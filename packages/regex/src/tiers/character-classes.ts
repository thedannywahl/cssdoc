/**
 * Tier 0: Generic Character Class Patterns
 *
 * Fundamental building blocks for regex patterns across all tiers.
 * These atomic patterns define basic character classes used to compose identifiers,
 * keywords, and other lexical elements.
 *
 * @module
 */

import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";

/**
 * Single alphabetic character: `[A-Za-z]`
 * Used as the start of identifiers.
 */
export const ALPHA: Regex<"[A-Za-z]", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`[A-Za-z]`,
  "u",
);

/**
 * Single lowercase alphabetic character: `[a-z]`
 * Used for lowercase-only keywords like cardinality modifiers.
 */
export const ALPHA_LOWER: Regex<"[a-z]", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`[a-z]`,
  "u",
);

/**
 * Single uppercase alphabetic character: `[A-Z]`
 * Used for uppercase-only keywords and class names.
 */
export const ALPHA_UPPER: Regex<"[A-Z]", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`[A-Z]`,
  "u",
);

/**
 * Alphanumeric character: `[0-9A-Za-z]`
 * Used in identifier continuations.
 */
export const ALPHANUMERIC: Regex<"[0-9A-Za-z]", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`[0-9A-Za-z]`,
  "u",
);

/**
 * Alphanumeric with dash and underscore: `[A-Za-z0-9_-]`
 * Used in CSS identifiers and BEM-style names.
 */
export const ALPHANUMERIC_EXTENDED: Regex<"[A-Za-z0-9_-]", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`[A-Za-z0-9_-]`,
  "u",
);

/**
 * Numeric digit: `[0-9]`
 * Used for numbers and refs.
 */
export const DIGIT: Regex<"[0-9]", { names: {}; flags: "u" }> = arkRegex.as(String.raw`[0-9]`, "u");

/**
 * Hyphen/dash character: `-`
 * Used in modifiers and custom properties.
 */
export const DASH: Regex<"-", { names: {}; flags: "u" }> = arkRegex.as(String.raw`-`, "u");

/**
 * Double hyphen/dash: `--`
 * Used for CSS custom properties.
 */
export const DOUBLE_DASH: Regex<"--", { names: {}; flags: "u" }> = arkRegex.as(String.raw`--`, "u");

/**
 * Dot/period character: `\.`
 * Used for qualified names and class selectors.
 */
export const DOT: Regex<"\\.", { names: {}; flags: "u" }> = arkRegex.as(String.raw`\.`, "u");

/**
 * Whitespace (space and tab): `[ \t]`
 * Used between tag and argument.
 */
export const SPACE_TAB: Regex<"[ \\t]", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`[ \t]`,
  "u",
);

/**
 * Opening brace: `\{`
 * Used for inline tags.
 */
export const BRACE_OPEN: Regex<"\\{", { names: {}; flags: "u" }> = arkRegex.as(String.raw`\{`, "u");

/**
 * Closing brace: `\}`
 * Used for inline tags.
 */
export const BRACE_CLOSE: Regex<"\\}", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`\}`,
  "u",
);

/**
 * Opening parenthesis: `\(`
 * Used in function syntax like `:state(active)`.
 */
export const PAREN_OPEN: Regex<"\\(", { names: {}; flags: "u" }> = arkRegex.as(String.raw`\(`, "u");

/**
 * Closing parenthesis: `\)`
 * Used in function syntax like `:state(active)`.
 */
export const PAREN_CLOSE: Regex<"\\)", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`\)`,
  "u",
);

/**
 * Colon: `:`
 * Used in pseudo-classes and pseudo-elements.
 */
export const COLON: Regex<":", { names: {}; flags: "u" }> = arkRegex.as(String.raw`:`, "u");

/**
 * Hexadecimal digit: `[0-9a-fA-F]`
 * Used in color codes and unicode escape sequences.
 */
export const HEX_DIGIT: Regex<"[0-9a-fA-F]", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`[0-9a-fA-F]`,
  "u",
);

