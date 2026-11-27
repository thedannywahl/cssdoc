/**
 * \@cssdoc/regex
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
 * const pattern = toRegExp(compileRegex(PATTERN_DEFINITIONS.CSS_IDENTIFIER));
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
import type { Regex } from "arkregex";

import { PATTERN_DEFINITIONS } from "./definitions.js";
import { compileRegex } from "./lib.js";

export { PATTERN_DEFINITIONS, type UnifiedPatternDef } from "./definitions.js";
export { toRegExp, type AnchorMode, compileRegex, escapeRegex, escapeRegexChar } from "./lib.js";

// Dynamic exports of all patterns as regex objects from PATTERN_DEFINITIONS
// This avoids duplication and ensures all patterns are always available
// Map all patterns from PATTERN_DEFINITIONS to individual exports
// Export both the regex object and the source string for each pattern

// Tier 0 - Character classes
export { CARRIAGE_RETURN_CHAR, LINE_FEED_CHAR } from "./definitions/tier-0-primitives.ts";
/** Compiled pattern: Carriage return character. */
export const CARRIAGE_RETURN: Regex = compileRegex(PATTERN_DEFINITIONS.CARRIAGE_RETURN);
/** Regex source for {@link CARRIAGE_RETURN}. */
export const CARRIAGE_RETURN_SOURCE: string = PATTERN_DEFINITIONS.CARRIAGE_RETURN.source;
/** Compiled pattern: Line feed character. */
export const LINE_FEED: Regex = compileRegex(PATTERN_DEFINITIONS.LINE_FEED);
/** Regex source for {@link LINE_FEED}. */
export const LINE_FEED_SOURCE: string = PATTERN_DEFINITIONS.LINE_FEED.source;
/** Compiled pattern: A character with special meaning in a regular expression. */
export const REGEX_METACHARACTER: Regex = compileRegex(PATTERN_DEFINITIONS.REGEX_METACHARACTER);
/** Regex source for {@link REGEX_METACHARACTER}. */
export const REGEX_METACHARACTER_SOURCE: string = PATTERN_DEFINITIONS.REGEX_METACHARACTER.source;
/** Compiled pattern: Alphabetic character (ASCII letters). */
export const ALPHA: Regex = compileRegex(PATTERN_DEFINITIONS.ALPHA);
/** Regex source for {@link ALPHA}. */
export const ALPHA_SOURCE: string = PATTERN_DEFINITIONS.ALPHA.source;
/** Compiled pattern: Lowercase alphabetic character. */
export const ALPHA_LOWER: Regex = compileRegex(PATTERN_DEFINITIONS.ALPHA_LOWER);
/** Regex source for {@link ALPHA_LOWER}. */
export const ALPHA_LOWER_SOURCE: string = PATTERN_DEFINITIONS.ALPHA_LOWER.source;
/** Compiled pattern: Uppercase alphabetic character. */
export const ALPHA_UPPER: Regex = compileRegex(PATTERN_DEFINITIONS.ALPHA_UPPER);
/** Regex source for {@link ALPHA_UPPER}. */
export const ALPHA_UPPER_SOURCE: string = PATTERN_DEFINITIONS.ALPHA_UPPER.source;
/** Compiled pattern: Alphanumeric character (letter or digit). */
export const ALPHANUMERIC: Regex = compileRegex(PATTERN_DEFINITIONS.ALPHANUMERIC);
/** Regex source for {@link ALPHANUMERIC}. */
export const ALPHANUMERIC_SOURCE: string = PATTERN_DEFINITIONS.ALPHANUMERIC.source;
/** Compiled pattern: Alphanumeric with underscore and hyphen. */
export const ALPHANUMERIC_EXTENDED: Regex = compileRegex(PATTERN_DEFINITIONS.ALPHANUMERIC_EXTENDED);
/** Regex source for {@link ALPHANUMERIC_EXTENDED}. */
export const ALPHANUMERIC_EXTENDED_SOURCE: string =
  PATTERN_DEFINITIONS.ALPHANUMERIC_EXTENDED.source;
/** Compiled pattern: Single digit. */
export const DIGIT: Regex = compileRegex(PATTERN_DEFINITIONS.DIGIT);
/** Regex source for {@link DIGIT}. */
export const DIGIT_SOURCE: string = PATTERN_DEFINITIONS.DIGIT.source;
/** Compiled pattern: Hyphen-minus character. */
export const DASH: Regex = compileRegex(PATTERN_DEFINITIONS.DASH);
/** Regex source for {@link DASH}. */
export const DASH_SOURCE: string = PATTERN_DEFINITIONS.DASH.source;
/** Compiled pattern: Double hyphen. */
export const DOUBLE_DASH: Regex = compileRegex(PATTERN_DEFINITIONS.DOUBLE_DASH);
/** Regex source for {@link DOUBLE_DASH}. */
export const DOUBLE_DASH_SOURCE: string = PATTERN_DEFINITIONS.DOUBLE_DASH.source;
/** Pattern source: Underscore character (literal). */
export const UNDERSCORE_CHAR: string = PATTERN_DEFINITIONS.UNDERSCORE_CHAR.source;
/** Pattern source: Forward slash character (literal). */
export const FORWARD_SLASH_CHAR: string = PATTERN_DEFINITIONS.FORWARD_SLASH_CHAR.source;
/** Pattern source: CSS doc-comment opener as literal text. */
export const DOC_COMMENT_START_TEXT: string = PATTERN_DEFINITIONS.DOC_COMMENT_START_TEXT.source;
/** Pattern source: CSS block comment closer as literal text. */
export const COMMENT_END_TEXT: string = PATTERN_DEFINITIONS.COMMENT_END_TEXT.source;
/** Compiled pattern: Forward slash punctuation. */
export const FORWARD_SLASH: Regex = compileRegex(PATTERN_DEFINITIONS.FORWARD_SLASH);
/** Regex source for {@link FORWARD_SLASH}. */
export const FORWARD_SLASH_SOURCE: string = PATTERN_DEFINITIONS.FORWARD_SLASH.source;
/** Compiled pattern: Asterisk punctuation. */
export const ASTERISK: Regex = compileRegex(PATTERN_DEFINITIONS.ASTERISK);
/** Regex source for {@link ASTERISK}. */
export const ASTERISK_SOURCE: string = PATTERN_DEFINITIONS.ASTERISK.source;
/** Pattern source: Asterisk character (literal). */
export const ASTERISK_CHAR: string = PATTERN_DEFINITIONS.ASTERISK_CHAR.source;
/** Pattern source: Caret character (literal). */
export const CARET_CHAR: string = PATTERN_DEFINITIONS.CARET_CHAR.source;
/** Pattern source: Dollar sign character (literal). */
export const DOLLAR_CHAR: string = PATTERN_DEFINITIONS.DOLLAR_CHAR.source;
/** Pattern source: Tilde character (literal). */
export const TILDE_CHAR: string = PATTERN_DEFINITIONS.TILDE_CHAR.source;
/** Pattern source: Ampersand character (literal). */
export const AMPERSAND_CHAR: string = PATTERN_DEFINITIONS.AMPERSAND_CHAR.source;
/** Compiled pattern: Hexadecimal digit. */
export const HEX_DIGIT: Regex = compileRegex(PATTERN_DEFINITIONS.HEX_DIGIT);
/** Regex source for {@link HEX_DIGIT}. */
export const HEX_DIGIT_SOURCE: string = PATTERN_DEFINITIONS.HEX_DIGIT.source;
/** Compiled pattern: Hexadecimal digit or wildcard. */
export const HEX_DIGIT_OR_WILDCARD: Regex = compileRegex(PATTERN_DEFINITIONS.HEX_DIGIT_OR_WILDCARD);
/** Regex source for {@link HEX_DIGIT_OR_WILDCARD}. */
export const HEX_DIGIT_OR_WILDCARD_SOURCE: string =
  PATTERN_DEFINITIONS.HEX_DIGIT_OR_WILDCARD.source;
