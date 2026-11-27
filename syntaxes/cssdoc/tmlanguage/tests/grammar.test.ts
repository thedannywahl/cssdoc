/* oxlint-disable eslint/require-unicode-regexp -- TextMate patterns use Oniguruma syntax. */
import { CSSDOC_TAG_NAMES } from "@cssdoc/spec";
import { regex as arkRegex } from "arkregex";
import { createHighlighter } from "shiki";
import { expect, test } from "vite-plus/test";

import atRuleGrammar from "../cssdoc.atrules.injection.tmLanguage.json" with { type: "json" };
import grammar from "../cssdoc.injection.tmLanguage.json" with { type: "json" };
import cssdocGrammar, { buildAtRuleInjectionGrammar, buildInjectionGrammar } from "../src/index.ts";

test.each([
  ["```", "````"],
  ["~~~~", "~~~~~"],
])("fenced code suppresses cssdoc tags until a matching %s fence closes", async (open, close) => {
  const highlighter = await createHighlighter({
    langs: [cssdocGrammar, "css"],
    themes: ["github-light"],
  });
  try {
    const code = [
      "/**",
      " * @example",
      ` * ${open}css`,
      " * @component hidden",
      " * {@link hidden}",
      ` * ${open.slice(0, -1)}`,
      " * @part hidden",
      ` * ${close}`,
      " * @summary visible",
      " */",
    ].join("\n");
    const lines = highlighter.codeToTokensBase(code, {
      lang: "css",
      theme: "github-light",
      includeExplanation: "scopeName",
    });
    const hasTag = (line: number) =>
      lines[line]?.some((token) =>
        token.explanation?.some((part) =>
          part.scopes.some((scope) => scope.scopeName === "storage.type.class.cssdoc"),
        ),
      );
    expect(hasTag(1)).toBe(true);
    expect(hasTag(3)).toBe(false);
    expect(hasTag(4)).toBe(false);
    expect(hasTag(6)).toBe(false);
    expect(hasTag(8)).toBe(true);
  } finally {
    highlighter.dispose();
  }
});

test.each([" * ```", " * ``` */"])(
  "an unclosed fence stops at the comment boundary: %s",
  async (fence) => {
    const highlighter = await createHighlighter({
      langs: [cssdocGrammar, "css"],
      themes: ["github-light"],
    });
    try {
      const code = [
        "/**",
        " * @example",
        fence,
        ...(fence.endsWith("*/") ? [] : [" * @component hidden", " */"]),
        "/** @component visible */",
      ].join("\n");
      const lines = highlighter.codeToTokensBase(code, {
        lang: "css",
        theme: "github-light",
        includeExplanation: "scopeName",
      });
      const scopes = (line: number) =>
        lines[line]?.flatMap((token) =>
          (token.explanation ?? []).flatMap((part) => part.scopes.map((scope) => scope.scopeName)),
        );
      expect(scopes(fence.endsWith("*/") ? 2 : 3)).not.toContain("storage.type.class.cssdoc");
      expect(scopes(lines.length - 1)).toContain("storage.type.class.cssdoc");
    } finally {
      highlighter.dispose();
    }
  },
);

test("is a well-formed injection grammar", () => {
  expect(grammar.scopeName).toBe("text.cssdoc");
  expect(grammar.injectionSelector).toContain("comment.block.css");
  expect(Array.isArray(grammar.patterns)).toBe(true);
  expect(grammar.patterns.length).toBeGreaterThan(0);
});

