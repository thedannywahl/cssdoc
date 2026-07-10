import { expect, test } from "vite-plus/test";
import grammar from "../grammarkdown.tmLanguage.json" with { type: "json" };

test("is a well-formed TextMate grammar", () => {
  expect(grammar.scopeName).toBe("source.grammarkdown");
  expect(grammar.name).toBe("grammarkdown");
  expect(Array.isArray(grammar.patterns)).toBe(true);
  expect(grammar.patterns.length).toBeGreaterThan(0);
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
