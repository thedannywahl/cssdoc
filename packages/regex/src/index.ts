/**
 * @cssdoc/regex
 *
 * Framework-agnostic regex patterns for CSS and CssDoc.
 * All patterns are defined in definitions.ts with metadata, capture types, and fixtures.
 *
 * @see {@link https://github.com/thedannywahl/cssdoc/blob/main/packages/regex/src/definitions.ts}
 * @module
 *
 * @example Access a pattern and use its regex
 * ```typescript
 * import { PATTERN_DEFINITIONS } from "@cssdoc/regex";
 *
 * const pattern = PATTERN_DEFINITIONS.CSS_IDENTIFIER;
 * console.log(pattern.regex.test("my-id"));     // true (ArkRegex object)
 * console.log(pattern.source);                   // "[A-Za-z_\\-]..." (string for composition)
 * ```
 *
 * @example Use toRegExp utility for matchAll
 * ```typescript
 * import { PATTERN_DEFINITIONS, toRegExp } from "@cssdoc/regex";
 *
 * const pattern = toRegExp(PATTERN_DEFINITIONS.CSS_IDENTIFIER.regex);
 * for (const match of text.matchAll(pattern)) {
 *   console.log(match[0]);
 * }
 * ```
 *
 * @example Import regex objects by name
 * ```typescript
 * // All patterns from PATTERN_DEFINITIONS are exported as individual regex objects:
 * import { ALPHA, DIGIT, SPACE_TAB, CSS_IDENTIFIER, TOKEN_IDENTIFIER } from "@cssdoc/regex";
 *
 * // Use them directly for testing
 * console.log(ALPHA.test("a"));           // true
 * console.log(DIGIT.test("5"));           // true
 * console.log(CSS_IDENTIFIER.test("my-class")); // true
 * ```
 *
 * @example Access pattern metadata and sources
 * ```typescript
 * import { PATTERN_DEFINITIONS } from "@cssdoc/regex";
 *
 * const def = PATTERN_DEFINITIONS.CSS_IDENTIFIER;
 * console.log(def.source);                // "[A-Za-z_\\-]..." string for composition
 * console.log(def.description);           // Human-readable description
 * console.log(def.fixtures.passes);       // Test cases that should match
 * console.log(def.fixtures.fails);        // Test cases that should not match
 * ```
 */

export { PATTERN_DEFINITIONS, type UnifiedPatternDef } from "./definitions.js";
export { toRegExp } from "./lib.js";

// Dynamic exports of all patterns as regex objects from PATTERN_DEFINITIONS
// This avoids duplication and ensures all patterns are always available
import { PATTERN_DEFINITIONS } from "./definitions.js";
import type { Regex } from "arkregex";

// Map all patterns from PATTERN_DEFINITIONS to individual exports
export const ALPHA: Regex = PATTERN_DEFINITIONS.ALPHA.regex;
export const ALPHA_LOWER: Regex = PATTERN_DEFINITIONS.ALPHA_LOWER.regex;
export const ALPHA_UPPER: Regex = PATTERN_DEFINITIONS.ALPHA_UPPER.regex;
export const ALPHANUMERIC: Regex = PATTERN_DEFINITIONS.ALPHANUMERIC.regex;
export const ALPHANUMERIC_EXTENDED: Regex = PATTERN_DEFINITIONS.ALPHANUMERIC_EXTENDED.regex;
export const DIGIT: Regex = PATTERN_DEFINITIONS.DIGIT.regex;
export const DASH: Regex = PATTERN_DEFINITIONS.DASH.regex;
export const DOUBLE_DASH: Regex = PATTERN_DEFINITIONS.DOUBLE_DASH.regex;
export const DOT: Regex = PATTERN_DEFINITIONS.DOT.regex;
export const HEX_DIGIT: Regex = PATTERN_DEFINITIONS.HEX_DIGIT.regex;
export const HEX_DIGIT_OR_WILDCARD: Regex = PATTERN_DEFINITIONS.HEX_DIGIT_OR_WILDCARD.regex;
export const SPACE_TAB: Regex = PATTERN_DEFINITIONS.SPACE_TAB.regex;
export const WORD_BOUNDARY: Regex = PATTERN_DEFINITIONS.WORD_BOUNDARY.regex;
export const CSS_IDENTIFIER_START: Regex = PATTERN_DEFINITIONS.CSS_IDENTIFIER_START.regex;
export const CSS_IDENTIFIER_CONT: Regex = PATTERN_DEFINITIONS.CSS_IDENTIFIER_CONT.regex;
export const CSS_IDENTIFIER_CONT_NO_DASH: Regex =
  PATTERN_DEFINITIONS.CSS_IDENTIFIER_CONT_NO_DASH.regex;
export const CSS_IDENTIFIER_START_WITH_DASH: Regex =
  PATTERN_DEFINITIONS.CSS_IDENTIFIER_START_WITH_DASH.regex;
