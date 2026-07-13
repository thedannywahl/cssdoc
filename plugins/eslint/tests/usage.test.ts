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
.button { color: red; }
.button.-color-secondary { color: blue; }
.button.-variant-old { color: gray; }
`;

const dir = mkdtempSync(join(tmpdir(), "cssdoc-usage-"));
const cssPath = join(dir, "components.css");
writeFileSync(cssPath, CSS);

const rules = {
  "cssdoc/valid-class-usage": ["warn", { css: [cssPath], modifierConvention: "rscss" }],
} as const;

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
  const messages = lintJsx(`export const x = <button className="button -bogus -variant-old" />;`);
  expect(messages.some((m) => m.includes("unknown-modifier") && m.includes("-bogus"))).toBe(true);
  expect(
    messages.some((m) => m.includes("deprecated-modifier") && m.includes("-color-secondary")),
  ).toBe(true);
});

test("JSX className: a valid modifier chain produces no messages", () => {
  expect(lintJsx(`export const x = <button className="button -color-secondary" />;`)).toEqual([]);
});

test("JSX: a `-modifier` on a non-cssdoc element is not flagged", () => {
  // No documented component among the tokens → no diagnostics (avoids false positives).
  expect(lintJsx(`export const x = <div className="grid -gap-4" />;`)).toEqual([]);
});

test("JSX dynamic bindings: template literal flags an unknown modifier", () => {
  const messages = lintJsx("export const x = <button className={`button -bogus`} />;");
  expect(messages.some((m) => m.includes("unknown-modifier") && m.includes("-bogus"))).toBe(true);
});

test("JSX dynamic bindings: clsx string args flag an unknown modifier", () => {
  const messages = lintJsx(`export const x = <button className={clsx("button", "-bogus")} />;`);
  expect(messages.some((m) => m.includes("unknown-modifier") && m.includes("-bogus"))).toBe(true);
});

test("JSX dynamic bindings: a valid modifier chain produces no messages", () => {
  expect(lintJsx("export const x = <button className={`button -color-secondary`} />;")).toEqual([]);
});

test("JSX dynamic bindings: a computed name (no string literal) is not flagged (best-effort)", () => {
  // An unquoted/computed class can't be read statically, so it's skipped rather than false-flagged.
  expect(lintJsx(`export const x = <button className={cx(buttonClasses)} />;`)).toEqual([]);
});

test("HTML class: flags an unknown modifier on the component", () => {
  const messages = lintHtml(`<button class="button -bogus">x</button>`);
  expect(messages.some((m) => m.includes("unknown-modifier") && m.includes("-bogus"))).toBe(true);
});

test("HTML class: a valid modifier chain produces no messages", () => {
  expect(lintHtml(`<button class="button -color-secondary">x</button>`)).toEqual([]);
});

// ── CUBE (attribute) convention on JSX ────────────────────────────────────────────────────────────

const CUBE_CSS = `
/**
 * @component card
 * @summary A surface.
 */
.card { color: red; }
.card[data-variant="ghost"] { background: none; }
`;
const cubeDir = mkdtempSync(join(tmpdir(), "cssdoc-cube-"));
const cubeCssPath = join(cubeDir, "cube.css");
writeFileSync(cubeCssPath, CUBE_CSS);

const cubeRules = {
  "cssdoc/valid-class-usage": [
    "warn",
    { css: [cubeCssPath], modifierConvention: { structure: "attribute", separator: "data-" } },
  ],
} as const;

const lintJsxCube = (code: string): string[] => {
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
          rules: cubeRules,
        },
      ] as Parameters<Linter["verify"]>[1],
      "test.jsx",
    )
    .map((m) => m.message);
};

test("JSX attribute (CUBE): an unknown data-attribute value is flagged; a known one is not", () => {
  const bad = lintJsxCube(`export const x = <div className="card" data-variant="bogus" />;`);
  expect(bad.some((m) => m.includes("unknown-modifier") && m.includes("data-variant"))).toBe(true);
  expect(lintJsxCube(`export const x = <div className="card" data-variant="ghost" />;`)).toEqual(
    [],
  );
});
