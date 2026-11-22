/**
 * Utilities for working with ArkRegex patterns.
 *
 * @module @cssdoc/regex/lib
 */

import type { Regex } from "arkregex";

/**
 * Convert an ArkRegex pattern to a native RegExp with the global flag for use with String.prototype.matchAll().
 *
 * ArkRegex extends RegExp but may not have the global flag set by default.
 * This utility ensures the pattern has the 'g' flag, which is required for matchAll().
 *
 * Works with patterns from any tier: W3C CSS, CssDoc Grammar, or cssdoc-specific patterns.
 *
 * @param arkRegex - An ArkRegex pattern object (which extends RegExp)
 * @returns A RegExp with the global flag enabled
 *
 * @example
 * ```typescript
 * import { CSSDOC_STRUCTURE_CLASS, toRegExp } from "@cssdoc/regex";
 *
 * const pattern = toRegExp(CSSDOC_STRUCTURE_CLASS);
 * for (const match of text.matchAll(pattern)) {
 *   console.log(match[0]);
 * }
 * ```
 *
 * @example
 * ```typescript
 * import { CSS_IDENTIFIER, toRegExp } from "@cssdoc/regex";
 *
 * // Works with CSS spec patterns too
 * const pattern = toRegExp(CSS_IDENTIFIER);
 * for (const match of text.matchAll(pattern)) {
 *   console.log(match[0]);
 * }
 * ```
 */
export const toRegExp = (arkRegex: Regex): RegExp => {
  // ArkRegex extends RegExp, so .source and .flags are available
  const flags = arkRegex.flags.includes("g") ? arkRegex.flags : arkRegex.flags + "g";
  return new RegExp(arkRegex.source, flags);
};
