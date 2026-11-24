/**
 * @cssdoc/regex/definitions
 *
 * Unified Pattern Definitions — Single source of truth for all regex patterns.
 * Each pattern is defined once with both ArkRegex and string representations.
 *
 * Patterns are organized by functional areas in the definitions/ directory:
 * - types.ts - TypeScript interfaces and types
 * - patterns.ts - Core pattern definitions (1700+ lines)
 * - Additional modular definitions can be added per tier or functional area
 *
 * @module
 */

export { type PatternResolver, type UnifiedPatternDef } from "./types.ts";
export { PATTERN_DEFINITIONS } from "./definitions/patterns.ts";
