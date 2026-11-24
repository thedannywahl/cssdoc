/**
 * @cssdoc/regex/patterns
 *
 * Pattern Registry — Single source of truth for all regex patterns.
 * Each pattern includes:
 * - Pattern string (the actual regex to compile)
 * - Metadata (description, examples, tier, grammar rule, etc.)
 *
 * This consolidates pattern definitions from tier files into one registry,
 * eliminating duplication and providing a queryable interface.
 *
 * @module
 */

import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";

/**
 * Metadata for a single regex pattern in the registry.
 */
export interface PatternDef {
  /** Pattern string in String.raw format */
  pattern: string;

  /** Named capture groups and their descriptions */
  captures?: Record<string, string>;

  /** Tier level: 0=character classes, 1=CSS spec, 2=CssDoc grammar, 3=cssdoc-specific, 4=complete */
  tier: 0 | 1 | 2 | 3 | 4;

  /** Human-readable description */
  description: string;

  /** Example strings that should match */
  examples?: string[];

  /** Pattern status: stable, beta, or deprecated */
  status?: "stable" | "beta" | "deprecated";

  /** Source file location where this was originally defined */
  source?: string;

  /** Grammar rule this implements */
  grammarRule?: string;

  /** Names of patterns this uses in composition */
  composedFrom?: string[];

  /** Array name in fixtures */
  fixturesRef?: string;

  /** Unicode flag: 'u' or 'v' (default 'u') */
  flags?: "u" | "v";
}

/**
 * Complete pattern registry.
 * Key = pattern name, value = pattern definition + metadata.
 *
 * We use string patterns with inline regex syntax (no template variable interpolation).
 * The pattern builder resolves composition at runtime by substituting pattern strings.
 */
