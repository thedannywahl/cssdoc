/**
 * Tier 1: W3C CSS Formal Grammar Patterns
 *
 * Patterns derived from the official W3C CSS specification:
 * https://www.w3.org/TR/css-2026/
 *
 * These are standard CSS constructs used across all stylesheets:
 * identifiers, keywords, colors, lengths, units, function names.
 *
 * All patterns use modern named capture groups for type safety and IDE completion.
 * References to Tier 0 (Character Classes) are documented for transparency on foundations.
 *
 * @module
 */

import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import {
  digit,
  doubleDash,
  hexDigit,
  hexDigitOrWildcard,
  cssIdentifierStart,
  cssIdentifierStartWithDash,
  cssIdentifierCont,
  cssIdentifierContNoDash,
} from "./character-classes.js";

/**
 * CSS identifier from W3C formal grammar.
 * Starts with letter, underscore, or non-ASCII; followed by word chars, hyphens, non-ASCII.
 * Pattern: `{ident}` → `[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*`
 *
 * @example
 * CSS_IDENTIFIER.exec("my-class")?.groups?.identifier // "my-class"
 * CSS_IDENTIFIER.exec("_private")?.groups?.identifier // "_private"
 * CSS_IDENTIFIER.exec("🎨color")?.groups?.identifier // "🎨color"
 */
export const CSS_IDENTIFIER: Regex<
  "(?<identifier>[a-zA-Z_\\u0080-\\uFFFF][\\w\\-\\u0080-\\uFFFF]*)",
  { names: { identifier: string } }
> = arkRegex.as(String.raw`(?<identifier>${cssIdentifierStart}${cssIdentifierCont}*)`, "u");

/**
 * CSS name from W3C formal grammar.
 * Similar to identifier but typically used for property/function names.
 * Pattern: `{name}` → `[a-zA-Z_\u0080-\uFFFF][\w\u0080-\uFFFF]*`
 *
 * @example
 * CSS_NAME.exec("background-color")?.groups?.name // "background-color"
 */
export const CSS_NAME: Regex<
  "(?<name>[a-zA-Z_\\u0080-\\uFFFF][\\w\\u0080-\\uFFFF]*)",
  { names: { name: string } }
> = arkRegex.as(String.raw`(?<name>${cssIdentifierStart}${cssIdentifierContNoDash}*)`, "u");

/**
 * CSS number from W3C formal grammar.
 * Integer or decimal number.
 * Composed from: Tier 0 DIGIT pattern
 *
 * @example
 * const match = CSS_NUMBER.exec("42");
 * match?.groups?.number // "42"
 * match?.groups?.decimal // undefined
 *
 * @example
 * const match = CSS_NUMBER.exec("3.14");
 * match?.groups?.number // "3.14"
 * match?.groups?.integer // "3"
 * match?.groups?.decimal // "14"
 */
const numberLiteralPattern = String.raw`${digit}+(?:\.${digit}+)?`;
export const CSS_NUMBER: Regex<
  "(?<number>(?<integer>\\d+)(?:\\.(?<decimal>\\d+))?)",
  { names: { number: string; integer: string; decimal?: string } }
> = arkRegex.as(String.raw`(?<number>(?<integer>${digit}+)(?:\.(?<decimal>${digit}+))?)`, "u");

/**
 * CSS percentage from W3C formal grammar.
 * Number followed by percent sign.
 * Composed from: Tier 0 digit pattern
 *
 * @example
 * CSS_PERCENTAGE.exec("50%")?.groups?.value // "50"
 */
export const CSS_PERCENTAGE: Regex<"(?<value>\\d+(?:\\.\\d+)?)%", { names: { value: string } }> =
  arkRegex.as(String.raw`(?<value>${numberLiteralPattern})%`, "u");

/**
 * CSS dimension from W3C formal grammar.
 * Number immediately followed by identifier (unit).
 * Uses Tier 0 digit pattern for numeric part.
 *
 * @example
 * const match = CSS_DIMENSION.exec("16px");
 * match?.groups?.value // "16"
 * match?.groups?.unit // "px"
 */
export const CSS_DIMENSION: Regex<
  "(?<value>\\d+(?:\\.\\d+)?)(?<unit>[a-zA-Z_\\u0080-\\uFFFF][\\w\\-\\u0080-\\uFFFF]*)",
  { names: { value: string; unit: string } }
> = arkRegex.as(
  String.raw`(?<value>${numberLiteralPattern})(?<unit>${cssIdentifierStart}${cssIdentifierCont}*)`,
  "u",
);

/**
 * CSS hash color from W3C formal grammar.
 * # followed by 3 or 6 hexadecimal digits.
 *
 * @example
 * CSS_HASH_COLOR.exec("#fff")?.groups?.color // "fff"
 * CSS_HASH_COLOR.exec("#ffffff")?.groups?.color // "ffffff"
 */
