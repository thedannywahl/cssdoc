/**
 * @cssdoc/regex/exports
 *
 * Convenience re-exports of Regex objects and string forms from patterns.ts
 * This provides the same API as the old tier files, but sourced from the unified registry.
 *
 * @module
 */

import { buildPattern, getPatternString } from "./patterns.js";

// ============================================================================
// Tier 0: Character Classes
// ============================================================================

export const ALPHA = buildPattern("ALPHA");
export const ALPHA_LOWER = buildPattern("ALPHA_LOWER");
export const ALPHA_UPPER = buildPattern("ALPHA_UPPER");
export const ALPHANUMERIC = buildPattern("ALPHANUMERIC");
export const ALPHANUMERIC_EXTENDED = buildPattern("ALPHANUMERIC_EXTENDED");
export const DIGIT = buildPattern("DIGIT");
export const DASH = buildPattern("DASH");
export const DOUBLE_DASH = buildPattern("DOUBLE_DASH");
export const DOT = buildPattern("DOT");
export const SPACE_TAB = buildPattern("SPACE_TAB");
export const BRACE_OPEN = buildPattern("BRACE_OPEN");
export const BRACE_CLOSE = buildPattern("BRACE_CLOSE");
export const PAREN_OPEN = buildPattern("PAREN_OPEN");
export const PAREN_CLOSE = buildPattern("PAREN_CLOSE");
export const COLON = buildPattern("COLON");
export const QUOTE = buildPattern("QUOTE");
export const HEX_DIGIT = buildPattern("HEX_DIGIT");
export const HEX_DIGIT_OR_WILDCARD = buildPattern("HEX_DIGIT_OR_WILDCARD");
export const CSS_IDENTIFIER_START = buildPattern("CSS_IDENTIFIER_START");
export const CSS_IDENTIFIER_START_WITH_DASH = buildPattern("CSS_IDENTIFIER_START_WITH_DASH");
export const CSS_IDENTIFIER_CONT = buildPattern("CSS_IDENTIFIER_CONT");
export const CSS_IDENTIFIER_CONT_NO_DASH = buildPattern("CSS_IDENTIFIER_CONT_NO_DASH");
export const WORD_BOUNDARY = buildPattern("WORD_BOUNDARY");

// String exports for use in template literals
export const alpha = getPatternString("ALPHA");
export const alphaLower = getPatternString("ALPHA_LOWER");
export const alphaUpper = getPatternString("ALPHA_UPPER");
export const alphanumeric = getPatternString("ALPHANUMERIC");
export const alphanumericExtended = getPatternString("ALPHANUMERIC_EXTENDED");
export const digit = getPatternString("DIGIT");
export const dash = getPatternString("DASH");
export const doubleDash = getPatternString("DOUBLE_DASH");
export const dot = getPatternString("DOT");
export const spaceTab = getPatternString("SPACE_TAB");
export const braceOpen = getPatternString("BRACE_OPEN");
export const braceClose = getPatternString("BRACE_CLOSE");
export const parenOpen = getPatternString("PAREN_OPEN");
export const parenClose = getPatternString("PAREN_CLOSE");
export const colon = getPatternString("COLON");
export const quote = getPatternString("QUOTE");
export const hexDigit = getPatternString("HEX_DIGIT");
export const hexDigitOrWildcard = getPatternString("HEX_DIGIT_OR_WILDCARD");
export const cssIdentifierStart = getPatternString("CSS_IDENTIFIER_START");
export const cssIdentifierStartWithDash = getPatternString("CSS_IDENTIFIER_START_WITH_DASH");
export const cssIdentifierCont = getPatternString("CSS_IDENTIFIER_CONT");
export const cssIdentifierContNoDash = getPatternString("CSS_IDENTIFIER_CONT_NO_DASH");
export const wordBoundary = getPatternString("WORD_BOUNDARY");

// ============================================================================
// Tier 1: W3C CSS Formal Grammar Patterns
// ============================================================================

export const CSS_IDENTIFIER = buildPattern("CSS_IDENTIFIER");
export const CSS_NAME = buildPattern("CSS_NAME");
export const CSS_NUMBER = buildPattern("CSS_NUMBER");
export const CSS_PERCENTAGE = buildPattern("CSS_PERCENTAGE");
export const CSS_DIMENSION = buildPattern("CSS_DIMENSION");
export const CSS_HASH_COLOR = buildPattern("CSS_HASH_COLOR");
export const CSS_FUNCTION = buildPattern("CSS_FUNCTION");
export const CSS_KEYWORD = buildPattern("CSS_KEYWORD");
export const CSS_UNICODE_RANGE = buildPattern("CSS_UNICODE_RANGE");
export const CSS_PROPERTY_NAME = buildPattern("CSS_PROPERTY_NAME");

// String exports for use in template literals
export const cssIdentifier = getPatternString("CSS_IDENTIFIER");
export const cssName = getPatternString("CSS_NAME");
export const cssNumber = getPatternString("CSS_NUMBER");
export const cssPercentage = getPatternString("CSS_PERCENTAGE");
export const cssDimension = getPatternString("CSS_DIMENSION");
export const cssHashColor = getPatternString("CSS_HASH_COLOR");
export const cssFunction = getPatternString("CSS_FUNCTION");
export const cssKeyword = getPatternString("CSS_KEYWORD");
export const cssUnicodeRange = getPatternString("CSS_UNICODE_RANGE");
export const cssPropertyName = getPatternString("CSS_PROPERTY_NAME");

// ============================================================================
// Tier 2: CssDoc Grammar Patterns
// ============================================================================

