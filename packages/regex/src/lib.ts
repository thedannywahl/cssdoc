/**
 * Utilities for working with ArkRegex patterns.
 *
 * @module @cssdoc/regex/lib
 */

import type { Regex } from "arkregex";

export type AnchorMode = "none" | "start" | "end" | "start-end";

/**
 * Convert an ArkRegex pattern to a native RegExp with the global flag for use with String.prototype.matchAll().
 *
 * ArkRegex extends RegExp but may not have the global flag set by default.
 * This utility ensures the pattern has the 'g' flag, which is required for matchAll().
 *
 * Optionally adds anchors (^ for start, $ for end) to match the entire string or its beginning/end.
 *
 * Works with patterns from any tier: W3C CSS, CssDoc Grammar, or cssdoc-specific patterns.
 *
 * @param arkRegex - An ArkRegex pattern object (which extends RegExp)
 * @param anchors - Anchor mode: "none" (default), "start", "end", or "start-end"
 * @returns A RegExp with the global flag enabled and optional anchors
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
 * import { RECORD_REFERENCE_NAME, toRegExp } from "@cssdoc/regex";
 *
 * // Match entire string from start to end
 * const fullMatch = toRegExp(RECORD_REFERENCE_NAME, "start-end");
 * if (fullMatch.test(value)) {
 *   console.log("Valid record reference name");
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
export const toRegExp = (arkRegex: Regex, anchors: AnchorMode = "none"): RegExp => {
  // ArkRegex extends RegExp, so .source and .flags are available
  let source = arkRegex.source;

  // Add anchors if requested
  if (anchors === "start" || anchors === "start-end") {
    source = `^${source}`;
  }
  if (anchors === "end" || anchors === "start-end") {
    source = `${source}$`;
  }

  const flags = arkRegex.flags.includes("g") ? arkRegex.flags : arkRegex.flags + "g";
  return new RegExp(source, flags);
};