/** Compiled pattern: Space or tab whitespace. */
export const SPACE_TAB: Regex = compileRegex(PATTERN_DEFINITIONS.SPACE_TAB);
/** Regex source for {@link SPACE_TAB}. */
export const SPACE_TAB_SOURCE: string = PATTERN_DEFINITIONS.SPACE_TAB.source;
/** Compiled pattern: Zero-width word boundary. */
export const WORD_BOUNDARY: Regex = compileRegex(PATTERN_DEFINITIONS.WORD_BOUNDARY);
/** Regex source for {@link WORD_BOUNDARY}. */
export const WORD_BOUNDARY_SOURCE: string = PATTERN_DEFINITIONS.WORD_BOUNDARY.source;

// Tier 1 - CSS spec patterns
/** Compiled pattern: CRLF, CR, or LF line ending. */
export const LINE_ENDING: Regex = compileRegex(PATTERN_DEFINITIONS.LINE_ENDING);
/** Regex source for {@link LINE_ENDING}. */
export const LINE_ENDING_SOURCE: string = PATTERN_DEFINITIONS.LINE_ENDING.source;
/** Compiled pattern: Lowercase ASCII filename extension, capturing the extension without the dot. */
export const FILE_EXTENSION: Regex = compileRegex(PATTERN_DEFINITIONS.FILE_EXTENSION);
/** Regex source for {@link FILE_EXTENSION}. */
export const FILE_EXTENSION_SOURCE: string = PATTERN_DEFINITIONS.FILE_EXTENSION.source;
/** Compiled pattern: CSS identifier start. */
export const CSS_IDENTIFIER_START: Regex = compileRegex(PATTERN_DEFINITIONS.CSS_IDENTIFIER_START);
/** Regex source for {@link CSS_IDENTIFIER_START}. */
export const CSS_IDENTIFIER_START_SOURCE: string = PATTERN_DEFINITIONS.CSS_IDENTIFIER_START.source;
/** Compiled pattern: CSS identifier continuation. */
export const CSS_IDENTIFIER_CONT: Regex = compileRegex(PATTERN_DEFINITIONS.CSS_IDENTIFIER_CONT);
/** Regex source for {@link CSS_IDENTIFIER_CONT}. */
export const CSS_IDENTIFIER_CONT_SOURCE: string = PATTERN_DEFINITIONS.CSS_IDENTIFIER_CONT.source;
/** Compiled pattern: CSS identifier continuation (no dash). */
export const CSS_IDENTIFIER_CONT_NO_DASH: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSS_IDENTIFIER_CONT_NO_DASH,
);
/** Regex source for {@link CSS_IDENTIFIER_CONT_NO_DASH}. */
export const CSS_IDENTIFIER_CONT_NO_DASH_SOURCE: string =
  PATTERN_DEFINITIONS.CSS_IDENTIFIER_CONT_NO_DASH.source;
/** Compiled pattern: CSS identifier start (with dash). */
export const CSS_IDENTIFIER_START_WITH_DASH: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSS_IDENTIFIER_START_WITH_DASH,
);
/** Regex source for {@link CSS_IDENTIFIER_START_WITH_DASH}. */
export const CSS_IDENTIFIER_START_WITH_DASH_SOURCE: string =
  PATTERN_DEFINITIONS.CSS_IDENTIFIER_START_WITH_DASH.source;
/** Compiled pattern: CSS identifier. */
export const CSS_IDENTIFIER: Regex = compileRegex(PATTERN_DEFINITIONS.CSS_IDENTIFIER);
/** Regex source for {@link CSS_IDENTIFIER}. */
export const CSS_IDENTIFIER_SOURCE: string = PATTERN_DEFINITIONS.CSS_IDENTIFIER.source;
/** Compiled pattern: CSS name. */
export const CSS_NAME: Regex = compileRegex(PATTERN_DEFINITIONS.CSS_NAME);
/** Regex source for {@link CSS_NAME}. */
export const CSS_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSS_NAME.source;
/** Compiled pattern: CSS number. */
export const CSS_NUMBER: Regex = compileRegex(PATTERN_DEFINITIONS.CSS_NUMBER);
/** Regex source for {@link CSS_NUMBER}. */
export const CSS_NUMBER_SOURCE: string = PATTERN_DEFINITIONS.CSS_NUMBER.source;
/** Compiled pattern: CSS percentage. */
export const CSS_PERCENTAGE: Regex = compileRegex(PATTERN_DEFINITIONS.CSS_PERCENTAGE);
/** Regex source for {@link CSS_PERCENTAGE}. */
export const CSS_PERCENTAGE_SOURCE: string = PATTERN_DEFINITIONS.CSS_PERCENTAGE.source;
/** Compiled pattern: CSS dimension. */
export const CSS_DIMENSION: Regex = compileRegex(PATTERN_DEFINITIONS.CSS_DIMENSION);
/** Regex source for {@link CSS_DIMENSION}. */
export const CSS_DIMENSION_SOURCE: string = PATTERN_DEFINITIONS.CSS_DIMENSION.source;
/** Compiled pattern: CSS hex color. */
export const CSS_HASH_COLOR: Regex = compileRegex(PATTERN_DEFINITIONS.CSS_HASH_COLOR);
/** Regex source for {@link CSS_HASH_COLOR}. */
export const CSS_HASH_COLOR_SOURCE: string = PATTERN_DEFINITIONS.CSS_HASH_COLOR.source;
/** Compiled pattern: CSS function call. */
export const CSS_FUNCTION: Regex = compileRegex(PATTERN_DEFINITIONS.CSS_FUNCTION);
/** Regex source for {@link CSS_FUNCTION}. */
export const CSS_FUNCTION_SOURCE: string = PATTERN_DEFINITIONS.CSS_FUNCTION.source;
/** Compiled pattern: CSS reserved keyword. */
export const CSS_KEYWORD: Regex = compileRegex(PATTERN_DEFINITIONS.CSS_KEYWORD);
/** Regex source for {@link CSS_KEYWORD}. */
export const CSS_KEYWORD_SOURCE: string = PATTERN_DEFINITIONS.CSS_KEYWORD.source;
/** Compiled pattern: CSS Unicode range. */
export const CSS_UNICODE_RANGE: Regex = compileRegex(PATTERN_DEFINITIONS.CSS_UNICODE_RANGE);
/** Regex source for {@link CSS_UNICODE_RANGE}. */
export const CSS_UNICODE_RANGE_SOURCE: string = PATTERN_DEFINITIONS.CSS_UNICODE_RANGE.source;
/** Compiled pattern: CSS property or custom property name. */
export const CSS_PROPERTY_NAME: Regex = compileRegex(PATTERN_DEFINITIONS.CSS_PROPERTY_NAME);
/** Regex source for {@link CSS_PROPERTY_NAME}. */
export const CSS_PROPERTY_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSS_PROPERTY_NAME.source;
/** Compiled pattern: Pseudo-selector with arguments like :is(), :has(), :not(). */
export const PSEUDO_SELECTOR_FUNCTIONAL: Regex = compileRegex(
  PATTERN_DEFINITIONS.PSEUDO_SELECTOR_FUNCTIONAL,
);
/** Regex source for {@link PSEUDO_SELECTOR_FUNCTIONAL}. */
export const PSEUDO_SELECTOR_FUNCTIONAL_SOURCE: string =
  PATTERN_DEFINITIONS.PSEUDO_SELECTOR_FUNCTIONAL.source;
/** Compiled pattern: Built-in-style or custom-element-shaped name, without validating membership. */
export const HTML_ELEMENT_NAME: Regex = compileRegex(PATTERN_DEFINITIONS.HTML_ELEMENT_NAME);
/** Regex source for {@link HTML_ELEMENT_NAME}. */
export const HTML_ELEMENT_NAME_SOURCE: string = PATTERN_DEFINITIONS.HTML_ELEMENT_NAME.source;
/** Compiled pattern: Lowercase ASCII built-in-style element name shape, without validating membership. */
export const HTML_STANDARD_ELEMENT_NAME: Regex = compileRegex(
  PATTERN_DEFINITIONS.HTML_STANDARD_ELEMENT_NAME,
);
/** Regex source for {@link HTML_STANDARD_ELEMENT_NAME}. */
export const HTML_STANDARD_ELEMENT_NAME_SOURCE: string =
  PATTERN_DEFINITIONS.HTML_STANDARD_ELEMENT_NAME.source;
