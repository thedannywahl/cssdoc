/**
 * \@cssdoc/regex/definitions/types
 *
 * Type definitions and interfaces for unified pattern definitions.
 *
 * @module
 */

/** Pattern metadata derived from a native regex or literal syntax primitive. */
export interface UnifiedPatternDef {
  /** Related production name in the grammar identified by `grammarSource`. */
  grammarRule?: string;
  /** Which grammar owns `grammarRule`. */
  grammarSource?: "cssdoc" | "css";
  /** Whether the pattern matches the production, a fragment, or a related heuristic. */
  grammarRelation?: "exact" | "fragment" | "related";

  /** Export name (e.g., ALPHA, CSS_IDENTIFIER) */
  name: string;

  /** Tier level */
  tier: 0 | 1 | 2 | 3 | 4;

  /** Raw pattern string (always present) */
  source: string;

  /** Canonical native regex; absent only for literal syntax primitives. */
  regex?: RegExp;

  /** Flags from the native regex. */
  flags?: string;

  /** Named capture groups and their descriptions */
  captures?: Record<string, string>;

  /** Human-readable description */
  description: string;

  /** Test fixtures */
  fixtures: {
    /** Inputs expected to match the pattern. */
    passes: Array<{
      /** Input to test. */
      input: string;
      /** Optional context for the example. */
      note?: string;
    }>;
    /** Inputs expected not to match the pattern. */
    fails: Array<{
      /** Input to test. */
      input: string;
      /** Why the input should not match. */
      reason: string;
    }>;
  };

  /** Related grammar fragments; descriptive metadata, not runtime composition. */
  composedFrom?: string[];

  /** Related pattern names */
  relatedPatterns?: string[];
}

/** Author a native regex or a literal primitive, never a separate regex source. */
export type PatternDefinition = Omit<UnifiedPatternDef, "source" | "regex" | "flags"> &
  ({ regex: RegExp; source?: never } | { source: string; regex?: never });
