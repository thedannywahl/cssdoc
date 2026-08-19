import { expect, test } from "vite-plus/test";
import { CSSDOC_TAG_NAMES } from "@cssdoc/spec";
import { buildAtRuleInjectionGrammar, buildInjectionGrammar } from "../src/index.ts";
import grammar from "../cssdoc.injection.tmLanguage.json" with { type: "json" };
import atRuleGrammar from "../cssdoc.atrules.injection.tmLanguage.json" with { type: "json" };

test("is a well-formed injection grammar", () => {
  expect(grammar.scopeName).toBe("documentation.cssdoc");
  expect(grammar.injectionSelector).toContain("comment.block.css");
  expect(Array.isArray(grammar.patterns)).toBe(true);
  expect(grammar.patterns.length).toBeGreaterThan(0);
});

test("the committed JSON is in sync with the builder (run `pnpm build && pnpm generate`)", () => {
  expect(grammar).toEqual(buildInjectionGrammar());
  expect(atRuleGrammar).toEqual(buildAtRuleInjectionGrammar());
});

test("at-rule grammar is a well-formed injection grammar", () => {
  expect(atRuleGrammar.scopeName).toBe("source.css.cssdoc.atrules");
  expect(atRuleGrammar.injectionSelector).toContain("meta.at-rule.css");
  expect(Array.isArray(atRuleGrammar.patterns)).toBe(true);
  expect(atRuleGrammar.patterns.length).toBeGreaterThan(0);
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

test("record-tag highlights a dotted qualified name in full, not just the segment before the dot", () => {
  const g = buildInjectionGrammar();
  const re = new RegExp(g.repository["record-tag"]?.match ?? "");
  const m = "@component menu.item".match(re);
  expect(m?.[2]).toBe("menu.item");
});

test("@ref has a dedicated numeric capture", () => {
  const g = buildInjectionGrammar();
  expect(g.repository["ref-tag"]?.match).toContain("ref");
  expect(g.repository["ref-tag"]?.captures?.["2"]?.name).toBe("constant.numeric.cssdoc");
});

test("@annotations is highlighted as a block tag", () => {
  const g = buildInjectionGrammar();
  expect(g.repository["block-tag"]?.match).toContain("annotations");
});

test("at-rule grammar highlights typed record refs and profile suffixes", () => {
  const g = buildAtRuleInjectionGrammar();
  expect(g.repository["record-ref-atrule"]?.match).toContain("component");
  expect(g.repository["record-ref-atrule"]?.match).toContain("layout");
  expect(g.repository["record-ref-atrule"]?.match).toContain("utility");
  expect(g.repository["record-ref-atrule"]?.match).toContain("declaration");
  expect(g.repository["record-ref-atrule"]?.captures?.["1"]?.name).toBe(
    "storage.type.class.cssdoc",
  );
  expect(g.repository["record-ref-atrule"]?.captures?.["2"]?.name).toBe("entity.name.type.cssdoc");
  expect(g.repository["record-ref-atrule"]?.captures?.["3"]?.name).toBe(
    "support.type.custom-property.cssdoc",
  );
  expect(g.repository["untyped-ref-atrule"]?.match).toContain("@(?!(?:");
  expect(g.repository["untyped-ref-atrule"]?.match).toContain("media");
  expect(g.repository["untyped-ref-atrule"]?.captures?.["1"]?.name).toBe(
    "storage.type.class.cssdoc",
  );
  expect(g.repository["untyped-ref-atrule"]?.captures?.["2"]?.name).toBe(
    "support.type.custom-property.cssdoc",
  );
});
