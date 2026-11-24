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
 * @example Use toRegExp with anchors for validation
 * ```typescript
 * import { RECORD_REFERENCE_NAME, toRegExp } from "@cssdoc/regex";
 *
 * // Match entire string from start to end
 * const validator = toRegExp(RECORD_REFERENCE_NAME, "start-end");
 * if (validator.test(value)) {
 *   console.log("Valid record reference name");
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
 * @example Access pattern sources for composition
 * ```typescript
 * // Pattern sources are exported with _SOURCE suffix for template composition:
 * import { TOKEN_IDENTIFIER_SOURCE, TOKEN_CUSTOM_PROPERTY_SOURCE } from "@cssdoc/regex";
 *
 * const composed = `(?<id>${TOKEN_IDENTIFIER_SOURCE})(?<prop>${TOKEN_CUSTOM_PROPERTY_SOURCE})`;
 * ```
 *
 * @example Access pattern metadata
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
export { toRegExp, type AnchorMode } from "./lib.js";

// Dynamic exports of all patterns as regex objects from PATTERN_DEFINITIONS
// This avoids duplication and ensures all patterns are always available
import { PATTERN_DEFINITIONS } from "./definitions.js";
import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";

// Helper to get regex for a pattern, creating one from source if needed (for Tier 0)
const getRegex = (name: keyof typeof PATTERN_DEFINITIONS): Regex => {
  const def = PATTERN_DEFINITIONS[name];
  if (def.regex) return def.regex;
  // For Tier 0 patterns, create a regex from the source using .as() for string parameters
  const flags = (def.flags || "") as "u" | "v" | "";
  return arkRegex.as(def.source, flags);
};

// Map all patterns from PATTERN_DEFINITIONS to individual exports
// Export both the regex object and the source string for each pattern

// Tier 0 - Character classes
export const ALPHA: Regex = getRegex("ALPHA");
export const ALPHA_SOURCE: string = PATTERN_DEFINITIONS.ALPHA.source;
export const ALPHA_LOWER: Regex = getRegex("ALPHA_LOWER");
export const ALPHA_LOWER_SOURCE: string = PATTERN_DEFINITIONS.ALPHA_LOWER.source;
export const ALPHA_UPPER: Regex = getRegex("ALPHA_UPPER");
export const ALPHA_UPPER_SOURCE: string = PATTERN_DEFINITIONS.ALPHA_UPPER.source;
export const ALPHANUMERIC: Regex = getRegex("ALPHANUMERIC");
export const ALPHANUMERIC_SOURCE: string = PATTERN_DEFINITIONS.ALPHANUMERIC.source;
export const ALPHANUMERIC_EXTENDED: Regex = getRegex("ALPHANUMERIC_EXTENDED");
export const ALPHANUMERIC_EXTENDED_SOURCE: string =
  PATTERN_DEFINITIONS.ALPHANUMERIC_EXTENDED.source;
export const DIGIT: Regex = getRegex("DIGIT");
export const DIGIT_SOURCE: string = PATTERN_DEFINITIONS.DIGIT.source;
export const DASH: Regex = getRegex("DASH");
export const DASH_SOURCE: string = PATTERN_DEFINITIONS.DASH.source;
export const DOUBLE_DASH: Regex = getRegex("DOUBLE_DASH");
export const DOUBLE_DASH_SOURCE: string = PATTERN_DEFINITIONS.DOUBLE_DASH.source;
export const DOT: Regex = getRegex("DOT");
export const DOT_SOURCE: string = PATTERN_DEFINITIONS.DOT.source;
export const FORWARD_SLASH: Regex = getRegex("FORWARD_SLASH");
export const FORWARD_SLASH_SOURCE: string = PATTERN_DEFINITIONS.FORWARD_SLASH.source;
export const ASTERISK: Regex = getRegex("ASTERISK");
export const ASTERISK_SOURCE: string = PATTERN_DEFINITIONS.ASTERISK.source;
export const HEX_DIGIT: Regex = getRegex("HEX_DIGIT");
export const HEX_DIGIT_SOURCE: string = PATTERN_DEFINITIONS.HEX_DIGIT.source;
export const HEX_DIGIT_OR_WILDCARD: Regex = getRegex("HEX_DIGIT_OR_WILDCARD");
export const HEX_DIGIT_OR_WILDCARD_SOURCE: string =
  PATTERN_DEFINITIONS.HEX_DIGIT_OR_WILDCARD.source;
export const SPACE_TAB: Regex = getRegex("SPACE_TAB");
export const SPACE_TAB_SOURCE: string = PATTERN_DEFINITIONS.SPACE_TAB.source;
export const WORD_BOUNDARY: Regex = getRegex("WORD_BOUNDARY");
export const WORD_BOUNDARY_SOURCE: string = PATTERN_DEFINITIONS.WORD_BOUNDARY.source;

// Tier 1 - CSS spec patterns
export const CSS_IDENTIFIER_START: Regex = getRegex("CSS_IDENTIFIER_START");
export const CSS_IDENTIFIER_START_SOURCE: string = PATTERN_DEFINITIONS.CSS_IDENTIFIER_START.source;
export const CSS_IDENTIFIER_CONT: Regex = getRegex("CSS_IDENTIFIER_CONT");
export const CSS_IDENTIFIER_CONT_SOURCE: string = PATTERN_DEFINITIONS.CSS_IDENTIFIER_CONT.source;
export const CSS_IDENTIFIER_CONT_NO_DASH: Regex =
  PATTERN_DEFINITIONS.CSS_IDENTIFIER_CONT_NO_DASH.regex;
export const CSS_IDENTIFIER_CONT_NO_DASH_SOURCE: string =
  PATTERN_DEFINITIONS.CSS_IDENTIFIER_CONT_NO_DASH.source;
export const CSS_IDENTIFIER_START_WITH_DASH: Regex =
  PATTERN_DEFINITIONS.CSS_IDENTIFIER_START_WITH_DASH.regex;
export const CSS_IDENTIFIER_START_WITH_DASH_SOURCE: string =
  PATTERN_DEFINITIONS.CSS_IDENTIFIER_START_WITH_DASH.source;
export const CSS_IDENTIFIER: Regex = getRegex("CSS_IDENTIFIER");
export const CSS_IDENTIFIER_SOURCE: string = PATTERN_DEFINITIONS.CSS_IDENTIFIER.source;
export const CSS_NAME: Regex = getRegex("CSS_NAME");
export const CSS_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSS_NAME.source;
export const CSS_NUMBER: Regex = getRegex("CSS_NUMBER");
export const CSS_NUMBER_SOURCE: string = PATTERN_DEFINITIONS.CSS_NUMBER.source;
export const CSS_PERCENTAGE: Regex = getRegex("CSS_PERCENTAGE");
export const CSS_PERCENTAGE_SOURCE: string = PATTERN_DEFINITIONS.CSS_PERCENTAGE.source;
export const CSS_DIMENSION: Regex = getRegex("CSS_DIMENSION");
export const CSS_DIMENSION_SOURCE: string = PATTERN_DEFINITIONS.CSS_DIMENSION.source;
export const CSS_HASH_COLOR: Regex = getRegex("CSS_HASH_COLOR");
export const CSS_HASH_COLOR_SOURCE: string = PATTERN_DEFINITIONS.CSS_HASH_COLOR.source;
export const CSS_FUNCTION: Regex = getRegex("CSS_FUNCTION");
export const CSS_FUNCTION_SOURCE: string = PATTERN_DEFINITIONS.CSS_FUNCTION.source;
export const CSS_KEYWORD: Regex = getRegex("CSS_KEYWORD");
export const CSS_KEYWORD_SOURCE: string = PATTERN_DEFINITIONS.CSS_KEYWORD.source;
export const CSS_UNICODE_RANGE: Regex = getRegex("CSS_UNICODE_RANGE");
export const CSS_UNICODE_RANGE_SOURCE: string = PATTERN_DEFINITIONS.CSS_UNICODE_RANGE.source;
export const CSS_PROPERTY_NAME: Regex = getRegex("CSS_PROPERTY_NAME");
export const CSS_PROPERTY_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSS_PROPERTY_NAME.source;
export const PSEUDO_SELECTOR_FUNCTIONAL: Regex =
  PATTERN_DEFINITIONS.PSEUDO_SELECTOR_FUNCTIONAL.regex;
export const PSEUDO_SELECTOR_FUNCTIONAL_SOURCE: string =
  PATTERN_DEFINITIONS.PSEUDO_SELECTOR_FUNCTIONAL.source;
export const HTML_ELEMENT_NAME: Regex = getRegex("HTML_ELEMENT_NAME");
export const HTML_ELEMENT_NAME_SOURCE: string = PATTERN_DEFINITIONS.HTML_ELEMENT_NAME.source;
export const RECORD_REFERENCE_NAME: Regex = getRegex("RECORD_REFERENCE_NAME");
export const RECORD_REFERENCE_NAME_SOURCE: string =
  PATTERN_DEFINITIONS.RECORD_REFERENCE_NAME.source;
export const COMMENT_START: Regex = getRegex("COMMENT_START");
export const COMMENT_START_SOURCE: string = PATTERN_DEFINITIONS.COMMENT_START.source;
export const COMMENT_LINE_MARKER: Regex = getRegex("COMMENT_LINE_MARKER");
export const COMMENT_LINE_MARKER_SOURCE: string = PATTERN_DEFINITIONS.COMMENT_LINE_MARKER.source;

// Tier 2-3 - CssDoc patterns
export const CSSDOC_TAG_NAME: Regex = getRegex("CSSDOC_TAG_NAME");
export const CSSDOC_TAG_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_TAG_NAME.source;
export const CSSDOC_SELECTOR: Regex = getRegex("CSSDOC_SELECTOR");
export const CSSDOC_SELECTOR_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_SELECTOR.source;
export const CSSDOC_MODIFIER_NAME: Regex = getRegex("CSSDOC_MODIFIER_NAME");
export const CSSDOC_MODIFIER_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_MODIFIER_NAME.source;
export const CSSDOC_MODIFIER_ATTRIBUTE: Regex = getRegex("CSSDOC_MODIFIER_ATTRIBUTE");
export const CSSDOC_MODIFIER_ATTRIBUTE_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_MODIFIER_ATTRIBUTE.source;
export const CSSDOC_PSEUDO_SELECTOR: Regex = getRegex("CSSDOC_PSEUDO_SELECTOR");
export const CSSDOC_PSEUDO_SELECTOR_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_PSEUDO_SELECTOR.source;
export const CSSDOC_CARDINALITY: Regex = getRegex("CSSDOC_CARDINALITY");
export const CSSDOC_CARDINALITY_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_CARDINALITY.source;
export const CSSDOC_COMPONENT_REF: Regex = getRegex("CSSDOC_COMPONENT_REF");
export const CSSDOC_COMPONENT_REF_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_COMPONENT_REF.source;
export const CSSDOC_PART_NAME: Regex = getRegex("CSSDOC_PART_NAME");
export const CSSDOC_PART_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_PART_NAME.source;
export const CSSDOC_CSSPROP_NAME: Regex = getRegex("CSSDOC_CSSPROP_NAME");
export const CSSDOC_CSSPROP_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_CSSPROP_NAME.source;
export const CSSDOC_CSSSTATE_NAME: Regex = getRegex("CSSDOC_CSSSTATE_NAME");
export const CSSDOC_CSSSTATE_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_CSSSTATE_NAME.source;
export const CSSDOC_VARIANT_NAME: Regex = getRegex("CSSDOC_VARIANT_NAME");
export const CSSDOC_VARIANT_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_VARIANT_NAME.source;
export const CSSDOC_SLOT_NAME: Regex = getRegex("CSSDOC_SLOT_NAME");
export const CSSDOC_SLOT_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_SLOT_NAME.source;
export const CSSDOC_EXAMPLE_LANG: Regex = getRegex("CSSDOC_EXAMPLE_LANG");
export const CSSDOC_EXAMPLE_LANG_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_EXAMPLE_LANG.source;

// Punctuation
export const COLON: Regex = getRegex("COLON");
export const COLON_SOURCE: string = PATTERN_DEFINITIONS.COLON.source;
export const AT_CHAR: string = PATTERN_DEFINITIONS.AT_CHAR.source;
export const AT: Regex = getRegex("AT");
export const AT_SOURCE: string = PATTERN_DEFINITIONS.AT.source;
export const PIPE_CHAR: string = PATTERN_DEFINITIONS.PIPE_CHAR.source;
export const PIPE: Regex = getRegex("PIPE");
export const PIPE_SOURCE: string = PATTERN_DEFINITIONS.PIPE.source;
export const PAREN_OPEN: Regex = getRegex("PAREN_OPEN");
export const PAREN_OPEN_SOURCE: string = PATTERN_DEFINITIONS.PAREN_OPEN.source;
export const PAREN_OPEN_CHAR: string = PATTERN_DEFINITIONS.PAREN_OPEN_CHAR.source;
export const PAREN_CLOSE: Regex = getRegex("PAREN_CLOSE");
export const PAREN_CLOSE_SOURCE: string = PATTERN_DEFINITIONS.PAREN_CLOSE.source;
export const PAREN_CLOSE_CHAR: string = PATTERN_DEFINITIONS.PAREN_CLOSE_CHAR.source;
export const BRACE_OPEN: Regex = getRegex("BRACE_OPEN");
export const BRACE_OPEN_SOURCE: string = PATTERN_DEFINITIONS.BRACE_OPEN.source;
export const BRACE_OPEN_CHAR: string = PATTERN_DEFINITIONS.BRACE_OPEN_CHAR.source;
export const BRACE_CLOSE: Regex = getRegex("BRACE_CLOSE");
export const BRACE_CLOSE_SOURCE: string = PATTERN_DEFINITIONS.BRACE_CLOSE.source;
export const BRACE_CLOSE_CHAR: string = PATTERN_DEFINITIONS.BRACE_CLOSE_CHAR.source;
export const BRACKET_OPEN: Regex = getRegex("BRACKET_OPEN");
export const BRACKET_OPEN_SOURCE: string = PATTERN_DEFINITIONS.BRACKET_OPEN.source;
export const BRACKET_OPEN_CHAR: string = PATTERN_DEFINITIONS.BRACKET_OPEN_CHAR.source;
export const BRACKET_CLOSE: Regex = getRegex("BRACKET_CLOSE");
export const BRACKET_CLOSE_SOURCE: string = PATTERN_DEFINITIONS.BRACKET_CLOSE.source;
export const BRACKET_CLOSE_CHAR: string = PATTERN_DEFINITIONS.BRACKET_CLOSE_CHAR.source;
export const QUOTE_SINGLE: Regex = getRegex("QUOTE_SINGLE");
export const QUOTE_SINGLE_SOURCE: string = PATTERN_DEFINITIONS.QUOTE_SINGLE.source;
export const QUOTE_SINGLE_CHAR: string = PATTERN_DEFINITIONS.QUOTE_SINGLE_CHAR.source;
export const QUOTE_DOUBLE: Regex = getRegex("QUOTE_DOUBLE");
export const QUOTE_DOUBLE_SOURCE: string = PATTERN_DEFINITIONS.QUOTE_DOUBLE.source;
export const QUOTE_DOUBLE_CHAR: string = PATTERN_DEFINITIONS.QUOTE_DOUBLE_CHAR.source;

// Tier 3-4 - Token patterns for syntax highlighting
export const TOKEN_WHITESPACE: Regex = getRegex("TOKEN_WHITESPACE");
export const TOKEN_WHITESPACE_SOURCE: string = PATTERN_DEFINITIONS.TOKEN_WHITESPACE.source;
export const TOKEN_IDENTIFIER: Regex = getRegex("TOKEN_IDENTIFIER");
export const TOKEN_IDENTIFIER_SOURCE: string = PATTERN_DEFINITIONS.TOKEN_IDENTIFIER.source;
export const TOKEN_QUALIFIED_IDENTIFIER: Regex =
  PATTERN_DEFINITIONS.TOKEN_QUALIFIED_IDENTIFIER.regex;
export const TOKEN_QUALIFIED_IDENTIFIER_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_QUALIFIED_IDENTIFIER.source;
export const TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL: Regex =
  PATTERN_DEFINITIONS.TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL.regex;
export const TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL.source;
export const TOKEN_MODIFIER_NAME: Regex = getRegex("TOKEN_MODIFIER_NAME");
export const TOKEN_MODIFIER_NAME_SOURCE: string = PATTERN_DEFINITIONS.TOKEN_MODIFIER_NAME.source;
export const TOKEN_MODIFIER_NAME_OPTIONAL: Regex =
  PATTERN_DEFINITIONS.TOKEN_MODIFIER_NAME_OPTIONAL.regex;
export const TOKEN_MODIFIER_NAME_OPTIONAL_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_MODIFIER_NAME_OPTIONAL.source;
export const TOKEN_CLASS_SELECTOR: Regex = getRegex("TOKEN_CLASS_SELECTOR");
export const TOKEN_CLASS_SELECTOR_SOURCE: string = PATTERN_DEFINITIONS.TOKEN_CLASS_SELECTOR.source;
export const TOKEN_CLASS_SELECTOR_REQUIRED_DOT: Regex =
  PATTERN_DEFINITIONS.TOKEN_CLASS_SELECTOR_REQUIRED_DOT.regex;
export const TOKEN_CLASS_SELECTOR_REQUIRED_DOT_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_CLASS_SELECTOR_REQUIRED_DOT.source;
export const TOKEN_CLASS_SELECTOR_OPTIONAL: Regex =
  PATTERN_DEFINITIONS.TOKEN_CLASS_SELECTOR_OPTIONAL.regex;
export const TOKEN_CLASS_SELECTOR_OPTIONAL_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_CLASS_SELECTOR_OPTIONAL.source;
export const TOKEN_CUSTOM_PROPERTY: Regex = getRegex("TOKEN_CUSTOM_PROPERTY");
export const TOKEN_CUSTOM_PROPERTY_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_CUSTOM_PROPERTY.source;
export const TOKEN_CUSTOM_PROPERTY_OPTIONAL: Regex =
  PATTERN_DEFINITIONS.TOKEN_CUSTOM_PROPERTY_OPTIONAL.regex;
export const TOKEN_CUSTOM_PROPERTY_OPTIONAL_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_CUSTOM_PROPERTY_OPTIONAL.source;
export const TOKEN_REF_NUMBER: Regex = getRegex("TOKEN_REF_NUMBER");
export const TOKEN_REF_NUMBER_SOURCE: string = PATTERN_DEFINITIONS.TOKEN_REF_NUMBER.source;
export const TOKEN_REF_NUMBER_OPTIONAL: Regex = getRegex("TOKEN_REF_NUMBER_OPTIONAL");
export const TOKEN_REF_NUMBER_OPTIONAL_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_REF_NUMBER_OPTIONAL.source;
export const TOKEN_PSEUDO_CLASS: Regex = getRegex("TOKEN_PSEUDO_CLASS");
export const TOKEN_PSEUDO_CLASS_SOURCE: string = PATTERN_DEFINITIONS.TOKEN_PSEUDO_CLASS.source;
export const TOKEN_PSEUDO_CLASS_OPTIONAL: Regex =
  PATTERN_DEFINITIONS.TOKEN_PSEUDO_CLASS_OPTIONAL.regex;
export const TOKEN_PSEUDO_CLASS_OPTIONAL_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_PSEUDO_CLASS_OPTIONAL.source;
export const TOKEN_INLINE_CONTENT: Regex = getRegex("TOKEN_INLINE_CONTENT");
export const TOKEN_INLINE_CONTENT_SOURCE: string = PATTERN_DEFINITIONS.TOKEN_INLINE_CONTENT.source;
export const CSSDOC_STRUCTURE_TAG_KEYWORD: Regex = getRegex("CSSDOC_STRUCTURE_TAG_KEYWORD");
export const CSSDOC_STRUCTURE_TAG_KEYWORD_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_STRUCTURE_TAG_KEYWORD.source;
export const CSSDOC_ANY_TAG_KEYWORD: Regex = getRegex("CSSDOC_ANY_TAG_KEYWORD");
export const CSSDOC_ANY_TAG_KEYWORD_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_ANY_TAG_KEYWORD.source;
export const TAG_NAME_PLACEHOLDER: Regex = getRegex("TAG_NAME_PLACEHOLDER");
export const TAG_NAME_PLACEHOLDER_SOURCE: string = PATTERN_DEFINITIONS.TAG_NAME_PLACEHOLDER.source;
export const CSSDOC_STRUCTURE_TAG: Regex = getRegex("CSSDOC_STRUCTURE_TAG");
export const CSSDOC_STRUCTURE_TAG_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_STRUCTURE_TAG.source;
export const CSSDOC_DEMO_URL: Regex = getRegex("CSSDOC_DEMO_URL");
export const CSSDOC_DEMO_URL_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_DEMO_URL.source;

// CodeMirror / TextMate tokenizer patterns
export const TOKENIZER_INLINE_TAG: Regex = getRegex("TOKENIZER_INLINE_TAG");
export const TOKENIZER_INLINE_TAG_SOURCE: string = PATTERN_DEFINITIONS.TOKENIZER_INLINE_TAG.source;
export const TOKENIZER_RECORD_TAG: Regex = getRegex("TOKENIZER_RECORD_TAG");
export const TOKENIZER_RECORD_TAG_SOURCE: string = PATTERN_DEFINITIONS.TOKENIZER_RECORD_TAG.source;
export const TOKENIZER_MODIFIER_TAG: Regex = getRegex("TOKENIZER_MODIFIER_TAG");
export const TOKENIZER_MODIFIER_TAG_SOURCE: string =
  PATTERN_DEFINITIONS.TOKENIZER_MODIFIER_TAG.source;
export const TOKENIZER_PART_TAG: Regex = getRegex("TOKENIZER_PART_TAG");
export const TOKENIZER_PART_TAG_SOURCE: string = PATTERN_DEFINITIONS.TOKENIZER_PART_TAG.source;
export const TOKENIZER_PROPERTY_TAG: Regex = getRegex("TOKENIZER_PROPERTY_TAG");
export const TOKENIZER_PROPERTY_TAG_SOURCE: string =
  PATTERN_DEFINITIONS.TOKENIZER_PROPERTY_TAG.source;
export const TOKENIZER_REF_TAG: Regex = getRegex("TOKENIZER_REF_TAG");
export const TOKENIZER_REF_TAG_SOURCE: string = PATTERN_DEFINITIONS.TOKENIZER_REF_TAG.source;

// Structure custom-media patterns
export const STRUCTURE_RECORD_KIND: Regex = getRegex("STRUCTURE_RECORD_KIND");
export const STRUCTURE_RECORD_KIND_SOURCE: string =
  PATTERN_DEFINITIONS.STRUCTURE_RECORD_KIND.source;
export const TYPED_STRUCTURE_MEDIA: Regex = getRegex("TYPED_STRUCTURE_MEDIA");
export const TYPED_STRUCTURE_MEDIA_SOURCE: string =
  PATTERN_DEFINITIONS.TYPED_STRUCTURE_MEDIA.source;
export const UNTYPED_STRUCTURE_MEDIA: Regex = getRegex("UNTYPED_STRUCTURE_MEDIA");
export const UNTYPED_STRUCTURE_MEDIA_SOURCE: string =
  PATTERN_DEFINITIONS.UNTYPED_STRUCTURE_MEDIA.source;
