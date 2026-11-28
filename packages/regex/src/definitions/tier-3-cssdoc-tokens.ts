/**
 * \@cssdoc/regex/definitions/tier-3-cssdoc-tokens
 * Tier 3+ CssDoc and tokenizer patterns
 * @module
 */

import type { PatternDefinition } from "../types.ts";

/** Component reference with optional cardinality */
export const CSSDOC_COMPONENT_REF: RegExp =
  /(?<ref>(?<identifier>[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)(?::(?<card>(?<oomKw>one-or-more|more):max-(?<oomMax>[0-9]+)|max-(?<max>[0-9]+)|(?<kw>optional|opt|many|one-or-more|more)))?)/;
/** Part name */
export const CSSDOC_PART_NAME: RegExp = /(?<name>[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)/;
/** Property or custom property name */
export const CSSDOC_CSSPROP_NAME: RegExp =
  /(?<name>(?<custom>--)?[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)/;
/** State name */
export const CSSDOC_CSSSTATE_NAME: RegExp = /(?<name>[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)/;
/** Variant name */
export const CSSDOC_VARIANT_NAME: RegExp = /(?<name>[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)/;
/** Slot name */
export const CSSDOC_SLOT_NAME: RegExp = /(?<name>[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)/;
/** \@example language identifier */
export const CSSDOC_EXAMPLE_LANG: RegExp =
  /(?<lang>css|html|javascript|js|typescript|ts|jsx|tsx|json|markdown|md|text|plain)/;
/** Horizontal whitespace (space or tab) */
export const TOKEN_WHITESPACE: RegExp = /[ \t]*/;
/** Base identifier (letter, then alphanumeric with dash/underscore) */
export const TOKEN_IDENTIFIER: RegExp = /[A-Za-z][A-Za-z0-9\-_]*/;
/** Qualified identifier (dot-separated) */
export const TOKEN_QUALIFIED_IDENTIFIER: RegExp =
  /[A-Za-z][A-Za-z0-9\-_]*(?:\.[A-Za-z][A-Za-z0-9\-_]*)*/;
/** Optional qualified identifier */
export const TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL: RegExp =
  /(?:[A-Za-z][\w\-]*(?:\.[A-Za-z][\w\-]*)*)?/;
/** Modifier name (optional leading dash) */
export const TOKEN_MODIFIER_NAME: RegExp = /-?[A-Za-z][A-Za-z0-9\-_]*/;
/** Optional modifier name */
export const TOKEN_MODIFIER_NAME_OPTIONAL: RegExp = /(?:-?[A-Za-z][A-Za-z0-9\-_]*)?/;
/** Class selector (optional leading dot) */
export const TOKEN_CLASS_SELECTOR: RegExp = /\.?[A-Za-z][A-Za-z0-9\-_]*/;
/** Class selector with required leading dot */
export const TOKEN_CLASS_SELECTOR_REQUIRED_DOT: RegExp = /\.[A-Za-z][A-Za-z0-9\-_]*/;
/** Optional class selector */
export const TOKEN_CLASS_SELECTOR_OPTIONAL: RegExp = /(?:\.?[A-Za-z][A-Za-z0-9\-_]*)?/;
/** Custom CSS property (--name) */
export const TOKEN_CUSTOM_PROPERTY: RegExp = /--[A-Za-z][A-Za-z0-9\-_]*/;
/** Optional custom CSS property */
export const TOKEN_CUSTOM_PROPERTY_OPTIONAL: RegExp = /(?:--[A-Za-z][A-Za-z0-9\-_]*)?/;
/** Numeric reference (digits with optional dot and more digits) */
export const TOKEN_REF_NUMBER: RegExp = /[0-9]+(?:\.[0-9]*)?/;
/** Optional numeric reference */
export const TOKEN_REF_NUMBER_OPTIONAL: RegExp = /(?:[0-9]+\.?)?/;
/** Pseudo-class or state (optional colon, optional parens) */
export const TOKEN_PSEUDO_CLASS: RegExp = /:?[A-Za-z][A-Za-z0-9\-_]*(?:\([A-Za-z0-9\-_]*\))?/;
/** Optional pseudo-class or state */
export const TOKEN_PSEUDO_CLASS_OPTIONAL: RegExp =
  /(?::?[A-Za-z][A-Za-z0-9\-_]*(?:\([A-Za-z0-9\-_]*\))?)?/;
/** Inline content (anything except closing brace) */
export const TOKEN_INLINE_CONTENT: RegExp = /[^}]*/;
/** Structure tag keyword (\@component, \@variant, etc.) */
export const CSSDOC_STRUCTURE_TAG: RegExp = /(?:@component|@variant|@modifier|@state|@part)/;
/** \@demo URL */
export const CSSDOC_DEMO_URL: RegExp = /(?<url>https?:\/\/\S+)/;
/** Inline tag tokenizer: \{\@tag content\}. Used for capturing inline doc-comment tags. */
export const TOKENIZER_INLINE_TAG: RegExp = /(?<inline>\{(?<itag>@\w+)\b[ \t]*(?<itext>[^}]*)\}?)/;
/** Record tag tokenizer: \@tag name or \@tag name.name */
export const TOKENIZER_RECORD_TAG: RegExp =
  /(?<record>(?<rtag>@\w+)\b[ \t]*(?<rname>[A-Za-z][A-Za-z0-9\-_]*(?:\.[A-Za-z][A-Za-z0-9\-_]*)*)?)/;
/** Modifier tag tokenizer: \@tag -name */
export const TOKENIZER_MODIFIER_TAG: RegExp =
  /(?<modifier>(?<mtag>@\w+)\b[ \t]*(?<mname>-?[A-Za-z][A-Za-z0-9\-_]*)?)/;
/** Part tag tokenizer: \@tag .name or \@tag .name[attr] */
export const TOKENIZER_PART_TAG: RegExp =
  /(?<part>(?<ptag>@\w+)\b[ \t]*(?<pname>\.?[A-Za-z][A-Za-z0-9\-_]*)?)/;
/** Custom property tag tokenizer: \@tag --name */
export const TOKENIZER_PROPERTY_TAG: RegExp =
  /(?<property>(?<proptag>@\w+)\b[ \t]*(?<propname>--[A-Za-z][A-Za-z0-9\-_]*)?)/;
/** Ref tag tokenizer: \@ref 1 or \@ref 1.2 */
export const TOKENIZER_REF_TAG: RegExp =
  /(?<ref>(?<reftag>@ref)\b[ \t]*(?<refnum>[0-9]+(?:\.[0-9]*)?)?)/;
/** Typed structure custom-media reference (\@kind name (--profile)) */
export const TYPED_STRUCTURE_MEDIA: RegExp =
  /@(component|name|utility|declaration)[ \t]+([A-Za-z][A-Za-z0-9\-_]*)[ \t]*\([ \t]*(--[A-Za-z][A-Za-z0-9\-_]*)[ \t]*\)/;
/** Untyped structure custom-media reference (\@name (--profile)) */
export const UNTYPED_STRUCTURE_MEDIA: RegExp =
  /@([A-Za-z][A-Za-z0-9\-_]*)[ \t]*\([ \t]*(--[A-Za-z][A-Za-z0-9\-_]*)[ \t]*\)/;

/** CssDoc token and tag tokenizer pattern definitions. */
export const TIER_3_CSSDOC_TOKENS_PATTERNS: Record<string, PatternDefinition> = {
  CSSDOC_COMPONENT_REF: {
    name: "CSSDOC_COMPONENT_REF",
    grammarRule: "StructureBody",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 3,
    regex: CSSDOC_COMPONENT_REF,
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
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 3,
    regex: CSSDOC_PART_NAME,
    captures: { name: "Part name" },
    description: "Part name",
    composedFrom: ["CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    fixtures: {
      passes: [{ input: "button" }, { input: "my-part" }, { input: "icon2" }],
      fails: [
        { input: "-part", reason: "starts with dash" },
        { input: "", reason: "empty" },
        { input: "2part", reason: "starts with a digit" },
      ],
    },
  },
  CSSDOC_CSSPROP_NAME: {
    name: "CSSDOC_CSSPROP_NAME",
    grammarRule: "CustomPropertyName",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 3,
    regex: CSSDOC_CSSPROP_NAME,
    captures: { name: "Full property name", custom: "Double dash if custom" },
    description: "Property or custom property name",
    composedFrom: ["DOUBLE_DASH", "CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    fixtures: {
      passes: [{ input: "background-color" }, { input: "--my-color" }, { input: "color" }],
      fails: [
        { input: "-color", reason: "single dash not valid" },
        { input: "", reason: "empty" },
        { input: "--1color", reason: "custom name starts with a digit" },
      ],
    },
  },
  CSSDOC_CSSSTATE_NAME: {
    name: "CSSDOC_CSSSTATE_NAME",
    grammarRule: "StateName",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 3,
    regex: CSSDOC_CSSSTATE_NAME,
    captures: { name: "State name" },
    description: "State name",
    composedFrom: ["CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    fixtures: {
      passes: [{ input: "active" }, { input: "my-state" }, { input: "open2" }],
      fails: [
        { input: "-state", reason: "starts with dash" },
        { input: "", reason: "empty" },
        { input: "2state", reason: "starts with a digit" },
      ],
    },
  },
  CSSDOC_VARIANT_NAME: {
    name: "CSSDOC_VARIANT_NAME",
    grammarRule: "StructureBody",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 3,
    regex: CSSDOC_VARIANT_NAME,
    captures: { name: "Variant name" },
    description: "Variant name",
    composedFrom: ["CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    fixtures: {
      passes: [{ input: "default" }, { input: "button-group" }, { input: "compact2" }],
      fails: [
        { input: "-variant", reason: "starts with dash" },
        { input: "", reason: "empty" },
        { input: "2variant", reason: "starts with a digit" },
      ],
    },
  },
  CSSDOC_SLOT_NAME: {
    name: "CSSDOC_SLOT_NAME",
    grammarRule: "SlotName",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 3,
    regex: CSSDOC_SLOT_NAME,
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
    tier: 3,
    regex: CSSDOC_EXAMPLE_LANG,
    captures: { lang: "Language identifier" },
    description: "@example language identifier",
    fixtures: {
      passes: [{ input: "css" }, { input: "html" }, { input: "javascript" }],
      fails: [
        { input: "python", reason: "not a web language" },
        { input: "", reason: "empty" },
        { input: "CSS", reason: "language identifiers are lowercase" },
      ],
    },
  },
  TOKEN_WHITESPACE: {
    name: "TOKEN_WHITESPACE",
    tier: 3,
    regex: TOKEN_WHITESPACE,
    description: "Horizontal whitespace (space or tab)",
    fixtures: {
      passes: [{ input: " " }, { input: "\t" }, { input: "" }],
      fails: [
        { input: "\n", reason: "newline" },
        { input: "x", reason: "not whitespace" },
      ],
    },
  },
  TOKEN_IDENTIFIER: {
    name: "TOKEN_IDENTIFIER",
    tier: 3,
    regex: TOKEN_IDENTIFIER,
    description: "Base identifier (letter, then alphanumeric with dash/underscore)",
    composedFrom: ["ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "name" }, { input: "my_name" }, { input: "my-name" }],
      fails: [
        { input: "-name", reason: "starts with dash" },
        { input: "1name", reason: "starts with a digit" },
      ],
    },
  },
  TOKEN_QUALIFIED_IDENTIFIER: {
    name: "TOKEN_QUALIFIED_IDENTIFIER",
    tier: 3,
    regex: TOKEN_QUALIFIED_IDENTIFIER,
    description: "Qualified identifier (dot-separated)",
    composedFrom: ["ALPHA", "ALPHANUMERIC_EXTENDED", "DOT"],
    fixtures: {
      passes: [{ input: "name" }, { input: "menu.item" }, { input: "menu.item.icon" }],
      fails: [
        { input: "menu.", reason: "trailing dot" },
        { input: "menu..item", reason: "empty segment" },
      ],
    },
  },
  TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL: {
    name: "TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL",
    tier: 3,
    regex: TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL,
    description: "Optional qualified identifier",
    composedFrom: ["ALPHA", "ALPHANUMERIC_EXTENDED", "DOT"],
    fixtures: {
      passes: [{ input: "name" }, { input: "" }, { input: "menu.item" }],
      fails: [
        { input: "menu.", reason: "trailing dot" },
        { input: ".menu", reason: "empty first segment" },
      ],
    },
  },
  TOKEN_MODIFIER_NAME: {
    name: "TOKEN_MODIFIER_NAME",
    tier: 3,
    regex: TOKEN_MODIFIER_NAME,
    description: "Modifier name (optional leading dash)",
    composedFrom: ["ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "name" }, { input: "-name" }, { input: "-color-primary" }],
      fails: [
        { input: "", reason: "empty" },
        { input: "--name", reason: "two leading dashes" },
        { input: "1name", reason: "starts with a digit" },
      ],
    },
  },
  TOKEN_MODIFIER_NAME_OPTIONAL: {
    name: "TOKEN_MODIFIER_NAME_OPTIONAL",
    tier: 3,
    regex: TOKEN_MODIFIER_NAME_OPTIONAL,
    description: "Optional modifier name",
    composedFrom: ["ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "name" }, { input: "" }, { input: "-dark" }],
      fails: [
        { input: "--dark", reason: "two leading dashes" },
        { input: "1name", reason: "starts with a digit" },
      ],
    },
  },
  TOKEN_CLASS_SELECTOR: {
    name: "TOKEN_CLASS_SELECTOR",
    tier: 3,
    regex: TOKEN_CLASS_SELECTOR,
    description: "Class selector (optional leading dot)",
    composedFrom: ["DOT", "ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "name" }, { input: ".name" }, { input: ".button-primary" }],
      fails: [
        { input: "", reason: "empty" },
        { input: ".1button", reason: "name starts with a digit" },
        { input: "..button", reason: "two leading dots" },
      ],
    },
  },
  TOKEN_CLASS_SELECTOR_REQUIRED_DOT: {
    name: "TOKEN_CLASS_SELECTOR_REQUIRED_DOT",
    tier: 3,
    regex: TOKEN_CLASS_SELECTOR_REQUIRED_DOT,
    description: "Class selector with required leading dot",
    composedFrom: ["DOT", "ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: ".name" }, { input: ".button" }, { input: ".menu-item" }],
      fails: [
        { input: "name", reason: "missing dot" },
        { input: ".123", reason: "starts with digit" },
      ],
    },
  },
  TOKEN_CLASS_SELECTOR_OPTIONAL: {
    name: "TOKEN_CLASS_SELECTOR_OPTIONAL",
    tier: 3,
    regex: TOKEN_CLASS_SELECTOR_OPTIONAL,
    description: "Optional class selector",
    composedFrom: ["DOT", "ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "name" }, { input: "" }, { input: ".button" }],
      fails: [
        { input: ".1button", reason: "name starts with a digit" },
        { input: "..button", reason: "two leading dots" },
      ],
    },
  },
  TOKEN_CUSTOM_PROPERTY: {
    name: "TOKEN_CUSTOM_PROPERTY",
    tier: 3,
    regex: TOKEN_CUSTOM_PROPERTY,
    description: "Custom CSS property (--name)",
    composedFrom: ["DOUBLE_DASH", "ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "--color" }, { input: "--button-color" }, { input: "--size" }],
      fails: [
        { input: "color", reason: "no dash" },
        { input: "--1color", reason: "name starts with a digit" },
      ],
    },
  },
  TOKEN_CUSTOM_PROPERTY_OPTIONAL: {
    name: "TOKEN_CUSTOM_PROPERTY_OPTIONAL",
    tier: 3,
    regex: TOKEN_CUSTOM_PROPERTY_OPTIONAL,
    description: "Optional custom CSS property",
    composedFrom: ["DOUBLE_DASH", "ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "--color" }, { input: "" }, { input: "--button-color" }],
      fails: [
        { input: "color", reason: "missing double dash" },
        { input: "--1color", reason: "name starts with a digit" },
      ],
    },
  },
  TOKEN_REF_NUMBER: {
    name: "TOKEN_REF_NUMBER",
    tier: 3,
    regex: TOKEN_REF_NUMBER,
    description: "Numeric reference (digits with optional dot and more digits)",
    composedFrom: ["DIGIT", "DOT"],
    fixtures: {
      passes: [{ input: "1" }, { input: "42" }, { input: "1.2" }, { input: "2." }],
      fails: [
        { input: "", reason: "empty" },
        { input: ".", reason: "just a dot" },
        { input: "1.a", reason: "non-numeric suffix" },
      ],
    },
  },
  TOKEN_REF_NUMBER_OPTIONAL: {
    name: "TOKEN_REF_NUMBER_OPTIONAL",
    tier: 3,
    regex: TOKEN_REF_NUMBER_OPTIONAL,
    description: "Optional numeric reference",
    composedFrom: ["DIGIT", "DOT"],
    fixtures: {
      passes: [{ input: "1" }, { input: "" }, { input: "42." }],
      fails: [
        { input: ".", reason: "missing digits" },
        { input: "1.2", reason: "additional digits after dot" },
      ],
    },
  },
  TOKEN_PSEUDO_CLASS: {
    name: "TOKEN_PSEUDO_CLASS",
    tier: 3,
    regex: TOKEN_PSEUDO_CLASS,
    description: "Pseudo-class or state (optional colon, optional parens)",
    composedFrom: ["COLON", "ALPHA", "ALPHANUMERIC_EXTENDED", "PAREN_OPEN", "PAREN_CLOSE"],
    fixtures: {
      passes: [{ input: "active" }, { input: ":active" }, { input: "state(open)" }],
      fails: [
        { input: "", reason: "empty" },
        { input: ":", reason: "missing name" },
        { input: ":state(open", reason: "missing closing parenthesis" },
      ],
    },
  },
  TOKEN_PSEUDO_CLASS_OPTIONAL: {
    name: "TOKEN_PSEUDO_CLASS_OPTIONAL",
    tier: 3,
    regex: TOKEN_PSEUDO_CLASS_OPTIONAL,
    description: "Optional pseudo-class or state",
    composedFrom: ["COLON", "ALPHA", "ALPHANUMERIC_EXTENDED", "PAREN_OPEN", "PAREN_CLOSE"],
    fixtures: {
      passes: [{ input: "active" }, { input: "" }, { input: ":state(open)" }],
      fails: [
        { input: ":", reason: "missing name" },
        { input: ":state(open", reason: "missing closing parenthesis" },
      ],
    },
  },
  TOKEN_INLINE_CONTENT: {
    name: "TOKEN_INLINE_CONTENT",
    tier: 3,
    regex: TOKEN_INLINE_CONTENT,
    description: "Inline content (anything except closing brace)",
    fixtures: {
      passes: [{ input: "link text" }, { input: "" }, { input: "label|text" }],
      fails: [
        { input: "}", reason: "closing brace" },
        { input: "link}text", reason: "contains a closing brace" },
      ],
    },
  },
  CSSDOC_STRUCTURE_TAG: {
    name: "CSSDOC_STRUCTURE_TAG",
    grammarRule: "StructureBody",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 3,
    regex: CSSDOC_STRUCTURE_TAG,
    description: "Structure tag keyword (@component, @variant, etc.)",
    fixtures: {
      passes: [{ input: "@component" }, { input: "@variant" }, { input: "@part" }],
      fails: [
        { input: "component", reason: "no @" },
        { input: "@unknown", reason: "not a structure tag" },
      ],
    },
  },
  CSSDOC_DEMO_URL: {
    name: "CSSDOC_DEMO_URL",
    grammarRule: "Url",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 3,
    regex: CSSDOC_DEMO_URL,
    captures: { url: "URL" },
    description: "@demo URL",
    fixtures: {
      passes: [
        { input: "https://example.com" },
        { input: "http://localhost:3000" },
        { input: "https://example.com/demo" },
      ],
      fails: [
        { input: "example.com", reason: "missing protocol" },
        { input: "", reason: "empty" },
        { input: "ftp://example.com", reason: "unsupported protocol" },
      ],
    },
  },
  TOKENIZER_INLINE_TAG: {
    name: "TOKENIZER_INLINE_TAG",
    tier: 3,
    regex: TOKENIZER_INLINE_TAG,
    description:
      "Inline tag tokenizer: {@tag content}. Used for capturing inline doc-comment tags.",
    composedFrom: ["WORD_BOUNDARY", "SPACE_TAB", "TOKEN_INLINE_CONTENT"],
    fixtures: {
      passes: [
        { input: "{@link https://example.com}", note: "with URL" },
        { input: "{@label foo}", note: "with label" },
        { input: "{@link target" },
      ],
      fails: [
        { input: "@link text", reason: "missing braces" },
        { input: "{link target}", reason: "missing at sign" },
      ],
    },
  },
  TOKENIZER_RECORD_TAG: {
    name: "TOKENIZER_RECORD_TAG",
    tier: 3,
    regex: TOKENIZER_RECORD_TAG,
    description: "Record tag tokenizer: @tag name or @tag name.name",
    composedFrom: ["WORD_BOUNDARY", "SPACE_TAB", "TOKEN_QUALIFIED_IDENTIFIER"],
    fixtures: {
      passes: [
        { input: "@component button" },
        { input: "@component button.variant" },
        { input: "@component", note: "optional name" },
      ],
      fails: [
        { input: "component button", reason: "missing at sign" },
        { input: "@component 123", reason: "name starts with a digit" },
      ],
    },
  },
  TOKENIZER_MODIFIER_TAG: {
    name: "TOKENIZER_MODIFIER_TAG",
    tier: 3,
    regex: TOKENIZER_MODIFIER_TAG,
    description: "Modifier tag tokenizer: @tag -name",
    composedFrom: ["WORD_BOUNDARY", "SPACE_TAB", "TOKEN_MODIFIER_NAME"],
    fixtures: {
      passes: [{ input: "@modifier -dark" }, { input: "@modifier" }, { input: "@modifier color" }],
      fails: [
        { input: "modifier -dark", reason: "missing at sign" },
        { input: "@modifier --dark", reason: "two leading dashes" },
      ],
    },
  },
  TOKENIZER_PART_TAG: {
    name: "TOKENIZER_PART_TAG",
    tier: 3,
    regex: TOKENIZER_PART_TAG,
    description: "Part tag tokenizer: @tag .name or @tag .name[attr]",
    composedFrom: ["WORD_BOUNDARY", "SPACE_TAB", "TOKEN_CLASS_SELECTOR"],
    fixtures: {
      passes: [{ input: "@part .button" }, { input: "@csspart .icon" }, { input: "@slot" }],
      fails: [
        { input: "part .button", reason: "missing at sign" },
        { input: "@part .1button", reason: "name starts with a digit" },
      ],
    },
  },
  TOKENIZER_PROPERTY_TAG: {
    name: "TOKENIZER_PROPERTY_TAG",
    tier: 3,
    regex: TOKENIZER_PROPERTY_TAG,
    description: "Custom property tag tokenizer: @tag --name",
    composedFrom: ["WORD_BOUNDARY", "SPACE_TAB", "TOKEN_CUSTOM_PROPERTY"],
    fixtures: {
      passes: [
        { input: "@property --color" },
        { input: "@cssproperty --size" },
        { input: "@property" },
      ],
      fails: [
        { input: "property --color", reason: "missing at sign" },
        { input: "@property --1color", reason: "name starts with a digit" },
      ],
    },
  },
  TOKENIZER_REF_TAG: {
    name: "TOKENIZER_REF_TAG",
    tier: 3,
    regex: TOKENIZER_REF_TAG,
    description: "Ref tag tokenizer: @ref 1 or @ref 1.2",
    composedFrom: ["WORD_BOUNDARY", "SPACE_TAB", "TOKEN_REF_NUMBER"],
    fixtures: {
      passes: [{ input: "@ref 1" }, { input: "@ref 1.2" }, { input: "@ref" }],
      fails: [
        { input: "@ref abc", reason: "not a number" },
        { input: "ref 1", reason: "missing at sign" },
      ],
    },
  },
  TYPED_STRUCTURE_MEDIA: {
    name: "TYPED_STRUCTURE_MEDIA",
    tier: 3,
    regex: TYPED_STRUCTURE_MEDIA,
    description: "Typed structure custom-media reference (@kind name (--profile))",
    composedFrom: [
      "AT_CHAR",
      "STRUCTURE_RECORD_KIND",
      "SPACE_TAB",
      "TOKEN_IDENTIFIER",
      "TOKEN_CUSTOM_PROPERTY",
    ],
    fixtures: {
      passes: [
        { input: "@component nav (--top-nav)" },
        { input: "@utility spacing (--sizes)" },
        { input: "@declaration tokens (--theme)" },
      ],
      fails: [
        { input: "@unknown nav (--x)", reason: "unknown record kind" },
        { input: "component nav (--x)", reason: "missing @" },
      ],
    },
  },
  UNTYPED_STRUCTURE_MEDIA: {
    name: "UNTYPED_STRUCTURE_MEDIA",
    tier: 3,
    regex: UNTYPED_STRUCTURE_MEDIA,
    description: "Untyped structure custom-media reference (@name (--profile))",
    composedFrom: ["AT_CHAR", "TOKEN_IDENTIFIER", "SPACE_TAB", "TOKEN_CUSTOM_PROPERTY"],
    fixtures: {
      passes: [
        { input: "@sidebar (--layouts)" },
        { input: "@custom-ref (--profile)" },
        { input: "@nav (--compact)" },
      ],
      fails: [
        { input: "sidebar (--x)", reason: "missing @" },
        { input: "@sidebar", reason: "missing parentheses" },
      ],
    },
  },
};