/** Compiled pattern: Lowercase ASCII tag-name heuristic with digits and hyphens, not a validator. */
export const HTML_LOWERCASE_TAG_NAME_LIKE: Regex = compileRegex(
  PATTERN_DEFINITIONS.HTML_LOWERCASE_TAG_NAME_LIKE,
);
/** Regex source for {@link HTML_LOWERCASE_TAG_NAME_LIKE}. */
export const HTML_LOWERCASE_TAG_NAME_LIKE_SOURCE: string =
  PATTERN_DEFINITIONS.HTML_LOWERCASE_TAG_NAME_LIKE.source;
/** Compiled pattern: Valid custom element name under the HTML and DOM standards. */
export const HTML_CUSTOM_ELEMENT_NAME: Regex = compileRegex(
  PATTERN_DEFINITIONS.HTML_CUSTOM_ELEMENT_NAME,
);
/** Regex source for {@link HTML_CUSTOM_ELEMENT_NAME}. */
export const HTML_CUSTOM_ELEMENT_NAME_SOURCE: string =
  PATTERN_DEFINITIONS.HTML_CUSTOM_ELEMENT_NAME.source;
/** Compiled pattern: ASCII custom-element-shaped name heuristic, not the complete HTML name grammar. */
export const HTML_CUSTOM_ELEMENT_LIKE_NAME: Regex = compileRegex(
  PATTERN_DEFINITIONS.HTML_CUSTOM_ELEMENT_LIKE_NAME,
);
/** Regex source for {@link HTML_CUSTOM_ELEMENT_LIKE_NAME}. */
export const HTML_CUSTOM_ELEMENT_LIKE_NAME_SOURCE: string =
  PATTERN_DEFINITIONS.HTML_CUSTOM_ELEMENT_LIKE_NAME.source;
/** Compiled pattern: ASCII host-tag name heuristic with word characters and hyphens. */
export const HTML_LIKE_TAG_NAME: Regex = compileRegex(PATTERN_DEFINITIONS.HTML_LIKE_TAG_NAME);
/** Regex source for {@link HTML_LIKE_TAG_NAME}. */
export const HTML_LIKE_TAG_NAME_SOURCE: string = PATTERN_DEFINITIONS.HTML_LIKE_TAG_NAME.source;
/** Compiled pattern: ASCII host-tag name heuristic that also accepts dots, as in JSX member names. */
export const HTML_LIKE_DOTTED_TAG_NAME: Regex = compileRegex(
  PATTERN_DEFINITIONS.HTML_LIKE_DOTTED_TAG_NAME,
);
/** Regex source for {@link HTML_LIKE_DOTTED_TAG_NAME}. */
export const HTML_LIKE_DOTTED_TAG_NAME_SOURCE: string =
  PATTERN_DEFINITIONS.HTML_LIKE_DOTTED_TAG_NAME.source;
/** Compiled pattern: Double- or single-quoted attribute value, capturing the unquoted content. */
export const HTML_QUOTED_ATTRIBUTE_VALUE: Regex = compileRegex(
  PATTERN_DEFINITIONS.HTML_QUOTED_ATTRIBUTE_VALUE,
);
/** Regex source for {@link HTML_QUOTED_ATTRIBUTE_VALUE}. */
export const HTML_QUOTED_ATTRIBUTE_VALUE_SOURCE: string =
  PATTERN_DEFINITIONS.HTML_QUOTED_ATTRIBUTE_VALUE.source;
/** Compiled pattern: HTML class or JSX className attribute name. */
export const HTML_LIKE_CLASS_ATTRIBUTE_NAME: Regex = compileRegex(
  PATTERN_DEFINITIONS.HTML_LIKE_CLASS_ATTRIBUTE_NAME,
);
/** Regex source for {@link HTML_LIKE_CLASS_ATTRIBUTE_NAME}. */
export const HTML_LIKE_CLASS_ATTRIBUTE_NAME_SOURCE: string =
  PATTERN_DEFINITIONS.HTML_LIKE_CLASS_ATTRIBUTE_NAME.source;
/** Compiled pattern: ASCII-like attribute name and quoted value, capturing the name and either value. */
export const HTML_QUOTED_ATTRIBUTE: Regex = compileRegex(PATTERN_DEFINITIONS.HTML_QUOTED_ATTRIBUTE);
/** Regex source for {@link HTML_QUOTED_ATTRIBUTE}. */
export const HTML_QUOTED_ATTRIBUTE_SOURCE: string =
  PATTERN_DEFINITIONS.HTML_QUOTED_ATTRIBUTE.source;
/** Compiled pattern: Non-greedy HTML comment delimiter heuristic, not a complete HTML comment parser. */
export const HTML_COMMENT: Regex = compileRegex(PATTERN_DEFINITIONS.HTML_COMMENT);
/** Regex source for {@link HTML_COMMENT}. */
export const HTML_COMMENT_SOURCE: string = PATTERN_DEFINITIONS.HTML_COMMENT.source;
/** Compiled pattern: Style opener prefix heuristic capturing text up to the first greater-than sign. */
export const HTML_LIKE_STYLE_OPEN_TAG: Regex = compileRegex(
  PATTERN_DEFINITIONS.HTML_LIKE_STYLE_OPEN_TAG,
);
/** Regex source for {@link HTML_LIKE_STYLE_OPEN_TAG}. */
export const HTML_LIKE_STYLE_OPEN_TAG_SOURCE: string =
  PATTERN_DEFINITIONS.HTML_LIKE_STYLE_OPEN_TAG.source;
/** Compiled pattern: Style closing-tag prefix heuristic, without requiring the closing greater-than sign. */
export const HTML_LIKE_STYLE_CLOSE_PREFIX: Regex = compileRegex(
  PATTERN_DEFINITIONS.HTML_LIKE_STYLE_CLOSE_PREFIX,
);
/** Regex source for {@link HTML_LIKE_STYLE_CLOSE_PREFIX}. */
export const HTML_LIKE_STYLE_CLOSE_PREFIX_SOURCE: string =
  PATTERN_DEFINITIONS.HTML_LIKE_STYLE_CLOSE_PREFIX.source;
/** Compiled pattern: Start of input or a character that can precede a bare template-tag identifier. */
export const JAVASCRIPT_TAGGED_TEMPLATE_BOUNDARY: Regex = compileRegex(
  PATTERN_DEFINITIONS.JAVASCRIPT_TAGGED_TEMPLATE_BOUNDARY,
);
/** Regex source for {@link JAVASCRIPT_TAGGED_TEMPLATE_BOUNDARY}. */
export const JAVASCRIPT_TAGGED_TEMPLATE_BOUNDARY_SOURCE: string =
  PATTERN_DEFINITIONS.JAVASCRIPT_TAGGED_TEMPLATE_BOUNDARY.source;
/** Compiled pattern: A dotted member or non-nested call suffix in a template-tag expression heuristic. */
export const JAVASCRIPT_TAGGED_TEMPLATE_CHAIN_SEGMENT: Regex = compileRegex(
  PATTERN_DEFINITIONS.JAVASCRIPT_TAGGED_TEMPLATE_CHAIN_SEGMENT,
);
/** Regex source for {@link JAVASCRIPT_TAGGED_TEMPLATE_CHAIN_SEGMENT}. */
export const JAVASCRIPT_TAGGED_TEMPLATE_CHAIN_SEGMENT_SOURCE: string =
  PATTERN_DEFINITIONS.JAVASCRIPT_TAGGED_TEMPLATE_CHAIN_SEGMENT.source;
/** Compiled pattern: Captured quoted or template literal heuristic without escape handling. */
export const JAVASCRIPT_QUOTED_OR_TEMPLATE_LITERAL_LIKE: Regex = compileRegex(
  PATTERN_DEFINITIONS.JAVASCRIPT_QUOTED_OR_TEMPLATE_LITERAL_LIKE,
);
/** Regex source for {@link JAVASCRIPT_QUOTED_OR_TEMPLATE_LITERAL_LIKE}. */
export const JAVASCRIPT_QUOTED_OR_TEMPLATE_LITERAL_LIKE_SOURCE: string =
  PATTERN_DEFINITIONS.JAVASCRIPT_QUOTED_OR_TEMPLATE_LITERAL_LIKE.source;
