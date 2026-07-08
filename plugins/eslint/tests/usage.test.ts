import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import htmlParser from "@html-eslint/parser";
import { Linter } from "eslint";
import { expect, test } from "vite-plus/test";
import plugin from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 * @modifier -color-secondary — A lower-emphasis action.
 * @modifier -variant-old — @deprecated {@link -color-secondary}
 */
.instui-button { color: red; }
.instui-button.-color-secondary { color: blue; }
.instui-button.-variant-old { color: gray; }
`;

const dir = mkdtempSync(join(tmpdir(), "cssdoc-usage-"));
const cssPath = join(dir, "components.css");
writeFileSync(cssPath, CSS);

const rules = { "cssdoc/valid-class-usage": ["warn", { css: [cssPath] }] } as const;

const lintJsx = (code: string): string[] => {
  const linter = new Linter();
  return linter
    .verify(
      code,
      [
        {
          files: ["**/*.jsx"],
          languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
          plugins: { cssdoc: plugin },
          rules,
        },
      ] as Parameters<Linter["verify"]>[1],
      "test.jsx",
    )
    .map((m) => m.message);
};

const lintHtml = (code: string): string[] => {
  const linter = new Linter();
  return linter
    .verify(
      code,
      [
        {
          files: ["**/*.html"],
          languageOptions: { parser: htmlParser },
          plugins: { cssdoc: plugin },
          rules,
        },
      ] as Parameters<Linter["verify"]>[1],
      "test.html",
    )
    .map((m) => m.message);
};

test("JSX className: flags an unknown modifier and a deprecated one on the component", () => {
  const messages = lintJsx(
    `export const x = <button className="instui-button -bogus -variant-old" />;`,
  );
  expect(messages.some((m) => m.includes("unknown-modifier") && m.includes("-bogus"))).toBe(true);
  expect(
    messages.some((m) => m.includes("deprecated-modifier") && m.includes("-color-secondary")),
  ).toBe(true);
});

test("JSX className: a valid modifier chain produces no messages", () => {
  expect(
    lintJsx(`export const x = <button className="instui-button -color-secondary" />;`),
  ).toEqual([]);
});

test("JSX: a `-modifier` on a non-cssdoc element is not flagged", () => {
  // No documented component among the tokens → no diagnostics (avoids false positives).
  expect(lintJsx(`export const x = <div className="grid -gap-4" />;`)).toEqual([]);
});

test("HTML class: flags an unknown modifier on the component", () => {
  const messages = lintHtml(`<button class="instui-button -bogus">x</button>`);
  expect(messages.some((m) => m.includes("unknown-modifier") && m.includes("-bogus"))).toBe(true);
});

test("HTML class: a valid modifier chain produces no messages", () => {
  expect(lintHtml(`<button class="instui-button -color-secondary">x</button>`)).toEqual([]);
});
