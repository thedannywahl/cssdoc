import { expect, test } from "vite-plus/test";
import { type LintOptions, type Violation, lintCssDocs as lintRaw } from "../src/index.ts";

// The fixtures below use the rscss convention; the parser now defaults to BEM.
const lintCssDocs = (css: string, opts: LintOptions = {}): Violation[] =>
  lintRaw(css, { modifierConvention: "rscss", ...opts });

const byRule = (violations: Violation[], rule: string): Violation[] =>
  violations.filter((v) => v.rule === rule);

const CSS = `
/**
 * @component button
 * @modifier -color-secondary — A lower-emphasis action.
 * @part .ghost — A part no selector defines.
 * @modifier -variant-old — @deprecated
 */
.button { color: red; }
.button.-color-secondary { color: blue; }
.button.-size-sm { font-size: small; }
.button.-variant-old { color: gray; }
`;

test("flags a missing summary", () => {
  const v = byRule(lintCssDocs(CSS), "missing-summary");
  expect(v).toHaveLength(1);
  expect(v[0].record).toBe("button");
});

test("flags an AST modifier without a @modifier description", () => {
  const v = byRule(lintCssDocs(CSS), "undocumented-modifier");
  // -size-sm has no description; -color-secondary is documented; -variant-old is deprecated.
  expect(v.map((x) => x.message)).toEqual([expect.stringContaining("-size-sm")]);
});

test("flags a deprecated modifier that lacks a canonical replacement or note", () => {
  const v = byRule(lintCssDocs(CSS), "deprecated-requires-canonical");
  expect(v).toHaveLength(1);
  expect(v[0].message).toContain("-variant-old");
});

test("flags an undocumented part", () => {
  // .ghost is documented but its description is present; add an AST part with none.
  const css = `
/**
 * @component menu
 * @summary A menu.
 */
.menu { min-width: 10rem; }
@scope (.menu) {
  :scope > .item { padding: 0.5rem; }
}
`;
  const v = byRule(lintCssDocs(css), "undocumented-part");
  expect(v.map((x) => x.message)).toEqual([expect.stringContaining(".item")]);
});

test("flags documentation that has drifted from the CSS (name-not-in-css)", () => {
  const v = byRule(lintCssDocs(CSS), "name-not-in-css");
  // .ghost is documented via @part but no selector defines it.
  expect(v.map((x) => x.message)).toEqual([expect.stringContaining(".ghost")]);
  expect(v[0].line).toBeGreaterThan(0);
});

test("rules can be disabled", () => {
  const v = lintCssDocs(CSS, { rules: { "missing-summary": false } });
  expect(byRule(v, "missing-summary")).toHaveLength(0);
});

test("naming: component-name-case flags a component that violates the configured case", () => {
  const lower = `/**\n * @component card\n * @summary A surface.\n */\n.card { color: red; }`;
  const pascal = `/**\n * @component Card\n * @summary A surface.\n */\n.Card { color: red; }`;
  // PascalCase (SUIT): the lowercase `.card` is flagged; `.Card` is fine.
  expect(
    byRule(lintCssDocs(lower, { naming: { component: "pascalCase" } }), "component-name-case"),
  ).toHaveLength(1);
  expect(
    byRule(lintCssDocs(pascal, { naming: { component: "pascalCase" } }), "component-name-case"),
  ).toHaveLength(0);
  // Off by default (no naming configured).
  expect(byRule(lintCssDocs(lower), "component-name-case")).toHaveLength(0);
});

test("naming: a custom regex is honored for the name case", () => {
  const css = `/**\n * @component widget\n * @summary A thing.\n */\n.widget { color: red; }`;
  // Require a `c-` prefix; `.widget` doesn't match.
  const v = byRule(lintCssDocs(css, { naming: { component: "^c-" } }), "component-name-case");
  expect(v).toHaveLength(1);
});