/** Compiled pattern: One to six heading markers followed by whitespace. */
export const MARKDOWN_ATX_HEADING_PREFIX: Regex = compileRegex(
  PATTERN_DEFINITIONS.MARKDOWN_ATX_HEADING_PREFIX,
);
/** Regex source for {@link MARKDOWN_ATX_HEADING_PREFIX}. */
export const MARKDOWN_ATX_HEADING_PREFIX_SOURCE: string =
  PATTERN_DEFINITIONS.MARKDOWN_ATX_HEADING_PREFIX.source;
/** Compiled pattern: Three backticks used as a Markdown fence marker, without line or block rules. */
export const MARKDOWN_BACKTICK_FENCE: Regex = compileRegex(
  PATTERN_DEFINITIONS.MARKDOWN_BACKTICK_FENCE,
);
/** Regex source for {@link MARKDOWN_BACKTICK_FENCE}. */
export const MARKDOWN_BACKTICK_FENCE_SOURCE: string =
  PATTERN_DEFINITIONS.MARKDOWN_BACKTICK_FENCE.source;
/** Pattern source: Three backticks as literal Markdown fence text. */
export const MARKDOWN_BACKTICK_FENCE_TEXT: string =
  PATTERN_DEFINITIONS.BACKTICK_CHAR.source.repeat(3);
/** Compiled pattern: Three backticks after the start of a line and optional whitespace. */
export const MARKDOWN_BACKTICK_FENCE_LINE_PREFIX: Regex = compileRegex(
  PATTERN_DEFINITIONS.MARKDOWN_BACKTICK_FENCE_LINE_PREFIX,
);
/** Regex source for {@link MARKDOWN_BACKTICK_FENCE_LINE_PREFIX}. */
export const MARKDOWN_BACKTICK_FENCE_LINE_PREFIX_SOURCE: string =
  PATTERN_DEFINITIONS.MARKDOWN_BACKTICK_FENCE_LINE_PREFIX.source;
/** Compiled pattern: Captured single-backtick-delimited span, including empty and multiline spans. */
export const MARKDOWN_SINGLE_BACKTICK_CODE_SPAN: Regex = compileRegex(
  PATTERN_DEFINITIONS.MARKDOWN_SINGLE_BACKTICK_CODE_SPAN,
);
/** Regex source for {@link MARKDOWN_SINGLE_BACKTICK_CODE_SPAN}. */
export const MARKDOWN_SINGLE_BACKTICK_CODE_SPAN_SOURCE: string =
  PATTERN_DEFINITIONS.MARKDOWN_SINGLE_BACKTICK_CODE_SPAN.source;
/** Compiled pattern: Unordered list marker character, without surrounding whitespace. */
export const MARKDOWN_UNORDERED_LIST_MARKER: Regex = compileRegex(
  PATTERN_DEFINITIONS.MARKDOWN_UNORDERED_LIST_MARKER,
);
/** Regex source for {@link MARKDOWN_UNORDERED_LIST_MARKER}. */
export const MARKDOWN_UNORDERED_LIST_MARKER_SOURCE: string =
  PATTERN_DEFINITIONS.MARKDOWN_UNORDERED_LIST_MARKER.source;
/** Compiled pattern: One or more ASCII digits followed by a period, without surrounding whitespace. */
export const MARKDOWN_ORDERED_LIST_MARKER: Regex = compileRegex(
  PATTERN_DEFINITIONS.MARKDOWN_ORDERED_LIST_MARKER,
);
/** Regex source for {@link MARKDOWN_ORDERED_LIST_MARKER}. */
export const MARKDOWN_ORDERED_LIST_MARKER_SOURCE: string =
  PATTERN_DEFINITIONS.MARKDOWN_ORDERED_LIST_MARKER.source;
/** Compiled pattern: Less-than character (regex pattern). */
export const LESS_THAN: Regex = compileRegex(PATTERN_DEFINITIONS.LESS_THAN);
/** Regex source for {@link LESS_THAN}. */
export const LESS_THAN_SOURCE: string = PATTERN_DEFINITIONS.LESS_THAN.source;
/** Pattern source: Less-than character (literal). */
export const LESS_THAN_CHAR: string = PATTERN_DEFINITIONS.LESS_THAN_CHAR.source;
/** Compiled pattern: Greater-than character (regex pattern). */
export const GREATER_THAN: Regex = compileRegex(PATTERN_DEFINITIONS.GREATER_THAN);
/** Regex source for {@link GREATER_THAN}. */
export const GREATER_THAN_SOURCE: string = PATTERN_DEFINITIONS.GREATER_THAN.source;
/** Pattern source: Greater-than character (literal). */
export const GREATER_THAN_CHAR: string = PATTERN_DEFINITIONS.GREATER_THAN_CHAR.source;
/** Compiled pattern: Record reference name (starts with letter, then alphanumeric with hyphens). */
export const RECORD_REFERENCE_NAME: Regex = compileRegex(PATTERN_DEFINITIONS.RECORD_REFERENCE_NAME);
/** Regex source for {@link RECORD_REFERENCE_NAME}. */
export const RECORD_REFERENCE_NAME_SOURCE: string =
  PATTERN_DEFINITIONS.RECORD_REFERENCE_NAME.source;
/** Compiled pattern: Dot-separated reference segments accepted in structure tags. */
export const CSSDOC_QUALIFIED_REFERENCE: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_QUALIFIED_REFERENCE,
);
/** Regex source for {@link CSSDOC_QUALIFIED_REFERENCE}. */
export const CSSDOC_QUALIFIED_REFERENCE_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_QUALIFIED_REFERENCE.source;
/** Compiled pattern: Default or named slot selector in a structure node. */
export const CSSDOC_STRUCTURE_SLOT: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_STRUCTURE_SLOT);
/** Regex source for {@link CSSDOC_STRUCTURE_SLOT}. */
export const CSSDOC_STRUCTURE_SLOT_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_STRUCTURE_SLOT.source;
/** Compiled pattern: CSS block comment start (/*). */
export const COMMENT_START: Regex = compileRegex(PATTERN_DEFINITIONS.COMMENT_START);
/** Regex source for {@link COMMENT_START}. */
export const COMMENT_START_SOURCE: string = PATTERN_DEFINITIONS.COMMENT_START.source;
/** Compiled pattern: CSS doc-comment opener (/**). */
export const DOC_COMMENT_START: Regex = compileRegex(PATTERN_DEFINITIONS.DOC_COMMENT_START);
/** Regex source for {@link DOC_COMMENT_START}. */
export const DOC_COMMENT_START_SOURCE: string = PATTERN_DEFINITIONS.DOC_COMMENT_START.source;
/** Compiled pattern: CSS block comment end (*&#47;). */
export const COMMENT_END: Regex = compileRegex(PATTERN_DEFINITIONS.COMMENT_END);
/** Regex source for {@link COMMENT_END}. */
export const COMMENT_END_SOURCE: string = PATTERN_DEFINITIONS.COMMENT_END.source;
/** Compiled pattern: CSS block comment line marker (*). */
export const COMMENT_LINE_MARKER: Regex = compileRegex(PATTERN_DEFINITIONS.COMMENT_LINE_MARKER);
/** Regex source for {@link COMMENT_LINE_MARKER}. */
export const COMMENT_LINE_MARKER_SOURCE: string = PATTERN_DEFINITIONS.COMMENT_LINE_MARKER.source;
/** Compiled leading block-comment line marker. */
export const COMMENT_LINE_PREFIX: Regex = compileRegex(PATTERN_DEFINITIONS.COMMENT_LINE_PREFIX);
/** Regex source for {@link COMMENT_LINE_PREFIX}. */
export const COMMENT_LINE_PREFIX_SOURCE: string = PATTERN_DEFINITIONS.COMMENT_LINE_PREFIX.source;
/** Compiled run of JavaScript whitespace. */
export const WHITESPACE_RUN: Regex = compileRegex(PATTERN_DEFINITIONS.WHITESPACE_RUN);
/** Regex source for {@link WHITESPACE_RUN}. */
export const WHITESPACE_RUN_SOURCE: string = PATTERN_DEFINITIONS.WHITESPACE_RUN.source;

