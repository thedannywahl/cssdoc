/**
 * @cssdoc/regex/registry
 *
 * Pattern Registry — a queryable, type-safe central registry of all regex patterns
 * linking each pattern to its grammar rule, tier level, examples, and source location.
 *
 * Uses ArkType for schema definition and runtime validation.
 *
 * @module
 */

/**
 * Metadata for a single regex pattern in the registry.
 */
export interface PatternMetadata {
  /** The grammar rule this pattern implements (e.g., "Identifier", "ModifierName") */
  grammarRule?: string;

  /** Tier level: 0=character classes, 1=CSS spec, 2=CssDoc grammar, 3=cssdoc-specific, 4=complete patterns */
  tier: 0 | 1 | 2 | 3 | 4;

  /** Human-readable description of what this pattern matches */
  description: string;

  /** Example strings that should match this pattern */
  examples?: string[];

  /** Named capture groups this pattern defines and their types */
  captures?: Record<string, string>;

  /** Pattern status: stable (default), beta, or deprecated */
  status?: "stable" | "beta" | "deprecated";

  /** Source file location where this pattern is defined (e.g., "css-spec.ts:45") */
  source?: string;

  /** Related pattern names in the registry */
  related?: string[];

  /** Array name in fixtures (e.g., "cssIdentifierFixtures" for fixtures/tier-1/css-spec.fixtures.ts) */
  fixturesRef?: string;
}

/**
 * Complete registry of all regex patterns, indexed by pattern name.
 * This is populated with metadata for every pattern exported from @cssdoc/regex.
 */
