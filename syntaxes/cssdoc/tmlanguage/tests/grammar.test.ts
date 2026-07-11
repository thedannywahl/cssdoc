import { expect, test } from "vite-plus/test";
import { CSSDOC_TAG_NAMES } from "@cssdoc/spec";
import { buildInjectionGrammar } from "../src/index.ts";
import grammar from "../cssdoc.injection.tmLanguage.json" with { type: "json" };

test("is a well-formed injection grammar", () => {
  expect(grammar.scopeName).toBe("documentation.cssdoc");
  expect(grammar.injectionSelector).toContain("comment.block.css");
  expect(Array.isArray(grammar.patterns)).toBe(true);
  expect(grammar.patterns.length).toBeGreaterThan(0);
});

test("the committed JSON is in sync with the builder (run `pnpm build && pnpm generate`)", () => {
  expect(grammar).toEqual(buildInjectionGrammar());
});

test("every standard tag from @cssdoc/spec appears in a grammar rule", () => {
  const rules = JSON.stringify(grammar.repository);
  for (const name of CSSDOC_TAG_NAMES) {
    expect(rules, `missing @${name}`).toContain(name);
  }
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

test("member names get semantic scopes: record name, modifier like part, cssstate like property", () => {
  const g = buildInjectionGrammar();
  expect(g.repository["record-tag"]?.captures?.["2"]?.name).toBe("entity.name.type.cssdoc");
  // A modifier's value uses the same scope as a part.
  expect(g.repository["modifier-tag"]?.captures?.["2"]?.name).toBe(
    g.repository["part-tag"]?.captures?.["2"]?.name,
  );
  // A cssstate's value uses the same scope as a custom property.
  expect(g.repository["state-tag"]?.captures?.["2"]?.name).toBe(
    g.repository["property-tag"]?.captures?.["2"]?.name,
  );
  // @component / @cssstate no longer fall through to the value-less keyword rule.
  expect(g.repository["block-tag"]?.match).not.toContain("component");
  expect(g.repository["block-tag"]?.match).not.toContain("cssstate");
});
