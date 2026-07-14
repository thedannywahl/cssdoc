import { parseCssDocs } from "@cssdoc/core";
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

test("directives: disable, disable-next-line, and expect-error suppress and verify", () => {
  const missing = "/**\n * @component chip\n */\n.chip { color: red; }"; // no @summary → missing-summary
  expect(byRule(lintCssDocs(missing), "missing-summary")).toHaveLength(1); // baseline

  // Whole-file block disable.
  expect(byRule(lintCssDocs(`/* cssdoc-disable */\n${missing}`), "missing-summary")).toHaveLength(
    0,
  );

  // disable-next-line on the line above the doc comment (where missing-summary anchors).
  const nextLine = `/* cssdoc-disable-next-line missing-summary */\n${missing}`;
  expect(byRule(lintCssDocs(nextLine), "missing-summary")).toHaveLength(0);

  // A matched expect-error is silent; an unmatched one raises cssdoc-directive.
  const met = `/* cssdoc-expect-error missing-summary */\n${missing}`;
  expect(byRule(lintCssDocs(met), "missing-summary")).toHaveLength(0);
  expect(byRule(lintCssDocs(met), "cssdoc-directive")).toHaveLength(0);
  const unmet = "/* cssdoc-expect-error */\n.plain { color: red; }";
  expect(byRule(lintCssDocs(unmet), "cssdoc-directive")).toHaveLength(1);
});

test("directives: a ` - <reason>` suffix is ignored for rule scoping", () => {
  const missing = "/**\n * @component chip\n */\n.chip { color: red; }";
  // The reason after ` - ` must not be treated as extra rule names — the named rule still suppresses.
  const withReason = `/* cssdoc-disable-next-line missing-summary - generated, documented upstream */\n${missing}`;
  expect(byRule(lintCssDocs(withReason), "missing-summary")).toHaveLength(0);

  // A reason on an all-rules disable (no rule list) still disables everything.
  const allWithReason = `/* cssdoc-disable - vendor file */\n${missing}`;
  expect(byRule(lintCssDocs(allWithReason), "missing-summary")).toHaveLength(0);

  // The reason doesn't accidentally scope to an unrelated rule: disabling a *different* rule with a
  // reason leaves missing-summary reported.
  const otherRule = `/* cssdoc-disable-next-line unknown-modifier - unrelated */\n${missing}`;
  expect(byRule(lintCssDocs(otherRule), "missing-summary")).toHaveLength(1);
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

test("name-not-in-css: a deprecated alias with no selector is exempt", () => {
  const css = [
    "/**",
    " * @component alert",
    " * @summary An alert.",
    " * @modifier -without-shadow — No shadow.",
    " * @modifier -has-shadow-false — @deprecated {@link -without-shadow}",
    " */",
    ".alert { color: red; }",
    ".alert.-without-shadow { box-shadow: none; }",
  ].join("\n");
  // -without-shadow is defined; -has-shadow-false is a deprecated alias intentionally absent → no warning.
  expect(byRule(lintCssDocs(css), "name-not-in-css")).toHaveLength(0);
});

test("name-not-in-css: a `*` wildcard modifier is satisfied by an attribute-family selector", () => {
  const withFamily = [
    "/**",
    " * @component alert",
    " * @summary An alert.",
    " * @modifier -icon-* — Swap the status glyph.",
    " */",
    ".alert { color: red; }",
    '.alert[class*="-icon-"] { background: var(--glyph); }',
  ].join("\n");
  expect(byRule(lintCssDocs(withFamily), "name-not-in-css")).toHaveLength(0);

  // A literal instance of the family also satisfies the wildcard.
  const withInstance = [
    "/**",
    " * @component alert",
    " * @modifier -icon-* — Swap the status glyph.",
    " */",
    ".alert { color: red; }",
    ".alert.-icon-arrow { background: var(--glyph); }",
  ].join("\n");
  expect(byRule(lintCssDocs(withInstance), "name-not-in-css")).toHaveLength(0);

  // Nothing defines the family → still warns (genuine drift).
  const withoutFamily = [
    "/**",
    " * @component alert",
    " * @modifier -icon-* — Swap the status glyph.",
    " */",
    ".alert { color: red; }",
  ].join("\n");
  expect(byRule(lintCssDocs(withoutFamily), "name-not-in-css")).toHaveLength(1);
});

test("name-not-in-css: class attribute selectors define a modifier per their operator", () => {
  const doc = (rule: string) =>
    [
      "/**",
      " * @component alert",
      " * @modifier -foo — A modifier.",
      " */",
      ".alert { color: red; }",
      rule,
    ].join("\n");
  // *= (contains), $= (suffix), ~= (exact word) all define the chained `-foo` modifier.
  expect(byRule(lintCssDocs(doc('.alert[class*="-foo"] {}')), "name-not-in-css")).toHaveLength(0);
  expect(byRule(lintCssDocs(doc('.alert[class$="-foo"] {}')), "name-not-in-css")).toHaveLength(0);
  expect(byRule(lintCssDocs(doc('.alert[class~="-foo"] {}')), "name-not-in-css")).toHaveLength(0);
  // ^= anchors to the start of the class attribute (the base), so it does NOT define `-foo`.
  expect(byRule(lintCssDocs(doc('.alert[class^="-prop-foo"] {}')), "name-not-in-css")).toHaveLength(
    1,
  );
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

test("providerEntries let a consumer @structure compose an upstream component without a false flag", () => {
  const providerEntries = parseCssDocs(
    "/**\n * @component widget\n * @summary A widget.\n */\n.widget {}",
    {
      modifierConvention: "rscss",
    },
  );
  const consumer = [
    "/**",
    " * @component panel",
    " * @summary A panel.",
    " * @structure",
    " * .panel { .widget {} }",
    " */",
    ".panel {}",
  ].join("\n");
  const rules = (opts: LintOptions) => lintCssDocs(consumer, opts).map((v) => v.rule);
  // Without the provider, the composed `.widget` is an unknown structure selector...
  expect(rules({})).toContain("structure-unknown-selector");
  // ...with it, the upstream component is recognized as a sibling.
  expect(rules({ providerEntries })).not.toContain("structure-unknown-selector");
});
