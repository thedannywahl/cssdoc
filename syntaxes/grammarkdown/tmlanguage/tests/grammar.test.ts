/* oxlint-disable eslint/require-unicode-regexp -- TextMate patterns use Oniguruma syntax. */
import { expect, test } from "vite-plus/test";

import grammar from "../grammarkdown.tmLanguage.json" with { type: "json" };
import grammarkdownGrammar, { buildGrammar, grammarkdown as namedGrammar } from "../src/index.ts";

test("the committed JSON and exports match the grammar builder", () => {
  expect(grammar).toEqual(buildGrammar());
  expect(grammarkdownGrammar).toEqual(grammar);
  expect(namedGrammar).toBe(grammarkdownGrammar);
});

test("is a well-formed TextMate grammar", () => {
  expect(grammar.scopeName).toBe("source.grammarkdown");
  expect(grammar.name).toBe("grammarkdown");
  expect(Array.isArray(grammar.patterns)).toBe(true);
  expect(grammar.patterns.length).toBeGreaterThan(0);
});

test("composed rules retain grammarkdown token and capture behavior", () => {
  const { production, parameters, nonterminal, codepoint, directive } = buildGrammar().repository;
  const productionPattern = new RegExp(production.match!);
  expect(productionPattern.exec("  Name2[Param] ::: rhs")?.slice(1)).toEqual([
    "Name2",
    "[Param]",
    ":::",
  ]);
  expect(productionPattern.exec("Item: rhs")?.slice(1)).toEqual(["Item", undefined, ":"]);
  expect(productionPattern.test("_Name: rhs")).toBe(false);
  expect(new RegExp(`^${parameters.match!}$`).test("A2")).toBe(true);
  expect(new RegExp(`^${parameters.match!}$`).test("A_2")).toBe(false);
  expect(new RegExp(`^${nonterminal.match!}$`).test("lower")).toBe(false);
  expect(new RegExp(`^${nonterminal.match!}$`).test("Upper2")).toBe(true);
  expect(new RegExp(`^${codepoint.match!}$`).test("U+10FFFF")).toBe(true);
  expect(new RegExp(`^${codepoint.match!}$`).test("U+G0")).toBe(false);
  expect(new RegExp(`^${directive.match!}$`).test("@define")).toBe(true);
  expect(new RegExp(`^${directive.match!}$`).test("@defineMore")).toBe(false);
});

test("every #include resolves to a repository rule", () => {
  const repo: Record<string, unknown> = grammar.repository ?? {};
  const refs = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        if (key === "include" && typeof value === "string" && value.startsWith("#")) {
          refs.add(value.slice(1));
        } else {
          walk(value);
        }
      }
    }
  };
  walk(grammar.patterns);
  walk(repo);

  const missing = [...refs].filter((ref) => !(ref in repo));
  expect(missing).toEqual([]);
});
