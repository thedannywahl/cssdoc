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
import { PATTERN_DEFINITIONS, type UnifiedPatternDef } from "../src/definitions.js";
import { escapeRegex, escapeRegexChar } from "../src/lib.ts";

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
