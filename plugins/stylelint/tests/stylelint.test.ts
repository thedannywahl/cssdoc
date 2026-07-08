import stylelint from "stylelint";
import { expect, test } from "vite-plus/test";
import plugin, { ruleName } from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @modifier -color-secondary — A lower-emphasis action.
 */
.instui-button { color: red; }
.instui-button.-size-sm { font-size: small; }
`;

const lint = (code: string): Promise<{ text: string; rule: string | undefined }[]> =>
  stylelint
    .lint({ code, config: { plugins: [plugin], rules: { [ruleName]: true } } })
    .then((r) => r.results[0].warnings.map((w) => ({ text: w.text, rule: w.rule })));

test("the rule reports doc-hygiene violations from lint-core", async () => {
  const warnings = await lint(CSS);
  const texts = warnings.map((w) => w.text);
  // button has no @summary; -size-sm has no @modifier description.
  expect(texts.some((t) => t.includes("missing-summary"))).toBe(true);
  expect(texts.some((t) => t.includes("undocumented-modifier") && t.includes("-size-sm"))).toBe(
    true,
  );
  expect(warnings.every((w) => w.rule === ruleName)).toBe(true);
});

test("a fully documented stylesheet produces no warnings", async () => {
  const clean = `
/**
 * @component chip
 * @summary A small labelled tag.
 * @modifier -color-info — Informational.
 */
.instui-chip { color: red; }
.instui-chip.-color-info { color: blue; }
`;
  expect(await lint(clean)).toEqual([]);
});