// Tier 2-3 - CssDoc patterns
/** Compiled pattern: Kind of an inline cssdoc diagnostic directive. */
export const CSSDOC_DIRECTIVE_KIND: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_DIRECTIVE_KIND);
/** Regex source for {@link CSSDOC_DIRECTIVE_KIND}. */
export const CSSDOC_DIRECTIVE_KIND_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_DIRECTIVE_KIND.source;
/** Compiled pattern: Permissive class reference with its name captured. */
export const CSS_CLASS_REFERENCE: Regex = compileRegex(PATTERN_DEFINITIONS.CSS_CLASS_REFERENCE);
/** Regex source for {@link CSS_CLASS_REFERENCE}. */
export const CSS_CLASS_REFERENCE_SOURCE: string = PATTERN_DEFINITIONS.CSS_CLASS_REFERENCE.source;
/** Compiled pattern: Custom state selector with its name captured. */
export const CSSDOC_CUSTOM_STATE_SELECTOR: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_CUSTOM_STATE_SELECTOR,
);
/** Regex source for {@link CSSDOC_CUSTOM_STATE_SELECTOR}. */
export const CSSDOC_CUSTOM_STATE_SELECTOR_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_CUSTOM_STATE_SELECTOR.source;
/** Compiled pattern: Shadow part selector with its name captured. */
export const CSSDOC_SHADOW_PART_SELECTOR: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_SHADOW_PART_SELECTOR,
);
/** Regex source for {@link CSSDOC_SHADOW_PART_SELECTOR}. */
export const CSSDOC_SHADOW_PART_SELECTOR_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_SHADOW_PART_SELECTOR.source;
/** Compiled pattern: Pseudo selector stripped before scanning classes. */
export const CSSDOC_SCANNED_PSEUDO_SELECTOR: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_SCANNED_PSEUDO_SELECTOR,
);
/** Regex source for {@link CSSDOC_SCANNED_PSEUDO_SELECTOR}. */
export const CSSDOC_SCANNED_PSEUDO_SELECTOR_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_SCANNED_PSEUDO_SELECTOR.source;
/** Compiled pattern: Typed structure reference body with kind, name, profile, and privacy captures. */
export const CSSDOC_TYPED_STRUCTURE_REFERENCE: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_TYPED_STRUCTURE_REFERENCE,
);
/** Regex source for {@link CSSDOC_TYPED_STRUCTURE_REFERENCE}. */
export const CSSDOC_TYPED_STRUCTURE_REFERENCE_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_TYPED_STRUCTURE_REFERENCE.source;
/** Compiled pattern: Shorthand structure reference body with name, profile, and privacy captures. */
export const CSSDOC_SHORTHAND_STRUCTURE_REFERENCE: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_SHORTHAND_STRUCTURE_REFERENCE,
);
/** Regex source for {@link CSSDOC_SHORTHAND_STRUCTURE_REFERENCE}. */
export const CSSDOC_SHORTHAND_STRUCTURE_REFERENCE_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_SHORTHAND_STRUCTURE_REFERENCE.source;
/** Compiled pattern: Class name accepted for base-class and scoped-part inference. */
export const CSSDOC_BASE_CLASS_NAME: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_BASE_CLASS_NAME,
);
/** Regex source for {@link CSSDOC_BASE_CLASS_NAME}. */
export const CSSDOC_BASE_CLASS_NAME_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_BASE_CLASS_NAME.source;
/** Compiled pattern: Class reference for base and scoped-part inference, capturing the name. */
export const CSSDOC_BASE_CLASS_REFERENCE: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_BASE_CLASS_REFERENCE,
);
/** Regex source for {@link CSSDOC_BASE_CLASS_REFERENCE}. */
export const CSSDOC_BASE_CLASS_REFERENCE_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_BASE_CLASS_REFERENCE.source;
/** Compiled pattern: Element name in an element tag, with independently optional angle brackets. */
export const CSSDOC_ELEMENT_TAG: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_ELEMENT_TAG);
/** Regex source for {@link CSSDOC_ELEMENT_TAG}. */
export const CSSDOC_ELEMENT_TAG_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_ELEMENT_TAG.source;
/** Compiled pattern: Class attribute selector with operator and quoted or unquoted value captures. */
export const CSS_CLASS_ATTRIBUTE_SELECTOR: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSS_CLASS_ATTRIBUTE_SELECTOR,
);
/** Regex source for {@link CSS_CLASS_ATTRIBUTE_SELECTOR}. */
export const CSS_CLASS_ATTRIBUTE_SELECTOR_SOURCE: string =
  PATTERN_DEFINITIONS.CSS_CLASS_ATTRIBUTE_SELECTOR.source;
/** Compiled pattern: Bracketed CSS selector with quoted attribute values. */
export const CSSDOC_ATTRIBUTE_SELECTOR: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_ATTRIBUTE_SELECTOR,
);
/** Regex source for {@link CSSDOC_ATTRIBUTE_SELECTOR}. */
export const CSSDOC_ATTRIBUTE_SELECTOR_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_ATTRIBUTE_SELECTOR.source;
/** Compiled pattern: Selector token with bracketed attributes that can contain whitespace. */
export const CSSDOC_SELECTOR_TOKEN: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_SELECTOR_TOKEN);
/** Regex source for {@link CSSDOC_SELECTOR_TOKEN}. */
export const CSSDOC_SELECTOR_TOKEN_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_SELECTOR_TOKEN.source;
/** Compiled pattern: Custom property name accepted in a cssdoc tag. */
export const CSSDOC_CUSTOM_PROPERTY_TAG_NAME: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_CUSTOM_PROPERTY_TAG_NAME,
);
/** Regex source for {@link CSSDOC_CUSTOM_PROPERTY_TAG_NAME}. */
export const CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_CUSTOM_PROPERTY_TAG_NAME.source;
/** Compiled pattern: Block tag name without its at sign. */
export const CSSDOC_BLOCK_TAG_NAME: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_BLOCK_TAG_NAME);
/** Regex source for {@link CSSDOC_BLOCK_TAG_NAME}. */
export const CSSDOC_BLOCK_TAG_NAME_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_BLOCK_TAG_NAME.source;
/** Compiled pattern: Lowercase alphanumeric example label with optional hyphens. */
export const CSSDOC_EXAMPLE_LABEL: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_EXAMPLE_LABEL);
/** Regex source for {@link CSSDOC_EXAMPLE_LABEL}. */
export const CSSDOC_EXAMPLE_LABEL_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_EXAMPLE_LABEL.source;
/** Compiled pattern: Separator between a cssdoc tag argument and its description. */
export const CSSDOC_DESCRIPTION_SEPARATOR: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_DESCRIPTION_SEPARATOR,
);
/** Regex source for {@link CSSDOC_DESCRIPTION_SEPARATOR}. */
export const CSSDOC_DESCRIPTION_SEPARATOR_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_DESCRIPTION_SEPARATOR.source;
/** Compiled pattern: Optional punctuation before a modifier annotation. */
export const CSSDOC_MODIFIER_ANNOTATION_PREFIX: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_MODIFIER_ANNOTATION_PREFIX,
);
/** Regex source for {@link CSSDOC_MODIFIER_ANNOTATION_PREFIX}. */
export const CSSDOC_MODIFIER_ANNOTATION_PREFIX_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_MODIFIER_ANNOTATION_PREFIX.source;
/** Compiled pattern: A bare, class, or bracketed canonical modifier reference. */
export const CSSDOC_MODIFIER_REFERENCE: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_MODIFIER_REFERENCE,
);
/** Regex source for {@link CSSDOC_MODIFIER_REFERENCE}. */
export const CSSDOC_MODIFIER_REFERENCE_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_MODIFIER_REFERENCE.source;
/** Compiled pattern: CssDoc tag name. */
export const CSSDOC_TAG_NAME: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_TAG_NAME);
/** Regex source for {@link CSSDOC_TAG_NAME}. */
export const CSSDOC_TAG_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_TAG_NAME.source;
/** Compiled pattern: CSS selector. */
export const CSSDOC_SELECTOR: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_SELECTOR);
/** Regex source for {@link CSSDOC_SELECTOR}. */
export const CSSDOC_SELECTOR_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_SELECTOR.source;
/** Compiled pattern: Modifier name. */
export const CSSDOC_MODIFIER_NAME: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_MODIFIER_NAME);
/** Regex source for {@link CSSDOC_MODIFIER_NAME}. */
export const CSSDOC_MODIFIER_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_MODIFIER_NAME.source;
/** Compiled pattern: Modifier with attribute selector. */
export const CSSDOC_MODIFIER_ATTRIBUTE: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_MODIFIER_ATTRIBUTE,
);
/** Regex source for {@link CSSDOC_MODIFIER_ATTRIBUTE}. */
export const CSSDOC_MODIFIER_ATTRIBUTE_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_MODIFIER_ATTRIBUTE.source;
/** Compiled pattern: Pseudo selector. */
export const CSSDOC_PSEUDO_SELECTOR: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_PSEUDO_SELECTOR,
);
/** Regex source for {@link CSSDOC_PSEUDO_SELECTOR}. */
export const CSSDOC_PSEUDO_SELECTOR_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_PSEUDO_SELECTOR.source;
export { CSSDOC_CARDINALITY_KEYWORDS } from "./definitions/tier-2-cssdoc-grammar.ts";
/** Compiled pattern: Cardinality suffix in structure, without the leading colon. */
export const CSSDOC_CARDINALITY: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_CARDINALITY);
/** Regex source for {@link CSSDOC_CARDINALITY}. */
export const CSSDOC_CARDINALITY_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_CARDINALITY.source;
/** Compiled pattern: Component reference with optional cardinality. */
export const CSSDOC_COMPONENT_REF: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_COMPONENT_REF);
/** Regex source for {@link CSSDOC_COMPONENT_REF}. */
export const CSSDOC_COMPONENT_REF_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_COMPONENT_REF.source;
/** Compiled pattern: Part name. */
export const CSSDOC_PART_NAME: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_PART_NAME);
/** Regex source for {@link CSSDOC_PART_NAME}. */
export const CSSDOC_PART_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_PART_NAME.source;
/** Compiled pattern: Property or custom property name. */
export const CSSDOC_CSSPROP_NAME: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_CSSPROP_NAME);
/** Regex source for {@link CSSDOC_CSSPROP_NAME}. */
export const CSSDOC_CSSPROP_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_CSSPROP_NAME.source;
/** Compiled pattern: State name. */
export const CSSDOC_CSSSTATE_NAME: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_CSSSTATE_NAME);
/** Regex source for {@link CSSDOC_CSSSTATE_NAME}. */
export const CSSDOC_CSSSTATE_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_CSSSTATE_NAME.source;
/** Compiled pattern: Variant name. */
export const CSSDOC_VARIANT_NAME: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_VARIANT_NAME);
/** Regex source for {@link CSSDOC_VARIANT_NAME}. */
export const CSSDOC_VARIANT_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_VARIANT_NAME.source;
/** Compiled pattern: Slot name. */
export const CSSDOC_SLOT_NAME: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_SLOT_NAME);
/** Regex source for {@link CSSDOC_SLOT_NAME}. */
export const CSSDOC_SLOT_NAME_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_SLOT_NAME.source;
/** Compiled pattern: \@example language identifier. */
export const CSSDOC_EXAMPLE_LANG: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_EXAMPLE_LANG);
/** Regex source for {@link CSSDOC_EXAMPLE_LANG}. */
export const CSSDOC_EXAMPLE_LANG_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_EXAMPLE_LANG.source;