export const PATTERNS: Record<string, PatternDef> = {
  // ============================================================================
  // Tier 0: Character Classes
  // ============================================================================

  ALPHA: {
    pattern: String.raw`[A-Za-z]`,
    tier: 0,
    description: "Alphabetic characters [a-zA-Z]",
    examples: ["a", "Z", "m"],
    status: "stable",
    source: "character-classes.ts:12",
  },

  ALPHA_LOWER: {
    pattern: String.raw`[a-z]`,
    tier: 0,
    description: "Lowercase alphabetic [a-z]",
    examples: ["a", "z", "m"],
    status: "stable",
    source: "character-classes.ts:18",
  },

  ALPHA_UPPER: {
    pattern: String.raw`[A-Z]`,
    tier: 0,
    description: "Uppercase alphabetic [A-Z]",
    examples: ["A", "Z", "M"],
    status: "stable",
    source: "character-classes.ts:24",
  },

  ALPHANUMERIC: {
    pattern: String.raw`[0-9A-Za-z]`,
    tier: 0,
    description: "Alphanumeric character [0-9A-Za-z]",
    examples: ["0", "a", "Z"],
    status: "stable",
    source: "character-classes.ts:30",
  },

  ALPHANUMERIC_EXTENDED: {
    pattern: String.raw`[A-Za-z0-9_-]`,
    tier: 0,
    description: "Alphanumeric with underscore and dash [A-Za-z0-9_-]",
    examples: ["a", "0", "_", "-"],
    status: "stable",
    source: "character-classes.ts:36",
  },

  DIGIT: {
    pattern: String.raw`[0-9]`,
    tier: 0,
    description: "Single digit [0-9]",
    examples: ["0", "5", "9"],
    status: "stable",
    source: "character-classes.ts:42",
  },

  DASH: {
    pattern: String.raw`-`,
    tier: 0,
    description: "Hyphen-minus character: -",
    examples: ["-"],
    status: "stable",
    source: "character-classes.ts:48",
  },

  DOUBLE_DASH: {
    pattern: String.raw`--`,
    tier: 0,
    description: "Double hyphen: --",
    examples: ["--"],
    status: "stable",
    source: "character-classes.ts:54",
  },

  DOT: {
    pattern: String.raw`\.`,
    tier: 0,
    description: "Dot/period character: .",
    examples: ["."],
    status: "stable",
    source: "character-classes.ts:60",
  },

  SPACE_TAB: {
    pattern: String.raw`[ \t]`,
    tier: 0,
    description: "Whitespace: space or tab",
    examples: [" ", "\t"],
    status: "stable",
    source: "character-classes.ts:66",
  },

  BRACE_OPEN: {
    pattern: String.raw`\{`,
    tier: 0,
    description: "Opening brace {",
    examples: ["{"],
    status: "stable",
    source: "character-classes.ts:72",
  },

  BRACE_CLOSE: {
    pattern: String.raw`\}`,
    tier: 0,
    description: "Closing brace }",
    examples: ["}"],
    status: "stable",
    source: "character-classes.ts:78",
  },

  PAREN_OPEN: {
    pattern: String.raw`\(`,
    tier: 0,
    description: "Opening parenthesis (",
    examples: ["("],
    status: "stable",
    source: "character-classes.ts:84",
  },

  PAREN_CLOSE: {
    pattern: String.raw`\)`,
    tier: 0,
    description: "Closing parenthesis )",
    examples: [")"],
    status: "stable",
    source: "character-classes.ts:90",
  },

  COLON: {
    pattern: String.raw`:`,
    tier: 0,
    description: "Colon :",
    examples: [":"],
    status: "stable",
    source: "character-classes.ts:96",
  },

  QUOTE: {
    pattern: String.raw`["']`,
    tier: 0,
    description: "Single or double quote: \" or '",
    examples: ['"', "'"],
    status: "stable",
    source: "character-classes.ts:102",
  },

  HEX_DIGIT: {
    pattern: String.raw`[0-9a-fA-F]`,
    tier: 0,
    description: "Hexadecimal digit [0-9a-fA-F]",
    examples: ["0", "a", "F"],
    status: "stable",
    source: "character-classes.ts:108",
  },

  HEX_DIGIT_OR_WILDCARD: {
    pattern: String.raw`[0-9a-fA-F?]`,
    tier: 0,
    description: "Hexadecimal digit or wildcard [0-9a-fA-F?]",
    examples: ["0", "a", "?"],
    status: "stable",
    source: "character-classes.ts:114",
  },

  CSS_IDENTIFIER_START: {
    pattern: String.raw`[a-zA-Z_\u0080-\uFFFF]`,
    tier: 0,
    description: "CSS identifier start character",
    examples: ["a", "_", "🎨"],
    status: "stable",
    source: "character-classes.ts:120",
  },

  CSS_IDENTIFIER_START_WITH_DASH: {
    pattern: String.raw`[a-zA-Z_\-\u0080-\uFFFF]`,
    tier: 0,
    description: "CSS identifier start with dash allowed",
    examples: ["a", "_", "-", "🎨"],
    status: "stable",
    source: "character-classes.ts:126",
  },

  CSS_IDENTIFIER_CONT: {
    pattern: String.raw`[\w\-\u0080-\uFFFF]`,
    tier: 0,
    description: "CSS identifier continuation character",
    examples: ["a", "0", "_", "-", "🎨"],
    status: "stable",
    source: "character-classes.ts:132",
  },

  CSS_IDENTIFIER_CONT_NO_DASH: {
    pattern: String.raw`[\w\u0080-\uFFFF]`,
    tier: 0,
    description: "CSS identifier continuation without dash",
    examples: ["a", "0", "_", "🎨"],
    status: "stable",
    source: "character-classes.ts:138",
  },

  WORD_BOUNDARY: {
    pattern: String.raw`\b`,
    tier: 0,
    description: "Word boundary assertion",
    examples: [],
    status: "stable",
    source: "character-classes.ts:144",
  },

  // ============================================================================
  // Tier 1: W3C CSS Formal Grammar Patterns
  // Note: Patterns that require variable interpolation will be expanded in Tier 2+
  // ============================================================================

  CSS_IDENTIFIER: {
    pattern: String.raw`(?<identifier>[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)`,
    captures: { identifier: "Full CSS identifier" },
    tier: 1,
    description: "CSS identifier from W3C formal grammar",
    examples: ["my-class", "_private", "🎨color"],
    status: "stable",
    composedFrom: ["CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    source: "css-spec.ts:30",
    grammarRule: "ident",
  },

  CSS_NAME: {
    pattern: String.raw`(?<name>[a-zA-Z_\u0080-\uFFFF][\w\u0080-\uFFFF]*)`,
    captures: { name: "CSS name without dashes" },
    tier: 1,
    description: "CSS name from W3C formal grammar",
    examples: ["background", "color", "functionName"],
    status: "stable",
    composedFrom: ["CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT_NO_DASH"],
    source: "css-spec.ts:50",
    grammarRule: "name",
  },

  CSS_NUMBER: {
    pattern: String.raw`(?<number>(?<integer>\d+)(?:\.(?<decimal>\d+))?)`,
    captures: {
      number: "Full number",
      integer: "Integer part",
      decimal: "Decimal part (optional)",
    },
    tier: 1,
    description: "CSS number from W3C formal grammar",
    examples: ["42", "3.14", "0"],
    status: "stable",
    composedFrom: ["DIGIT"],
    source: "css-spec.ts:70",
    grammarRule: "number",
  },

  CSS_PERCENTAGE: {
    pattern: String.raw`(?<value>\d+(?:\.\d+)?)%`,
    captures: { value: "Numeric value without percent sign" },
    tier: 1,
    description: "CSS percentage from W3C formal grammar",
    examples: ["50%", "100%", "33.33%"],
    status: "stable",
    composedFrom: ["DIGIT"],
    source: "css-spec.ts:90",
    grammarRule: "percentage",
  },

  CSS_DIMENSION: {
    pattern: String.raw`(?<value>\d+(?:\.\d+)?)(?<unit>[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)`,
    captures: { value: "Numeric value", unit: "Unit name (px, em, etc)" },
    tier: 1,
    description: "CSS dimension from W3C formal grammar",
    examples: ["16px", "2.5em", "100%"],
    status: "stable",
    composedFrom: ["DIGIT", "CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    source: "css-spec.ts:106",
    grammarRule: "dimension",
  },

  CSS_HASH_COLOR: {
    pattern: String.raw`#(?<color>[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)`,
    captures: { color: "Hex color without #" },
    tier: 1,
    description: "CSS hash color from W3C formal grammar",
    examples: ["#fff", "#ffffff", "#000"],
    status: "stable",
    composedFrom: ["HEX_DIGIT"],
    source: "css-spec.ts:122",
    grammarRule: "hash",
  },

  CSS_FUNCTION: {
    pattern: String.raw`(?<name>[a-zA-Z_\-\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)[ \t]*\(`,
    captures: { name: "Function name" },
    tier: 1,
    description: "CSS function from W3C formal grammar",
    examples: ["rgb(", "var(", "calc("],
    status: "stable",
    composedFrom: ["CSS_IDENTIFIER_START_WITH_DASH", "CSS_IDENTIFIER_CONT", "SPACE_TAB"],
    source: "css-spec.ts:138",
    grammarRule: "function",
  },

  CSS_KEYWORD: {
    pattern: String.raw`(?<keyword>auto|inherit|initial|revert|unset)`,
    captures: { keyword: "CSS keyword" },
    tier: 1,
    description: "CSS reserved keywords",
    examples: ["auto", "inherit", "initial"],
    status: "stable",
    source: "css-spec.ts:154",
    grammarRule: "keyword",
    flags: "u",
  },

  CSS_UNICODE_RANGE: {
    pattern: String.raw`u\+(?<start>[0-9a-fA-F?]{1,6})(?:-(?<range>[0-9a-fA-F]{1,6}))?`,
    captures: { start: "Start of range", range: "End of range (optional)" },
    tier: 1,
    description: "CSS Unicode range from W3C formal grammar",
    examples: ["u+26", "u+0-7F", "u+0025-00FF"],
    status: "stable",
    composedFrom: ["HEX_DIGIT_OR_WILDCARD", "HEX_DIGIT"],
    source: "css-spec.ts:168",
    grammarRule: "unicode-range",
  },

  CSS_PROPERTY_NAME: {
    pattern: String.raw`(?<name>(?<custom>--)?[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)`,
    captures: { name: "Full property name", custom: "Double dash if custom property" },
    tier: 1,
    description: "CSS property name or custom property",
    examples: ["background-color", "--my-var", "color"],
    status: "stable",
    composedFrom: ["DOUBLE_DASH", "CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    source: "css-spec.ts:184",
    grammarRule: "property-name",
  },
};

/**
 * Cache of built Regex objects, keyed by pattern name.
 * Built on-demand by buildPattern().
 */
const patternCache = new Map<string, Regex<any, any>>();

/**
 * Build a Regex object from a pattern definition.
 * Caches the result for performance.
 *
 * @throws if pattern name not found
 */
export function buildPattern(name: string): Regex<any, any> {
  if (patternCache.has(name)) {
    return patternCache.get(name)!;
  }

  const def = PATTERNS[name];
  if (!def) {
    throw new Error(`Pattern not found: ${name}`);
  }

  const flags = def.flags || "u";
  const regex = arkRegex.as(def.pattern, flags) as Regex<any, any>;
  patternCache.set(name, regex);
  return regex;
}

/**
 * Get pattern string (for use in template literals).
 */
export function getPatternString(name: string): string {
  const def = PATTERNS[name];
  if (!def) {
    throw new Error(`Pattern not found: ${name}`);
  }
  return def.pattern;
}

/**
 * Get pattern metadata.
 */
export function getPatternMetadata(name: string): PatternDef | undefined {
  return PATTERNS[name];
}

/**
 * Get all patterns by tier.
 */
export function getPatternsByTier(tier: 0 | 1 | 2 | 3 | 4): PatternDef[] {
  return Object.entries(PATTERNS)
    .filter(([, def]) => def.tier === tier)
    .map(([, def]) => def);
}

/**
 * Get all patterns by grammar rule.
 */
export function getPatternsByGrammarRule(rule: string): PatternDef[] {
  return Object.entries(PATTERNS)
    .filter(([, def]) => def.grammarRule === rule)
    .map(([, def]) => def);
}

/**
 * Get all patterns by status.
 */
export function getPatternsByStatus(status: "stable" | "beta" | "deprecated"): PatternDef[] {
  return Object.entries(PATTERNS)
    .filter(([, def]) => def.status === status)
    .map(([, def]) => def);
}

/**
 * Query: get all patterns that compose a given pattern.
 */
export function getPatternsComposingOf(name: string): Record<string, PatternDef> {
  const result: Record<string, PatternDef> = {};
  for (const [pName, def] of Object.entries(PATTERNS)) {
    if (def.composedFrom?.includes(name)) {
      result[pName] = def;
    }
  }
  return result;
}
