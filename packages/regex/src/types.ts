/**
 * @cssdoc/regex/definitions/types
 *
 * Type definitions and interfaces for unified pattern definitions.
 *
 * @module
 */

import type { Regex } from "arkregex";

/** Resolver function type for composed patterns */
export type PatternResolver = (name: string, unwrap?: boolean) => string;

/**
 * Raw pattern definition — before regex compilation.
 * Used during pattern definition and composition.
 * Either `source` or `pattern` should be provided.
 */
export interface RawPatternDef {
  /** Grammar rule name from CssDoc.grammarkdown (primary key) */
  grammarRule?: string;

  /** Export name (e.g., ALPHA, CSS_IDENTIFIER) */
  name: string;

  /** Tier level */
  tier: 0 | 1 | 2 | 3 | 4;

  /** Raw pattern string (optional if pattern function is provided) */
  source?: string;

  /** Pattern composition function (for lazy evaluation) */
  pattern?: (resolve: PatternResolver, unwrap?: boolean) => string;

  /** Unicode flag: 'u' or 'v' */
  flags?: "u" | "v";

  /** Named capture groups and their descriptions */
  captures?: Record<string, string>;

  /** Human-readable description */
  description: string;

  /** Test fixtures */
  fixtures: {
    passes: Array<{ input: string; note?: string }>;
    fails: Array<{ input: string; reason: string }>;
  };

  /** Names of patterns this composes */
  composedFrom?: string[];

  /** Related pattern names */
  relatedPatterns?: string[];
}

/**
 * Unified pattern definition — combines ArkRegex, string, metadata, and fixtures.
 */
export interface UnifiedPatternDef {
  /** Grammar rule name from CssDoc.grammarkdown (primary key) */
  grammarRule?: string;

  /** Export name (e.g., ALPHA, CSS_IDENTIFIER) */
  name: string;

  /** Tier level */
  tier: 0 | 1 | 2 | 3 | 4;

  /** Raw pattern string (always present) */
  source: string;

  /** Compiled ArkRegex object (for type-safe direct use, optional for Tier 0) */
  regex?: Regex;

  /** Unicode flag: 'u' or 'v' */
  flags?: "u" | "v";

  /** Named capture groups and their descriptions */
  captures?: Record<string, string>;

  /** Human-readable description */
  description: string;

  /** Test fixtures */
  fixtures: {
    passes: Array<{ input: string; note?: string }>;
    fails: Array<{ input: string; reason: string }>;
  };

  /** Names of patterns this composes */
  composedFrom?: string[];

  /** Related pattern names */
  relatedPatterns?: string[];
}
