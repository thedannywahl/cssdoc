/**
 * @cssdoc/regex/tests/definitions.test
 *
 * Comprehensive test suite for all pattern definitions.
 * Tests all passes and fails from PATTERN_DEFINITIONS in one place.
 *
 * @module
 */

import { describe, it, expect } from "vite-plus/test";
import { PATTERN_DEFINITIONS } from "../src/definitions.js";

/**
 * Resolve a pattern to its regex string.
 */
function resolvePattern(
  def: (typeof PATTERN_DEFINITIONS)[keyof typeof PATTERN_DEFINITIONS],
): string {
  if (typeof def.pattern === "string") {
    return def.pattern;
  }

  const resolver = (depName: string): string => {
    const depDef = PATTERN_DEFINITIONS[depName];
    if (!depDef) throw new Error(`Pattern ${depName} not found`);
    return resolvePattern(depDef);
  };

  return def.pattern(resolver);
}

describe("Pattern Definitions", () => {
  it("exports at least 40 patterns", () => {
    expect(Object.keys(PATTERN_DEFINITIONS).length).toBeGreaterThanOrEqual(40);
  });

  Object.entries(PATTERN_DEFINITIONS).forEach(([name, def]) => {
    describe(`${name} (Tier ${def.tier})`, () => {
      it("can be compiled to a RegExp", () => {
        expect(() => {
          new RegExp(resolvePattern(def));
        }).not.toThrow();
      });

      it("has a description", () => {
        expect(def.description).toBeDefined();
        expect(def.description.length).toBeGreaterThan(0);
      });

      // Test all positive fixtures
      def.fixtures.passes.forEach((testCase) => {
        const note = testCase.note ? ` (${testCase.note})` : "";
        it(`matches "${testCase.input}"${note}`, () => {
          const regex = new RegExp(resolvePattern(def));
          expect(regex.test(testCase.input)).toBe(true);
        });
      });

      // Test all negative fixtures
      def.fixtures.fails.forEach((testCase) => {
        it(`rejects "${testCase.input}" - ${testCase.reason}`, () => {
          // For negative cases, the pattern should not match the full string
          const pattern = resolvePattern(def);
          const anchoredRegex = new RegExp(`^${pattern}$`);
          expect(anchoredRegex.test(testCase.input)).toBe(false);
        });
      });
    });
  });
});