export const CSS_HASH_COLOR: Regex<
  "#(?<color>[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)",
  { names: { color: string } }
> = arkRegex.as(String.raw`#(?<color>${hexDigit}{3}(?:${hexDigit}{3})?)`, "u");

/**
 * CSS function from W3C formal grammar.
 * Function name (identifier) followed by opening parenthesis.
 * Uses Tier 0 SPACE_TAB pattern for whitespace.
 *
 * @example
 * CSS_FUNCTION.exec("rgb(")?.groups?.name // "rgb"
 * CSS_FUNCTION.exec("var (")?.groups?.name // "var"
 */
export const CSS_FUNCTION: Regex<
  "(?<name>[a-zA-Z_\\-\\u0080-\\uFFFF][\\w\\-\\u0080-\\uFFFF]*)[\\s\\t]*\\(",
  { names: { name: string } }
> = arkRegex.as(
  String.raw`(?<name>${cssIdentifierStartWithDash}${cssIdentifierCont}*)[ \t]*\(`,
  "u",
);

/**
 * CSS keyword from W3C formal grammar.
 * Reserved keywords in CSS (all lowercase for matching).
 *
 * @example
 * CSS_KEYWORD.exec("auto")?.groups?.keyword // "auto"
 * CSS_KEYWORD.exec("inherit")?.groups?.keyword // "inherit"
 */
export const CSS_KEYWORD: Regex<
  "(?<keyword>auto|inherit|initial|revert|unset)",
  { names: { keyword: string }; flags: "iu" }
> = arkRegex.as(String.raw`(?<keyword>auto|inherit|initial|revert|unset)`, "iu");

/**
 * CSS Unicode range from W3C formal grammar.
 * Pattern: `u+` followed by 1-6 hex digits, optional range with `?` or `-`.
 * Composed from: Tier 0 DIGIT pattern
 *
 * @example
 * CSS_UNICODE_RANGE.exec("u+26")?.groups?.start // "26"
 * CSS_UNICODE_RANGE.exec("u+0-7F")?.groups?.start // "0"
 * CSS_UNICODE_RANGE.exec("u+0025-00FF")?.groups?.range // "00FF"
 */
export const CSS_UNICODE_RANGE: Regex<
  "u\\+(?<start>[0-9a-fA-F?]{1,6})(?:-(?<range>[0-9a-fA-F]{1,6}))?",
  { names: { start: string; range?: string } }
> = arkRegex.as(
  String.raw`u\+(?<start>${hexDigitOrWildcard}{1,6})(?:-(?<range>${hexDigit}{1,6}))?`,
  "u",
);

/**
 * CSS property name from W3C formal grammar.
 * Standard CSS property name or custom property (variable).
 *
 * @example
 * CSS_PROPERTY_NAME.exec("background-color")?.groups?.name // "background-color"
 * CSS_PROPERTY_NAME.exec("--my-var")?.groups?.name // "--my-var"
 * const isCustomProp = !!CSS_PROPERTY_NAME.exec(input)?.groups?.custom;
 */
export const CSS_PROPERTY_NAME: Regex<
  "(?<name>(?<custom>--)?[a-zA-Z_\\u0080-\\uFFFF][\\w\\-\\u0080-\\uFFFF]*)",
  { names: { name: string; custom?: string } }
> = arkRegex.as(
  String.raw`(?<name>(?<custom>${doubleDash})?${cssIdentifierStart}${cssIdentifierCont}*)`,
  "u",
);

// Convenience string exports for use in template literals
export const cssIdentifier: string = CSS_IDENTIFIER.source;
export const cssName: string = CSS_NAME.source;
export const cssNumber: string = CSS_NUMBER.source;
export const cssPercentage: string = CSS_PERCENTAGE.source;
export const cssDimension: string = CSS_DIMENSION.source;
export const cssHashColor: string = CSS_HASH_COLOR.source;
export const cssFunction: string = CSS_FUNCTION.source;
export const cssKeyword: string = CSS_KEYWORD.source;
export const cssUnicodeRange: string = CSS_UNICODE_RANGE.source;
export const cssPropertyName: string = CSS_PROPERTY_NAME.source;

// Inner patterns for reuse in custom capture groups (without capture wrapper)
export const cssNamePattern: string = `${cssIdentifierStart}${cssIdentifierContNoDash}*`;
export const cssIdentifierPattern: string = `${cssIdentifierStart}${cssIdentifierCont}*`;
export const cssPropertyNamePattern: string = `(?:${doubleDash})?${cssIdentifierStart}${cssIdentifierCont}*`;
