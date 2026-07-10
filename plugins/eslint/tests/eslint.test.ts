import { Linter } from "eslint";
import { expect, test } from "vite-plus/test";
import plugin from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @modifier button--color-secondary — A lower-emphasis action.
 */
.button { color: red; }
.button--size-sm { font-size: small; }
`;

const lint = (code: string): { ruleId: string | null; message: string }[] => {
  const linter = new Linter();
  return linter
    .verify(code, plugin.configs.recommended as Parameters<Linter["verify"]>[1], "test.css")
    .map((m) => ({ ruleId: m.ruleId, message: m.message }));
};

test("the recommended config reports doc-hygiene violations on a .css file", () => {
  const messages = lint(CSS);
  expect(messages.length).toBeGreaterThan(0);
  expect(messages.every((m) => m.ruleId === "cssdoc/valid-doc-comments")).toBe(true);
  expect(messages.some((m) => m.message.includes("missing-summary"))).toBe(true);
  expect(
    messages.some(
      (m) => m.message.includes("undocumented-modifier") && m.message.includes("button--size-sm"),
    ),
  ).toBe(true);
});

test("a fully documented stylesheet produces no messages", () => {
  const clean = `
/**
 * @component chip
 * @summary A small labelled tag.
 * @modifier chip--color-info — Informational.
 */
.chip { color: red; }
.chip--color-info { color: blue; }
`;
  expect(lint(clean)).toEqual([]);
});