// Punctuation
/** Pattern source: Equals sign character (literal). */
export const EQUALS_CHAR: string = PATTERN_DEFINITIONS.EQUALS_CHAR.source;
/** Compiled pattern: Colon (regex pattern). */
export const COLON: Regex = compileRegex(PATTERN_DEFINITIONS.COLON);
/** Regex source for {@link COLON}. */
export const COLON_SOURCE: string = PATTERN_DEFINITIONS.COLON.source;
/** Pattern source: Colon character (literal). */
export const COLON_CHAR: string = PATTERN_DEFINITIONS.COLON_CHAR.source;
/** Compiled pattern: Period or dot (regex pattern). */
export const DOT: Regex = compileRegex(PATTERN_DEFINITIONS.DOT);
/** Regex source for {@link DOT}. */
export const DOT_SOURCE: string = PATTERN_DEFINITIONS.DOT.source;
/** Pattern source: Period or dot character (literal). */
export const DOT_CHAR: string = PATTERN_DEFINITIONS.DOT_CHAR.source;
/** Compiled pattern: Hash or pound (regex pattern). */
export const POUND: Regex = compileRegex(PATTERN_DEFINITIONS.POUND);
/** Regex source for {@link POUND}. */
export const POUND_SOURCE: string = PATTERN_DEFINITIONS.POUND.source;
/** Pattern source: Hash or pound character (literal). */
export const POUND_CHAR: string = PATTERN_DEFINITIONS.POUND_CHAR.source;
/** Pattern source: At sign character (literal). */
export const AT_CHAR: string = PATTERN_DEFINITIONS.AT_CHAR.source;
/** Compiled pattern: At sign (regex pattern). */
export const AT: Regex = compileRegex(PATTERN_DEFINITIONS.AT);
/** Regex source for {@link AT}. */
export const AT_SOURCE: string = PATTERN_DEFINITIONS.AT.source;
/** Pattern source: Pipe character (literal). */
export const PIPE_CHAR: string = PATTERN_DEFINITIONS.PIPE_CHAR.source;
/** Compiled pattern: Pipe (regex pattern). */
export const PIPE: Regex = compileRegex(PATTERN_DEFINITIONS.PIPE);
/** Regex source for {@link PIPE}. */
export const PIPE_SOURCE: string = PATTERN_DEFINITIONS.PIPE.source;
/** Compiled pattern: Opening parenthesis (regex pattern). */
export const PAREN_OPEN: Regex = compileRegex(PATTERN_DEFINITIONS.PAREN_OPEN);
/** Regex source for {@link PAREN_OPEN}. */
export const PAREN_OPEN_SOURCE: string = PATTERN_DEFINITIONS.PAREN_OPEN.source;
/** Pattern source: Opening parenthesis character (literal). */
export const PAREN_OPEN_CHAR: string = PATTERN_DEFINITIONS.PAREN_OPEN_CHAR.source;
/** Compiled pattern: Closing parenthesis (regex pattern). */
export const PAREN_CLOSE: Regex = compileRegex(PATTERN_DEFINITIONS.PAREN_CLOSE);
/** Regex source for {@link PAREN_CLOSE}. */
export const PAREN_CLOSE_SOURCE: string = PATTERN_DEFINITIONS.PAREN_CLOSE.source;
/** Pattern source: Closing parenthesis character (literal). */
export const PAREN_CLOSE_CHAR: string = PATTERN_DEFINITIONS.PAREN_CLOSE_CHAR.source;
/** Compiled pattern: Opening brace (regex pattern). */
export const BRACE_OPEN: Regex = compileRegex(PATTERN_DEFINITIONS.BRACE_OPEN);
/** Regex source for {@link BRACE_OPEN}. */
export const BRACE_OPEN_SOURCE: string = PATTERN_DEFINITIONS.BRACE_OPEN.source;
/** Pattern source: Opening brace character (literal). */
export const BRACE_OPEN_CHAR: string = PATTERN_DEFINITIONS.BRACE_OPEN_CHAR.source;
/** Compiled pattern: Closing brace (regex pattern). */
export const BRACE_CLOSE: Regex = compileRegex(PATTERN_DEFINITIONS.BRACE_CLOSE);
/** Regex source for {@link BRACE_CLOSE}. */
export const BRACE_CLOSE_SOURCE: string = PATTERN_DEFINITIONS.BRACE_CLOSE.source;
/** Pattern source: Closing brace character (literal). */
export const BRACE_CLOSE_CHAR: string = PATTERN_DEFINITIONS.BRACE_CLOSE_CHAR.source;
/** Compiled pattern: Opening square bracket (regex pattern). */
export const BRACKET_OPEN: Regex = compileRegex(PATTERN_DEFINITIONS.BRACKET_OPEN);
/** Regex source for {@link BRACKET_OPEN}. */
export const BRACKET_OPEN_SOURCE: string = PATTERN_DEFINITIONS.BRACKET_OPEN.source;
/** Pattern source: Opening square bracket character (literal). */
export const BRACKET_OPEN_CHAR: string = PATTERN_DEFINITIONS.BRACKET_OPEN_CHAR.source;
/** Compiled pattern: Closing square bracket (regex pattern). */
export const BRACKET_CLOSE: Regex = compileRegex(PATTERN_DEFINITIONS.BRACKET_CLOSE);
/** Regex source for {@link BRACKET_CLOSE}. */
export const BRACKET_CLOSE_SOURCE: string = PATTERN_DEFINITIONS.BRACKET_CLOSE.source;
/** Pattern source: Closing square bracket character (literal). */
export const BRACKET_CLOSE_CHAR: string = PATTERN_DEFINITIONS.BRACKET_CLOSE_CHAR.source;
/** Compiled pattern: Single quote (regex pattern). */
export const QUOTE_SINGLE: Regex = compileRegex(PATTERN_DEFINITIONS.QUOTE_SINGLE);
/** Regex source for {@link QUOTE_SINGLE}. */
export const QUOTE_SINGLE_SOURCE: string = PATTERN_DEFINITIONS.QUOTE_SINGLE.source;
/** Pattern source: Single quote character (literal). */
export const QUOTE_SINGLE_CHAR: string = PATTERN_DEFINITIONS.QUOTE_SINGLE_CHAR.source;
/** Compiled pattern: Double quote (regex pattern). */
export const QUOTE_DOUBLE: Regex = compileRegex(PATTERN_DEFINITIONS.QUOTE_DOUBLE);
/** Regex source for {@link QUOTE_DOUBLE}. */
export const QUOTE_DOUBLE_SOURCE: string = PATTERN_DEFINITIONS.QUOTE_DOUBLE.source;
/** Pattern source: Double quote character (literal). */
export const QUOTE_DOUBLE_CHAR: string = PATTERN_DEFINITIONS.QUOTE_DOUBLE_CHAR.source;
/** Pattern source: Backtick character (literal). */
export const BACKTICK_CHAR: string = PATTERN_DEFINITIONS.BACKTICK_CHAR.source;
/** Pattern source: Backslash character (literal). */
export const BACKSLASH_CHAR: string = PATTERN_DEFINITIONS.BACKSLASH_CHAR.source;
/** Pattern source: Plus character (literal). */
export const PLUS_CHAR: string = PATTERN_DEFINITIONS.PLUS_CHAR.source;

