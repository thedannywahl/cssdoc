/**
 * @cssdoc/regex/fixtures
 *
 * Test fixture types for validating regex patterns against expected inputs.
 *
 * Each pattern has a fixture array with passing and failing test cases.
 * Fixtures serve as executable documentation: they demonstrate exactly what each pattern matches.
 *
 * @module
 */

/**
 * A single test case that should match a pattern.
 */
export interface PassingCase {
  /** Input string that should match */
  input: string;

  /** Expected named capture groups and their values */
  captures?: Record<string, string | undefined>;

  /** If the pattern matches a substring, the expected full match (optional; defaults to input) */
  fullMatch?: string;
}

/**
 * A single test case that should NOT match a pattern.
 */
export interface FailingCase {
  /** Input string that should NOT match */
  input: string;

  /** Why this input should fail (documentation) */
  reason: string;
}

/**
 * A fixture for testing a single regex pattern.
 */
export interface PatternFixture {
  /** Pattern name from PATTERN_REGISTRY */
  pattern: string;

  /** Grammar rule this pattern implements (optional; for reference) */
  grammarRule?: string;

  /** Tier level (0-4) */
  tier: 0 | 1 | 2 | 3 | 4;

  /** Test cases that should match */
  passes: PassingCase[];

  /** Test cases that should NOT match */
  fails: FailingCase[];
}
