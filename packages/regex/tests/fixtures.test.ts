/**
 * Fixture validation tests
 *
 * Runs all pattern fixtures through their corresponding regex patterns
 * to verify that passes and fails behave as expected.
 */

import { describe, it, expect, beforeAll } from "vite-plus/test";
import { getAllFixtures } from "../fixtures/index.js";
import {
  ALPHA,
  ALPHA_LOWER,
  ALPHA_UPPER,
  DIGIT,
  DASH,
  DOUBLE_DASH,
  DOT,
  COLON,
  SPACE_TAB,
  BRACE_OPEN,
  BRACE_CLOSE,
  PAREN_OPEN,
  PAREN_CLOSE,
  CSS_IDENTIFIER,
  CSS_PROPERTY_NAME,
  CSS_FUNCTION,
  CSS_NUMBER,
  CSS_PERCENTAGE,
  CSS_DIMENSION,
  CSS_HASH_COLOR,
  CSS_KEYWORD,
  CSS_UNICODE_RANGE,
  CSSDOC_IDENTIFIER,
  CSSDOC_RECORD_NAME,
  CSSDOC_MODIFIER_SUFFIX,
  CSSDOC_MODIFIER_CHAINED,
  CSSDOC_MODIFIER_ATTRIBUTE,
  CSSDOC_TAG,
  CSSDOC_CUSTOM_PROPERTY,
  CSSDOC_STRUCTURE_CLASS,
  CSSDOC_CARDINALITY,
  CSSDOC_RECORD_TAG_PATTERN,
  CSSDOC_MODIFIER_TAG_PATTERN,
  CSSDOC_PART_TAG_PATTERN,
  CSSDOC_PROPERTY_TAG_PATTERN,
} from "@cssdoc/regex";

// Map pattern names to their actual regex objects
const patternMap: Record<string, any> = {
  // Tier 0
  ALPHA,
  ALPHA_LOWER,
  ALPHA_UPPER,
  DIGIT,
  DASH,
  DOUBLE_DASH,
  DOT,
  COLON,
  SPACE_TAB,
  BRACE_OPEN,
  BRACE_CLOSE,
  PAREN_OPEN,
  PAREN_CLOSE,
  // Tier 1
  CSS_IDENTIFIER,
  CSS_PROPERTY_NAME,
  CSS_FUNCTION,
  CSS_NUMBER,
  CSS_PERCENTAGE,
  CSS_DIMENSION,
  CSS_HASH_COLOR,
  CSS_KEYWORD,
  CSS_UNICODE_RANGE,
  // Tier 2
  CSSDOC_IDENTIFIER,
  CSSDOC_RECORD_NAME,
  CSSDOC_MODIFIER_SUFFIX,
  CSSDOC_MODIFIER_CHAINED,
  CSSDOC_MODIFIER_ATTRIBUTE,
  CSSDOC_TAG,
  CSSDOC_CUSTOM_PROPERTY,
  CSSDOC_STRUCTURE_CLASS,
  CSSDOC_CARDINALITY,
  CSSDOC_RECORD_TAG_PATTERN,
  CSSDOC_MODIFIER_TAG_PATTERN,
  CSSDOC_PART_TAG_PATTERN,
  CSSDOC_PROPERTY_TAG_PATTERN,
};

describe("Pattern Fixtures", () => {
  let allFixtures: any[] = [];

  beforeAll(async () => {
    allFixtures = await getAllFixtures();
  });

  it("loads all fixtures", () => {
    expect(allFixtures.length).toBeGreaterThan(0);
  });

  describe("pattern tests", () => {
    // We need to generate tests dynamically after fixtures are loaded
    // Using a workaround with a single test that verifies all patterns
    it("validates all fixture patterns", async () => {
      const allTestFixtures = await getAllFixtures();
      let testCount = 0;
      let passCount = 0;

      for (const fixtureArray of allTestFixtures) {
        for (const fixture of fixtureArray) {
          const pattern = patternMap[fixture.pattern];
          expect(pattern, `Pattern ${fixture.pattern} not exported`).toBeDefined();

          if (!pattern) continue;

          // Test passing cases
          for (const testCase of fixture.passes) {
            testCount++;
            const sourcePattern = pattern.source ? pattern.source : pattern.toString().slice(1, -1);
            const anchoredSource = `^${sourcePattern}$`;
            const regex = new RegExp(anchoredSource, pattern.flags || "u");
            const match = regex.exec(testCase.input);

            if (match) {
              passCount++;
              if (testCase.captures && match?.groups) {
                for (const [name, expectedValue] of Object.entries(testCase.captures)) {
                  const actualValue = match.groups?.[name];
                  if (actualValue !== expectedValue) {
                    console.error(
                      `DETAIL: ${fixture.pattern} input="${testCase.input}" group="${name}" expected="${String(expectedValue)}" actual="${String(actualValue)}"`,
                    );
                  }
                  expect(actualValue).toBe(expectedValue);
                }
              }
            } else {
              console.error(
                `FAIL: ${fixture.pattern} expected to match "${testCase.input}" but didn't`,
              );
            }
          }

          // Test failing cases
          for (const testCase of fixture.fails) {
            testCount++;
            const sourcePattern = pattern.source ? pattern.source : pattern.toString().slice(1, -1);
            const anchoredSource = `^${sourcePattern}$`;
            const regex = new RegExp(anchoredSource, pattern.flags || "u");
            const match = regex.exec(testCase.input);

            if (!match) {
              passCount++;
            } else {
              console.error(
                `FAIL_SHOULD_NOT_MATCH: ${fixture.pattern} "${testCase.input}" matched but shouldn't (reason: ${testCase.reason})`,
              );
            }
          }
        }
      }

      expect(passCount).toBe(testCount);
      console.log(`✓ All ${testCount} fixture tests passed`);
    });
  });
});