// Tier 3-4 - Token patterns for syntax highlighting
/** Compiled pattern: Horizontal whitespace (space or tab). */
export const TOKEN_WHITESPACE: Regex = compileRegex(PATTERN_DEFINITIONS.TOKEN_WHITESPACE);
/** Regex source for {@link TOKEN_WHITESPACE}. */
export const TOKEN_WHITESPACE_SOURCE: string = PATTERN_DEFINITIONS.TOKEN_WHITESPACE.source;
/** Compiled pattern: Base identifier (letter, then alphanumeric with dash/underscore). */
export const TOKEN_IDENTIFIER: Regex = compileRegex(PATTERN_DEFINITIONS.TOKEN_IDENTIFIER);
/** Regex source for {@link TOKEN_IDENTIFIER}. */
export const TOKEN_IDENTIFIER_SOURCE: string = PATTERN_DEFINITIONS.TOKEN_IDENTIFIER.source;
/** Compiled pattern: Qualified identifier (dot-separated). */
export const TOKEN_QUALIFIED_IDENTIFIER: Regex = compileRegex(
  PATTERN_DEFINITIONS.TOKEN_QUALIFIED_IDENTIFIER,
);
/** Regex source for {@link TOKEN_QUALIFIED_IDENTIFIER}. */
export const TOKEN_QUALIFIED_IDENTIFIER_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_QUALIFIED_IDENTIFIER.source;
/** Compiled pattern: Optional qualified identifier. */
export const TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL: Regex = compileRegex(
  PATTERN_DEFINITIONS.TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL,
);
/** Regex source for {@link TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL}. */
export const TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL.source;
/** Compiled pattern: Modifier name (optional leading dash). */
export const TOKEN_MODIFIER_NAME: Regex = compileRegex(PATTERN_DEFINITIONS.TOKEN_MODIFIER_NAME);
/** Regex source for {@link TOKEN_MODIFIER_NAME}. */
export const TOKEN_MODIFIER_NAME_SOURCE: string = PATTERN_DEFINITIONS.TOKEN_MODIFIER_NAME.source;
/** Compiled pattern: Optional modifier name. */
export const TOKEN_MODIFIER_NAME_OPTIONAL: Regex = compileRegex(
  PATTERN_DEFINITIONS.TOKEN_MODIFIER_NAME_OPTIONAL,
);
/** Regex source for {@link TOKEN_MODIFIER_NAME_OPTIONAL}. */
export const TOKEN_MODIFIER_NAME_OPTIONAL_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_MODIFIER_NAME_OPTIONAL.source;
/** Compiled pattern: Class selector (optional leading dot). */
export const TOKEN_CLASS_SELECTOR: Regex = compileRegex(PATTERN_DEFINITIONS.TOKEN_CLASS_SELECTOR);
/** Regex source for {@link TOKEN_CLASS_SELECTOR}. */
export const TOKEN_CLASS_SELECTOR_SOURCE: string = PATTERN_DEFINITIONS.TOKEN_CLASS_SELECTOR.source;
/** Compiled pattern: Class selector with required leading dot. */
export const TOKEN_CLASS_SELECTOR_REQUIRED_DOT: Regex = compileRegex(
  PATTERN_DEFINITIONS.TOKEN_CLASS_SELECTOR_REQUIRED_DOT,
);
/** Regex source for {@link TOKEN_CLASS_SELECTOR_REQUIRED_DOT}. */
export const TOKEN_CLASS_SELECTOR_REQUIRED_DOT_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_CLASS_SELECTOR_REQUIRED_DOT.source;
/** Compiled pattern: Optional class selector. */
export const TOKEN_CLASS_SELECTOR_OPTIONAL: Regex = compileRegex(
  PATTERN_DEFINITIONS.TOKEN_CLASS_SELECTOR_OPTIONAL,
);
/** Regex source for {@link TOKEN_CLASS_SELECTOR_OPTIONAL}. */
export const TOKEN_CLASS_SELECTOR_OPTIONAL_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_CLASS_SELECTOR_OPTIONAL.source;
/** Compiled pattern: Custom CSS property (--name). */
export const TOKEN_CUSTOM_PROPERTY: Regex = compileRegex(PATTERN_DEFINITIONS.TOKEN_CUSTOM_PROPERTY);
/** Regex source for {@link TOKEN_CUSTOM_PROPERTY}. */
export const TOKEN_CUSTOM_PROPERTY_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_CUSTOM_PROPERTY.source;
/** Compiled pattern: Optional custom CSS property. */
export const TOKEN_CUSTOM_PROPERTY_OPTIONAL: Regex = compileRegex(
  PATTERN_DEFINITIONS.TOKEN_CUSTOM_PROPERTY_OPTIONAL,
);
/** Regex source for {@link TOKEN_CUSTOM_PROPERTY_OPTIONAL}. */
export const TOKEN_CUSTOM_PROPERTY_OPTIONAL_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_CUSTOM_PROPERTY_OPTIONAL.source;
/** Compiled pattern: Numeric reference (digits with optional dot and more digits). */
export const TOKEN_REF_NUMBER: Regex = compileRegex(PATTERN_DEFINITIONS.TOKEN_REF_NUMBER);
/** Regex source for {@link TOKEN_REF_NUMBER}. */
export const TOKEN_REF_NUMBER_SOURCE: string = PATTERN_DEFINITIONS.TOKEN_REF_NUMBER.source;
/** Compiled pattern: Optional numeric reference. */
export const TOKEN_REF_NUMBER_OPTIONAL: Regex = compileRegex(
  PATTERN_DEFINITIONS.TOKEN_REF_NUMBER_OPTIONAL,
);
/** Regex source for {@link TOKEN_REF_NUMBER_OPTIONAL}. */
export const TOKEN_REF_NUMBER_OPTIONAL_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_REF_NUMBER_OPTIONAL.source;
/** Compiled pattern: Pseudo-class or state (optional colon, optional parens). */
export const TOKEN_PSEUDO_CLASS: Regex = compileRegex(PATTERN_DEFINITIONS.TOKEN_PSEUDO_CLASS);
/** Regex source for {@link TOKEN_PSEUDO_CLASS}. */
export const TOKEN_PSEUDO_CLASS_SOURCE: string = PATTERN_DEFINITIONS.TOKEN_PSEUDO_CLASS.source;
/** Compiled pattern: Optional pseudo-class or state. */
export const TOKEN_PSEUDO_CLASS_OPTIONAL: Regex = compileRegex(
  PATTERN_DEFINITIONS.TOKEN_PSEUDO_CLASS_OPTIONAL,
);
/** Regex source for {@link TOKEN_PSEUDO_CLASS_OPTIONAL}. */
export const TOKEN_PSEUDO_CLASS_OPTIONAL_SOURCE: string =
  PATTERN_DEFINITIONS.TOKEN_PSEUDO_CLASS_OPTIONAL.source;
