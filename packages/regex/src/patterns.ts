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

  // ============================================================================
  // Tier 2: CssDoc Grammar Patterns
  // ============================================================================

  CSSDOC_IDENTIFIER_PART: {
    pattern: String.raw`[A-Za-z_][\w-]*`,
    tier: 2,
    description: "CssDoc identifier part (ASCII-only building block)",
    examples: ["button", "my-component", "_private"],
    status: "stable",
    source: "css-doc-grammar.ts:30",
    grammarRule: "IdentifierPart",
  },

  CSSDOC_IDENTIFIER: {
    pattern: String.raw`(?<identifier>[A-Za-z_][\w-]*)`,
    captures: { identifier: "Identifier" },
    tier: 2,
    description: "CssDoc identifier (ASCII-only)",
    examples: ["button", "my-component", "_private"],
    status: "stable",
    composedFrom: ["CSSDOC_IDENTIFIER_PART"],
    source: "css-doc-grammar.ts:50",
    grammarRule: "Identifier",
  },

  CSSDOC_RECORD_NAME: {
    pattern: String.raw`(?<parts>[A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*)*)`,
    captures: { parts: "Dot-separated identifier parts" },
    tier: 2,
    description: "CssDoc record name (qualified identifier with dots)",
    examples: ["button", "menu.item", "form.field.radio"],
    status: "stable",
    composedFrom: ["CSSDOC_IDENTIFIER_PART", "DOT"],
    source: "css-doc-grammar.ts:70",
    grammarRule: "RecordName",
  },

  CSSDOC_MODIFIER_SUFFIX: {
    pattern: String.raw`(?<name>[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*(?:-)?)`,
    captures: { name: "Modifier name" },
    tier: 2,
    description: "BEM-like modifier suffix (--name or --name-*)",
    examples: ["primary", "size-lg", "icon-*"],
    status: "stable",
    source: "css-doc-grammar.ts:90",
    grammarRule: "SuffixModifierName",
  },

  CSSDOC_MODIFIER_CHAINED: {
    pattern: String.raw`-(?<prop>[A-Za-z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)(?:-(?<value>[A-Za-z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*(?:-)?))?`,
    captures: { prop: "First segment", value: "Second segment (optional)" },
    tier: 2,
    description: "Chained modifier form (.-prop or .-prop-value)",
    examples: ["-active", "-size-lg", "-icon-*"],
    status: "stable",
    source: "css-doc-grammar.ts:110",
    grammarRule: "ChainedModifierName",
  },

  CSSDOC_MODIFIER_ATTRIBUTE: {
    pattern: String.raw`\[(?<name>[A-Za-z0-9_-]+)(?:=(?<value>[\"']?[^\]]*?)(?<quote>[\"'])?)?\]`,
    captures: {
      name: "Attribute name",
      value: "Attribute value (optional)",
      quote: "Quote character (optional)",
    },
    tier: 2,
    description: "Attribute-style modifier ([name] or [name=value])",
    examples: ["[disabled]", "[aria-pressed=true]"],
    status: "stable",
    source: "css-doc-grammar.ts:130",
    grammarRule: "AttributeModifier",
  },

  CSSDOC_TAG: {
    pattern: String.raw`@(?<tag>[\w-]+)(?:\s+(?<arg>\S+))?`,
    captures: { tag: "Tag name", arg: "Tag argument (optional)" },
    tier: 2,
    description: "CssDoc tag (@tag or @tag argument)",
    examples: ["@component", "@modifier active", "@deprecated"],
    status: "stable",
    source: "css-doc-grammar.ts:150",
    grammarRule: "Tag",
  },

  CSSDOC_TAG_ARG: {
    pattern: String.raw`(?<arg>\S+)`,
    captures: { arg: "Argument text" },
    tier: 2,
    description: "CssDoc tag argument",
    examples: ["button", "button.primary"],
    status: "stable",
    source: "css-doc-grammar.ts:168",
    grammarRule: "TagArg",
  },

  CSSDOC_STRUCTURE_REF: {
    pattern: String.raw`(?<ref>[A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*)*)(?::(?<type>[\w-]+))?`,
    captures: { ref: "Reference path", type: "Type annotation (optional)" },
    tier: 2,
    description: "Structure reference (optionally typed)",
    examples: ["button", "menu.item", "menu.item:submenu"],
    status: "stable",
    source: "css-doc-grammar.ts:185",
    grammarRule: "StructureRef",
  },

  CSSDOC_CARDINALITY: {
    pattern: String.raw`(?:(?<type>max|one-or-more-max)-(?<value>\d+)|(?<keyword>optional|one-or-more|many))`,
    captures: { type: "Cardinality type", value: "Numeric value", keyword: "Cardinality keyword" },
    tier: 2,
    description: "Structure cardinality (optional, many, max-N, one-or-more, one-or-more-max-N)",
    examples: ["optional", "many", "max-5", "one-or-more"],
    status: "stable",
    source: "css-doc-grammar.ts:205",
    grammarRule: "Cardinality",
  },

  CSSDOC_CUSTOM_PROPERTY: {
    pattern: String.raw`--(?<name>[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)`,
    captures: { name: "Property name without --" },
    tier: 2,
    description: "CSS custom property reference",
    examples: ["--primary-color", "--my-var"],
    status: "stable",
    composedFrom: ["DOUBLE_DASH", "CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    source: "css-doc-grammar.ts:225",
    grammarRule: "CustomProperty",
  },

  CSSDOC_INLINE_REF: {
    pattern: String.raw`\{@(?<tag>[\w-]+)\s+(?<ref>\S+)\}`,
    captures: { tag: "Inline tag name", ref: "Reference" },
    tier: 2,
    description: "Inline reference in prose ({@tag ref})",
    examples: ["{@link button}", "{@inheritDoc Component}"],
    status: "stable",
    source: "css-doc-grammar.ts:245",
    grammarRule: "InlineRef",
  },

  CSSDOC_REF_NUM: {
    pattern: String.raw`(?<num>\d+)\.?`,
    captures: { num: "Reference number" },
    tier: 2,
    description: "Numeric reference (@ref 1)",
    examples: ["1", "1.", "42"],
    status: "stable",
    source: "css-doc-grammar.ts:263",
    grammarRule: "RefNum",
  },

  CSSDOC_STATE_VALUE: {
    pattern: String.raw`:?(?<name>[A-Za-z][\w-]*)(?:\((?<param>[\w-]*)\))?`,
    captures: { name: "State name", param: "State parameter (optional)" },
    tier: 2,
    description: "CSS state value (:open, :state(open), :disabled)",
    examples: [":open", ":state(open)", ":disabled", "open"],
    status: "stable",
    source: "css-doc-grammar.ts:283",
    grammarRule: "StateValue",
  },

  CSSDOC_SELECTOR_VALUE: {
    pattern: String.raw`(?<value>\.?[A-Za-z][A-Za-z0-9_-]*)`,
    captures: { value: "Selector value" },
    tier: 2,
    description: "Selector/pseudo/class value (.alert-box, ::before, alert-container)",
    examples: [".alert-box", "::before", "alert-container"],
    status: "stable",
    source: "css-doc-grammar.ts:303",
    grammarRule: "SelectorValue",
  },

  CSSDOC_STRUCTURE_CARDINALITY: {
    pattern: String.raw`:(?:(?<keyword>optional|one-or-more|many)(?::max-(?<maxValue>\d+))?|max-(?<justMax>\d+))`,
    captures: { keyword: "Cardinality keyword", maxValue: "Max value", justMax: "Just max value" },
    tier: 2,
    description: "Structure cardinality suffix (:optional, :max-1, :one-or-more:max-2)",
    examples: [":optional", ":max-1", ":one-or-more:max-2"],
    status: "stable",
    source: "css-doc-grammar.ts:323",
    grammarRule: "StructureCardinality",
  },

  CSSDOC_SLOT_DECL: {
    pattern: String.raw`\bslot(?:\[name=(?:["']?(?<name>[\w-]*)["']?)?\])?`,
    captures: { name: "Slot name (optional)" },
    tier: 2,
    description: 'Slot declaration in structure (slot or slot[name="x"])',
    examples: ["slot", 'slot[name="x"]', "slot[name='content']"],
    status: "stable",
    source: "css-doc-grammar.ts:343",
    grammarRule: "SlotDecl",
  },

  CSSDOC_STRUCTURE_CLASS: {
    pattern: String.raw`\.(?<class>[A-Za-z][A-Za-z0-9_-]*)`,
    captures: { class: "Class name" },
    tier: 2,
    description: "Class selector in structure body (.pfx-alert)",
    examples: [".pfx-alert", ".button-group"],
    status: "stable",
    source: "css-doc-grammar.ts:361",
    grammarRule: "StructureClass",
  },

  CSSDOC_STRUCTURE_TAG: {
    pattern: String.raw`@structure\b`,
    tier: 2,
    description: "Structure tag keyword",
    examples: ["@structure"],
    status: "stable",
    source: "css-doc-grammar.ts:375",
    grammarRule: "StructureTag",
  },

  CSSDOC_STRUCTURE_COMPONENT: {
    pattern: String.raw`(@(?:component|variant))\b[ \t]*([A-Za-z][\w-]*)?`,
    captures: { tag: "Component/Variant tag", name: "Component name (optional)" },
    tier: 2,
    description: "Structure component or variant reference",
    examples: ["@component button", "@variant primary"],
    status: "stable",
    source: "css-doc-grammar.ts:389",
    grammarRule: "StructureComponent",
  },

  CSSDOC_STRUCTURE_BRACE: {
    pattern: String.raw`[{}]`,
    tier: 2,
    description: "Opening or closing brace in structure",
    examples: ["{", "}"],
    status: "stable",
    source: "css-doc-grammar.ts:407",
    grammarRule: "StructureBrace",
  },

  CSSDOC_INLINE_TAG_PATTERN: {
    pattern: String.raw`(\{)(@(?:link|label|inheritDoc))\b[ \t]*([^}]*)(\})?`,
    tier: 2,
    description: "Inline tag pattern for syntax highlighting ({@link} etc)",
    examples: ["{@link button}", "{@label", "{@inheritDoc Component}"],
    status: "stable",
    source: "css-doc-grammar.ts:421",
    grammarRule: "InlineTagPattern",
  },

  CSSDOC_RECORD_TAG_PATTERN: {
    pattern: String.raw`(@(?:component|name|utility|rule|declaration|layout))\b[ \t]*([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*)?`,
    tier: 2,
    description: "Record/component tag pattern for syntax highlighting",
    examples: ["@component Button", "@name menu.item"],
    status: "stable",
    source: "css-doc-grammar.ts:439",
    grammarRule: "RecordTagPattern",
  },

  CSSDOC_MODIFIER_TAG_PATTERN: {
    pattern: String.raw`(@(?:modifier|variant))\b[ \t]*(-[A-Za-z][A-Za-z0-9-]*)?`,
    tier: 2,
    description: "Modifier tag pattern for syntax highlighting",
    examples: ["@modifier -primary", "@variant -size-lg"],
    status: "stable",
    source: "css-doc-grammar.ts:453",
    grammarRule: "ModifierTagPattern",
  },

  CSSDOC_PART_TAG_PATTERN: {
    pattern: String.raw`(@(?:part|csspart|slot|selector|pseudo|class))\b[ \t]*(\\.?[A-Za-z][A-Za-z0-9_-]*)?`,
    tier: 2,
    description: "Part tag pattern for syntax highlighting",
    examples: ["@part header", "@selector .alert-box", "@pseudo ::after"],
    status: "stable",
    source: "css-doc-grammar.ts:468",
    grammarRule: "PartTagPattern",
  },

  CSSDOC_PROPERTY_TAG_PATTERN: {
    pattern: String.raw`(@(?:cssproperty|property))\b[ \t]*(--[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)?`,
    tier: 2,
    description: "Property tag pattern for syntax highlighting",
    examples: ["@cssproperty --primary-color", "@property --size"],
    status: "stable",
    source: "css-doc-grammar.ts:483",
    grammarRule: "PropertyTagPattern",
  },

  CSSDOC_REF_TAG_PATTERN: {
    pattern: String.raw`(@(?:ref))\b[ \t]*(\d+\.?)?`,
    tier: 2,
    description: "Ref tag pattern for syntax highlighting",
    examples: ["@ref 1", "@ref 1."],
    status: "stable",
    source: "css-doc-grammar.ts:498",
    grammarRule: "RefTagPattern",
  },
};

