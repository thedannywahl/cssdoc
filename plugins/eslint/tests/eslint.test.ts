import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
    .verify(code, plugin.configs.recommended, "test.css")
    .map((m) => ({ ruleId: m.ruleId, message: m.message }));
};

test("the recommended config reports doc-hygiene violations on a .css file", () => {
  const messages = lint(CSS);
  expect(messages.length).toBeGreaterThan(0);
  expect(messages.every((m) => m.ruleId === "cssdoc/valid-doc-comments")).toBe(true);
  expect(messages.some((m) => m.message.includes("missing-summary"))).toBe(false);
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

test.each(["recommended", "strict", "relaxed"] as const)(
  "the %s preset includes upstream recommended CSS rules",
  (preset) => {
    const messages = new Linter().verify(".card {}", plugin.configs[preset], "test.css");
    expect(
      messages
        .filter((message) => message.ruleId === "css/no-empty-blocks")
        .map((message) => message.severity),
    ).toEqual([2]);
  },
);

test("the rule passes configured rule options to authoring checks", () => {
  for (const allowInherit of [false, true]) {
    const dir = mkdtempSync(join(tmpdir(), "cssdoc-eslint-rule-options-"));
    try {
      writeFileSync(
        join(dir, "cssdoc.json"),
        JSON.stringify({ ruleOptions: { values: { allowInherit } } }),
      );
      const messages = new Linter({ cwd: dir }).verify(
        "/**\n * @component card\n * @sealed\n */\n.card { margin: inherit; }",
        plugin.configs.recommended,
        join(dir, "a.css"),
      );
      expect(messages.some((m) => m.message.includes("sealed-reset-value"))).toBe(!allowInherit);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});
