import { CssDocConfiguration, CssDocTagDefinition, parseCssDocs } from "@cssdoc/core";
import { createIndex, indexFromEntries } from "@cssdoc/index";
import { DEFAULT_RULE_SEVERITIES, resolveRuleSeverities } from "@cssdoc/providers";
import { expect, test } from "vite-plus/test";
import { CssDocLanguageService } from "../src/service.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 * @modifier -color-secondary — A lower-emphasis action.
 * @modifier -variant-old — @deprecated {@link -color-secondary}
 */
.button { color: red; }
.button.-color-secondary { color: blue; }
.button.-variant-old { color: gray; }
@property --button-radius { syntax: "<length>"; inherits: false; initial-value: 4px; }
`;

const service = new CssDocLanguageService(
  createIndex(CSS, { file: "components.css", modifierConvention: "rscss" }),
);
const summaryWarnSeverities = resolveRuleSeverities({ "missing-summary": "warn" });

// Single-line helper: cursor at `character` on line 0.
const at = (character: number) => ({ line: 0, character });

test("CSS diagnostics honor the configured unused-expectation severity", () => {
  const index = createIndex("");
  const svc = new CssDocLanguageService(index);
  const source = "/* cssdoc-expect-error missing-summary */\n.plain {}";
  for (const [setting, severity] of [
    ["off", undefined],
    ["warn", 2],
    ["error", 1],
  ] as const) {
    svc.setScopes([
      {
        dir: "/app",
        index,
        severities: resolveRuleSeverities({ "cssdoc-directive": setting }),
        naming: {},
      },
    ]);
    expect(
      svc.diagnostics(source, "css", "/app/test.css").find((d) => d.code === "cssdoc-directive")
        ?.severity,
    ).toBe(severity);
  }
});

test("consumer diagnostics apply file-specific severities from the relevant scope", () => {
  const svc = new CssDocLanguageService(createIndex(""));
  const index = createIndex(CSS, { modifierConvention: "rscss" });
  svc.setScopes([
    {
      dir: "/app",
      index,
      severities: resolveRuleSeverities({ "deprecated-modifier": "error" }),
      severitiesForFile: (path) =>
        resolveRuleSeverities({
          "deprecated-modifier": path.endsWith("ignored.html") ? "off" : "warn",
        }),
      naming: {},
    },
  ]);
  const source = '<button class="button -variant-old"></button>';
  expect(svc.diagnostics(source, "html", "/app/ignored.html")).toEqual([]);
  expect(
    svc
      .diagnostics(source, "html", "/app/checked.html")
      .find((d) => d.code === "deprecated-modifier")?.severity,
  ).toBe(2);
});

test("completions in a class attribute suggest the component's modifiers", () => {
  const text = `<button class="button ">x</button>`;
  const labels = service.completions(text, at(text.indexOf('">'))).map((c) => c.label);
  expect(labels).toEqual(expect.arrayContaining(["-color-secondary", "-variant-old"]));
});

test("completions retain quote and offset handling for JSX className values", () => {
  const text = `<Button className={'button '} />`;
  const labels = service.completions(text, at(text.indexOf("'}")));
  expect(labels.map((c) => c.label)).toContain("-color-secondary");
});

test("completions carry sortText so a @global modifier sorts after the component's own", () => {
  const css = `
/**
 * @component button
 * @summary Button.
 * @modifier -size-sm — Small.
 */
.button {}
.button.-size-sm {}

/**
 * @utility theme
 * @global
 * @modifier -density-compact — Reduces padding everywhere.
 */