/**
 * Hexadecimal digit or wildcard: `[0-9a-fA-F?]`
 * Used in unicode range patterns where `?` acts as a wildcard.
 */
export const HEX_DIGIT_OR_WILDCARD: Regex<"[0-9a-fA-F?]", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`[0-9a-fA-F?]`,
  "u",
);

/**
 * CSS identifier start: `[a-zA-Z_\u0080-\uFFFF]`
 * Letter, underscore, or non-ASCII character.
 * Used as the first character of CSS identifiers, properties, and function names.
 */
export const CSS_IDENTIFIER_START: Regex<"[a-zA-Z_\\u0080-\\uFFFF]", { names: {}; flags: "u" }> =
  arkRegex.as(String.raw`[a-zA-Z_\u0080-\uFFFF]`, "u");

/**
 * CSS identifier start with dash: `[a-zA-Z_\-\u0080-\uFFFF]`
 * Letter, underscore, dash, or non-ASCII character.
 * Used in contexts like function names where dashes are allowed at the start.
 */
export const CSS_IDENTIFIER_START_WITH_DASH: Regex<
  "[a-zA-Z_\\-\\u0080-\\uFFFF]",
  { names: {}; flags: "u" }
> = arkRegex.as(String.raw`[a-zA-Z_\-\u0080-\uFFFF]`, "u");

/**
 * CSS identifier continuation: `[\w\-\u0080-\uFFFF]`
 * Word characters, dash, or non-ASCII character.
 * Used after the first character in CSS identifiers, properties, and function names.
 */
export const CSS_IDENTIFIER_CONT: Regex<"[\\w\\-\\u0080-\\uFFFF]", { names: {}; flags: "u" }> =
  arkRegex.as(String.raw`[\w\-\u0080-\uFFFF]`, "u");

/**
 * CSS identifier continuation without dash: `[\w\u0080-\uFFFF]`
 * Word characters or non-ASCII character (no dash).
 * Used in contexts like function names where dashes are not valid.
 */
export const CSS_IDENTIFIER_CONT_NO_DASH: Regex<"[\\w\\u0080-\\uFFFF]", { names: {}; flags: "u" }> =
  arkRegex.as(String.raw`[\w\u0080-\uFFFF]`, "u");

/**
 * Word boundary assertion: `\b`
 * Used to mark tag name boundaries and prevent partial matches.
 */
export const WORD_BOUNDARY: Regex<"\\b", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`\b`,
  "u",
);

// Re-export .source strings with convenient names for string templates
export const alpha: string = ALPHA.source;
export const alphaLower: string = ALPHA_LOWER.source;
export const alphaUpper: string = ALPHA_UPPER.source;
export const alphanumeric: string = ALPHANUMERIC.source;
export const alphanumericExtended: string = ALPHANUMERIC_EXTENDED.source;
export const digit: string = DIGIT.source;
export const dash: string = DASH.source;
export const doubleDash: string = DOUBLE_DASH.source;
export const dot: string = DOT.source;
export const spaceTab: string = SPACE_TAB.source;
export const braceOpen: string = BRACE_OPEN.source;
export const braceClose: string = BRACE_CLOSE.source;
export const parenOpen: string = PAREN_OPEN.source;
export const parenClose: string = PAREN_CLOSE.source;
export const colon: string = COLON.source;
export const hexDigit: string = HEX_DIGIT.source;
export const hexDigitOrWildcard: string = HEX_DIGIT_OR_WILDCARD.source;
export const cssIdentifierStart: string = CSS_IDENTIFIER_START.source;
export const cssIdentifierStartWithDash: string = CSS_IDENTIFIER_START_WITH_DASH.source;
export const cssIdentifierCont: string = CSS_IDENTIFIER_CONT.source;
export const cssIdentifierContNoDash: string = CSS_IDENTIFIER_CONT_NO_DASH.source;
export const wordBoundary: string = WORD_BOUNDARY.source;
