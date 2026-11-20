/**
 * Tier 1: W3C CSS Formal Grammar Patterns
 *
 * Patterns derived from the official W3C CSS specification:
 * https://www.w3.org/TR/CSS2/syndata.html#lexical-units
 *
 * These are standard CSS constructs used across all stylesheets:
 * identifiers, keywords, colors, lengths, units, function names.
 *
 * All patterns use modern named capture groups for type safety and IDE completion.
 *
 * @module
 */

import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";

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
> = arkRegex.as(String.raw`(?<identifier>[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)`, "u");

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
> = arkRegex.as(String.raw`(?<name>[a-zA-Z_\u0080-\uFFFF][\w\u0080-\uFFFF]*)`, "u");

/**
 * CSS number from W3C formal grammar.
 * Integer or decimal number.
 * Pattern: `{num}` → `\d+(?:\.\d+)?`
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
export const CSS_NUMBER: Regex<
  "(?<number>(?<integer>\\d+)(?:\\.(?<decimal>\\d+))?)",
  { names: { number: string; integer: string; decimal?: string } }
> = arkRegex.as(String.raw`(?<number>(?<integer>\d+)(?:\.(?<decimal>\d+))?)`, "u");

/**
 * CSS percentage from W3C formal grammar.
 * Number followed by percent sign.
 *
 * @example
 * CSS_PERCENTAGE.exec("50%")?.groups?.value // "50"
 */
export const CSS_PERCENTAGE: Regex<"(?<value>\\d+(?:\\.\\d+)?)%", { names: { value: string } }> =
  arkRegex.as(String.raw`(?<value>\d+(?:\.\d+)?)%`, "u");

/**
 * CSS dimension from W3C formal grammar.
 * Number immediately followed by identifier (unit).
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
  String.raw`(?<value>\d+(?:\.\d+)?)(?<unit>[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)`,
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
> = arkRegex.as(String.raw`#(?<color>[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)`, "u");

/**
 * CSS function from W3C formal grammar.
 * Function name (identifier) followed by opening parenthesis.
 *
 * @example
 * CSS_FUNCTION.exec("rgb(")?.groups?.name // "rgb"
 * CSS_FUNCTION.exec("var (")?.groups?.name // "var"
 */
export const CSS_FUNCTION: Regex<
  "(?<name>[a-zA-Z_\\-\\u0080-\\uFFFF][\\w\\-\\u0080-\\uFFFF]*)[\\s\\t]*\\(",
  { names: { name: string } }
> = arkRegex.as(String.raw`(?<name>[a-zA-Z_\-\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)[\s\t]*\(`, "u");

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
 *
 * @example
 * CSS_UNICODE_RANGE.exec("u+26")?.groups?.start // "26"
 * CSS_UNICODE_RANGE.exec("u+0-7F")?.groups?.start // "0"
 * CSS_UNICODE_RANGE.exec("u+0025-00FF")?.groups?.range // "00FF"
 */
export const CSS_UNICODE_RANGE: Regex<
  "u\\+(?<start>[0-9a-fA-F?]{1,6})(?:-(?<range>[0-9a-fA-F]{1,6}))?",
  { names: { start: string; range?: string } }
> = arkRegex.as(String.raw`u\+(?<start>[0-9a-fA-F?]{1,6})(?:-(?<range>[0-9a-fA-F]{1,6}))?`, "u");

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
> = arkRegex.as(String.raw`(?<name>(?<custom>--)?[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)`, "u");
