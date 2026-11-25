/**
 * @cssdoc/regex/definitions/tier-3-cssdoc-tokens
 * Tier 3+ CssDoc and tokenizer patterns
 * @module
 */

import type { RawPatternDef, PatternResolver } from "../types.ts";

export const TIER_3_CSSDOC_TOKENS_PATTERNS: Record<string, RawPatternDef> = {
  CSSDOC_COMPONENT_REF: {
    name: "CSSDOC_COMPONENT_REF",
    grammarRule: "ComponentRef",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
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
        { input: "button:opt", note: "shorthand cardinality" },
        { input: "button:many", note: "many cardinality" },
        { input: "button:max-5", note: "with max" },
        { input: "button:more:max-4", note: "bounded shorthand" },
      ],
      fails: [
        { input: "", reason: "empty" },
        { input: "button:", reason: "missing cardinality" },
        { input: "button:zero-or-more", reason: "unsupported cardinality" },
      ],
    },
  },
  CSSDOC_PART_NAME: {
    name: "CSSDOC_PART_NAME",
    grammarRule: "PartName",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
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
    pattern: (resolve: PatternResolver) => {
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
    pattern: (resolve: PatternResolver) => {
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
    pattern: (resolve: PatternResolver) => {
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
    pattern: (resolve: PatternResolver) => {
      const alpha = resolve("ALPHA", true);
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
    source: String.raw`(?<lang>css|html|javascript|js|typescript|ts|jsx|tsx|json|markdown|md|text|plain)`,
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
  TOKEN_WHITESPACE: {
    name: "TOKEN_WHITESPACE",
    tier: 3,
    source: String.raw`[ \t]*`,
    description: "Horizontal whitespace (space or tab)",
    fixtures: {
      passes: [{ input: " " }, { input: "\t" }],
      fails: [{ input: "\n", reason: "newline" }],
    },
  },
  TOKEN_IDENTIFIER: {
    name: "TOKEN_IDENTIFIER",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const alpha = resolve("ALPHA", true);
      const extended = resolve("ALPHANUMERIC_EXTENDED");
      return `[${alpha}](?:${extended})*`;
    },
    description: "Base identifier (letter, then alphanumeric with dash/underscore)",
    composedFrom: ["ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "name" }, { input: "my_name" }, { input: "my-name" }],
      fails: [{ input: "-name", reason: "starts with dash" }],
    },
  },
  TOKEN_QUALIFIED_IDENTIFIER: {
    name: "TOKEN_QUALIFIED_IDENTIFIER",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const alpha = resolve("ALPHA", true);
      const extended = resolve("ALPHANUMERIC_EXTENDED");
      const dot = resolve("DOT");
      return `[${alpha}](?:${extended})*(?:${dot}[${alpha}](?:${extended})*)*`;
    },
    description: "Qualified identifier (dot-separated)",
    composedFrom: ["ALPHA", "ALPHANUMERIC_EXTENDED", "DOT"],
    fixtures: {
      passes: [{ input: "name" }, { input: "menu.item" }],
      fails: [{ input: "menu.", reason: "trailing dot" }],
    },
  },
  TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL: {
    name: "TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const alpha = resolve("ALPHA", true);
      const extended = resolve("ALPHANUMERIC_EXTENDED", true);
      const dot = resolve("DOT");
      return `(?:[${alpha}][${extended}]*(?:${dot}[${alpha}][${extended}]*)*)?`;
    },
    description: "Optional qualified identifier",
    composedFrom: ["ALPHA", "ALPHANUMERIC_EXTENDED", "DOT"],
    fixtures: {
      passes: [{ input: "name" }, { input: "" }],
      fails: [],
    },
  },
  TOKEN_MODIFIER_NAME: {
    name: "TOKEN_MODIFIER_NAME",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const alpha = resolve("ALPHA", true);
      const extended = resolve("ALPHANUMERIC_EXTENDED");
      return `-?[${alpha}](?:${extended})*`;
    },
    description: "Modifier name (optional leading dash)",
    composedFrom: ["ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "name" }, { input: "-name" }],
      fails: [{ input: "", reason: "empty" }],
    },
  },
  TOKEN_MODIFIER_NAME_OPTIONAL: {
    name: "TOKEN_MODIFIER_NAME_OPTIONAL",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const alpha = resolve("ALPHA", true);
      const extended = resolve("ALPHANUMERIC_EXTENDED");
      return `(?:-?[${alpha}](?:${extended})*)?`;
    },
    description: "Optional modifier name",
    composedFrom: ["ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "name" }, { input: "" }],
      fails: [],
    },
  },
  TOKEN_CLASS_SELECTOR: {
    name: "TOKEN_CLASS_SELECTOR",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const dot = resolve("DOT");
      const alpha = resolve("ALPHA", true);
      const extended = resolve("ALPHANUMERIC_EXTENDED");
      return `${dot}?[${alpha}](?:${extended})*`;
    },
    description: "Class selector (optional leading dot)",
    composedFrom: ["DOT", "ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "name" }, { input: ".name" }],
      fails: [{ input: "", reason: "empty" }],
    },
  },
  TOKEN_CLASS_SELECTOR_REQUIRED_DOT: {
    name: "TOKEN_CLASS_SELECTOR_REQUIRED_DOT",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const dot = resolve("DOT");
      const alpha = resolve("ALPHA", true);
      const extended = resolve("ALPHANUMERIC_EXTENDED");
      return `${dot}[${alpha}](?:${extended})*`;
    },
    description: "Class selector with required leading dot",
    composedFrom: ["DOT", "ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: ".name" }],
      fails: [
        { input: "name", reason: "missing dot" },
        { input: ".123", reason: "starts with digit" },
      ],
    },
  },
  TOKEN_CLASS_SELECTOR_OPTIONAL: {
    name: "TOKEN_CLASS_SELECTOR_OPTIONAL",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const dot = resolve("DOT");
      const alpha = resolve("ALPHA", true);
      const extended = resolve("ALPHANUMERIC_EXTENDED");
      return `(?:${dot}?[${alpha}](?:${extended})*)?`;
    },
    description: "Optional class selector",
    composedFrom: ["DOT", "ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "name" }, { input: "" }],
      fails: [],
    },
  },
  TOKEN_CUSTOM_PROPERTY: {
    name: "TOKEN_CUSTOM_PROPERTY",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const dash = resolve("DOUBLE_DASH");
      const alpha = resolve("ALPHA", true);
      const extended = resolve("ALPHANUMERIC_EXTENDED");
      return `${dash}[${alpha}](?:${extended})*`;
    },
    description: "Custom CSS property (--name)",
    composedFrom: ["DOUBLE_DASH", "ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "--color" }],
      fails: [{ input: "color", reason: "no dash" }],
    },
  },
  TOKEN_CUSTOM_PROPERTY_OPTIONAL: {
    name: "TOKEN_CUSTOM_PROPERTY_OPTIONAL",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const dash = resolve("DOUBLE_DASH");
      const alpha = resolve("ALPHA", true);
      const extended = resolve("ALPHANUMERIC_EXTENDED");
      return `(?:${dash}[${alpha}](?:${extended})*)?`;
    },
    description: "Optional custom CSS property",
    composedFrom: ["DOUBLE_DASH", "ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "--color" }, { input: "" }],
      fails: [],
    },
  },
  TOKEN_REF_NUMBER: {
    name: "TOKEN_REF_NUMBER",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const digit = resolve("DIGIT");
      const dot = resolve("DOT");
      return `(?:${digit})+(?:${dot}(?:${digit})*)?`;
    },
    description: "Numeric reference (digits with optional dot and more digits)",
    composedFrom: ["DIGIT", "DOT"],
    fixtures: {
      passes: [{ input: "1" }, { input: "42" }, { input: "1.2" }, { input: "2." }],
      fails: [
        { input: "", reason: "empty" },
        { input: ".", reason: "just a dot" },
      ],
    },
  },
  TOKEN_REF_NUMBER_OPTIONAL: {
    name: "TOKEN_REF_NUMBER_OPTIONAL",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const digit = resolve("DIGIT");
      const dot = resolve("DOT");
      return `(?:(?:${digit})+${dot}?)?`;
    },
    description: "Optional numeric reference",
    composedFrom: ["DIGIT", "DOT"],
    fixtures: {
      passes: [{ input: "1" }, { input: "" }],
      fails: [],
    },
  },
  TOKEN_PSEUDO_CLASS: {
    name: "TOKEN_PSEUDO_CLASS",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const colon = resolve("COLON");
      const alpha = resolve("ALPHA", true);
      const extended = resolve("ALPHANUMERIC_EXTENDED");
      const parenOpen = resolve("PAREN_OPEN");
      const parenClose = resolve("PAREN_CLOSE");
      return `${colon}?[${alpha}](?:${extended})*(?:${parenOpen}(?:${extended})*${parenClose})?`;
    },
    description: "Pseudo-class or state (optional colon, optional parens)",
    composedFrom: ["COLON", "ALPHA", "ALPHANUMERIC_EXTENDED", "PAREN_OPEN", "PAREN_CLOSE"],
    fixtures: {
      passes: [{ input: "active" }, { input: ":active" }, { input: "state(open)" }],
      fails: [{ input: "", reason: "empty" }],
    },
  },
  TOKEN_PSEUDO_CLASS_OPTIONAL: {
    name: "TOKEN_PSEUDO_CLASS_OPTIONAL",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const colon = resolve("COLON");
      const alpha = resolve("ALPHA", true);
      const extended = resolve("ALPHANUMERIC_EXTENDED");
      const parenOpen = resolve("PAREN_OPEN");
      const parenClose = resolve("PAREN_CLOSE");
      return `(?:${colon}?[${alpha}](?:${extended})*(?:${parenOpen}(?:${extended})*${parenClose})?)?`;
    },
    description: "Optional pseudo-class or state",
    composedFrom: ["COLON", "ALPHA", "ALPHANUMERIC_EXTENDED", "PAREN_OPEN", "PAREN_CLOSE"],
    fixtures: {
      passes: [{ input: "active" }, { input: "" }],
      fails: [],
    },
  },
  TOKEN_INLINE_CONTENT: {
    name: "TOKEN_INLINE_CONTENT",
    tier: 3,
    source: String.raw`[^}]*`,
    description: "Inline content (anything except closing brace)",
    fixtures: {
      passes: [{ input: "link text" }],
      fails: [],
    },
  },
  CSSDOC_STRUCTURE_TAG: {
    name: "CSSDOC_STRUCTURE_TAG",
    grammarRule: "StructureTagName",
    tier: 3,
    source: String.raw`(?:@component|@variant|@modifier|@state|@part)`,
    description: "Structure tag keyword (@component, @variant, etc.)",
    fixtures: {
      passes: [{ input: "@component" }, { input: "@variant" }],
      fails: [{ input: "component", reason: "no @" }],
    },
  },
  CSSDOC_DEMO_URL: {
    name: "CSSDOC_DEMO_URL",
    grammarRule: "DemoURL",
    tier: 3,
    source: String.raw`(?<url>https?://[^\s]+)`,
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
  TOKENIZER_INLINE_TAG: {
    name: "TOKENIZER_INLINE_TAG",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const wordBoundary = resolve("WORD_BOUNDARY");
      const spaceTab = resolve("SPACE_TAB");
      const inlineContent = resolve("TOKEN_INLINE_CONTENT");
      return `(?<inline>\\{(?<itag>@\\w+)${wordBoundary}${spaceTab}*(?<itext>${inlineContent})\\}?)`;
    },
    description:
      "Inline tag tokenizer: {@tag content}. Used for capturing inline doc-comment tags.",
    composedFrom: ["WORD_BOUNDARY", "SPACE_TAB", "TOKEN_INLINE_CONTENT"],
    fixtures: {
      passes: [
        { input: "{@link https://example.com}", note: "with URL" },
        { input: "{@label foo}", note: "with label" },
      ],
      fails: [{ input: "@link text", reason: "missing braces" }],
    },
  },
  TOKENIZER_RECORD_TAG: {
    name: "TOKENIZER_RECORD_TAG",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const wordBoundary = resolve("WORD_BOUNDARY");
      const spaceTab = resolve("SPACE_TAB");
      const qualifiedId = resolve("TOKEN_QUALIFIED_IDENTIFIER");
      return `(?<record>(?<rtag>@\\w+)${wordBoundary}${spaceTab}*(?<rname>${qualifiedId})?)`;
    },
    description: "Record tag tokenizer: @tag name or @tag name.name",
    composedFrom: ["WORD_BOUNDARY", "SPACE_TAB", "TOKEN_QUALIFIED_IDENTIFIER"],
    fixtures: {
      passes: [
        { input: "@component button" },
        { input: "@component button.variant" },
        { input: "@component", note: "optional name" },
      ],
      fails: [],
    },
  },
  TOKENIZER_MODIFIER_TAG: {
    name: "TOKENIZER_MODIFIER_TAG",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const wordBoundary = resolve("WORD_BOUNDARY");
      const spaceTab = resolve("SPACE_TAB");
      const modifierName = resolve("TOKEN_MODIFIER_NAME");
      return `(?<modifier>(?<mtag>@\\w+)${wordBoundary}${spaceTab}*(?<mname>${modifierName})?)`;
    },
    description: "Modifier tag tokenizer: @tag -name",
    composedFrom: ["WORD_BOUNDARY", "SPACE_TAB", "TOKEN_MODIFIER_NAME"],
    fixtures: {
      passes: [{ input: "@modifier -dark" }, { input: "@modifier" }],
      fails: [],
    },
  },
  TOKENIZER_PART_TAG: {
    name: "TOKENIZER_PART_TAG",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const wordBoundary = resolve("WORD_BOUNDARY");
      const spaceTab = resolve("SPACE_TAB");
      const classSelector = resolve("TOKEN_CLASS_SELECTOR");
      return `(?<part>(?<ptag>@\\w+)${wordBoundary}${spaceTab}*(?<pname>${classSelector})?)`;
    },
    description: "Part tag tokenizer: @tag .name or @tag .name[attr]",
    composedFrom: ["WORD_BOUNDARY", "SPACE_TAB", "TOKEN_CLASS_SELECTOR"],
    fixtures: {
      passes: [{ input: "@part .button" }, { input: "@csspart .icon" }, { input: "@slot" }],
      fails: [],
    },
  },
  TOKENIZER_PROPERTY_TAG: {
    name: "TOKENIZER_PROPERTY_TAG",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const wordBoundary = resolve("WORD_BOUNDARY");
      const spaceTab = resolve("SPACE_TAB");
      const customProp = resolve("TOKEN_CUSTOM_PROPERTY");
      return `(?<property>(?<proptag>@\\w+)${wordBoundary}${spaceTab}*(?<propname>${customProp})?)`;
    },
    description: "Custom property tag tokenizer: @tag --name",
    composedFrom: ["WORD_BOUNDARY", "SPACE_TAB", "TOKEN_CUSTOM_PROPERTY"],
    fixtures: {
      passes: [{ input: "@property --color" }, { input: "@cssproperty --size" }],
      fails: [],
    },
  },
  TOKENIZER_REF_TAG: {
    name: "TOKENIZER_REF_TAG",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const wordBoundary = resolve("WORD_BOUNDARY");
      const spaceTab = resolve("SPACE_TAB");
      const refNumber = resolve("TOKEN_REF_NUMBER");
      return `(?<ref>(?<reftag>@ref)${wordBoundary}${spaceTab}*(?<refnum>${refNumber})?)`;
    },
    description: "Ref tag tokenizer: @ref 1 or @ref 1.2",
    composedFrom: ["WORD_BOUNDARY", "SPACE_TAB", "TOKEN_REF_NUMBER"],
    fixtures: {
      passes: [{ input: "@ref 1" }, { input: "@ref 1.2" }],
      fails: [{ input: "@ref abc", reason: "not a number" }],
    },
  },
  TYPED_STRUCTURE_MEDIA: {
    name: "TYPED_STRUCTURE_MEDIA",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const at = resolve("AT_CHAR");
      const recordKind = resolve("STRUCTURE_RECORD_KIND");
      const space = resolve("SPACE_TAB");
      const identifier = resolve("TOKEN_IDENTIFIER");
      const customProp = resolve("TOKEN_CUSTOM_PROPERTY");
      return `${at}(${recordKind})${space}+(${identifier})${space}*\\(${space}*(${customProp})${space}*\\)`;
    },
    description: "Typed structure custom-media reference (@kind name (--profile))",
    composedFrom: [
      "AT_CHAR",
      "STRUCTURE_RECORD_KIND",
      "SPACE_TAB",
      "TOKEN_IDENTIFIER",
      "TOKEN_CUSTOM_PROPERTY",
    ],
    fixtures: {
      passes: [{ input: "@component nav (--top-nav)" }, { input: "@utility spacing (--sizes)" }],
      fails: [
        { input: "@unknown nav (--x)", reason: "unknown record kind" },
        { input: "component nav (--x)", reason: "missing @" },
      ],
    },
  },
  UNTYPED_STRUCTURE_MEDIA: {
    name: "UNTYPED_STRUCTURE_MEDIA",
    tier: 3,
    pattern: (resolve: PatternResolver) => {
      const at = resolve("AT_CHAR");
      const space = resolve("SPACE_TAB");
      const identifier = resolve("TOKEN_IDENTIFIER");
      const customProp = resolve("TOKEN_CUSTOM_PROPERTY");
      return `${at}(${identifier})${space}*\\(${space}*(${customProp})${space}*\\)`;
    },
    description: "Untyped structure custom-media reference (@name (--profile))",
    composedFrom: ["AT_CHAR", "TOKEN_IDENTIFIER", "SPACE_TAB", "TOKEN_CUSTOM_PROPERTY"],
    fixtures: {
      passes: [{ input: "@sidebar (--layouts)" }, { input: "@custom-ref (--profile)" }],
      fails: [
        { input: "sidebar (--x)", reason: "missing @" },
        { input: "@sidebar", reason: "missing parentheses" },
      ],
    },
  },
};