// ============================================================================
// Lazy-Evaluated Exports (avoid duplication)
// ============================================================================
// Instead of duplicating pattern definitions, we provide getters that
// dynamically build/retrieve patterns from PATTERNS registry.
// All pattern names are automatically exported using getters below.

/** @internal Dynamically build regex exports from PATTERNS registry */
export const createPatternExports = () => {
  const exports: Record<string, any> = {};

  for (const name of Object.keys(PATTERNS)) {
    // Add Regex export (cached by buildPattern)
    Object.defineProperty(exports, name, {
      get: () => buildPattern(name),
      enumerable: true,
    });

    // Add string export (camelCase version)
    const camelCase = name
      .split("_")
      .map((part, i) =>
        i === 0 ? part.toLowerCase() : part.charAt(0) + part.slice(1).toLowerCase(),
      )
      .join("");

    Object.defineProperty(exports, camelCase, {
      get: () => getPatternString(name),
      enumerable: true,
    });
  }

  return exports;
};

// Pre-computed exports object with all pattern names
const patternExports = createPatternExports();

// Re-export all patterns as named exports
export const {
  // Tier 0 exports
  ALPHA,
  alpha,
  ALPHA_LOWER,
  alphaLower,
  ALPHA_UPPER,
  alphaUpper,
  ALPHANUMERIC,
  alphanumeric,
  ALPHANUMERIC_EXTENDED,
  alphanumericExtended,
  DIGIT,
  digit,
  DASH,
  dash,
  DOUBLE_DASH,
  doubleDash,
  DOT,
  dot,
  SPACE_TAB,
  spaceTab,
  BRACE_OPEN,
  braceOpen,
  BRACE_CLOSE,
  braceClose,
  PAREN_OPEN,
  parenOpen,
  PAREN_CLOSE,
  parenClose,
  COLON,
  colon,
  QUOTE,
  quote,
  HEX_DIGIT,
  hexDigit,
  HEX_DIGIT_OR_WILDCARD,
  hexDigitOrWildcard,
  CSS_IDENTIFIER_START,
  cssIdentifierStart,
  CSS_IDENTIFIER_START_WITH_DASH,
  cssIdentifierStartWithDash,
  CSS_IDENTIFIER_CONT,
  cssIdentifierCont,
  CSS_IDENTIFIER_CONT_NO_DASH,
  cssIdentifierContNoDash,
  WORD_BOUNDARY,
  wordBoundary,
  // Tier 1 exports
  CSS_IDENTIFIER,
  cssIdentifier,
  CSS_NAME,
  cssName,
  CSS_NUMBER,
  cssNumber,
  CSS_PERCENTAGE,
  cssPercentage,
  CSS_DIMENSION,
  cssDimension,
  CSS_HASH_COLOR,
  cssHashColor,
  CSS_FUNCTION,
  cssFunction,
  CSS_KEYWORD,
  cssKeyword,
  CSS_UNICODE_RANGE,
  cssUnicodeRange,
  CSS_PROPERTY_NAME,
  cssPropertyName,
  // Tier 2 exports
  CSSDOC_IDENTIFIER_PART,
  cssdocIdentifierPart,
  CSSDOC_IDENTIFIER,
  cssdocIdentifier,
  CSSDOC_RECORD_NAME,
  cssdocRecordName,
  CSSDOC_MODIFIER_SUFFIX,
  cssdocModifierSuffix,
  CSSDOC_MODIFIER_CHAINED,
  cssdocModifierChained,
  CSSDOC_MODIFIER_ATTRIBUTE,
  cssdocModifierAttribute,
  CSSDOC_TAG,
  cssdocTag,
  CSSDOC_TAG_ARG,
  cssdocTagArg,
  CSSDOC_STRUCTURE_REF,
  cssdocStructureRef,
  CSSDOC_CARDINALITY,
  cssdocCardinality,
  CSSDOC_CUSTOM_PROPERTY,
  cssdocCustomProperty,
  CSSDOC_INLINE_REF,
  cssdocInlineRef,
  CSSDOC_REF_NUM,
  cssdocRefNum,
  CSSDOC_STATE_VALUE,
  cssdocStateValue,
  CSSDOC_SELECTOR_VALUE,
  cssdocSelectorValue,
  CSSDOC_STRUCTURE_CARDINALITY,
  cssdocStructureCardinality,
  CSSDOC_SLOT_DECL,
  cssdocSlotDecl,
  CSSDOC_STRUCTURE_CLASS,
  cssdocStructureClass,
  CSSDOC_STRUCTURE_TAG,
  cssdocStructureTag,
  CSSDOC_STRUCTURE_COMPONENT,
  cssdocStructureComponent,
  CSSDOC_STRUCTURE_BRACE,
  cssdocStructureBrace,
  CSSDOC_INLINE_TAG_PATTERN,
  cssdocInlineTagPattern,
  CSSDOC_RECORD_TAG_PATTERN,
  cssdocRecordTagPattern,
  CSSDOC_MODIFIER_TAG_PATTERN,
  cssdocModifierTagPattern,
  CSSDOC_PART_TAG_PATTERN,
  cssdocPartTagPattern,
  CSSDOC_PROPERTY_TAG_PATTERN,
  cssdocPropertyTagPattern,
  CSSDOC_REF_TAG_PATTERN,
  cssdocRefTagPattern,
} = patternExports;

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
