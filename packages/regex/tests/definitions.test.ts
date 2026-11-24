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

      it("has a compiled ArkRegex", () => {
        expect(def.regex).toBeDefined();
        // Note: ArkRegex may normalize the source (e.g., escaping), so we just check existence
        expect(typeof def.regex.source).toBe("string");
        expect(def.regex.source.length).toBeGreaterThan(0);
      });

      it("has a description", () => {
        expect(def.description).toBeDefined();
        expect(def.description.length).toBeGreaterThan(0);
      });

      // Test all positive fixtures
      def.fixtures.passes.forEach((testCase) => {
        const note = testCase.note ? ` (${testCase.note})` : "";
        it(`matches "${testCase.input}"${note}`, () => {
          expect(def.regex.test(testCase.input)).toBe(true);
        });
      });

      // Test all negative fixtures
      def.fixtures.fails.forEach((testCase) => {
        it(`rejects "${testCase.input}" - ${testCase.reason}`, () => {
          // For negative cases, the pattern should not match the full string
          const anchoredRegex = new RegExp(`^${def.source}$`);
          expect(anchoredRegex.test(testCase.input)).toBe(false);
        });
      });
    });
  });
});
