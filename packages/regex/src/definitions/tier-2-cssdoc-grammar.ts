/**
 * \@cssdoc/regex/definitions/tier-2-cssdoc-grammar
 * Tier 2 CssDoc grammar and selector patterns
 * @module
 */

import type { PatternDefinition } from "../types.ts";

/** Map accepted structure cardinality keywords to their canonical values. */
export const CSSDOC_CARDINALITY_KEYWORDS: Readonly<
  Record<string, "optional" | "many" | "one-or-more">
> = {
  optional: "optional",
  opt: "optional",
  many: "many",
  "one-or-more": "one-or-more",
  more: "one-or-more",
};
/** Kind of an inline cssdoc diagnostic directive */
export const CSSDOC_DIRECTIVE_KIND: RegExp =
  /(?:disable-next-line|disable-line|disable|enable|expect-error)\b/;
/** Permissive class reference with its name captured */
export const CSS_CLASS_REFERENCE: RegExp = /\.([\w\-]+)/u;
/** Custom state selector with its name captured */
export const CSSDOC_CUSTOM_STATE_SELECTOR: RegExp = /:state\(\s*([\w\-]+)\s*\)/u;
/** Shadow part selector with its name captured */
export const CSSDOC_SHADOW_PART_SELECTOR: RegExp = /::part\(\s*([\w\-]+)\s*\)/u;
/** Pseudo selector stripped before scanning classes */
export const CSSDOC_SCANNED_PSEUDO_SELECTOR: RegExp = /::?[\w\-]+(\([^)]*\))?/u;
/** Typed structure reference body with kind, name, profile, and privacy captures */
export const CSSDOC_TYPED_STRUCTURE_REFERENCE: RegExp =
  /(component|name|utility|declaration)\s+([\w\-]+(?:\.[\w\-]+)*)(?::([\w\-]+))?(?:\s+(private))?/u;
/** Shorthand structure reference body with name, profile, and privacy captures */
export const CSSDOC_SHORTHAND_STRUCTURE_REFERENCE: RegExp =
  /([\w\-]+(?:\.[\w\-]+)*)(?::([\w\-]+))?(?:\s+(private))?/u;
/** Class name accepted for base-class and scoped-part inference */
export const CSSDOC_BASE_CLASS_NAME: RegExp = /(?:[A-Za-z_])[\w\-]*/;
/** Class reference for base and scoped-part inference, capturing the name */
export const CSSDOC_BASE_CLASS_REFERENCE: RegExp = /\.((?:[A-Za-z_])[\w\-]*)/u;
/** Element name in an element tag, with independently optional angle brackets */
export const CSSDOC_ELEMENT_TAG: RegExp = /<?\s*([a-z][a-z0-9-]*)\s*>?/u;
/** Class attribute selector with operator and quoted or unquoted value captures */
export const CSS_CLASS_ATTRIBUTE_SELECTOR: RegExp =
  /\[\s*class\s*([~^$*|]?)=\s*(?!\s)(?:"([^"]*)"|'([^']*)'|([^\]\s]*))\s*\]/u;
