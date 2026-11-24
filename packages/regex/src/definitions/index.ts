/**
 * @cssdoc/regex/definitions/index
 *
 * Unified Pattern Definitions — Single source of truth for all regex patterns.
 * Organized by functional areas and tiers.
 *
 * @module
 */

export { type PatternResolver, type UnifiedPatternDef } from "./types.ts";

// Re-export the main pattern definitions from the original module
export { PATTERN_DEFINITIONS } from "./patterns.ts";
