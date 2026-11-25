/**
 * @cssdoc/regex/definitions/patterns
 *
 * Unified Pattern Definitions — Single source of truth for all regex patterns.
 * Each pattern is defined once with both ArkRegex and string representations.
 * Patterns are organized by tier.
 *
 * @module
 */

import { regex as arkRegex } from "arkregex";
import type { UnifiedPatternDef, RawPatternDef } from "../types.ts";
import { createResolver, resolveAllPatterns } from "../lib.ts";
import { TIER_0_PATTERNS } from "./tier-0.ts";
import { TIER_1_PATTERNS } from "./tier-1.ts";
import { TIER_1_HTML_PATTERNS } from "./tier-1-html.ts";
import { TIER_1_MARKDOWN_PATTERNS } from "./tier-1-markdown.ts";
import { TIER_2_PATTERNS } from "./tier-2.ts";
import { TIER_3_PATTERNS } from "./tier-3.ts";

/**
 * Complete unified pattern definitions.
 * Patterns are resolved lazily to handle composition dependencies.
 */
export const PATTERN_DEFINITIONS: Record<string, UnifiedPatternDef> = (() => {
  const rawDefs: Record<string, RawPatternDef> = {
    ...TIER_0_PATTERNS,
    ...TIER_1_PATTERNS,
    ...TIER_1_HTML_PATTERNS,
    ...TIER_1_MARKDOWN_PATTERNS,
    ...TIER_2_PATTERNS,
    ...TIER_3_PATTERNS,
  };

  resolveAllPatterns(rawDefs);
  const resolver = createResolver(rawDefs);

  // Build final definitions with ArkRegex
  const result: Record<string, UnifiedPatternDef> = {};
  for (const [name, def] of Object.entries(rawDefs)) {
    const source = resolver(name);
    const flags = (def.flags || "") as "u" | "v" | "";

    result[name] = {
      ...def,
      name,
      source,
      ...(def.tier === 0 ? {} : { regex: arkRegex.as(source, flags as "u" | "v") }),
    };
  }

  return result;
})();