.theme {}
.theme.-density-compact {}
`;
  const svc = new CssDocLanguageService(createIndex(css, { modifierConvention: "rscss" }));
  const text = `<button class="button ">x</button>`;
  const completions = svc.completions(text, at(text.indexOf('">')));
  const direct = completions.find((c) => c.label === "-size-sm");
  const global = completions.find((c) => c.label === "-density-compact");
  expect(direct?.sortText).toBeTruthy();
  expect(global?.sortText).toBeTruthy();
  expect(direct!.sortText! < global!.sortText!).toBe(true);
});

test("completions after var(--…) suggest declared custom properties", () => {
  const text = `.x { color: var(--i`;
  const labels = service.completions(text, at(text.length)).map((c) => c.label);
  expect(labels).toContain("--button-radius");
});

test("class completions include a governing scope's provider records and modifiers", () => {
  const provider = parseCssDocs(
    "/**\n * @component widget\n * @modifier quiet Quiet mode.\n */\n.widget {}\n.widget--quiet {}",
  );
  const own = createIndex("");
  const svc = new CssDocLanguageService(own);
  svc.setScopes([
    {
      dir: "/app",
      index: own,
      siblingIndex: indexFromEntries(provider),
      severities: DEFAULT_RULE_SEVERITIES,
      naming: {},
    },
  ]);
  const emptyClass = '<div class="">';
  expect(
    svc.completions(emptyClass, at(12), "/app/page.html", "html").map((c) => c.label),
  ).toContain("widget");
  const withBase = '<div class="widget ">';
  expect(
    svc
      .completions(withBase, at(withBase.indexOf('">')), "/app/page.html", "html")
      .map((c) => c.label),
  ).toContain("widget--quiet");
});

test("hover on a modifier token shows its documentation", () => {
  const text = `<button class="button -color-secondary">x</button>`;
  const hover = service.hover(text, at(text.indexOf("-color-secondary") + 2));
  expect(hover?.contents).toContain("A lower-emphasis action.");
});

test("hover filters examples from providers without changing the existing section controls", () => {
  const providerEntries = parseCssDocs(`
/** @component widget
 * @example labels=[docs, demo]
 * <button>Shared</button>
 * @example labels=[demo]
 * <button>Interactive</button>
 * @example labels=[a11y]
 * <button>Audit fixture</button>
 * @example
 * <button>Unlabeled</button>
 */
.widget {}
`);
  const svc = new CssDocLanguageService(createIndex(""));
  svc.setScopes([
    {
      dir: "/app",
      index: createIndex(""),
      siblingIndex: indexFromEntries(providerEntries),
      severities: DEFAULT_RULE_SEVERITIES,
      naming: {},
    },
  ]);
  const markup = `<div class="widget">`;
  const pos = at(markup.indexOf("widget"));
  const filter = { labels: ["docs"], includeUnlabeled: false };
  const card = svc.hover(markup, pos, "/app/page.html", "html", filter)?.contents;
  expect(card).toContain("**$(book) Example**");
  expect(card).toContain("Shared");
  expect(card).not.toMatch(/Interactive|Audit fixture|Unlabeled|labels=\[/u);

  const css = ".widget {}";
  expect(svc.hover(css, at(2), "/app/page.css", "css", filter)?.contents).toContain("Shared");
  expect(svc.hover(css, at(2), "/app/page.css", "css", filter)?.contents).not.toContain(
    "Interactive",
  );
  expect(
    svc.hover(markup, pos, "/app/page.html", "html", { ...filter, labels: [] })?.contents,
  ).not.toContain("$(book) Example");

  svc.setHoverDetail("custom", { examples: "off" });
  expect(svc.hover(markup, pos, "/app/page.html", "html", filter)?.contents).not.toContain(
    "Shared",
  );
});

test("hover on @ref shows its local @annotations legend text", () => {
  const text = [
    "/**",
    " * @component card",
    " * @summary A card.",
    " * @annotations",
    " * 1. Focus ring is mandatory.",
    " * @ref 1.",
    " */",
    ".card {}",
  ].join("\n");
  const idx = text.indexOf("@ref 1") + 5;
  const before = text.slice(0, idx);
  const pos = {
    line: before.split("\n").length - 1,
    character: idx - (before.lastIndexOf("\n") + 1),
  };
  const svc = new CssDocLanguageService(createIndex(text));
  const hover = svc.hover(text, pos, "card.css", "css");
  expect(hover?.contents).toContain("@ref 1");
  expect(hover?.contents).toContain("Focus ring is mandatory.");
  expect(hover?.contents).toContain("$(symbol-numeric)");
  svc.setHoverPresentation("markdown");
  expect(svc.hover(text, pos, "card.css", "css")?.contents).not.toContain("$(symbol-numeric)");
});

test("definition on a modifier token points at its rule in the CSS file", () => {
  const text = `<button class="button -color-secondary">x</button>`;
  const def = service.definition(text, at(text.indexOf("-color-secondary") + 2));
  expect(def?.uri).toBe("components.css");
  expect(def?.range.start.line).toBe(8); // 0-based; the rule is on line 9
});

test("diagnostics flag unknown and deprecated modifiers, with a quick-fix for the deprecation", () => {
  const text = `<button class="button -bogus -variant-old">x</button>`;
  const diags = service.diagnostics(text);
  expect(diags.map((d) => d.code)).toEqual(
    expect.arrayContaining(["unknown-modifier", "deprecated-modifier"]),
  );
  const actions = service.codeActions(diags);
  expect(actions[0].title).toBe("Replace with .-color-secondary");
  expect(actions[0].edit.newText).toBe("-color-secondary");
});

const BEM_CSS = `
/**
 * @component card
 * @summary A surface.
 * @modifier card--featured — A promoted card.
 */
.card { color: red; }
.card--featured { color: blue; }
`;

test("BEM (default): diagnostics flag an undocumented suffix modifier at Warning", () => {
  const svc = new CssDocLanguageService(createIndex(BEM_CSS));
  const diags = svc.diagnostics(`<div class="card card--bogus">x</div>`);
  const unknown = diags.find((d) => d.code === "unknown-modifier");
  expect(unknown?.severity).toBe(2); // Warning
  expect(unknown?.message).toContain(".card--bogus");
});

test("diagnostics flag disallowed-element when @element constraints exclude the host tag", () => {
  const css = `
/**
 * @component button
 * @summary A primary action.
 * @element button
 */
.button {}`;
  const svc = new CssDocLanguageService(createIndex(css));
  const diags = svc.diagnostics(`<div class="button"></div>`, "html");
  expect(diags.some((d) => d.code === "disallowed-element")).toBe(true);
  expect(svc.diagnostics(`<button class="button"></button>`, "html")).toEqual([]);

  const strict = new CssDocLanguageService(createIndex(css));
  strict.setScopes([
    {
      dir: "/",
      index: createIndex(css),
      severities: { ...DEFAULT_RULE_SEVERITIES, "disallowed-element": "error" },
      naming: {},
    },
  ]);
  const sev = strict
    .diagnostics(`<div class="button"></div>`, "html")
    .find((d) => d.code === "disallowed-element")?.severity;
  expect(sev).toBe(1);
});

test("class usage is checked in JSX className, Vue :class, and Svelte class:name", () => {
  const svc = new CssDocLanguageService(createIndex(BEM_CSS));
  // JSX className brace with a string literal.
  expect(
    svc
      .diagnostics(`<button className={clsx("card", "card--bogus")} />`, "typescriptreact")
      .some((d) => d.code === "unknown-modifier" && d.message.includes(".card--bogus")),
  ).toBe(true);
  // Vue :class array literal (static class carries the base).
  expect(
    svc
      .diagnostics(`<div class="card" :class="['card--bogus']" />`, "vue")
      .some((d) => d.code === "unknown-modifier"),
  ).toBe(true);
  // Svelte class:name directive.
  expect(
    svc
      .diagnostics(`<div class="card" class:card--bogus={on} />`, "svelte")
      .some((d) => d.code === "unknown-modifier"),
  ).toBe(true);
  // A documented modifier stays clean.
  expect(
    svc
      .diagnostics(`<div class="card card--featured" />`, "html")
      .some((d) => d.code === "unknown-modifier"),
  ).toBe(false);
});

test("attribute (CUBE): a data-attribute modifier on the base element is checked", () => {
  const cubeCss = `
/**
 * @component card
 * @summary A surface.
 */
.card { color: red; }
.card[data-variant="ghost"] { background: none; }
`;
  const svc = new CssDocLanguageService(
    createIndex(cubeCss, { modifierConvention: { structure: "attribute", separator: "data-" } }),
  );
  const diags = svc.diagnostics(`<div class="card" data-variant="bogus"></div>`);
  const unknown = diags.find((d) => d.code === "unknown-modifier");
  expect(unknown?.message).toContain(`[data-variant="bogus"]`);
  // A known attribute value is fine.
  expect(
    svc
      .diagnostics(`<div class="card" data-variant="ghost"></div>`)
      .some((d) => d.code === "unknown-modifier"),
  ).toBe(false);
  const jsx = `<Button className='card' data-variant = 'bogus' />`;
  const singleQuoted = svc.diagnostics(jsx).find((d) => d.code === "unknown-modifier");
  expect(singleQuoted?.message).toContain(`[data-variant="bogus"]`);
  expect(singleQuoted?.range.start.character).toBe(jsx.indexOf("data-variant"));
  expect(singleQuoted?.range.end.character).toBe(jsx.indexOf(" />"));
});

test("multi-config: each scope checks consumer usage against its own convention", () => {
  // Two packages with different conventions (BEM and rscss).
  const bem = createIndex(
    `/**\n * @component card\n * @summary s\n */\n.card {}\n.card--featured {}`,
  );
  const rscss = createIndex(
    `/**\n * @component tag\n * @summary s\n */\n.tag {}\n.tag.-color-red {}`,
    {
      modifierConvention: "rscss",
    },
  );
  const svc = new CssDocLanguageService(createIndex(""));
  svc.setScopes([
    { dir: "/repo/a", index: bem, severities: DEFAULT_RULE_SEVERITIES, naming: {} },
    { dir: "/repo/b", index: rscss, severities: DEFAULT_RULE_SEVERITIES, naming: {} },
  ]);
  // BEM component → BEM convention flags `card--bogus`.
  const a = svc.diagnostics(`<div class="card card--bogus"></div>`, "html");
  expect(a.some((d) => d.code === "unknown-modifier" && d.message.includes(".card--bogus"))).toBe(
    true,
  );
  // rscss component → rscss convention flags `-color-bad`; the BEM scope doesn't own `tag`, so it
  // contributes nothing (no cross-convention false positives).
  const b = svc.diagnostics(`<div class="tag -color-bad"></div>`, "html");
  expect(b.some((d) => d.code === "unknown-modifier" && d.message.includes(".-color-bad"))).toBe(
    true,
  );
  expect(b.filter((d) => d.code === "unknown-modifier")).toHaveLength(1);
});

test("diagnostics lint the embedded CSS in a Vue <style> block, at absolute lines", () => {
  const vue = `<template><button class="btn" /></template>
<style>
/**
 * @component btn
 */
.btn { color: red; }
</style>`;
  const service = new CssDocLanguageService(createIndex(""));
  service.setRuleSeverities(summaryWarnSeverities);
  const diags = service.diagnostics(vue, "vue", "Button.vue");
  const summary = diags.find((d) => d.code === "missing-summary");
  expect(summary).toBeDefined();
  expect(summary?.range.start.line).toBeGreaterThan(1); // inside the <style> block, not line 0
});

test("Markdown diagnostics ignore comment-like globs in prose and non-CSS fences", () => {
  const md = `# Tooling notes

- Test files (\`__tests__/**\`) are excluded.

\`\`\`typescript
export default {
  lint: { "**/*.md": "markdownlint" },
};
\`\`\`

Exports may use \`/** @public */\` annotations.
`;
  const service = new CssDocLanguageService(createIndex(""));
  expect(() => service.diagnostics(md, "markdown", "gotchas.md")).not.toThrow();
  expect(service.diagnostics(md, "markdown", "gotchas.md")).toEqual([]);
});

test("diagnostics see a doc comment authored above a styled-component const (via projection)", () => {
  const ts = `import styled from "styled-components";
/**
 * @component button
 */
const Button = styled.button\`
  color: red;
\`;`;
  const service = new CssDocLanguageService(createIndex(""));
  service.setRuleSeverities(summaryWarnSeverities);
  const diags = service.diagnostics(ts, "typescript", "Button.ts");
  // stylelint can't see this comment; the LSP can, because the projection keeps it in place.
  expect(diags.some((d) => d.code === "missing-summary")).toBe(true);
});

test("structure diagnostics resolve a cross-file sibling and restore masked ${…} for display", () => {
  // The workspace scope knows the `close-button` sibling (any prefix — here `vendor-`).
  const svc = new CssDocLanguageService(
    createIndex(
      "/**\n * @component close-button\n * @summary A dismiss control.\n */\n.vendor-close-button {}",
      { modifierConvention: "rscss" },
    ),
  );
  // alert.ts: the doc comment (and its `@structure`) lives inside the `css` template, so `${p}` is a
  // real interpolation that projects to the masked filler.
  const ts = [
    "export const alert = css`",
    "/**",
    " * @component alert",
    " * @summary An alert.",
    " * @structure",
    " * .${p}alert {",
    " *   .${p}close-button {}",
    " *   .${p}bogus {}",
    " * }",
    " */",
    ".${p}alert {}",
    "`;",
  ].join("\n");
  const structure = svc
    .diagnostics(ts, "typescript", "alert.ts")
    .filter((d) => d.code === "structure-unknown-selector");
  // `.${p}close-button` resolves to the sibling; only `.${p}bogus` is unknown.
  expect(structure).toHaveLength(1);
  // Its message shows the source interpolation, not the masked projection (`.aaaabogus`).
  expect(structure[0].message).toContain(".${p}bogus");
  expect(structure[0].message).not.toContain("aaaa");
});

test("embedded hover restores ${…} and renders the full card even with an empty sectionOrder", () => {
  const svc = new CssDocLanguageService(createIndex(""));
  svc.setHoverDetail("full", {}, []); // the client's default empty order must not blank the card
  const ts = [
    "export const alert = css`",
    "/**",
    " * @component alert",
    " * @summary An alert.",
    " * @modifier -color-info — Informational (default).",
    " */",
    ".${p}alert {}",
    ".${p}alert.-color-info {}",
    "`;",
  ].join("\n");
  const off = ts.indexOf("\n.${p}alert {") + 4; // inside the class of the rule declaration
  const before = ts.slice(0, off);
  const position = {
    line: before.split("\n").length - 1,
    character: off - (before.lastIndexOf("\n") + 1),
  };
  const contents = svc.hover(ts, position, "alert.ts", "typescript")?.contents ?? "";
  expect(contents).toContain(".${p}alert"); // interpolation restored, not the masked `.aaaaalert`
  expect(contents).not.toContain("aaaa");
  expect(contents).toContain("Modifiers"); // the full card, not just the one-line header
});

test("embedded hover renders an escaped fenced @example: real fence, prose, unmasked ${…}", () => {
  const bt = String.fromCharCode(96);
  const f = "\\" + bt + "\\" + bt + "\\" + bt; // an escaped ``` fence, as authored in a css template
  const ts = [
    "export const alert = css" + bt,
    "/**",
    " * @component alert",
    " * @summary An alert.",
    " * @example",
    " * Prose before.",
    " * " + f + "html",
    ' * <div class="${p}alert"></div>',
    " * " + f,
    " */",
    ".${p}alert {}",
    bt + ";",
  ].join("\n");
  const off = ts.indexOf("\n.${p}alert {") + 4;
  const before = ts.slice(0, off);
  const position = {
    line: before.split("\n").length - 1,
    character: off - (before.lastIndexOf("\n") + 1),
  };
  const contents =
    new CssDocLanguageService(createIndex("")).hover(ts, position, "alert.ts", "typescript")
      ?.contents ?? "";
  expect(contents).toContain("Prose before.");
  expect(contents).toContain("```html"); // a real fence, not the escaped `\`\`\``
  expect(contents).not.toContain("\\`");
  expect(contents).toContain('<div class="${p}alert">'); // interpolation restored, fence preserved
});

test("embedded hover: var() chain resolves, [class*] shows the family, a sibling shows its card", () => {
  // Project index (the generated sheet): the token chain, alert (with a `-icon-*` family), close-button.
  const project = createIndex(
    [
      '@property --info-border { syntax: "<color>"; inherits: false; initial-value: var(--stroke-info); }',
      ":root { --stroke-info: #0770a3; }",
      "/**\n * @component alert\n * @summary An alert.\n * @modifier -icon-* — Swap the glyph.\n */",
      ".vendor-alert {}",
      ".vendor-alert[class*='-icon-'] {}",
      "/**\n * @component close-button\n * @summary A dismiss control.\n */",
      ".vendor-close-button {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  const svc = new CssDocLanguageService(project);
  svc.setHoverDetail("full", {}, []);

  const bt = String.fromCharCode(96);
  const ts = [
    "export const alert = css" + bt,
    "/**\n * @component alert\n * @summary An alert.\n * @modifier -icon-* — Swap the glyph.\n */",
    ".${p}alert {}",
    ".${p}alert.-color-info { border-color: var(--info-border); }",
    '.${p}alert[class*="-icon-"] { color: red; }',
    ".${p}alert > .${p}close-button {}",
    bt + ";",
  ].join("\n");
  const hoverAt = (needle: string, delta: number) => {
    const off = ts.indexOf(needle) + delta;
    const before = ts.slice(0, off);
    return svc.hover(
      ts,
      {
        line: before.split("\n").length - 1,
        character: off - (before.lastIndexOf("\n") + 1),
      },
      "alert.ts",
      "typescript",
    )?.contents;
  };

  // ① var() chain resolved to the terminal literal.
  const varHover = hoverAt("var(--info-border)", 6) ?? "";
  expect(varHover).toContain("Resolves to: `#0770a3`");

  // ② the `[class*="-icon-"]` attribute selector resolves to the `-icon-*` family modifier.
  const attrHover = hoverAt('[class*="-icon-"]', 3) ?? "";
  expect(attrHover).toContain("Swap the glyph");

  // ③ a sibling component reference shows that component's own card.
  const sibHover = hoverAt("> .${p}close-button", 5) ?? "";
  expect(sibHover).toContain("A dismiss control.");
  expect(sibHover).toContain("close-button");
});

test("diagnostics parse a .scss document through the SCSS dialect", () => {
  const scss = `$brand: #06c;
// a scss line comment
/**
 * @component card
 */
.card { color: $brand; }`;
  const service = new CssDocLanguageService(createIndex(""));
  service.setRuleSeverities(summaryWarnSeverities);
  const diags = service.diagnostics(scss, "scss", "card.scss");
  // Parses past $vars and // without throwing; card has no @summary.
  expect(diags.some((d) => d.code === "missing-summary")).toBe(true);
});

test("css diagnostics honor the configured name case", () => {
  const svc = new CssDocLanguageService(
    createIndex(`/**\n * @component card\n * @summary s\n */\n.card {}`),
  );
  svc.setNaming({ component: "pascalCase" });
  const diags = svc.diagnostics(
    `/**\n * @component card\n * @summary s\n */\n.card { color: red; }`,
    "css",
  );
  expect(diags.some((d) => d.code === "component-name-case")).toBe(true);
});

test("a component defined in the document's own <style> is available to its markup", () => {
  const svc = new CssDocLanguageService(createIndex("")); // empty workspace index
  const src = `<style>
/**
 * @component note
 * @summary A note.
 * @modifier note--info — Info.
 */
.note {}
.note--info {}
</style>
<p class="note note--bogus">x</p>`;
  // Usage checking: an undocumented modifier of the in-file component is flagged…
  expect(
    svc.diagnostics(src, "html").find((d) => d.code === "unknown-modifier")?.message,
  ).toContain(".note--bogus");
  // …while a documented one stays clean.
  const clean = src.replace("note--bogus", "note--info");
  expect(svc.diagnostics(clean, "html").some((d) => d.code === "unknown-modifier")).toBe(false);
  // Hover also resolves the in-file component (path drives host detection).
  const at = clean.indexOf("note--info", clean.indexOf('class="note'));
  const position = {
    line: clean.slice(0, at).split("\n").length - 1,
    character: at - clean.lastIndexOf("\n", at) - 1,
  };
  expect(svc.hover(clean, position, "note.html")?.contents).toContain("note");
});

test("typescript config command globs do not throw in diagnostics, hover, or definition", () => {
  const svc = new CssDocLanguageService(createIndex(""));
  const ts = `import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      // CSS/cssdoc linting depends on generated records.
      "lint:css": {
        command:
          'vp exec stylelint "renderers/web-components/src/**/*.css" "formats/components/src/{components,utilities}/*.css" "formats/components/generated/*.css"',
      },
      "lint:js": {
        command:
          'vp exec eslint "formats/components/src/{components,utilities}/*.css" "formats/components/generated/*.css" "renderers/web-components/src/**/*.css"',
      },
    },
  },
});`;

  const at = ts.indexOf("components,utilities");
  const before = ts.slice(0, at);
  const pos = {
    line: before.split("\n").length - 1,
    character: at - (before.lastIndexOf("\n") + 1),
  };

  expect(() => svc.diagnostics(ts, "typescript", "vite.config.ts")).not.toThrow();
  expect(() => svc.hover(ts, pos, "vite.config.ts", "typescript")).not.toThrow();
  expect(() => svc.definition(ts, pos, "vite.config.ts", "typescript")).not.toThrow();
});

test("authoring hover: hovering a selector or property in the CSS source resolves its card", () => {
  const css = `/**
 * @component button
 * @summary The primary action control.
 * @modifier button--danger — A destructive action.
 * @cssproperty --button-radius — The corner radius.
 */
.button {
  border-radius: var(--button-radius);
}
.button--danger {
  color: red;
}
@property --button-radius { syntax: "<length>"; inherits: false; initial-value: 4px; }`;
  const svc = new CssDocLanguageService(createIndex("")); // empty workspace; resolves against the file
  const pos = (needle: string, extra = 1) => {
    const i = css.indexOf(needle) + extra;
    return {
      line: css.slice(0, i).split("\n").length - 1,
      character: i - css.lastIndexOf("\n", i) - 1,
    };
  };
  // The base selector's rule → the component card.
  expect(svc.hover(css, pos(".button {"), "components.css", "css")?.contents).toContain(
    "The primary action control.",
  );
  // A modifier selector → its modifier docs.
  expect(svc.hover(css, pos(".button--danger {"), "components.css", "css")?.contents).toContain(
    "A destructive action.",
  );
  // A custom property in a declaration → its property docs.
  expect(
    svc.hover(css, pos("var(--button-radius", 6), "components.css", "css")?.contents,
  ).toContain("The corner radius.");
});

test("doc-tag completion: `@` inside a /** */ comment in a stylesheet suggests cssdoc tags", () => {
  const svc = new CssDocLanguageService(createIndex(""));
  const completions = svc.completions(
    "/**\n * @",
    { line: 1, character: 4 },
    "components.css",
    "css",
  );
  const labels = completions.map((c) => c.label);
  expect(labels).toEqual(expect.arrayContaining(["@component", "@modifier", "@part", "@summary"]));
  // Each suggestion carries a description of the tag's purpose alongside its kind.
  const summary = completions.find((c) => c.label === "@summary");
  expect(summary?.kind).toBe(14);
  expect(summary?.detail).toBe("block tag");
  expect(summary?.documentation).toBe("A one-line description of the record.");
  // Not offered outside a doc comment, or in a non-stylesheet document.
  expect(svc.completions("@", { line: 0, character: 1 }, "a.css", "css")).toEqual([]);
  expect(svc.completions("/**\n * @", { line: 1, character: 4 }, "a.ts", "typescript")).toEqual([]);
});

test("doc-tag completion replaces the complete tag without duplicating @", () => {
  const svc = new CssDocLanguageService(createIndex(""));
  for (const [text, position, end] of [
    ["/**\n * @\n */", { line: 1, character: 4 }, 4],
    ["/**\n * @pa\n */", { line: 1, character: 6 }, 6],
    ["/**\n * @pold\n */", { line: 1, character: 5 }, 8],
    ["/**\r\n * 😀 @pa\r\n */", { line: 1, character: 9 }, 9],
  ] as const) {
    const part = svc.completions(text, position, "a.css", "css").find((c) => c.label === "@part");
    const start = text.split("\n")[position.line].indexOf("@");
    expect(part?.textEdit).toEqual({
      range: {
        start: { line: position.line, character: start },
        end: { ...position, character: end },
      },
      newText: "@part",
    });
  }
});

test("hover works inside clsx() and inside embedded CSS (css`` template, Markdown fence)", () => {
  const pos = (text: string, needle: string) => {
    const i = text.indexOf(needle) + 1;
    return {
      line: text.slice(0, i).split("\n").length - 1,
      character: i - text.lastIndexOf("\n", i) - 1,
    };
  };
  // 1) A class inside clsx(...) — a usage hover, not a class="" attribute.
  const svc = new CssDocLanguageService(createIndex(BEM_CSS)); // documents `card`
  const jsx = `<div className={clsx("card", "card--featured")} />`;
  expect(svc.hover(jsx, pos(jsx, '"card"'), "App.jsx", "javascriptreact")?.contents).toContain(
    "A surface.",
  );

  // 2) A selector authored inside a css`` template (empty workspace — resolves against the file).
  const empty = new CssDocLanguageService(createIndex(""));
  const ts = [
    "const css = String.raw;",
    "export const s = css`",
    "/**",
    " * @component badge",
    " * @summary A label.",
    " */",
    ".badge {}",
    "`;",
  ].join("\n");
  expect(empty.hover(ts, pos(ts, ".badge"), "styles.ts", "typescript")?.contents).toContain(
    "A label.",
  );

  // 3) A selector authored inside a Markdown ```css fence.
  const md = [
    "# Doc",
    "",
    "```css",
    "/**",
    " * @component alert",
    " * @summary A banner.",
    " */",
    ".alert {}",
    "```",
  ].join("\n");
  expect(empty.hover(md, pos(md, ".alert"), "styleguide.md", "markdown")?.contents).toContain(
    "A banner.",
  );
});

test("definition works inside clsx() and inside embedded CSS", () => {
  const pos = (text: string, needle: string) => {
    const i = text.indexOf(needle) + 1;
    return {
      line: text.slice(0, i).split("\n").length - 1,
      character: i - text.lastIndexOf("\n", i) - 1,
    };
  };
  // clsx usage → jumps to the workspace rule.
  const svc = new CssDocLanguageService(createIndex(BEM_CSS, { file: "components.css" }));
  const jsx = `<div className={clsx("card", "card--featured")} />`;
  const d = svc.definition(jsx, pos(jsx, '"card--featured"'), "App.jsx", "javascriptreact");
  expect(d?.uri).toBe("components.css");

  // A selector authored in a css`` template → jumps within the file.
  const empty = new CssDocLanguageService(createIndex(""));
  const ts = [
    "const css = String.raw;",
    "export const s = css`",
    "/**",
    " * @component badge",
    " * @summary A label.",
    " */",
    ".badge {}",
    ".badge--big {}",
    "`;",
  ].join("\n");
  const d2 = empty.definition(ts, pos(ts, ".badge--big {"), "styles.ts", "typescript");
  expect(d2?.uri).toBe("styles.ts");
  expect(d2?.range.start.line).toBe(7); // the .badge--big rule
});

test("completions round out: doc-tags in embedded CSS, and class modifiers in clsx()", () => {
  const empty = new CssDocLanguageService(createIndex(""));
  const svc = new CssDocLanguageService(createIndex(BEM_CSS)); // documents card + card--featured

  // Position of the char just after `needle`, correct even when that lands at a line boundary.
  const posAfter = (text: string, needle: string) => {
    const at = text.indexOf(needle) + needle.length;
    return {
      line: text.slice(0, at).split("\n").length - 1,
      character: at - text.lastIndexOf("\n", at - 1) - 1,
    };
  };

  // 1) `@` inside a css`` template's doc comment suggests cssdoc tags…
  const ts = [
    "const css = String.raw;",
    "export const s = css`",
    "/**",
    " * @",
    " */",
    ".x {}",
    "`;",
  ].join("\n");
  expect(
    empty.completions(ts, posAfter(ts, " * @"), "styles.ts", "typescript").map((c) => c.label),
  ).toEqual(expect.arrayContaining(["@component", "@modifier"]));
  // …but NOT in a plain JSDoc that isn't inside any CSS region.
  const jsdoc = ["/**", " * @", " */", "function f() {}"].join("\n");
  expect(empty.completions(jsdoc, posAfter(jsdoc, " * @"), "a.ts", "typescript")).toEqual([]);

  // 2) A partial modifier inside clsx() offers the base component's modifiers.
  const jsx = `<div className={clsx("card", "card--")} />`;
  const ci = jsx.indexOf('"card--"') + 6; // inside "card--"
  const labels = svc
    .completions(jsx, { line: 0, character: ci }, "App.jsx", "javascriptreact")
    .map((c) => c.label);
  expect(labels).toContain("card--featured");
});

test("a scope's providers let a consumer stylesheet compose an upstream component (lint + hover)", () => {
  // The upstream provider (vendor) documents a `widget`; the consumer scope carries it as a sibling.
  const providerEntries = parseCssDocs(
    "/**\n * @component widget\n * @summary A vendor widget.\n */\n.widget {}",
    { modifierConvention: "rscss" },
  );
  const demo = [
    "/**",
    " * @component panel",
    " * @summary A panel.",
    " * @structure",
    " * .panel { .widget {} }",
    " */",
    ".panel {}",
    ".panel .widget { color: red; }",
  ].join("\n");
  const own = createIndex(demo, { file: "demo.css" });
  const svc = new CssDocLanguageService(createIndex(""));
  svc.setScopes([
    {
      dir: "",
      index: own,
      siblingIndex: indexFromEntries([...own.entries, ...providerEntries]),
      severities: DEFAULT_RULE_SEVERITIES,
      naming: {},
    },
  ]);

  // Lint: the composed vendor `.widget` is recognized, not a false structure-unknown-selector.
  const diags = svc.diagnostics(demo, "css", "demo.css");
  expect(diags.some((d) => d.code === "structure-unknown-selector")).toBe(false);

  // Hover: hovering the vendor `.widget` inside demo.css resolves to the vendor component's card.
  const off = demo.indexOf(".widget { color") + 2;
  const before = demo.slice(0, off);
  const contents =
    svc.hover(
      demo,
      {
        line: before.split("\n").length - 1,
        character: off - (before.lastIndexOf("\n") + 1),
      },
      "demo.css",
      "css",
    )?.contents ?? "";
  expect(contents).toContain("A vendor widget.");
});

test("a scope's providers resolve @global modifiers in classUsage diagnostics (not just structure/hover)", () => {
  // The upstream provider documents a `@global` spacing utility,
  // never authored anywhere in the consumer's own scope.
  const providerEntries = parseCssDocs(
    "/**\n * @utility spacing\n * @global\n * @modifier --p-lg — Large padding.\n */\n.spacing {}",
    { modifierConvention: "rscss" },
  );
  const own = createIndex("/**\n * @component card\n * @summary A card.\n */\n.card {}", {
    file: "demo.css",
    modifierConvention: "rscss",
  });
  const svc = new CssDocLanguageService(createIndex(""));
  svc.setScopes([
    {
      dir: "",
      index: own,
      siblingIndex: indexFromEntries(
        [...own.entries, ...providerEntries],
        undefined,
        undefined,
        own.matcher,
      ),
      severities: DEFAULT_RULE_SEVERITIES,
      naming: {},
    },
  ]);

  // The `@global` provider modifier chained onto this scope's own component is NOT flagged unknown.
  const clean = svc.diagnostics(`<div class="card --p-lg"></div>`, "html");
  expect(clean.some((d) => d.code === "unknown-modifier")).toBe(false);

  // A genuinely unknown modifier is still flagged.
  const bogus = svc.diagnostics(`<div class="card --totally-bogus"></div>`, "html");
  expect(bogus.some((d) => d.code === "unknown-modifier")).toBe(true);
});

test("rebuild: a PostCSS parse error yields a valid empty scope, not a thrown exception", () => {
  // CssDocLanguageService.setScopes mirrors what server.ts rebuild() does after the try/catch guard.
  const svc = new CssDocLanguageService(createIndex(""));
  // Provide a scope with an empty index (simulating the fallback) — service must stay functional.
  svc.setScopes([
    { dir: "", index: createIndex(""), severities: DEFAULT_RULE_SEVERITIES, naming: {} },
  ]);
  // No diagnostics on clean HTML; service did not crash.
  expect(() => svc.diagnostics("<div></div>", "html")).not.toThrow();
  expect(svc.diagnostics("<div></div>", "html")).toEqual([]);
});

test("semanticTokens: extracts doc comment tags as tokens", () => {
  const docCss = `
/**
 * @component button
 * @summary A button component.
 * @deprecated Use btn-v2 instead.
 * @modifier -primary
 * @cssproperty --btn-color
 */
.button { }`;

  const svc = new CssDocLanguageService(createIndex(docCss));
  const tokens = svc.semanticTokens(docCss);

  // Should find tokens for @-tags in the doc comment
  expect(tokens.length).toBeGreaterThan(0);

  // Tokens should have required fields
  for (const token of tokens) {
    expect(typeof token.line).toBe("number");
    expect(typeof token.startCharacter).toBe("number");
    expect(typeof token.length).toBe("number");
    expect(typeof token.tokenType).toBe("number");
    expect(typeof token.tokenModifiers).toBe("number");
  }

  // Find a decorator token (for @-prefixed tags)
  const decoratorToken = tokens.find((t) => t.tokenType === 4); // 4 = decorator
  expect(decoratorToken).toBeDefined();
});

test("semantic tokens use line-relative UTF-16 positions in multiline and inline comments", () => {
  const text = `/**\n * @component button\n * @summary Click me\n */\n.💫 {} /** @deprecated Old */`;
  const lines = text.split("\n");
  const svc = new CssDocLanguageService(createIndex(""));
  const tokenText = svc.semanticTokens(text).map((token) => ({
    line: token.line,
    text: lines[token.line].slice(token.startCharacter, token.startCharacter + token.length),
  }));
  expect(tokenText).toEqual([
    { line: 1, text: "component" },
    { line: 1, text: "button" },
    { line: 2, text: "summary" },
    { line: 2, text: "Click me" },
    { line: 4, text: "deprecated" },
    { line: 4, text: "Old" },
  ]);
});

test("semantic tokens follow configured block ownership in embedded CSS and incomplete fences", () => {
  const config = new CssDocConfiguration();
  config.addTagDefinition(new CssDocTagDefinition({ tagName: "custom", syntaxKind: "block" }));
  config.setSupportForTag(config.tryGetTagDefinition("summary")!, false);
  const idx = createIndex("");
  const svc = new CssDocLanguageService(idx);
  svc.setScopes([
    {
      dir: "/app",
      index: idx,
      severities: DEFAULT_RULE_SEVERITIES,
      naming: {},
      configuration: config,
    },
  ]);
  const text = [
    "<p>/** @component outside */</p>",
    "<style>😀 /**",
    " * @custom - Text",
    " * @summary - Disabled",
    " * @example -",
    " * ```css",
    " * @component hidden",
    " */",
    "</style>",
  ].join("\r\n");
  const lines = text.split("\r\n");
  const tags = svc
    .semanticTokens(text, "/app/example.html")
    .filter((token) => token.tokenType === 4)
    .map((token) =>
      lines[token.line].slice(token.startCharacter, token.startCharacter + token.length),
    );
  expect(tags).toEqual(["custom", "example"]);
  const incomplete = "/** @component button\n * @example -\n * ```\n * @summary hidden";
  expect(svc.semanticTokens(incomplete).filter((token) => token.tokenType === 4)).toHaveLength(2);
});

test("inlayHints: shows custom property metadata", () => {
  const docCss = `
/**
 * @component button
 * @cssproperty --btn-color The button background color.
 * @cssproperty --btn-size
 */
.button {
  background: var(--btn-color, blue);
  font-size: var(--btn-size, 16px);
}`;

  const svc = new CssDocLanguageService(createIndex(docCss));
  const hints = svc.inlayHints(docCss);

  // Should find hints for custom property usages
  expect(hints.length).toBeGreaterThan(0);

  // Property hints should have type kind (1) and tooltip with metadata
  const propHints = hints.filter((h) => h.kind === 1 && h.tooltip?.includes("Property"));
  expect(propHints.length).toBeGreaterThan(0);
});

test("semanticTokens: returns empty array for CSS without doc comments", () => {
  const simpleCss = `.button { color: red; }`;
  const svc = new CssDocLanguageService(createIndex(simpleCss));
  const tokens = svc.semanticTokens(simpleCss);

  // No doc comments = no semantic tokens
  expect(tokens).toEqual([]);
});

test("inlayHints: returns empty array for CSS without custom properties", () => {
  const simpleCss = `.button { color: red; }`;
  const svc = new CssDocLanguageService(createIndex(simpleCss));
  const hints = svc.inlayHints(simpleCss);

  // No custom properties = no inlay hints
  expect(hints).toEqual([]);
});