export const PATTERN_REGISTRY: Record<string, PatternMetadata> = {
  // ============================================================================
  // Tier 0: Character Classes
  // ============================================================================

  ALPHA: {
    tier: 0,
    description: "Alphabetic characters [a-zA-Z]",
    examples: ["a", "Z", "m"],
    source: "character-classes.ts:12",
    status: "stable",
  },

  ALPHA_LOWER: {
    tier: 0,
    description: "Lowercase alphabetic [a-z]",
    examples: ["a", "z", "m"],
    source: "character-classes.ts:18",
    status: "stable",
  },

  ALPHA_UPPER: {
    tier: 0,
    description: "Uppercase alphabetic [A-Z]",
    examples: ["A", "Z", "M"],
    source: "character-classes.ts:24",
    status: "stable",
  },

  DIGIT: {
    tier: 0,
    description: "Single digit [0-9]",
    examples: ["0", "5", "9"],
    source: "character-classes.ts:30",
    status: "stable",
  },

  DASH: {
    tier: 0,
    description: "Hyphen-minus character: -",
    examples: ["-"],
    source: "character-classes.ts:36",
    status: "stable",
  },

  DOUBLE_DASH: {
    tier: 0,
    description: "Double hyphen: --",
    examples: ["--"],
    source: "character-classes.ts:42",
    status: "stable",
  },

  DOT: {
    tier: 0,
    description: "Period character: .",
    examples: ["."],
    source: "character-classes.ts:48",
    status: "stable",
  },

  COLON: {
    tier: 0,
    description: "Colon character: :",
    examples: [":"],
    source: "character-classes.ts:54",
    status: "stable",
  },

  SPACE_TAB: {
    tier: 0,
    description: "Space or horizontal tab whitespace",
    examples: [" ", "\t"],
    source: "character-classes.ts:60",
    status: "stable",
  },

  BRACE_OPEN: {
    tier: 0,
    description: "Opening curly brace: {",
    examples: ["{"],
    source: "character-classes.ts:66",
    status: "stable",
  },

  BRACE_CLOSE: {
    tier: 0,
    description: "Closing curly brace: }",
    examples: ["}"],
    source: "character-classes.ts:72",
    status: "stable",
  },

  PAREN_OPEN: {
    tier: 0,
    description: "Opening parenthesis: (",
    examples: ["("],
    source: "character-classes.ts:78",
    status: "stable",
  },

  PAREN_CLOSE: {
    tier: 0,
    description: "Closing parenthesis: )",
    examples: [")"],
    source: "character-classes.ts:84",
    status: "stable",
  },

  // ============================================================================
  // Tier 1: W3C CSS Spec
  // ============================================================================

  CSS_IDENTIFIER_START: {
    grammarRule: "IdentifierStart",
    tier: 1,
    description: "CSS identifier start character: letter or underscore per W3C CSS 2026",
    examples: ["a", "_", "Z"],
    source: "css-spec.ts:12",
    status: "stable",
  },

  CSS_IDENTIFIER_CONT: {
    grammarRule: "IdentifierPart",
    tier: 1,
    description:
      "CSS identifier continuation: letter, digit, underscore, or hyphen per W3C CSS 2026",
    examples: ["a", "1", "-", "_"],
    source: "css-spec.ts:24",
    status: "stable",
  },

  CSS_IDENTIFIER: {
    grammarRule: "Identifier",
    tier: 1,
    description:
      "CSS identifier: starts with letter/underscore, continues with letter/digit/underscore/hyphen per W3C CSS 2026",
    examples: ["button", "my-component", "_private", "a1"],
    captures: { identifier: "string" },
    source: "css-spec.ts:36",
    status: "stable",
  },

  CSS_NAME: {
    tier: 1,
    description: "CSS name token (non-whitespace, non-special characters)",
    examples: ["color", "background-image"],
    source: "css-spec.ts:48",
    status: "stable",
  },

  CSS_PROPERTY_NAME: {
    grammarRule: "PropertyName",
    tier: 1,
    description: "CSS custom property: -- prefix followed by identifier per W3C CSS 2026",
    examples: ["--color", "--my-prop", "--_private"],
    captures: { name: "string" },
    source: "css-spec.ts:60",
    status: "stable",
  },

  CSS_FUNCTION: {
    grammarRule: "Function",
    tier: 1,
    description: "CSS function: identifier followed by ( per W3C CSS 2026",
    examples: ["rgb(", "var(", "calc("],
    captures: { name: "string" },
    source: "css-spec.ts:72",
    status: "stable",
  },

  CSS_NUMBER: {
    grammarRule: "Number",
    tier: 1,
    description: "CSS number: integer or decimal per W3C CSS 2026",
    examples: ["123", "0.5", "-42"],
    captures: { number: "string" },
    source: "css-spec.ts:84",
    status: "stable",
  },

  CSS_PERCENTAGE: {
    grammarRule: "Percentage",
    tier: 1,
    description: "CSS percentage: number followed by % per W3C CSS 2026",
    examples: ["50%", "0.5%", "-100%"],
    captures: { number: "string" },
    source: "css-spec.ts:96",
    status: "stable",
  },

  CSS_DIMENSION: {
    grammarRule: "Dimension",
    tier: 1,
    description: "CSS dimension: number followed by unit identifier per W3C CSS 2026",
    examples: ["12px", "1.5em", "360deg"],
    captures: { number: "string", unit: "string" },
    source: "css-spec.ts:108",
    status: "stable",
  },

  CSS_HASH_COLOR: {
    tier: 1,
    description: "CSS hex color: # followed by 3 or 6 hex digits per W3C CSS 2026",
    examples: ["#fff", "#ffffff", "#abc"],
    captures: { color: "string" },
    source: "css-spec.ts:120",
    status: "stable",
  },

  CSS_KEYWORD: {
    tier: 1,
    description: "CSS keyword: identifier with no digits or special chars per W3C CSS 2026",
    examples: ["inherit", "initial", "auto"],
    source: "css-spec.ts:132",
    status: "stable",
  },

  CSS_UNICODE_RANGE: {
    tier: 1,
    description:
      "CSS unicode-range: U+ followed by hex digits and optional wildcard per W3C CSS 2026",
    examples: ["U+0025", "U+0??", "U+0025-00FF"],
    source: "css-spec.ts:144",
    status: "stable",
  },

  // ============================================================================
  // Tier 2: CssDoc Grammar (from CssDoc.grammarkdown)
  // ============================================================================

  CSSDOC_IDENTIFIER: {
    grammarRule: "Identifier",
    tier: 2,
    description:
      "CssDoc identifier: letter/underscore start, letter/digit/underscore/hyphen continuation",
    examples: ["button", "my-component", "_private"],
    captures: { identifier: "string" },
    source: "css-doc-grammar.ts:12",
    status: "stable",
  },

  CSSDOC_RECORD_NAME: {
    grammarRule: "RecordName",
    tier: 2,
    description:
      "CssDoc record name: unqualified identifier or dotted qualified name (e.g., menu.item)",
    examples: ["button", "progress-circle", "menu.item", "dialog.header"],
    captures: { record: "string", member: "string | undefined" },
    source: "css-doc-grammar.ts:24",
    status: "stable",
  },

  CSSDOC_MODIFIER_SUFFIX: {
    grammarRule: "SuffixModifierName",
    tier: 2,
    description: "Suffix form modifier: identifier--value (e.g., button--primary)",
    examples: ["button--primary", "size--large", "button--icon-*"],
    captures: { base: "string", value: "string" },
    source: "css-doc-grammar.ts:36",
    status: "stable",
  },

  CSSDOC_MODIFIER_CHAINED: {
    grammarRule: "ChainedModifierName",
    tier: 2,
    description: "Chained form modifier: -prop or -prop-value (e.g., -size or -size-large)",
    examples: ["-primary", "-size-large", "-icon-*"],
    captures: { prop: "string", value: "string | undefined" },
    source: "css-doc-grammar.ts:48",
    status: "stable",
  },

  CSSDOC_MODIFIER_ATTRIBUTE: {
    grammarRule: "AttributeModifier",
    tier: 2,
    description:
      'Attribute form modifier: [name] or [name operator value] (e.g., [data-layout] or [role="button"])',
    examples: ["[data-layout]", '[role="button"]', '[class*="-icon"]'],
    captures: { name: "string", operator: "string | undefined", value: "string | undefined" },
    source: "css-doc-grammar.ts:60",
    status: "stable",
  },

  CSSDOC_TAG: {
    grammarRule: "RecordKeyword",
    tier: 2,
    description:
      "CssDoc record tag keyword: @component, @name, @utility, @rule, @declaration, @layout",
    examples: ["@component", "@utility", "@declaration"],
    captures: { tag: "string" },
    source: "css-doc-grammar.ts:72",
    status: "stable",
  },

  CSSDOC_CUSTOM_PROPERTY: {
    grammarRule: "CustomPropertyName",
    tier: 2,
    description: "CSS custom property: -- prefix followed by identifier",
    examples: ["--primary-color", "--_private", "--color"],
    captures: { name: "string" },
    source: "css-doc-grammar.ts:84",
    status: "stable",
  },

  CSSDOC_STRUCTURE_CLASS: {
    grammarRule: "ClassSelector",
    tier: 2,
    description: "Class selector in structure: dot followed by identifier (e.g., .button)",
    examples: [".button", ".alert-box", ".icon"],
    captures: { class: "string" },
    source: "css-doc-grammar.ts:96",
    status: "stable",
  },

  CSSDOC_INLINE_REF: {
    grammarRule: "CssReference",
    tier: 2,
    description: "Inline reference in {@ tags: modifier, part name, or record name",
    examples: ["-primary", ".icon", "button", "menu.item"],
    source: "css-doc-grammar.ts:108",
    status: "beta",
  },

  CSSDOC_CARDINALITY: {
    grammarRule: "Cardinality (implicit in structure)",
    tier: 2,
    description:
      "Cardinality modifier in structure body: :min-max (e.g., :0-1, :one-or-more:max-2)",
    examples: [":optional", ":one-or-more:max-2", ":0-1"],
    captures: { cardinality: "string" },
    source: "css-doc-grammar.ts:120",
    status: "stable",
  },

  CSSDOC_STATE_VALUE: {
    grammarRule: "StateName",
    tier: 2,
    description: "State name: bare identifier, :pseudo-class, or [attribute] form",
    examples: ["open", ":hover", '[aria-expanded="true"]'],
    source: "css-doc-grammar.ts:132",
    status: "beta",
  },

  CSSDOC_SELECTOR_VALUE: {
    grammarRule: "CssSelectorArgument",
    tier: 2,
    description: "CSS selector argument for @selector: class, attribute, ID, or :host pseudo",
    examples: [".button", "[data-layout]", "#main", ":host"],
    source: "css-doc-grammar.ts:144",
    status: "beta",
  },

  CSSDOC_INLINE_TAG_PATTERN: {
    grammarRule: "InlineTag",
    tier: 2,
    description: "Inline tag pattern: {@link|inheritDoc|label ...}",
    examples: ["{@link -primary}", "{@inheritDoc button}", "{@label example}"],
    source: "css-doc-grammar.ts:156",
    status: "beta",
  },

  CSSDOC_RECORD_TAG_PATTERN: {
    grammarRule: "RecordTag",
    tier: 2,
    description:
      "Record opening tag: @component|@name|@utility|@rule|@declaration|@layout identifier",
    examples: ["@component button", "@utility spacing"],
    captures: { tag: "string", record: "string" },
    source: "css-doc-grammar.ts:168",
    status: "stable",
  },

  CSSDOC_MODIFIER_TAG_PATTERN: {
    grammarRule: "ModifierTag",
    tier: 2,
    description: "Modifier tag: @modifier name [— description]",
    examples: ["@modifier button--primary", "@modifier -size — Size variant"],
    captures: { modifier: "string", description: "string | undefined" },
    source: "css-doc-grammar.ts:180",
    status: "stable",
  },

  CSSDOC_PART_TAG_PATTERN: {
    grammarRule: "PartTag",
    tier: 2,
    description: "Part tag: @part name [— description]",
    examples: ["@part .icon", "@part [data-layout] — Layout container"],
    captures: { part: "string", description: "string | undefined" },
    source: "css-doc-grammar.ts:192",
    status: "stable",
  },

  CSSDOC_PROPERTY_TAG_PATTERN: {
    grammarRule: "CssPropertyTag",
    tier: 2,
    description: "Custom property tag: @cssproperty|@property name [<syntax>] [— description]",
    examples: ["@property --primary-color", "@cssproperty --size <number> — Size in pixels"],
    captures: {
      property: "string",
      syntax: "string | undefined",
      description: "string | undefined",
    },
    source: "css-doc-grammar.ts:204",
    status: "stable",
  },

  CSSDOC_REF_TAG_PATTERN: {
    grammarRule: "Reference inline tag",
    tier: 2,
    description: "Reference pattern in tags: modifier, part, or record reference",
    examples: ["-primary", ".icon", "button"],
    source: "css-doc-grammar.ts:216",
    status: "beta",
  },
};

