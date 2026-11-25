/**
 * @cssdoc/regex/tests/definitions.test
 *
 * Comprehensive test suite for all pattern definitions.
 * Tests all passes and fails from PATTERN_DEFINITIONS in one place.
 *
 * @module
 */

import { describe, it, expect } from "vite-plus/test";
import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import { PATTERN_DEFINITIONS, type UnifiedPatternDef } from "../src/definitions.js";
import {
  COMMENT_END,
  COMMENT_END_TEXT,
  DOC_COMMENT_START,
  DOC_COMMENT_START_TEXT,
  MARKDOWN_BACKTICK_FENCE,
  MARKDOWN_BACKTICK_FENCE_TEXT,
  MARKDOWN_BACKTICK_FENCE_LINE_PREFIX,
  MARKDOWN_SINGLE_BACKTICK_CODE_SPAN,
  HTML_COMMENT,
  HTML_QUOTED_ATTRIBUTE,
  HTML_QUOTED_ATTRIBUTE_VALUE,
} from "../src/index.ts";
import { escapeRegex, escapeRegexChar, toRegExp } from "../src/lib.ts";

function requiredRegex(def: UnifiedPatternDef): Regex {
  if (!def.regex) throw new Error(`Missing compiled regex for ${def.name}`);
  return def.regex;
}

it("escapes regex metacharacters without changing ordinary characters", () => {
  for (const char of ".*+?^${}()|[]\\") {
    expect(escapeRegexChar(char)).toBe(`\\${char}`);
  }
  expect(escapeRegexChar("-")).toBe("-");
  expect(escapeRegexChar("é")).toBe("é");
});

it("escapes each metacharacter in a string while preserving literal text", () => {
  const text = "é.a+[x]\\z";
  const escaped = escapeRegex(text);
  expect(escaped).toBe("é\\.a\\+\\[x\\]\\\\z");
  expect(new RegExp(`^${escaped}$`, "u").test(text)).toBe(true);
  expect(escapeRegex("")).toBe("");
});

it("adds global matching and anchors while preserving existing regex flags", () => {
  const pattern = toRegExp(arkRegex.as("item", "iu"), "start-end");
  expect(pattern.flags).toBe("giu");
  expect([..."\nITEM\n".matchAll(pattern)]).toEqual([]);
  expect([..."ITEM".matchAll(pattern)].map((match) => match[0])).toEqual(["ITEM"]);
});

it("captures only a trailing lowercase ASCII filename extension", () => {
  const pattern = requiredRegex(PATTERN_DEFINITIONS.FILE_EXTENSION);
  expect("dir/file.scss".match(pattern)?.[1]).toBe("scss");
  expect("file.scss1".match(pattern)).toBeNull();
  expect("file.".match(pattern)).toBeNull();
});

it("matches the same doc-comment opener as the literal form without consuming extra stars", () => {
  expect(DOC_COMMENT_START.exec("/*** text")?.[0]).toBe(DOC_COMMENT_START_TEXT);
  expect(DOC_COMMENT_START.exec("/* text")).toBeNull();
});

it("matches the literal comment closer without consuming extra stars", () => {
  expect(COMMENT_END.exec("**/")?.[0]).toBe(COMMENT_END_TEXT);
  expect(COMMENT_END.exec("/*")).toBeNull();
});

it("keeps the literal fence distinct from its regex source and detects indented line prefixes", () => {
  expect(MARKDOWN_BACKTICK_FENCE.exec("````")?.[0]).toBe(MARKDOWN_BACKTICK_FENCE_TEXT);
  expect(MARKDOWN_BACKTICK_FENCE_LINE_PREFIX.exec("text\n \t```css")?.[0]).toBe("\n \t```");
  expect(MARKDOWN_BACKTICK_FENCE_LINE_PREFIX.exec("text ```css")).toBeNull();
});

it("captures simple code spans when splitting Markdown prose", () => {
  const pattern = toRegExp(MARKDOWN_SINGLE_BACKTICK_CODE_SPAN);
  expect("a `x` b `` c `y\nz`".split(pattern)).toEqual([
    "a ",
    "`x`",
    " b ",
    "``",
    " c ",
    "`y\nz`",
    "",
  ]);
});

it("preserves HTML attribute value captures for either quote style", () => {
  expect(HTML_QUOTED_ATTRIBUTE_VALUE.exec('"double"')?.slice(1)).toEqual(["double", undefined]);
  expect(HTML_QUOTED_ATTRIBUTE_VALUE.exec("'single'")?.slice(1)).toEqual([undefined, "single"]);
  expect(HTML_QUOTED_ATTRIBUTE.exec('data-state = "open"')?.slice(1)).toEqual([
    "data-state",
    "open",
    undefined,
  ]);
});

it("matches HTML comments separately, including multiline comments", () => {
  const comments = toRegExp(HTML_COMMENT);
  expect([..."<!-- a\nb --> text <!-- c -->".matchAll(comments)].map((match) => match[0])).toEqual([
    "<!-- a\nb -->",
    "<!-- c -->",
  ]);
});

