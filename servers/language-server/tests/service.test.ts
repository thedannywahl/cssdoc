import { createIndex } from "@cssdoc/index";
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