/**
 * Query function: get metadata for a pattern by name.
 */
export function getPatternMetadata(name: string): PatternMetadata | undefined {
  return PATTERN_REGISTRY[name];
}

/**
 * Query function: get all pattern names in the registry.
 */
export function getAllPatterns(): string[] {
  return Object.keys(PATTERN_REGISTRY);
}

/**
 * Query function: get patterns by grammar rule.
 */
export function getPatternsByGrammarRule(rule: string): string[] {
  return getAllPatterns().filter((name) => {
    const meta = PATTERN_REGISTRY[name];
    return meta?.grammarRule === rule;
  });
}

/**
 * Query function: get patterns by tier level.
 */
export function getPatternsByTier(tier: 0 | 1 | 2 | 3 | 4): string[] {
  return getAllPatterns().filter((name) => PATTERN_REGISTRY[name].tier === tier);
}

/**
 * Query function: get patterns with a specific status.
 */
export function getPatternsByStatus(status: "stable" | "beta" | "deprecated"): string[] {
  return getAllPatterns().filter((name) => (PATTERN_REGISTRY[name].status ?? "stable") === status);
}

/**
 * Query function: get patterns by source file.
 */
export function getPatternsBySource(sourceFile: string): string[] {
  return getAllPatterns().filter((name) => {
    const meta = PATTERN_REGISTRY[name];
    return meta?.source?.startsWith(sourceFile);
  });
}