it.each([
  ['[class*="-icon-"]', ["*", "-icon-", undefined, undefined]],
  ["[ class ~= 'active' ]", ["~", undefined, "active", undefined]],
  ["[class=active]", ["", undefined, undefined, "active"]],
  ["[class$=]", ["$", undefined, undefined, ""]],
])("captures the operator and value in %s", (selector, captures) => {
  const pattern = new RegExp(PATTERN_DEFINITIONS.CSS_CLASS_ATTRIBUTE_SELECTOR.source, "u");
  expect(selector.match(pattern)?.slice(1)).toEqual(captures);
});

it.each(["div", "<div>", "< div", "div >"])("captures the element name from %s", (token) => {
  const pattern = new RegExp(`^${PATTERN_DEFINITIONS.CSSDOC_ELEMENT_TAG.source}$`, "u");
  expect(token.match(pattern)?.[1]).toBe("div");
});

it("captures base-class references without admitting modifier or digit prefixes", () => {
  const pattern = new RegExp(PATTERN_DEFINITIONS.CSSDOC_BASE_CLASS_REFERENCE.source, "gu");
  expect(
    [...".Card ._part-1 .-modifier .1part".matchAll(pattern)].map((match) => match[1]),
  ).toEqual(["Card", "_part-1"]);
});

it("captures permissive class references, including modifiers and digit prefixes", () => {
  const pattern = toRegExp(requiredRegex(PATTERN_DEFINITIONS.CSS_CLASS_REFERENCE));
  expect(
    [...".Card ._part-1 .-modifier .1part".matchAll(pattern)].map((match) => match[1]),
  ).toEqual(["Card", "_part-1", "-modifier", "1part"]);
});

it("preserves selector scanning captures and strips functional pseudo selectors", () => {
  const state = toRegExp(requiredRegex(PATTERN_DEFINITIONS.CSSDOC_CUSTOM_STATE_SELECTOR));
  const part = toRegExp(requiredRegex(PATTERN_DEFINITIONS.CSSDOC_SHADOW_PART_SELECTOR));
  const pseudo = toRegExp(requiredRegex(PATTERN_DEFINITIONS.CSSDOC_SCANNED_PSEUDO_SELECTOR));
  const selector = ".card:state( -open )::part(label):not(.hidden):hover";
  expect([...selector.matchAll(state)].map((match) => match[1])).toEqual(["-open"]);
  expect([...selector.matchAll(part)].map((match) => match[1])).toEqual(["label"]);
  expect(selector.replace(pseudo, "")).toBe(".card");
});

it("preserves typed and shorthand structure reference captures", () => {
  const typed = new RegExp(`^${PATTERN_DEFINITIONS.CSSDOC_TYPED_STRUCTURE_REFERENCE.source}$`, "u");
  const shorthand = new RegExp(
    `^${PATTERN_DEFINITIONS.CSSDOC_SHORTHAND_STRUCTURE_REFERENCE.source}$`,
    "u",
  );
  expect("component menu.item:compact private".match(typed)?.slice(1)).toEqual([
    "component",
    "menu.item",
    "compact",
    "private",
  ]);
  expect("menu.item:compact private".match(shorthand)?.slice(1)).toEqual([
    "menu.item",
    "compact",
    "private",
  ]);
});

describe("Pattern Definitions", () => {
  it("exports at least 40 patterns", () => {
    expect(Object.keys(PATTERN_DEFINITIONS).length).toBeGreaterThanOrEqual(40);
  });

  Object.entries(PATTERN_DEFINITIONS).forEach(([name, def]) => {
    describe(`${name} (Tier ${def.tier})`, () => {
      it("has a source string", () => {
        expect(def.source).toBeDefined();
        expect(typeof def.source).toBe("string");
        expect(def.source.length).toBeGreaterThan(0);
      });

      it("has a compiled ArkRegex or is Tier 0", () => {
        if (def.tier === 0) {
          // Tier 0 patterns are character sources, not regex patterns
          expect(def.regex).toBeUndefined();
        } else {
          expect(def.regex).toBeDefined();
          const regex = requiredRegex(def);
          // Note: ArkRegex may normalize the source (e.g., escaping), so we just check existence
          expect(typeof regex.source).toBe("string");
          expect(regex.source.length).toBeGreaterThan(0);
        }
      });

      it("has a description", () => {
        expect(def.description).toBeDefined();
        expect(def.description.length).toBeGreaterThan(0);
      });

      // Test all positive fixtures (only for Tier 1+; Tier 0 are composition primitives)
      if (def.tier > 0) {
        def.fixtures.passes.forEach((testCase) => {
          const note = testCase.note ? ` (${testCase.note})` : "";
          it(`matches "${testCase.input}"${note}`, () => {
            // Tier 1+: use the regex anchored to match the full string
            const compiled = requiredRegex(def);
            const regex = new RegExp(`^${compiled.source}$`, compiled.flags);
            expect(regex.test(testCase.input)).toBe(true);
          });
        });
      }

      // Test all negative fixtures (only for Tier 1+; Tier 0 are composition primitives)
      if (def.tier > 0) {
        def.fixtures.fails.forEach((testCase) => {
          it(`rejects "${testCase.input}" - ${testCase.reason}`, () => {
            // Tier 1+: use the regex anchored to match the full string
            const compiled = requiredRegex(def);
            const regex = new RegExp(`^${compiled.source}$`, compiled.flags);
            expect(regex.test(testCase.input)).toBe(false);
          });
        });
      }
    });
  });
});
