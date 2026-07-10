import stylelint from "stylelint";
import { expect, test } from "vite-plus/test";
import plugin, { ruleName } from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @modifier -color-secondary — A lower-emphasis action.
 */
.button { color: red; }
.button.-size-sm { font-size: small; }
`;

// The fixtures use the rscss convention; pass it as a secondary option (the parser defaults to BEM).
const lint = (code: string): Promise<{ text: string; rule: string | undefined }[]> =>
  stylelint
    .lint({
      code,
      config: { plugins: [plugin], rules: { [ruleName]: [true, { modifierConvention: "rscss" }] } },
    })
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
.chip { color: red; }
.chip.-color-info { color: blue; }
`;
  expect(await lint(clean)).toEqual([]);
});

const lintWith = (code: string, customSyntax: string): Promise<string[]> =>
  stylelint
    .lint({
      code,
      customSyntax,
      config: { plugins: [plugin], rules: { [ruleName]: [true, { modifierConvention: "rscss" }] } },
    })
    .then((r) => r.results[0].warnings.map((w) => w.text));

test("lints a Vue <style> block through postcss-html (comment inside the block)", async () => {
  const vue = `<template><button class="btn" /></template>
<style>
/**
 * @component btn
 */
.btn { color: red; }
.btn.-size-sm { font-size: small; }
</style>`;
  const warnings = await lintWith(vue, "postcss-html");
  // btn has no @summary; -size-sm is used but undocumented.
  expect(warnings.some((t) => t.includes("missing-summary"))).toBe(true);
  expect(warnings.some((t) => t.includes("undocumented-modifier"))).toBe(true);
});

test("lints an in-template comment through postcss-styled-syntax", async () => {
  const ts = `import styled from "styled-components";
const Button = styled.button\`
  /**
   * @component button
   */
  color: red;
  &.-size-sm { font-size: small; }
\`;`;
  const warnings = await lintWith(ts, "postcss-styled-syntax");
  expect(warnings.some((t) => t.includes("missing-summary"))).toBe(true);
});
