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
