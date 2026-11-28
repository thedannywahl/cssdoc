/**
 * \@cssdoc/regex/definitions
 *
 * Unified Pattern Definitions — Single source of truth for all regex patterns.
 * Each pattern is authored once as a native regex or literal syntax primitive.
 *
 * Patterns are organized by functional areas in the definitions/ directory:
 * - types.ts - TypeScript interfaces and types
 * - patterns.ts - Registry over the canonical native declarations
 * - Additional modular definitions can be added per tier or functional area
 *
 * @module
 */

export { type PatternDefinition, type UnifiedPatternDef } from "./types.ts";
export { PATTERN_DEFINITIONS } from "./definitions/patterns.ts";
