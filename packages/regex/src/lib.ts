/**
 * Utilities for working with ArkRegex patterns.
 *
 * @module @cssdoc/regex/lib
 */

import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import type { PatternResolver, UnifiedPatternDef } from "./types.ts";
import { REGEX_METACHARACTER_SOURCE } from "./definitions/tier-0.ts";

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
export const toRegExp = (pattern: Regex, anchors: AnchorMode = "none"): RegExp => {
  // ArkRegex extends RegExp, so .source and .flags are available
  let source = pattern.source;

  // Add anchors if requested
  if (anchors === "start" || anchors === "start-end") {
    source = `^${source}`;
  }
  if (anchors === "end" || anchors === "start-end") {
    source = `${source}$`;
  }

  const flags = pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g";
  return arkRegex.as(source, flags as Parameters<typeof arkRegex.as>[1]);
};

/**
 * Compile regex for a pattern.
 * Tier 0 patterns compile on-access from source; tier 1+ are precompiled.
 */
export function compileRegex(def: UnifiedPatternDef): Regex {
  if (def.regex) return def.regex;
  return arkRegex.as(def.source, (def.flags || "") as "u" | "v" | "") as Regex;
}

/**
 * Escape a character for use in a regex pattern.
 * Special regex characters are escaped; others pass through.
 */
export function escapeRegexChar(char: string): string {
  const regexSpecialChar = arkRegex.as(REGEX_METACHARACTER_SOURCE);
  return regexSpecialChar.test(char) ? `\\${char}` : char;
}

/** Escape regex metacharacters in a string for use as literal pattern text. */
export function escapeRegex(text: string): string {
  const METACHARACTER: Regex = arkRegex.as(REGEX_METACHARACTER_SOURCE, "gu");
  return text.replace(METACHARACTER, "\\$&");
}

/**
 * Helper to escape a character reference for use in regex.
 * If the pattern needs escaping (like `.` → `\.`), applies escapeRegexChar.
 */
export function escapeChar(resolve: PatternResolver, charName: string): string {
  const char = resolve(charName);
  const escaped = escapeRegexChar(char);
  return escaped;
}

/**
 * Create a resolver function for pattern composition.
 * Resolves pattern sources from rawDefs, with optional unwrapping of character classes.
 */
export function createResolver(rawDefs: Record<string, any>): PatternResolver {
  const bracketOpen = rawDefs.BRACKET_OPEN_CHAR?.source || "[";
  const bracketClose = rawDefs.BRACKET_CLOSE_CHAR?.source || "]";

  return (name: string, unwrap?: boolean) => {
    const def = rawDefs[name];
    if (!def) throw new Error(`Pattern not found: ${name}`);

    if (def.source) {
      return unwrap && def.source.startsWith(bracketOpen) && def.source.endsWith(bracketClose)
        ? def.source.slice(bracketOpen.length, -bracketClose.length)
        : def.source;
    }
    if (def.pattern) return def.pattern(createResolver(rawDefs), unwrap);

    throw new Error(`No source or pattern for ${name}`);
  };
}

/**
 * Resolve all pattern sources once at startup.
 * This handles lazy composition and prevents circular dependencies.
 */
export function resolveAllPatterns(rawDefs: Record<string, any>): void {
  const resolver = createResolver(rawDefs);
  for (const def of Object.values(rawDefs)) {
    if (!def.source && def.pattern) {
      def.source = def.pattern(resolver, false);
    }
  }
}
