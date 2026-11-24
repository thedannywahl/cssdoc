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
