/**
 * @cssdoc/regex/definitions
 *
 * Unified Pattern Definitions — Single source of truth for all regex patterns.
 * Each pattern is defined once with:
 * - Pattern string (the actual regex or composition function)
 * - Grammar rule name (from CssDoc.grammarkdown)
 * - Tier level (0 = character classes, 1 = CSS spec, ..., 4 = complete)
 * - Capture group types and descriptions
 * - Test fixtures (passes and fails)
 * - Human description
 *
 * This consolidates duplicate data from patterns.ts, registry.ts, types.ts, and fixtures/*.ts
 * into one authoritative source. All other files (patterns.ts, tiers/*.ts, etc.) are auto-generated
 * from these definitions.
 *
 * @module
 */

/**
 * Unified pattern definition — combines pattern, metadata, types, and fixtures.
 */
export interface UnifiedPatternDef {
  /** Grammar rule name from CssDoc.grammarkdown (primary key) */
  grammarRule?: string;

  /** Export name (e.g., ALPHA, CSS_IDENTIFIER) */
  name: string;

  /** Tier level */
  tier: 0 | 1 | 2 | 3 | 4;

  /** Pattern definition: string or composition function */
  pattern: string | ((resolve: (name: string) => string) => string);

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
 * Complete unified pattern definitions.
 * Key = pattern name, value = complete definition.
 */
export const PATTERN_DEFINITIONS: Record<string, UnifiedPatternDef> = {
  // ============================================================================
  // Tier 0: Character Classes
  // ============================================================================

  ALPHA: {
    name: "ALPHA",
    grammarRule: "Letter",
    tier: 0,
    pattern: String.raw`[A-Za-z]`,
    description: "Alphabetic character (ASCII letters)",
    fixtures: {
      passes: [{ input: "a" }, { input: "Z" }, { input: "m" }, { input: "A" }],
      fails: [
        { input: "1", reason: "digit" },
        { input: "-", reason: "punctuation" },
        { input: " ", reason: "space" },
        { input: "", reason: "empty" },
      ],
    },
  },

  ALPHA_LOWER: {
    name: "ALPHA_LOWER",
    tier: 0,
    pattern: String.raw`[a-z]`,
    description: "Lowercase alphabetic character",
    fixtures: {
      passes: [{ input: "a" }, { input: "z" }, { input: "m" }],
      fails: [
        { input: "A", reason: "uppercase" },
        { input: "Z", reason: "uppercase" },
        { input: "1", reason: "digit" },
        { input: "", reason: "empty" },
      ],
    },
  },

  ALPHA_UPPER: {
    name: "ALPHA_UPPER",
    tier: 0,
    pattern: String.raw`[A-Z]`,
    description: "Uppercase alphabetic character",
    fixtures: {
      passes: [{ input: "A" }, { input: "Z" }, { input: "M" }],
      fails: [
        { input: "a", reason: "lowercase" },
        { input: "z", reason: "lowercase" },
        { input: "1", reason: "digit" },
        { input: "", reason: "empty" },
      ],
    },
  },

  ALPHANUMERIC: {
    name: "ALPHANUMERIC",
    tier: 0,
    pattern: (resolve) => {
      const digit = resolve("DIGIT").slice(1, -1);
      const alpha = resolve("ALPHA").slice(1, -1);
      return `[${digit}${alpha}]`;
    },
    description: "Alphanumeric character (letter or digit)",
    composedFrom: ["DIGIT", "ALPHA"],
    fixtures: {
      passes: [{ input: "0" }, { input: "a" }, { input: "Z" }],
      fails: [
        { input: "-", reason: "punctuation" },
        { input: " ", reason: "space" },
        { input: "", reason: "empty" },
      ],
    },
  },

  ALPHANUMERIC_EXTENDED: {
    name: "ALPHANUMERIC_EXTENDED",
    tier: 0,
    pattern: (resolve) => {
      const alpha = resolve("ALPHA").slice(1, -1);
      const digit = resolve("DIGIT").slice(1, -1);
      return `[${alpha}${digit}\\-_]`;
    },
    description: "Alphanumeric with underscore and hyphen",
    composedFrom: ["ALPHA", "DIGIT"],
    fixtures: {
      passes: [{ input: "a" }, { input: "0" }, { input: "_" }, { input: "-" }],
      fails: [
        { input: " ", reason: "space" },
        { input: "", reason: "empty" },
      ],
    },
  },

  DIGIT: {
    name: "DIGIT",
    grammarRule: "Digit",
    tier: 0,
    pattern: String.raw`[0-9]`,
    description: "Single digit",
    fixtures: {
      passes: [{ input: "0" }, { input: "5" }, { input: "9" }],
      fails: [
        { input: "a", reason: "letter" },
        { input: "-", reason: "punctuation" },
        { input: " ", reason: "space" },
        { input: "", reason: "empty" },
      ],
    },
  },

  DASH: {
    name: "DASH",
    tier: 0,
    pattern: String.raw`-`,
    description: "Hyphen-minus character",
    fixtures: {
      passes: [{ input: "-" }],
      fails: [
        { input: "—", reason: "em dash" },
        { input: "_", reason: "underscore" },
        { input: "", reason: "empty" },
      ],
    },
  },

  DOUBLE_DASH: {
    name: "DOUBLE_DASH",
    tier: 0,
    pattern: String.raw`--`,
    description: "Double hyphen",
    fixtures: {
      passes: [{ input: "--" }],
      fails: [
        { input: "-", reason: "single dash" },
        { input: "", reason: "empty" },
      ],
    },
  },

  DOT: {
    name: "DOT",
    tier: 0,
    pattern: String.raw`\.`,
    description: "Period or dot character",
    fixtures: {
      passes: [{ input: "." }],
      fails: [
        { input: "…", reason: "ellipsis" },
        { input: ",", reason: "comma" },
        { input: "", reason: "empty" },
      ],
    },
  },

  HEX_DIGIT: {
    name: "HEX_DIGIT",
    tier: 0,
    pattern: String.raw`[0-9a-fA-F]`,
    description: "Hexadecimal digit",
    fixtures: {
      passes: [{ input: "0" }, { input: "f" }, { input: "F" }],
      fails: [
        { input: "g", reason: "not hex" },
        { input: "-", reason: "punctuation" },
        { input: "", reason: "empty" },
      ],
    },
  },

  HEX_DIGIT_OR_WILDCARD: {
    name: "HEX_DIGIT_OR_WILDCARD",
    tier: 0,
    pattern: String.raw`[0-9a-fA-F?]`,
    description: "Hexadecimal digit or wildcard",
    fixtures: {
      passes: [{ input: "0" }, { input: "f" }, { input: "?" }],
      fails: [
        { input: "g", reason: "not hex" },
        { input: "*", reason: "not wildcard format" },
        { input: "", reason: "empty" },
      ],
    },
  },

  SPACE_TAB: {
    name: "SPACE_TAB",
    tier: 0,
    pattern: String.raw`[ \t]`,
    description: "Space or tab whitespace",
    fixtures: {
      passes: [{ input: " " }, { input: "\t" }],
      fails: [
        { input: "\n", reason: "newline" },
        { input: "", reason: "empty" },
      ],
    },
  },

  WORD_BOUNDARY: {
    name: "WORD_BOUNDARY",
    tier: 0,
    pattern: String.raw`\b`,
    description: "Zero-width word boundary",
    fixtures: {
      passes: [{ input: "a ", note: "boundary after word char" }],
      fails: [{ input: "aa", reason: "no boundary between letters" }],
    },
  },

  CSS_IDENTIFIER_START: {
    name: "CSS_IDENTIFIER_START",
    tier: 0,
    pattern: String.raw`[a-zA-Z_\u0080-\uFFFF]`,
    description: "CSS identifier start",
    fixtures: {
      passes: [{ input: "a" }, { input: "_" }, { input: "🎨" }],
      fails: [
        { input: "0", reason: "digit" },
        { input: "-", reason: "hyphen not allowed at start" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSS_IDENTIFIER_CONT: {
    name: "CSS_IDENTIFIER_CONT",
    tier: 0,
    pattern: String.raw`[\w\-\u0080-\uFFFF]`,
    description: "CSS identifier continuation",
    fixtures: {
      passes: [{ input: "a" }, { input: "0" }, { input: "_" }, { input: "-" }, { input: "🎨" }],
      fails: [
        { input: " ", reason: "space" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSS_IDENTIFIER_CONT_NO_DASH: {
    name: "CSS_IDENTIFIER_CONT_NO_DASH",
    tier: 0,
    pattern: String.raw`[\w\u0080-\uFFFF]`,
    description: "CSS identifier continuation (no dash)",
    fixtures: {
      passes: [{ input: "a" }, { input: "0" }, { input: "_" }, { input: "🎨" }],
      fails: [
        { input: "-", reason: "dash not allowed" },
        { input: " ", reason: "space" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSS_IDENTIFIER_START_WITH_DASH: {
    name: "CSS_IDENTIFIER_START_WITH_DASH",
    tier: 0,
    pattern: String.raw`[a-zA-Z_\-\u0080-\uFFFF]`,
    description: "CSS identifier start (with dash)",
    fixtures: {
      passes: [{ input: "a" }, { input: "_" }, { input: "-" }, { input: "🎨" }],
      fails: [
        { input: "0", reason: "digit" },
        { input: " ", reason: "space" },
        { input: "", reason: "empty" },
      ],
    },
  },

  // ============================================================================
  // Tier 1: W3C CSS Formal Grammar Patterns
  // ============================================================================

  CSS_IDENTIFIER: {
    name: "CSS_IDENTIFIER",
    grammarRule: "ident",
    tier: 1,
    pattern: (resolve) => {
      const start = resolve("CSS_IDENTIFIER_START");
      const cont = resolve("CSS_IDENTIFIER_CONT");
      return `(?<identifier>${start}${cont}*)`;
    },
    captures: { identifier: "Full CSS identifier" },
    description: "CSS identifier",
    composedFrom: ["CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    fixtures: {
      passes: [
        { input: "my-class", note: "with dash" },
        { input: "_private", note: "with underscore" },
        { input: "🎨color", note: "with emoji" },
      ],
      fails: [
        { input: "-my-class", reason: "cannot start with dash" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSS_NAME: {
    name: "CSS_NAME",
    grammarRule: "name",
    tier: 1,
    pattern: (resolve) => {
      const start = resolve("CSS_IDENTIFIER_START");
      const cont = resolve("CSS_IDENTIFIER_CONT_NO_DASH");
      return `(?<name>${start}${cont}*)`;
    },
    captures: { name: "CSS name without dashes" },
    description: "CSS name",
    composedFrom: ["CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT_NO_DASH"],
    fixtures: {
      passes: [
        { input: "background", note: "simple" },
        { input: "color", note: "simple" },
      ],
      fails: [
        { input: "my-name", reason: "dashes not allowed" },
        { input: "-name", reason: "cannot start with dash" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSS_NUMBER: {
    name: "CSS_NUMBER",
    grammarRule: "number",
    tier: 1,
    pattern: (resolve) => {
      const digit = resolve("DIGIT").slice(1, -1);
      return `(?<number>(?<integer>[${digit}]+)(?:\\.(?<decimal>[${digit}]+))?)`;
    },
    captures: {
      number: "Full number",
      integer: "Integer part",
      decimal: "Decimal part (optional)",
    },
    description: "CSS number",
    composedFrom: ["DIGIT"],
    fixtures: {
      passes: [
        { input: "42", note: "integer" },
        { input: "3.14", note: "decimal" },
        { input: "0", note: "zero" },
      ],
      fails: [
        { input: "a", reason: "not a number" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSS_PERCENTAGE: {
    name: "CSS_PERCENTAGE",
    grammarRule: "percentage",
    tier: 1,
    pattern: (resolve) => {
      const digit = resolve("DIGIT").slice(1, -1);
      const numberLiteral = `[${digit}]+(?:\\.[${digit}]+)?`;
      return `(?<value>${numberLiteral})%`;
    },
    captures: { value: "Numeric value without percent sign" },
    description: "CSS percentage",
    composedFrom: ["DIGIT"],
    fixtures: {
      passes: [
        { input: "50%", note: "integer" },
        { input: "100%", note: "three digits" },
        { input: "33.33%", note: "decimal" },
      ],
      fails: [
        { input: "50", reason: "missing %" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSS_DIMENSION: {
    name: "CSS_DIMENSION",
    grammarRule: "dimension",
    tier: 1,
    pattern: (resolve) => {
      const digit = resolve("DIGIT").slice(1, -1);
      const start = resolve("CSS_IDENTIFIER_START");
      const cont = resolve("CSS_IDENTIFIER_CONT");
      return `(?<value>[${digit}]+(?:\\.[${digit}]+)?)(?<unit>${start}${cont}*)`;
    },
    captures: { value: "Numeric value", unit: "Unit name (px, em, etc)" },
    description: "CSS dimension",
    composedFrom: ["DIGIT", "CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    fixtures: {
      passes: [
        { input: "16px", note: "pixels" },
        { input: "2.5em", note: "decimal em" },
      ],
      fails: [
        { input: "px16", reason: "unit after number" },
        { input: "100%", reason: "percent is not a standard dimension unit" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSS_HASH_COLOR: {
    name: "CSS_HASH_COLOR",
    grammarRule: "hash",
    tier: 1,
    pattern: (resolve) => {
      const hex = resolve("HEX_DIGIT").slice(1, -1);
      return `#(?<color>[${hex}]{3}(?:[${hex}]{3})?)`;
    },
    captures: { color: "Hex color without #" },
    description: "CSS hex color",
    composedFrom: ["HEX_DIGIT"],
    fixtures: {
      passes: [
        { input: "#fff", note: "3-digit" },
        { input: "#ffffff", note: "6-digit" },
        { input: "#000", note: "black" },
      ],
      fails: [
        { input: "fff", reason: "missing #" },
        { input: "#ffff", reason: "4 digits not valid" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSS_FUNCTION: {
    name: "CSS_FUNCTION",
    grammarRule: "function",
    tier: 1,
    pattern: (resolve) => {
      const start = resolve("CSS_IDENTIFIER_START_WITH_DASH");
      const cont = resolve("CSS_IDENTIFIER_CONT");
      const space = resolve("SPACE_TAB").slice(1, -1);
      return `(?<name>${start}${cont}*)[${space}]*\\(`;
    },
    captures: { name: "Function name" },
    description: "CSS function call",
    composedFrom: ["CSS_IDENTIFIER_START_WITH_DASH", "CSS_IDENTIFIER_CONT", "SPACE_TAB"],
    fixtures: {
      passes: [
        { input: "rgb(", note: "basic" },
        { input: "var(", note: "custom property" },
        { input: "calc(", note: "calc function" },
      ],
      fails: [
        { input: "rgb)", reason: "closing paren" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSS_KEYWORD: {
    name: "CSS_KEYWORD",
    grammarRule: "keyword",
    tier: 1,
    pattern: String.raw`(?<keyword>auto|inherit|initial|revert|unset)`,
    captures: { keyword: "CSS keyword" },
    description: "CSS reserved keyword",
    fixtures: {
      passes: [{ input: "auto" }, { input: "inherit" }, { input: "initial" }],
      fails: [
        { input: "normal", reason: "not a reserved keyword" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSS_UNICODE_RANGE: {
    name: "CSS_UNICODE_RANGE",
    grammarRule: "unicode-range",
    tier: 1,
    pattern: (resolve) => {
      const hexWild = resolve("HEX_DIGIT_OR_WILDCARD").slice(1, -1);
      const hex = resolve("HEX_DIGIT").slice(1, -1);
      return `u\\+(?<start>[${hexWild}]{1,6})(?:-(?<range>[${hex}]{1,6}))?`;
    },
    captures: { start: "Start of range", range: "End of range (optional)" },
    description: "CSS Unicode range",
    composedFrom: ["HEX_DIGIT_OR_WILDCARD", "HEX_DIGIT"],
    fixtures: {
      passes: [
        { input: "u+26", note: "2 digits" },
        { input: "u+0-7F", note: "range" },
        { input: "u+0025-00FF", note: "4 digits to 4 digits" },
      ],
      fails: [
        { input: "U+26", reason: "must be lowercase u" },
        { input: "26", reason: "missing u+" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSS_PROPERTY_NAME: {
    name: "CSS_PROPERTY_NAME",
    grammarRule: "property-name",
    tier: 1,
    pattern: (resolve) => {
      const dash = resolve("DOUBLE_DASH");
      const start = resolve("CSS_IDENTIFIER_START");
      const cont = resolve("CSS_IDENTIFIER_CONT");
      return `(?<name>(?<custom>${dash})?${start}${cont}*)`;
    },
    captures: { name: "Full property name", custom: "Double dash if custom property" },
    description: "CSS property or custom property name",
    composedFrom: ["DOUBLE_DASH", "CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    fixtures: {
      passes: [
        { input: "background-color", note: "standard property" },
        { input: "--my-var", note: "custom property" },
        { input: "color", note: "simple" },
      ],
      fails: [
        { input: "-color", reason: "single dash not valid" },
        { input: "", reason: "empty" },
      ],
    },
  },

  // ============================================================================
  // Tier 2: CssDoc Grammar Patterns
  // ============================================================================

  CSSDOC_TAG_NAME: {
    name: "CSSDOC_TAG_NAME",
    grammarRule: "TagName",
    tier: 2,
    pattern: (resolve) => {
      const alpha = resolve("ALPHA").slice(1, -1);
      return `@(?<tag>[${alpha}][${alpha}]*(?:-[${alpha}]+)*)`;
    },
    captures: { tag: "Tag name without @" },
    description: "CssDoc tag name",
    composedFrom: ["ALPHA"],
    fixtures: {
      passes: [{ input: "@component" }, { input: "@name" }, { input: "@css-property" }],
      fails: [
        { input: "component", reason: "missing @" },
        { input: "@123", reason: "starts with digit" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSSDOC_SELECTOR: {
    name: "CSSDOC_SELECTOR",
    grammarRule: "Selector",
    tier: 2,
    pattern: (resolve) => {
      const start = resolve("CSS_IDENTIFIER_START_WITH_DASH");
      const cont = resolve("CSS_IDENTIFIER_CONT");
      const selector = `(?:${start}${cont}*|[.#\\[\\]:~+>\\s])`;
      return `(?<selector>${selector}+)`;
    },
    captures: { selector: "CSS selector" },
    description: "CSS selector",
    composedFrom: ["CSS_IDENTIFIER_START_WITH_DASH", "CSS_IDENTIFIER_CONT"],
    fixtures: {
      passes: [
        { input: ".my-class", note: "class selector" },
        { input: "#my-id", note: "id selector" },
        { input: ".class > .nested", note: "child combinator" },
      ],
      fails: [{ input: "", reason: "empty" }],
    },
  },

  CSSDOC_MODIFIER_NAME: {
    name: "CSSDOC_MODIFIER_NAME",
    grammarRule: "ModifierName",
    tier: 2,
    pattern: (resolve) => {
      const start = resolve("CSS_IDENTIFIER_START");
      const cont = resolve("CSS_IDENTIFIER_CONT");
      return `(?<name>${start}${cont}*)`;
    },
    captures: { name: "Modifier name" },
    description: "Modifier name",
    composedFrom: ["CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    fixtures: {
      passes: [{ input: "hover" }, { input: "my-modifier" }, { input: "active" }],
      fails: [
        { input: "-dash", reason: "starts with dash" },
        { input: "123", reason: "starts with digit" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSSDOC_MODIFIER_ATTRIBUTE: {
    name: "CSSDOC_MODIFIER_ATTRIBUTE",
    grammarRule: "ModifierAttribute",
    tier: 2,
    pattern: (resolve) => {
      const alpha = resolve("ALPHA").slice(1, -1);
      return `\\[(?<attr>[${alpha}]+)\\s*=\\s*(?<value>[^\\]]+)\\]`;
    },
    captures: { attr: "Attribute name", value: "Attribute value" },
    description: "Modifier with attribute selector",
    composedFrom: ["ALPHA"],
    fixtures: {
      passes: [{ input: "[type=button]" }, { input: "[role = tab]", note: "with spaces" }],
      fails: [
        { input: "[type]", reason: "missing value" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSSDOC_PSEUDO_SELECTOR: {
    name: "CSSDOC_PSEUDO_SELECTOR",
    grammarRule: "PseudoSelector",
    tier: 2,
    pattern: String.raw`(?<pseudo>::?(?:before|after|first-letter|first-line|placeholder|selection|backdrop))`,
    captures: { pseudo: "Pseudo element" },
    description: "Pseudo selector",
    fixtures: {
      passes: [
        { input: "::before" },
        { input: "::after" },
        { input: ":before", note: "single colon also valid" },
      ],
      fails: [
        { input: "before", reason: "missing colon" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSSDOC_CARDINALITY: {
    name: "CSSDOC_CARDINALITY",
    grammarRule: "Cardinality",
    tier: 2,
    pattern: String.raw`(?<card>(?:one-or-more|zero-or-more|optional|exactly-one|max-\d+)?)`,
    captures: { card: "Cardinality modifier" },
    description: "Cardinality in structure",
    fixtures: {
      passes: [{ input: "optional" }, { input: "one-or-more" }, { input: "max-5" }],
      fails: [{ input: "many", reason: "not a valid cardinality" }],
    },
  },

  // ============================================================================
  // Tier 3: cssdoc-specific compound patterns
  // ============================================================================

  CSSDOC_COMPONENT_REF: {
    name: "CSSDOC_COMPONENT_REF",
    grammarRule: "ComponentRef",
    tier: 3,
    pattern: (resolve) => {
      const ident = resolve("CSS_IDENTIFIER");
      const card = resolve("CSSDOC_CARDINALITY");
      return `(?<ref>${ident}(?::${card})?)`;
    },
    captures: { ref: "Component reference" },
    description: "Component reference with optional cardinality",
    composedFrom: ["CSS_IDENTIFIER", "CSSDOC_CARDINALITY"],
    fixtures: {
      passes: [
        { input: "button", note: "simple component" },
        { input: "button:optional", note: "with cardinality" },
        { input: "button:max-5", note: "with max" },
      ],
      fails: [{ input: "", reason: "empty" }],
    },
  },

  CSSDOC_PART_NAME: {
    name: "CSSDOC_PART_NAME",
    grammarRule: "PartName",
    tier: 3,
    pattern: (resolve) => {
      const start = resolve("CSS_IDENTIFIER_START");
      const cont = resolve("CSS_IDENTIFIER_CONT");
      return `(?<name>${start}${cont}*)`;
    },
    captures: { name: "Part name" },
    description: "Part name",
    composedFrom: ["CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    fixtures: {
      passes: [{ input: "button" }, { input: "my-part" }],
      fails: [
        { input: "-part", reason: "starts with dash" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSSDOC_CSSPROP_NAME: {
    name: "CSSDOC_CSSPROP_NAME",
    grammarRule: "CssPropertyName",
    tier: 3,
    pattern: (resolve) => {
      const dash = resolve("DOUBLE_DASH");
      const start = resolve("CSS_IDENTIFIER_START");
      const cont = resolve("CSS_IDENTIFIER_CONT");
      return `(?<name>(?<custom>${dash})?${start}${cont}*)`;
    },
    captures: { name: "Full property name", custom: "Double dash if custom" },
    description: "Property or custom property name",
    composedFrom: ["DOUBLE_DASH", "CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    fixtures: {
      passes: [{ input: "background-color" }, { input: "--my-color" }],
      fails: [
        { input: "-color", reason: "single dash not valid" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSSDOC_CSSSTATE_NAME: {
    name: "CSSDOC_CSSSTATE_NAME",
    grammarRule: "CssStateName",
    tier: 3,
    pattern: (resolve) => {
      const start = resolve("CSS_IDENTIFIER_START");
      const cont = resolve("CSS_IDENTIFIER_CONT");
      return `(?<name>${start}${cont}*)`;
    },
    captures: { name: "State name" },
    description: "State name",
    composedFrom: ["CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    fixtures: {
      passes: [{ input: "active" }, { input: "my-state" }],
      fails: [
        { input: "-state", reason: "starts with dash" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSSDOC_VARIANT_NAME: {
    name: "CSSDOC_VARIANT_NAME",
    grammarRule: "VariantName",
    tier: 3,
    pattern: (resolve) => {
      const start = resolve("CSS_IDENTIFIER_START");
      const cont = resolve("CSS_IDENTIFIER_CONT");
      return `(?<name>${start}${cont}*)`;
    },
    captures: { name: "Variant name" },
    description: "Variant name",
    composedFrom: ["CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    fixtures: {
      passes: [{ input: "default" }, { input: "button-group" }],
      fails: [
        { input: "-variant", reason: "starts with dash" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSSDOC_SLOT_NAME: {
    name: "CSSDOC_SLOT_NAME",
    grammarRule: "SlotName",
    tier: 3,
    pattern: (resolve) => {
      const alpha = resolve("ALPHA").slice(1, -1);
      return `(?<name>[${alpha}][${alpha}0-9]*(?:-[${alpha}0-9]+)*)`;
    },
    captures: { name: "Slot name" },
    description: "Slot name",
    composedFrom: ["ALPHA"],
    fixtures: {
      passes: [{ input: "content" }, { input: "my-slot" }, { input: "slot1" }],
      fails: [
        { input: "-slot", reason: "starts with dash" },
        { input: "1slot", reason: "starts with digit" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSSDOC_EXAMPLE_LANG: {
    name: "CSSDOC_EXAMPLE_LANG",
    grammarRule: "ExampleLanguage",
    tier: 3,
    pattern: String.raw`(?<lang>css|html|javascript|js|typescript|ts|jsx|tsx|json|markdown|md|text|plain)`,
    captures: { lang: "Language identifier" },
    description: "@example language identifier",
    fixtures: {
      passes: [{ input: "css" }, { input: "html" }, { input: "javascript" }],
      fails: [
        { input: "python", reason: "not a web language" },
        { input: "", reason: "empty" },
      ],
    },
  },

  CSSDOC_DEMO_URL: {
    name: "CSSDOC_DEMO_URL",
    grammarRule: "DemoURL",
    tier: 3,
    pattern: String.raw`(?<url>https?://[^\s]+)`,
    captures: { url: "URL" },
    description: "@demo URL",
    fixtures: {
      passes: [{ input: "https://example.com" }, { input: "http://localhost:3000" }],
      fails: [
        { input: "example.com", reason: "missing protocol" },
        { input: "", reason: "empty" },
      ],
    },
  },
};
