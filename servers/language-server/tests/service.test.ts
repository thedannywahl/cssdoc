import { parseCssDocs } from "@cssdoc/core";
import { createIndex, indexFromEntries } from "@cssdoc/index";
import { DEFAULT_RULE_SEVERITIES } from "@cssdoc/providers";
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

// Single-line helper: cursor at `character` on line 0.
const at = (character: number) => ({ line: 0, character });

test("completions in a class attribute suggest the component's modifiers", () => {
  const text = `<button class="button ">x</button>`;
  const labels = service.completions(text, at(text.indexOf('">'))).map((c) => c.label);
  expect(labels).toEqual(expect.arrayContaining(["-color-secondary", "-variant-old"]));
});

test("completions after var(--…) suggest declared custom properties", () => {
  const text = `.x { color: var(--i`;
  const labels = service.completions(text, at(text.length)).map((c) => c.label);
  expect(labels).toContain("--button-radius");
});

test("hover on a modifier token shows its documentation", () => {
  const text = `<button class="button -color-secondary">x</button>`;
  const hover = service.hover(text, at(text.indexOf("-color-secondary") + 2));
  expect(hover?.contents).toContain("A lower-emphasis action.");
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
  const diags = new CssDocLanguageService(createIndex("")).diagnostics(vue, "vue", "Button.vue");
  const summary = diags.find((d) => d.code === "missing-summary");
  expect(summary).toBeDefined();
  expect(summary?.range.start.line).toBeGreaterThan(1); // inside the <style> block, not line 0
});

test("diagnostics see a doc comment authored above a styled-component const (via projection)", () => {
  const ts = `import styled from "styled-components";
/**
 * @component button
 */
const Button = styled.button\`
  color: red;
\`;`;
  const diags = new CssDocLanguageService(createIndex("")).diagnostics(
    ts,
    "typescript",
    "Button.ts",
  );
  // stylelint can't see this comment; the LSP can, because the projection keeps it in place.
  expect(diags.some((d) => d.code === "missing-summary")).toBe(true);
});

test("structure diagnostics resolve a cross-file sibling and restore masked ${…} for display", () => {
  // The workspace scope knows the `close-button` sibling (any prefix — here `instui-`).
  const svc = new CssDocLanguageService(
    createIndex(
      "/**\n * @component close-button\n * @summary A dismiss control.\n */\n.instui-close-button {}",
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
    line: (before.match(/\n/gu) ?? []).length,
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
    line: (before.match(/\n/gu) ?? []).length,
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
      ".instui-alert {}",
      ".instui-alert[class*='-icon-'] {}",
      "/**\n * @component close-button\n * @summary A dismiss control.\n */",
      ".instui-close-button {}",
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
        line: (before.match(/\n/gu) ?? []).length,
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
  const diags = new CssDocLanguageService(createIndex("")).diagnostics(scss, "scss", "card.scss");
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
  const labels = svc
    .completions("/**\n * @", { line: 1, character: 4 }, "components.css", "css")
    .map((c) => c.label);
  expect(labels).toEqual(expect.arrayContaining(["@component", "@modifier", "@part", "@summary"]));
  // Not offered outside a doc comment, or in a non-stylesheet document.
  expect(svc.completions("@", { line: 0, character: 1 }, "a.css", "css")).toEqual([]);
  expect(svc.completions("/**\n * @", { line: 1, character: 4 }, "a.ts", "typescript")).toEqual([]);
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
        line: (before.match(/\n/gu) ?? []).length,
        character: off - (before.lastIndexOf("\n") + 1),
      },
      "demo.css",
      "css",
    )?.contents ?? "";
  expect(contents).toContain("A vendor widget.");
});
