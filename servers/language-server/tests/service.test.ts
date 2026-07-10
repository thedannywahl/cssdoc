import { createIndex } from "@cssdoc/index";
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