/** Bracketed CSS selector with quoted attribute values */
export const CSSDOC_ATTRIBUTE_SELECTOR: RegExp = /\[(?:[^\]"']|"[^"]*"|'[^']*')*\]/;
/** Selector token with bracketed attributes that can contain whitespace */
export const CSSDOC_SELECTOR_TOKEN: RegExp = /(?:\[(?:[^\]"']|"[^"]*"|'[^']*')*\]|[^\s[])+/;
/** Dot-separated reference segments accepted in structure tags */
export const CSSDOC_QUALIFIED_REFERENCE: RegExp = /[\w\-]+(?:\.[\w\-]+)*/;
/** Default or named slot selector in a structure node */
export const CSSDOC_STRUCTURE_SLOT: RegExp = /slot(?:\[\s*name\s*=\s*["']?([\w\-]+)["']?\s*\])?/;
/** Custom property name accepted in a cssdoc tag */
export const CSSDOC_CUSTOM_PROPERTY_TAG_NAME: RegExp = /--[\w\-]+/;
/** Block tag name without its at sign */
export const CSSDOC_BLOCK_TAG_NAME: RegExp = /[A-Za-z][\w-]*/;
/** Lowercase alphanumeric example label with optional hyphens */
export const CSSDOC_EXAMPLE_LABEL: RegExp = /[a-z0-9]+(?:-[a-z0-9]+)*/;
/** Separator between a cssdoc tag argument and its description */
export const CSSDOC_DESCRIPTION_SEPARATOR: RegExp = /(?:—|-{1,2})/;
/** Optional punctuation before a modifier annotation */
export const CSSDOC_MODIFIER_ANNOTATION_PREFIX: RegExp = /(?:[-—]\s*)?/;
/** A bare, class, or bracketed canonical modifier reference */
export const CSSDOC_MODIFIER_REFERENCE: RegExp = /(?:\.?[\w-]+|\[[^\]]*\])/;
/** Record reference name (starts with letter, then alphanumeric with hyphens) */
export const RECORD_REFERENCE_NAME: RegExp = /[A-Za-z][A-Za-z0-9\-_]*/;
/** CssDoc tag name */
export const CSSDOC_TAG_NAME: RegExp = /@(?<tag>[A-Za-z]+(?:-[A-Za-z]+)*)/;
/** CSS selector */
export const CSSDOC_SELECTOR: RegExp =
  /(?<selector>(?:[a-zA-Z_\-\u0080-\uFFFF][\w\-\u0080-\uFFFF]*|[.#[\]:~+>\s])+)/;
/** Modifier name */
export const CSSDOC_MODIFIER_NAME: RegExp = /(?<name>[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)/;
/** Modifier with attribute selector */
export const CSSDOC_MODIFIER_ATTRIBUTE: RegExp =
  /\[(?<attr>[A-Za-z]+)\s*=\s*(?<value>[^\s\]][^\]]*)\]/;
/** Pseudo selector */
export const CSSDOC_PSEUDO_SELECTOR: RegExp =
  /(?<pseudo>::?(?:before|after|first-letter|first-line|placeholder|selection|backdrop))/;
/** Cardinality suffix in structure, without the leading colon */
export const CSSDOC_CARDINALITY: RegExp =
  /(?<card>(?<oomKw>one-or-more|more):max-(?<oomMax>[0-9]+)|max-(?<max>[0-9]+)|(?<kw>optional|opt|many|one-or-more|more))/;
/** The \@structure tag keyword */
export const CSSDOC_STRUCTURE_TAG_KEYWORD: RegExp = /@structure\b/;
/** Any \@-prefixed tag keyword */
export const CSSDOC_ANY_TAG_KEYWORD: RegExp = /@[A-Za-z]+\b/;
/** Tag name placeholder for text replacement (\@tagname) */
export const TAG_NAME_PLACEHOLDER: RegExp = /@[A-Za-z]+/;
/** Structure record kind (component, name, utility, or declaration) */
export const STRUCTURE_RECORD_KIND: RegExp = /(?:component|name|utility|declaration)/;

/** CssDoc grammar, selector, and structure reference pattern definitions. */
export const TIER_2_CSSDOC_GRAMMAR_PATTERNS: Record<string, PatternDefinition> = {
  CSSDOC_DIRECTIVE_KIND: {
    name: "CSSDOC_DIRECTIVE_KIND",
    tier: 2,
    regex: CSSDOC_DIRECTIVE_KIND,
    description: "Kind of an inline cssdoc diagnostic directive",
    fixtures: {
      passes: [{ input: "disable" }, { input: "disable-next-line" }, { input: "expect-error" }],
      fails: [
        { input: "disable-next", reason: "unsupported directive" },
        { input: "enabled", reason: "not a directive" },
      ],
    },
  },
  CSS_CLASS_REFERENCE: {
    name: "CSS_CLASS_REFERENCE",
    tier: 2,
    regex: CSS_CLASS_REFERENCE,

    description: "Permissive class reference with its name captured",
    composedFrom: ["DOT", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: ".button" }, { input: ".-modifier" }, { input: ".1item" }],
      fails: [
        { input: "button", reason: "missing dot" },
        { input: ".", reason: "missing name" },
      ],
    },
  },
  CSSDOC_CUSTOM_STATE_SELECTOR: {
    name: "CSSDOC_CUSTOM_STATE_SELECTOR",
    grammarRule: "StateName",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 2,
    regex: CSSDOC_CUSTOM_STATE_SELECTOR,

    description: "Custom state selector with its name captured",
    composedFrom: ["COLON", "PAREN_OPEN", "ALPHANUMERIC_EXTENDED", "PAREN_CLOSE"],
    fixtures: {
      passes: [{ input: ":state(open)" }, { input: ":state( -x )" }, { input: ":state(active)" }],
      fails: [
        { input: ":state()", reason: "missing state name" },
        { input: ":state(open", reason: "missing closing parenthesis" },
      ],
    },
  },
  CSSDOC_SHADOW_PART_SELECTOR: {
    name: "CSSDOC_SHADOW_PART_SELECTOR",
    tier: 2,
    regex: CSSDOC_SHADOW_PART_SELECTOR,

    description: "Shadow part selector with its name captured",
    composedFrom: ["COLON", "PAREN_OPEN", "ALPHANUMERIC_EXTENDED", "PAREN_CLOSE"],
    fixtures: {
      passes: [{ input: "::part(label)" }, { input: "::part( -x )" }, { input: "::part(content)" }],
      fails: [
        { input: ":part(label)", reason: "single colon" },
        { input: "::part()", reason: "missing part name" },
      ],
    },
  },
  CSSDOC_SCANNED_PSEUDO_SELECTOR: {
    name: "CSSDOC_SCANNED_PSEUDO_SELECTOR",
    tier: 2,
    regex: CSSDOC_SCANNED_PSEUDO_SELECTOR,

    description: "Pseudo selector stripped before scanning classes",
    composedFrom: ["COLON", "ALPHANUMERIC_EXTENDED", "PAREN_OPEN", "PAREN_CLOSE"],
    fixtures: {
      passes: [{ input: ":hover" }, { input: "::part(label)" }, { input: ":not(.x)" }],
      fails: [
        { input: "hover", reason: "missing colon" },
        { input: ":", reason: "missing pseudo name" },
      ],
    },
  },
  CSSDOC_TYPED_STRUCTURE_REFERENCE: {
    name: "CSSDOC_TYPED_STRUCTURE_REFERENCE",
    grammarRule: "StructureReference",
    grammarSource: "cssdoc",
    grammarRelation: "fragment",
    tier: 2,
    regex: CSSDOC_TYPED_STRUCTURE_REFERENCE,

    description: "Typed structure reference body with kind, name, profile, and privacy captures",
    composedFrom: [
      "STRUCTURE_RECORD_KIND",
      "CSSDOC_QUALIFIED_REFERENCE",
      "COLON",
      "ALPHANUMERIC_EXTENDED",
    ],
    fixtures: {
      passes: [
        { input: "component menu.item:compact private" },
        { input: "utility spacing" },
        { input: "declaration tokens:compact" },
      ],
      fails: [
        { input: "component", reason: "missing name" },
        { input: "unknown menu", reason: "unknown kind" },
      ],
    },
  },
  CSSDOC_SHORTHAND_STRUCTURE_REFERENCE: {
    name: "CSSDOC_SHORTHAND_STRUCTURE_REFERENCE",
    grammarRule: "StructureReference",
    grammarSource: "cssdoc",
    grammarRelation: "fragment",
    tier: 2,
    regex: CSSDOC_SHORTHAND_STRUCTURE_REFERENCE,

    description: "Shorthand structure reference body with name, profile, and privacy captures",
    composedFrom: ["CSSDOC_QUALIFIED_REFERENCE", "COLON", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [
        { input: "menu.item:compact private" },
        { input: "spacing" },
        { input: "menu.item private" },
      ],
      fails: [
        { input: ".menu", reason: "empty first segment" },
        { input: "menu:", reason: "empty profile" },
      ],
    },
  },
  CSSDOC_BASE_CLASS_NAME: {
    name: "CSSDOC_BASE_CLASS_NAME",
    grammarRule: "Identifier",
    grammarSource: "cssdoc",
    grammarRelation: "exact",
    tier: 2,
    regex: CSSDOC_BASE_CLASS_NAME,
    description: "Class name accepted for base-class and scoped-part inference",
    composedFrom: ["ALPHA", "UNDERSCORE_CHAR", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "button" }, { input: "PFX-badge" }, { input: "_part2" }],
      fails: [
        { input: "-modifier", reason: "starts with hyphen" },
        { input: "1part", reason: "starts with digit" },
        { input: "é", reason: "not ASCII" },
        { input: "", reason: "empty" },
      ],
    },
  },
  CSSDOC_BASE_CLASS_REFERENCE: {
    name: "CSSDOC_BASE_CLASS_REFERENCE",
    tier: 2,
    regex: CSSDOC_BASE_CLASS_REFERENCE,

    description: "Class reference for base and scoped-part inference, capturing the name",
    composedFrom: ["DOT", "CSSDOC_BASE_CLASS_NAME"],
    fixtures: {
      passes: [{ input: ".button" }, { input: "._part2" }, { input: ".PFX-badge" }],
      fails: [
        { input: ".-modifier", reason: "starts with hyphen" },
        { input: "button", reason: "missing dot" },
      ],
    },
  },
  CSSDOC_ELEMENT_TAG: {
    name: "CSSDOC_ELEMENT_TAG",
    tier: 2,
    regex: CSSDOC_ELEMENT_TAG,

    description: "Element name in an element tag, with independently optional angle brackets",
    composedFrom: ["LESS_THAN", "HTML_LOWERCASE_TAG_NAME_LIKE", "GREATER_THAN"],
    fixtures: {
      passes: [
        { input: "div" },
        { input: "<div>" },
        { input: "<div" },
        { input: "div>" },
        { input: "< my-element >" },
      ],
      fails: [
        { input: "", reason: "missing name" },
        { input: "<1div>", reason: "name starts with a digit" },
        { input: "<div class=x>", reason: "attributes are not supported" },
        { input: "<DIV>", reason: "name must be lowercase" },
        { input: "<my-element.foo>", reason: "dot isn't accepted in cssdoc element tags" },
      ],
    },
  },
  CSS_CLASS_ATTRIBUTE_SELECTOR: {
    name: "CSS_CLASS_ATTRIBUTE_SELECTOR",
    tier: 2,
    regex: CSS_CLASS_ATTRIBUTE_SELECTOR,

    description: "Class attribute selector with operator and quoted or unquoted value captures",
    composedFrom: [
      "BRACKET_OPEN",
      "BRACKET_CLOSE",
      "QUOTE_SINGLE_CHAR",
      "QUOTE_DOUBLE_CHAR",
      "ASTERISK_CHAR",
      "CARET_CHAR",
      "DOLLAR_CHAR",
      "TILDE_CHAR",
      "PIPE_CHAR",
    ],
    fixtures: {
      passes: [
        { input: '[class*="-icon-"]' },
        { input: "[ class ~= 'active' ]" },
        { input: "[class=active]" },
        { input: "[class=]" },
      ],
      fails: [
        { input: "[id=active]", reason: "not a class attribute" },
        { input: "[class!=active]", reason: "unsupported operator" },
        { input: "[class=active", reason: "missing closing bracket" },
      ],
    },
  },
  CSSDOC_ATTRIBUTE_SELECTOR: {
    name: "CSSDOC_ATTRIBUTE_SELECTOR",
    grammarRule: "AttributeModifier",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 2,
    regex: CSSDOC_ATTRIBUTE_SELECTOR,
    description: "Bracketed CSS selector with quoted attribute values",
    composedFrom: ["BRACKET_OPEN", "BRACKET_CLOSE", "QUOTE_SINGLE_CHAR", "QUOTE_DOUBLE_CHAR"],
    fixtures: {
      passes: [
        { input: "[disabled]" },
        { input: '[data-value="a b"]' },
        { input: "[data-value='a]b']" },
      ],
      fails: [
        { input: "", reason: "empty" },
        { input: "[disabled", reason: "missing closing bracket" },
        { input: '[data-value="unterminated]', reason: "unclosed quote" },
      ],
    },
  },
  CSSDOC_SELECTOR_TOKEN: {
    name: "CSSDOC_SELECTOR_TOKEN",
    grammarRule: "CssSelectorArgument",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 2,
    regex: CSSDOC_SELECTOR_TOKEN,
    description: "Selector token with bracketed attributes that can contain whitespace",
    composedFrom: ["CSSDOC_ATTRIBUTE_SELECTOR", "BRACKET_OPEN"],
    fixtures: {
      passes: [{ input: ".button" }, { input: '[data-value="a b"].button' }, { input: ":host" }],
      fails: [
        { input: "", reason: "empty" },
        { input: ".button .label", reason: "whitespace outside brackets" },
        { input: "[unfinished", reason: "unclosed bracket" },
      ],
    },
  },
  CSSDOC_QUALIFIED_REFERENCE: {
    name: "CSSDOC_QUALIFIED_REFERENCE",
    grammarRule: "StructureReference",
    grammarSource: "cssdoc",
    grammarRelation: "fragment",
    tier: 2,
    regex: CSSDOC_QUALIFIED_REFERENCE,
    description: "Dot-separated reference segments accepted in structure tags",
    composedFrom: ["ALPHANUMERIC_EXTENDED", "DOT"],
    fixtures: {
      passes: [{ input: "menu.item" }, { input: "1._part" }, { input: "-item" }],
      fails: [
        { input: "", reason: "empty" },
        { input: ".item", reason: "empty first segment" },
        { input: "menu.", reason: "empty final segment" },
        { input: "menu..item", reason: "empty middle segment" },
      ],
    },
  },
  CSSDOC_STRUCTURE_SLOT: {
    name: "CSSDOC_STRUCTURE_SLOT",
    grammarRule: "Selector",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 2,
    regex: CSSDOC_STRUCTURE_SLOT,
    description: "Default or named slot selector in a structure node",
    composedFrom: [
      "BRACKET_OPEN",
      "BRACKET_CLOSE",
      "QUOTE_DOUBLE_CHAR",
      "QUOTE_SINGLE_CHAR",
      "ALPHANUMERIC_EXTENDED",
    ],
    fixtures: {
      passes: [
        { input: "slot" },
        { input: 'slot[name="icon"]' },
        { input: "slot[ name = 'header_1' ]" },
        { input: "slot[name=-item]" },
        { input: "slot[name=\"icon']" },
      ],
      fails: [
        { input: "", reason: "empty" },
        { input: "slot[name=]", reason: "empty name" },
        { input: "slot[name=icon].extra", reason: "additional selector" },
      ],
    },
  },
  CSSDOC_CUSTOM_PROPERTY_TAG_NAME: {
    name: "CSSDOC_CUSTOM_PROPERTY_TAG_NAME",
    grammarRule: "CustomPropertyName",
    grammarSource: "cssdoc",
    grammarRelation: "exact",
    tier: 2,
    regex: CSSDOC_CUSTOM_PROPERTY_TAG_NAME,
    description: "Custom property name accepted in a cssdoc tag",
    composedFrom: ["DOUBLE_DASH", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "--color" }, { input: "--123" }, { input: "--_value" }, { input: "---" }],
      fails: [
        { input: "--", reason: "missing name" },
        { input: "color", reason: "missing prefix" },
        { input: "--a.b", reason: "dot in name" },
      ],
    },
  },
  CSSDOC_BLOCK_TAG_NAME: {
    name: "CSSDOC_BLOCK_TAG_NAME",
    grammarRule: "CustomTag",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 2,
    regex: CSSDOC_BLOCK_TAG_NAME,
    description: "Block tag name without its at sign",
    composedFrom: ["ALPHA", "DASH"],
    fixtures: {
      passes: [{ input: "summary" }, { input: "custom_tag2" }, { input: "a--b" }],
      fails: [
        { input: "", reason: "empty" },
        { input: "2tag", reason: "starts with a digit" },
        { input: "@summary", reason: "includes an at sign" },
      ],
    },
  },
  CSSDOC_EXAMPLE_LABEL: {
    name: "CSSDOC_EXAMPLE_LABEL",
    grammarRule: "ExampleLabels",
    grammarSource: "cssdoc",
    grammarRelation: "fragment",
    tier: 2,
    regex: CSSDOC_EXAMPLE_LABEL,
    description: "Lowercase alphanumeric example label with optional hyphens",
    composedFrom: ["ALPHA_LOWER", "DIGIT", "DASH"],
    fixtures: {
      passes: [{ input: "docs" }, { input: "interactive-demo" }, { input: "v2" }],
      fails: [
        { input: "", reason: "empty" },
        { input: "Docs", reason: "uppercase" },
        { input: "-docs", reason: "leading hyphen" },
        { input: "docs--demo", reason: "consecutive hyphens" },
        { input: "docs-", reason: "trailing hyphen" },
      ],
    },
  },
  CSSDOC_DESCRIPTION_SEPARATOR: {
    name: "CSSDOC_DESCRIPTION_SEPARATOR",
    grammarRule: "Separator",
    grammarSource: "cssdoc",
    grammarRelation: "exact",
    tier: 2,
    regex: CSSDOC_DESCRIPTION_SEPARATOR,
    description: "Separator between a cssdoc tag argument and its description",
    composedFrom: ["DASH"],
    fixtures: {
      passes: [{ input: "—" }, { input: "-" }, { input: "--" }],
      fails: [
        { input: "---", reason: "more than two hyphens" },
        { input: "–", reason: "en dash" },
        { input: "", reason: "empty" },
      ],
    },
  },
  CSSDOC_MODIFIER_ANNOTATION_PREFIX: {
    name: "CSSDOC_MODIFIER_ANNOTATION_PREFIX",
    grammarRule: "ModifierBody",
    grammarSource: "cssdoc",
    grammarRelation: "fragment",
    tier: 2,
    regex: CSSDOC_MODIFIER_ANNOTATION_PREFIX,
    description: "Optional punctuation before a modifier annotation",
    composedFrom: ["DASH"],
    fixtures: {
      passes: [{ input: "" }, { input: "-" }, { input: "— " }, { input: "-\t" }],
      fails: [
        { input: "--", reason: "only one punctuation character is allowed" },
        { input: " ", reason: "whitespace requires a punctuation character" },
      ],
    },
  },
  CSSDOC_MODIFIER_REFERENCE: {
    name: "CSSDOC_MODIFIER_REFERENCE",
    grammarRule: "CssReference",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 2,
    regex: CSSDOC_MODIFIER_REFERENCE,
    description: "A bare, class, or bracketed canonical modifier reference",
    composedFrom: ["DOT", "BRACKET_OPEN", "BRACKET_CLOSE"],
    fixtures: {
      passes: [
        { input: "-active" },
        { input: ".active" },
        { input: "[aria-selected=true]" },
        { input: "[]" },
      ],
      fails: [
        { input: "", reason: "empty" },
        { input: ".", reason: "missing name" },
        { input: "[active", reason: "unclosed bracket" },
      ],
    },
  },
  RECORD_REFERENCE_NAME: {
    name: "RECORD_REFERENCE_NAME",
    tier: 2,
    regex: RECORD_REFERENCE_NAME,
    description: "Record reference name (starts with letter, then alphanumeric with hyphens)",
    composedFrom: ["ALPHA", "ALPHANUMERIC_EXTENDED"],
    fixtures: {
      passes: [{ input: "button" }, { input: "my-component" }, { input: "Alert" }],
      fails: [
        { input: "-button", reason: "starts with hyphen" },
        { input: "1button", reason: "starts with digit" },
        { input: "", reason: "empty" },
      ],
    },
  },
  CSSDOC_TAG_NAME: {
    name: "CSSDOC_TAG_NAME",
    tier: 2,
    regex: CSSDOC_TAG_NAME,
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
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 2,
    regex: CSSDOC_SELECTOR,
    captures: { selector: "CSS selector" },
    description: "CSS selector",
    composedFrom: ["CSS_IDENTIFIER_START_WITH_DASH", "CSS_IDENTIFIER_CONT"],
    fixtures: {
      passes: [
        { input: ".my-class", note: "class selector" },
        { input: "#my-id", note: "id selector" },
        { input: ".class > .nested", note: "child combinator" },
      ],
      fails: [
        { input: "", reason: "empty" },
        { input: "@", reason: "at sign is outside this selector pattern" },
        { input: "!", reason: "exclamation mark is outside this selector pattern" },
      ],
    },
  },
  CSSDOC_MODIFIER_NAME: {
    name: "CSSDOC_MODIFIER_NAME",
    grammarRule: "ModifierName",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 2,
    regex: CSSDOC_MODIFIER_NAME,
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
    grammarRule: "AttributeModifier",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 2,
    regex: CSSDOC_MODIFIER_ATTRIBUTE,
    captures: { attr: "Attribute name", value: "Attribute value" },
    description: "Modifier with attribute selector",
    composedFrom: ["ALPHA"],
    fixtures: {
      passes: [
        { input: "[type=button]" },
        { input: "[role = tab]", note: "with spaces" },
        { input: "[disabled=true]" },
      ],
      fails: [
        { input: "[type]", reason: "missing value" },
        { input: "[type=   ]", reason: "whitespace-only value" },
        { input: "", reason: "empty" },
        { input: "[type=button", reason: "missing closing bracket" },
      ],
    },
  },
  CSSDOC_PSEUDO_SELECTOR: {
    name: "CSSDOC_PSEUDO_SELECTOR",
    tier: 2,
    regex: CSSDOC_PSEUDO_SELECTOR,
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
        { input: "::", reason: "missing pseudo name" },
      ],
    },
  },
  CSSDOC_CARDINALITY: {
    name: "CSSDOC_CARDINALITY",
    grammarRule: "StructureBody",
    grammarSource: "cssdoc",
    grammarRelation: "fragment",
    tier: 2,
    regex: CSSDOC_CARDINALITY,
    captures: {
      card: "Cardinality modifier",
      oomKw: "One-or-more keyword",
      oomMax: "One-or-more upper bound",
      max: "Upper bound",
      kw: "Cardinality keyword",
    },
    composedFrom: ["DIGIT", "COLON", "DASH"],
    description: "Cardinality suffix in structure, without the leading colon",
    fixtures: {
      passes: [
        { input: "optional" },
        { input: "opt" },
        { input: "many" },
        { input: "one-or-more" },
        { input: "more" },
        { input: "max-5" },
        { input: "one-or-more:max-3" },
        { input: "more:max-4" },
      ],
      fails: [
        { input: "", reason: "missing cardinality" },
        { input: "zero-or-more", reason: "unsupported keyword" },
        { input: "exactly-one", reason: "unsupported keyword" },
        { input: "optional:max-2", reason: "optional cannot have a bound" },
        { input: "max-", reason: "missing bound" },
      ],
    },
  },
  CSSDOC_STRUCTURE_TAG_KEYWORD: {
    name: "CSSDOC_STRUCTURE_TAG_KEYWORD",
    tier: 2,
    regex: CSSDOC_STRUCTURE_TAG_KEYWORD,
    description: "The @structure tag keyword",
    composedFrom: ["AT", "WORD_BOUNDARY"],
    fixtures: {
      passes: [{ input: "@structure" }],
      fails: [
        { input: "@structure_foo", reason: "not a word boundary" },
        { input: "structure", reason: "no @" },
      ],
    },
  },
  CSSDOC_ANY_TAG_KEYWORD: {
    name: "CSSDOC_ANY_TAG_KEYWORD",
    tier: 2,
    regex: CSSDOC_ANY_TAG_KEYWORD,
    description: "Any @-prefixed tag keyword",
    composedFrom: ["AT", "ALPHA", "WORD_BOUNDARY"],
    fixtures: {
      passes: [{ input: "@structure" }, { input: "@component" }, { input: "@part" }],
      fails: [
        { input: "@123", reason: "not alphabetic" },
        { input: "structure", reason: "no @" },
      ],
    },
  },
  TAG_NAME_PLACEHOLDER: {
    name: "TAG_NAME_PLACEHOLDER",
    tier: 2,
    regex: TAG_NAME_PLACEHOLDER,
    description: "Tag name placeholder for text replacement (@tagname)",
    composedFrom: ["AT", "ALPHA"],
    fixtures: {
      passes: [{ input: "@structure" }, { input: "@component" }, { input: "@ref" }],
      fails: [
        { input: "@123", reason: "not alphabetic" },
        { input: "structure", reason: "no @" },
      ],
    },
  },
  STRUCTURE_RECORD_KIND: {
    name: "STRUCTURE_RECORD_KIND",
    tier: 2,
    regex: STRUCTURE_RECORD_KIND,
    description: "Structure record kind (component, name, utility, or declaration)",
    fixtures: {
      passes: [
        { input: "component" },
        { input: "name" },
        { input: "utility" },
        { input: "declaration" },
      ],
      fails: [
        { input: "rule", reason: "not a valid record kind" },
        { input: "unknown", reason: "not a valid record kind" },
        { input: "button", reason: "not a record kind" },
      ],
    },
  },
};