export const CSSDOC_IDENTIFIER_PART = buildPattern("CSSDOC_IDENTIFIER_PART");
export const CSSDOC_IDENTIFIER = buildPattern("CSSDOC_IDENTIFIER");
export const CSSDOC_RECORD_NAME = buildPattern("CSSDOC_RECORD_NAME");
export const CSSDOC_MODIFIER_SUFFIX = buildPattern("CSSDOC_MODIFIER_SUFFIX");
export const CSSDOC_MODIFIER_CHAINED = buildPattern("CSSDOC_MODIFIER_CHAINED");
export const CSSDOC_MODIFIER_ATTRIBUTE = buildPattern("CSSDOC_MODIFIER_ATTRIBUTE");
export const CSSDOC_TAG = buildPattern("CSSDOC_TAG");
export const CSSDOC_TAG_ARG = buildPattern("CSSDOC_TAG_ARG");
export const CSSDOC_STRUCTURE_REF = buildPattern("CSSDOC_STRUCTURE_REF");
export const CSSDOC_CARDINALITY = buildPattern("CSSDOC_CARDINALITY");
export const CSSDOC_CUSTOM_PROPERTY = buildPattern("CSSDOC_CUSTOM_PROPERTY");
export const CSSDOC_INLINE_REF = buildPattern("CSSDOC_INLINE_REF");
export const CSSDOC_REF_NUM = buildPattern("CSSDOC_REF_NUM");
export const CSSDOC_STATE_VALUE = buildPattern("CSSDOC_STATE_VALUE");
export const CSSDOC_SELECTOR_VALUE = buildPattern("CSSDOC_SELECTOR_VALUE");
export const CSSDOC_STRUCTURE_CARDINALITY = buildPattern("CSSDOC_STRUCTURE_CARDINALITY");
export const CSSDOC_SLOT_DECL = buildPattern("CSSDOC_SLOT_DECL");
export const CSSDOC_STRUCTURE_CLASS = buildPattern("CSSDOC_STRUCTURE_CLASS");
export const CSSDOC_STRUCTURE_TAG = buildPattern("CSSDOC_STRUCTURE_TAG");
export const CSSDOC_STRUCTURE_COMPONENT = buildPattern("CSSDOC_STRUCTURE_COMPONENT");
export const CSSDOC_STRUCTURE_BRACE = buildPattern("CSSDOC_STRUCTURE_BRACE");
export const CSSDOC_INLINE_TAG_PATTERN = buildPattern("CSSDOC_INLINE_TAG_PATTERN");
export const CSSDOC_RECORD_TAG_PATTERN = buildPattern("CSSDOC_RECORD_TAG_PATTERN");
export const CSSDOC_MODIFIER_TAG_PATTERN = buildPattern("CSSDOC_MODIFIER_TAG_PATTERN");
export const CSSDOC_PART_TAG_PATTERN = buildPattern("CSSDOC_PART_TAG_PATTERN");
export const CSSDOC_PROPERTY_TAG_PATTERN = buildPattern("CSSDOC_PROPERTY_TAG_PATTERN");
export const CSSDOC_REF_TAG_PATTERN = buildPattern("CSSDOC_REF_TAG_PATTERN");

// String exports for use in template literals
export const cssdocIdentifierPart = getPatternString("CSSDOC_IDENTIFIER_PART");
export const cssdocIdentifier = getPatternString("CSSDOC_IDENTIFIER");
export const cssdocRecordName = getPatternString("CSSDOC_RECORD_NAME");
export const cssdocModifierSuffix = getPatternString("CSSDOC_MODIFIER_SUFFIX");
export const cssdocModifierChained = getPatternString("CSSDOC_MODIFIER_CHAINED");
export const cssdocModifierAttribute = getPatternString("CSSDOC_MODIFIER_ATTRIBUTE");
export const cssdocTag = getPatternString("CSSDOC_TAG");
export const cssdocTagArg = getPatternString("CSSDOC_TAG_ARG");
export const cssdocStructureRef = getPatternString("CSSDOC_STRUCTURE_REF");
export const cssdocCardinality = getPatternString("CSSDOC_CARDINALITY");
export const cssdocCustomProperty = getPatternString("CSSDOC_CUSTOM_PROPERTY");
export const cssdocInlineRef = getPatternString("CSSDOC_INLINE_REF");
export const cssdocRefNum = getPatternString("CSSDOC_REF_NUM");
export const cssdocStateValue = getPatternString("CSSDOC_STATE_VALUE");
export const cssdocSelectorValue = getPatternString("CSSDOC_SELECTOR_VALUE");
export const cssdocStructureCardinality = getPatternString("CSSDOC_STRUCTURE_CARDINALITY");
export const cssdocSlotDecl = getPatternString("CSSDOC_SLOT_DECL");
export const cssdocStructureClass = getPatternString("CSSDOC_STRUCTURE_CLASS");
export const cssdocStructureTag = getPatternString("CSSDOC_STRUCTURE_TAG");
export const cssdocStructureComponent = getPatternString("CSSDOC_STRUCTURE_COMPONENT");
export const cssdocStructureBrace = getPatternString("CSSDOC_STRUCTURE_BRACE");
export const cssdocInlineTagPattern = getPatternString("CSSDOC_INLINE_TAG_PATTERN");
export const cssdocRecordTagPattern = getPatternString("CSSDOC_RECORD_TAG_PATTERN");
export const cssdocModifierTagPattern = getPatternString("CSSDOC_MODIFIER_TAG_PATTERN");
export const cssdocPartTagPattern = getPatternString("CSSDOC_PART_TAG_PATTERN");
export const cssdocPropertyTagPattern = getPatternString("CSSDOC_PROPERTY_TAG_PATTERN");
export const cssdocRefTagPattern = getPatternString("CSSDOC_REF_TAG_PATTERN");