export const CSS_IDENTIFIER: Regex = PATTERN_DEFINITIONS.CSS_IDENTIFIER.regex;
export const CSS_NAME: Regex = PATTERN_DEFINITIONS.CSS_NAME.regex;
export const CSS_NUMBER: Regex = PATTERN_DEFINITIONS.CSS_NUMBER.regex;
export const CSS_PERCENTAGE: Regex = PATTERN_DEFINITIONS.CSS_PERCENTAGE.regex;
export const CSS_DIMENSION: Regex = PATTERN_DEFINITIONS.CSS_DIMENSION.regex;
export const CSS_HASH_COLOR: Regex = PATTERN_DEFINITIONS.CSS_HASH_COLOR.regex;
export const CSS_FUNCTION: Regex = PATTERN_DEFINITIONS.CSS_FUNCTION.regex;
export const CSS_KEYWORD: Regex = PATTERN_DEFINITIONS.CSS_KEYWORD.regex;
export const CSS_UNICODE_RANGE: Regex = PATTERN_DEFINITIONS.CSS_UNICODE_RANGE.regex;
export const CSS_PROPERTY_NAME: Regex = PATTERN_DEFINITIONS.CSS_PROPERTY_NAME.regex;
export const CSSDOC_TAG_NAME: Regex = PATTERN_DEFINITIONS.CSSDOC_TAG_NAME.regex;
export const CSSDOC_SELECTOR: Regex = PATTERN_DEFINITIONS.CSSDOC_SELECTOR.regex;
export const CSSDOC_MODIFIER_NAME: Regex = PATTERN_DEFINITIONS.CSSDOC_MODIFIER_NAME.regex;
export const CSSDOC_MODIFIER_ATTRIBUTE: Regex = PATTERN_DEFINITIONS.CSSDOC_MODIFIER_ATTRIBUTE.regex;
export const CSSDOC_PSEUDO_SELECTOR: Regex = PATTERN_DEFINITIONS.CSSDOC_PSEUDO_SELECTOR.regex;
export const CSSDOC_CARDINALITY: Regex = PATTERN_DEFINITIONS.CSSDOC_CARDINALITY.regex;
export const CSSDOC_COMPONENT_REF: Regex = PATTERN_DEFINITIONS.CSSDOC_COMPONENT_REF.regex;
export const CSSDOC_PART_NAME: Regex = PATTERN_DEFINITIONS.CSSDOC_PART_NAME.regex;
export const CSSDOC_CSSPROP_NAME: Regex = PATTERN_DEFINITIONS.CSSDOC_CSSPROP_NAME.regex;
export const CSSDOC_CSSSTATE_NAME: Regex = PATTERN_DEFINITIONS.CSSDOC_CSSSTATE_NAME.regex;
export const CSSDOC_VARIANT_NAME: Regex = PATTERN_DEFINITIONS.CSSDOC_VARIANT_NAME.regex;
export const CSSDOC_SLOT_NAME: Regex = PATTERN_DEFINITIONS.CSSDOC_SLOT_NAME.regex;
export const CSSDOC_EXAMPLE_LANG: Regex = PATTERN_DEFINITIONS.CSSDOC_EXAMPLE_LANG.regex;
export const COLON: Regex = PATTERN_DEFINITIONS.COLON.regex;
export const PAREN_OPEN: Regex = PATTERN_DEFINITIONS.PAREN_OPEN.regex;
export const PAREN_CLOSE: Regex = PATTERN_DEFINITIONS.PAREN_CLOSE.regex;
export const TOKEN_WHITESPACE: Regex = PATTERN_DEFINITIONS.TOKEN_WHITESPACE.regex;
export const TOKEN_IDENTIFIER: Regex = PATTERN_DEFINITIONS.TOKEN_IDENTIFIER.regex;
export const TOKEN_QUALIFIED_IDENTIFIER: Regex =
  PATTERN_DEFINITIONS.TOKEN_QUALIFIED_IDENTIFIER.regex;
export const TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL: Regex =
  PATTERN_DEFINITIONS.TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL.regex;
export const TOKEN_MODIFIER_NAME: Regex = PATTERN_DEFINITIONS.TOKEN_MODIFIER_NAME.regex;
export const TOKEN_MODIFIER_NAME_OPTIONAL: Regex =
  PATTERN_DEFINITIONS.TOKEN_MODIFIER_NAME_OPTIONAL.regex;
export const TOKEN_CLASS_SELECTOR: Regex = PATTERN_DEFINITIONS.TOKEN_CLASS_SELECTOR.regex;
export const TOKEN_CLASS_SELECTOR_OPTIONAL: Regex =
  PATTERN_DEFINITIONS.TOKEN_CLASS_SELECTOR_OPTIONAL.regex;
export const TOKEN_CUSTOM_PROPERTY: Regex = PATTERN_DEFINITIONS.TOKEN_CUSTOM_PROPERTY.regex;
export const TOKEN_CUSTOM_PROPERTY_OPTIONAL: Regex =
  PATTERN_DEFINITIONS.TOKEN_CUSTOM_PROPERTY_OPTIONAL.regex;
export const TOKEN_REF_NUMBER: Regex = PATTERN_DEFINITIONS.TOKEN_REF_NUMBER.regex;
export const TOKEN_REF_NUMBER_OPTIONAL: Regex = PATTERN_DEFINITIONS.TOKEN_REF_NUMBER_OPTIONAL.regex;
export const TOKEN_PSEUDO_CLASS: Regex = PATTERN_DEFINITIONS.TOKEN_PSEUDO_CLASS.regex;
export const TOKEN_PSEUDO_CLASS_OPTIONAL: Regex =
  PATTERN_DEFINITIONS.TOKEN_PSEUDO_CLASS_OPTIONAL.regex;
export const TOKEN_INLINE_CONTENT: Regex = PATTERN_DEFINITIONS.TOKEN_INLINE_CONTENT.regex;
export const CSSDOC_STRUCTURE_TAG: Regex = PATTERN_DEFINITIONS.CSSDOC_STRUCTURE_TAG.regex;
export const CSSDOC_DEMO_URL: Regex = PATTERN_DEFINITIONS.CSSDOC_DEMO_URL.regex;