/** Compiled pattern: Inline content (anything except closing brace). */
export const TOKEN_INLINE_CONTENT: Regex = compileRegex(PATTERN_DEFINITIONS.TOKEN_INLINE_CONTENT);
/** Regex source for {@link TOKEN_INLINE_CONTENT}. */
export const TOKEN_INLINE_CONTENT_SOURCE: string = PATTERN_DEFINITIONS.TOKEN_INLINE_CONTENT.source;
/** Compiled pattern: The \@structure tag keyword. */
export const CSSDOC_STRUCTURE_TAG_KEYWORD: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_STRUCTURE_TAG_KEYWORD,
);
/** Regex source for {@link CSSDOC_STRUCTURE_TAG_KEYWORD}. */
export const CSSDOC_STRUCTURE_TAG_KEYWORD_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_STRUCTURE_TAG_KEYWORD.source;
/** Compiled pattern: Any \@-prefixed tag keyword. */
export const CSSDOC_ANY_TAG_KEYWORD: Regex = compileRegex(
  PATTERN_DEFINITIONS.CSSDOC_ANY_TAG_KEYWORD,
);
/** Regex source for {@link CSSDOC_ANY_TAG_KEYWORD}. */
export const CSSDOC_ANY_TAG_KEYWORD_SOURCE: string =
  PATTERN_DEFINITIONS.CSSDOC_ANY_TAG_KEYWORD.source;
/** Compiled pattern: Tag name placeholder for text replacement (\@tagname). */
export const TAG_NAME_PLACEHOLDER: Regex = compileRegex(PATTERN_DEFINITIONS.TAG_NAME_PLACEHOLDER);
/** Regex source for {@link TAG_NAME_PLACEHOLDER}. */
export const TAG_NAME_PLACEHOLDER_SOURCE: string = PATTERN_DEFINITIONS.TAG_NAME_PLACEHOLDER.source;
/** Compiled pattern: Structure tag keyword (\@component, \@variant, etc.). */
export const CSSDOC_STRUCTURE_TAG: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_STRUCTURE_TAG);
/** Regex source for {@link CSSDOC_STRUCTURE_TAG}. */
export const CSSDOC_STRUCTURE_TAG_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_STRUCTURE_TAG.source;
/** Compiled pattern: \@demo URL. */
export const CSSDOC_DEMO_URL: Regex = compileRegex(PATTERN_DEFINITIONS.CSSDOC_DEMO_URL);
/** Regex source for {@link CSSDOC_DEMO_URL}. */
export const CSSDOC_DEMO_URL_SOURCE: string = PATTERN_DEFINITIONS.CSSDOC_DEMO_URL.source;

// CodeMirror / TextMate tokenizer patterns
/** Compiled pattern: Inline tag tokenizer: \{\@tag content\}. Used for capturing inline doc-comment tags.. */
export const TOKENIZER_INLINE_TAG: Regex = compileRegex(PATTERN_DEFINITIONS.TOKENIZER_INLINE_TAG);
/** Regex source for {@link TOKENIZER_INLINE_TAG}. */
export const TOKENIZER_INLINE_TAG_SOURCE: string = PATTERN_DEFINITIONS.TOKENIZER_INLINE_TAG.source;
/** Compiled pattern: Record tag tokenizer: \@tag name or \@tag name.name. */
export const TOKENIZER_RECORD_TAG: Regex = compileRegex(PATTERN_DEFINITIONS.TOKENIZER_RECORD_TAG);
/** Regex source for {@link TOKENIZER_RECORD_TAG}. */
export const TOKENIZER_RECORD_TAG_SOURCE: string = PATTERN_DEFINITIONS.TOKENIZER_RECORD_TAG.source;
/** Compiled pattern: Modifier tag tokenizer: \@tag -name. */
export const TOKENIZER_MODIFIER_TAG: Regex = compileRegex(
  PATTERN_DEFINITIONS.TOKENIZER_MODIFIER_TAG,
);
/** Regex source for {@link TOKENIZER_MODIFIER_TAG}. */
export const TOKENIZER_MODIFIER_TAG_SOURCE: string =
  PATTERN_DEFINITIONS.TOKENIZER_MODIFIER_TAG.source;
/** Compiled pattern: Part tag tokenizer: \@tag .name or \@tag .name[attr]. */
export const TOKENIZER_PART_TAG: Regex = compileRegex(PATTERN_DEFINITIONS.TOKENIZER_PART_TAG);
/** Regex source for {@link TOKENIZER_PART_TAG}. */
export const TOKENIZER_PART_TAG_SOURCE: string = PATTERN_DEFINITIONS.TOKENIZER_PART_TAG.source;
/** Compiled pattern: Custom property tag tokenizer: \@tag --name. */
export const TOKENIZER_PROPERTY_TAG: Regex = compileRegex(
  PATTERN_DEFINITIONS.TOKENIZER_PROPERTY_TAG,
);
/** Regex source for {@link TOKENIZER_PROPERTY_TAG}. */
export const TOKENIZER_PROPERTY_TAG_SOURCE: string =
  PATTERN_DEFINITIONS.TOKENIZER_PROPERTY_TAG.source;
/** Compiled pattern: Ref tag tokenizer: \@ref 1 or \@ref 1.2. */
export const TOKENIZER_REF_TAG: Regex = compileRegex(PATTERN_DEFINITIONS.TOKENIZER_REF_TAG);
/** Regex source for {@link TOKENIZER_REF_TAG}. */
export const TOKENIZER_REF_TAG_SOURCE: string = PATTERN_DEFINITIONS.TOKENIZER_REF_TAG.source;

// Structure custom-media patterns
/** Compiled pattern: Structure record kind (component, name, utility, or declaration). */
export const STRUCTURE_RECORD_KIND: Regex = compileRegex(PATTERN_DEFINITIONS.STRUCTURE_RECORD_KIND);
/** Regex source for {@link STRUCTURE_RECORD_KIND}. */
export const STRUCTURE_RECORD_KIND_SOURCE: string =
  PATTERN_DEFINITIONS.STRUCTURE_RECORD_KIND.source;
/** Compiled pattern: Typed structure custom-media reference (\@kind name (--profile)). */
export const TYPED_STRUCTURE_MEDIA: Regex = compileRegex(PATTERN_DEFINITIONS.TYPED_STRUCTURE_MEDIA);
/** Regex source for {@link TYPED_STRUCTURE_MEDIA}. */
export const TYPED_STRUCTURE_MEDIA_SOURCE: string =
  PATTERN_DEFINITIONS.TYPED_STRUCTURE_MEDIA.source;
/** Compiled pattern: Untyped structure custom-media reference (\@name (--profile)). */
export const UNTYPED_STRUCTURE_MEDIA: Regex = compileRegex(
  PATTERN_DEFINITIONS.UNTYPED_STRUCTURE_MEDIA,
);
/** Regex source for {@link UNTYPED_STRUCTURE_MEDIA}. */
export const UNTYPED_STRUCTURE_MEDIA_SOURCE: string =
  PATTERN_DEFINITIONS.UNTYPED_STRUCTURE_MEDIA.source;