test("the committed JSON is in sync with the builder (run `vp run build && vp run generate`)", () => {
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

test("@selector and @pseudo have value highlighting, but @class is not a tag", () => {
  const g = buildInjectionGrammar();
  const partTagMatch = g.repository["part-tag"]?.match ?? "";
  expect(partTagMatch).toContain("selector");
  expect(partTagMatch).toContain("pseudo");
  expect(new RegExp(partTagMatch).test("@class .example")).toBe(false);
  // These should NOT be in block-tag since they have values.
  expect(g.repository["block-tag"]?.match).not.toContain("selector");
  expect(g.repository["block-tag"]?.match).not.toContain("pseudo");
  expect(new RegExp(g.repository["block-tag"]?.match ?? "").test("@class")).toBe(false);
});

test("@structure region highlights nested @scope and @variant with names", () => {
  const g = buildInjectionGrammar();
  const structurePatterns = g.repository["structure-tag"]?.patterns ?? [];
  const patternsStr = JSON.stringify(structurePatterns);
  expect(patternsStr).toContain("scope");
  expect(patternsStr).toContain("variant");
  const scopePattern = structurePatterns.find(
    (p: unknown) =>
      typeof p === "object" &&
      p !== null &&
      "match" in p &&
      typeof p.match === "string" &&
      p.match.includes("scope"),
  );
  expect(scopePattern).toBeDefined();
  if (!scopePattern || typeof scopePattern.match !== "string") {
    throw new TypeError("Expected a scope pattern");
  }
  const SCOPE = arkRegex.as(scopePattern.match, "u");
  const scopeMatch = SCOPE.exec("@scope (.menu) {");
  expect(scopeMatch?.[0]).toBe("@scope");
  expect(SCOPE.exec("@scope-menu (.menu) {")).toBeNull();

  const structureTagPattern = structurePatterns.find(
    (p: unknown) =>
      typeof p === "object" &&
      p !== null &&
      "match" in p &&
      typeof p.match === "string" &&
      p.match.includes("variant"),
  );
  expect(structureTagPattern).toBeDefined();
  const nestedVariant = "  .menu {\n    @variant compact {";
  if (!structureTagPattern || typeof structureTagPattern.match !== "string") {
    throw new TypeError("Expected a variant pattern");
  }
  const VARIANT = arkRegex.as(structureTagPattern.match, "u");
  const variantMatch = VARIANT.exec(nestedVariant);
  expect(variantMatch?.[1]).toBe("@variant");
  expect(variantMatch?.[2]).toBe("compact");
  expect(structureTagPattern.captures).toBeDefined();
});

test.each([
  "optional",
  "opt",
  "many",
  "one-or-more",
  "more",
  "max-5",
  "one-or-more:max-3",
  "more:max-4",
])("@structure component references include the full :%s cardinality", (cardinality) => {
  const pattern = buildInjectionGrammar().repository["structure-tag"]?.patterns?.[0]?.match;
  expect(pattern).toBeDefined();
  const COMPONENT_REFERENCE = arkRegex.as(pattern!, "u");
  const match = COMPONENT_REFERENCE.exec(`@component button:${cardinality}`);
  expect(match?.[2]).toBe(`button:${cardinality}`);
});

test("@structure region highlights slot declarations", () => {
  const g = buildInjectionGrammar();
  const structurePatterns = g.repository["structure-tag"]?.patterns ?? [];
  const patternsStr = JSON.stringify(structurePatterns);
  expect(patternsStr).toContain("slot");
  // Should handle slot with optional attributes: slot[name="x"]
  const slotPattern = structurePatterns.find(
    (p: unknown) =>
      typeof p === "object" &&
      p !== null &&
      "match" in p &&
      (p as Record<string, unknown>).match?.toString().includes("slot"),
  );
  expect(slotPattern).toBeDefined();
});

test("@structure region highlights cardinality modifiers", () => {
  const g = buildInjectionGrammar();
  const structurePatterns = g.repository["structure-tag"]?.patterns ?? [];
  const patternsStr = JSON.stringify(structurePatterns);
  // Should have pattern for :optional, :max-N, etc.
  expect(patternsStr).toContain(":[a-z]");
  const cardinalityPattern = structurePatterns.find(
    (p: unknown) =>
      typeof p === "object" &&
      p !== null &&
      "match" in p &&
      (p as Record<string, unknown>).match?.toString().includes(":"),
  );
  expect(cardinalityPattern).toBeDefined();
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

test.each(["memberOf", "member"])("@%s highlights its name and private keyword", (tag) => {
  const rule = buildInjectionGrammar().repository["member-tag"];
  const pattern = new RegExp(rule?.match ?? "");
  const match = `@${tag} side-nav-bar private`.match(pattern);
  expect(match?.slice(1)).toEqual([`@${tag}`, "side-nav-bar", "private"]);
  expect(`@${tag} panel`.match(pattern)?.slice(1)).toEqual([`@${tag}`, "panel", undefined]);
  expect(`@${tag} panel private-extra`.match(pattern)?.[3]).toBeUndefined();
  expect("@members tab, panel".match(pattern)).toBeNull();
  expect("private".match(pattern)).toBeNull();
  expect(rule?.captures?.["1"]?.name).toBe("storage.type.class.cssdoc");
  expect(rule?.captures?.["2"]?.name).toBe("entity.name.type.cssdoc");
  expect(rule?.captures?.["3"]?.name).toBe("storage.modifier.cssdoc");
});

test("@annotations is highlighted as a block tag", () => {
  const g = buildInjectionGrammar();
  expect(g.repository["block-tag"]?.match).toContain("annotations");
});

test("at-rule grammar highlights typed record refs and profile suffixes", () => {
  const g = buildAtRuleInjectionGrammar();
  expect(g.repository["record-ref-atrule"]?.match).toContain("component");
  expect(new RegExp(g.repository["record-ref-atrule"]?.match ?? "").test("@layout shell")).toBe(
    false,
  );
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

test("the removed record tag is not highlighted in doc comments", () => {
  const g = buildInjectionGrammar();
  for (const name of ["record-tag", "block-tag"]) {
    expect(new RegExp(g.repository[name]?.match ?? "").test("@layout shell")).toBe(false);
  }
});
