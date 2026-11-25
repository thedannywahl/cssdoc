/**
 * \@cssdoc/regex/definitions/tier-2-cssdoc-grammar
 * Tier 2 CssDoc grammar and selector patterns
 * @module
 */

import type { RawPatternDef, PatternResolver } from "../types.ts";

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

/** CssDoc grammar, selector, and structure reference pattern definitions. */
export const TIER_2_CSSDOC_GRAMMAR_PATTERNS: Record<string, RawPatternDef> = {
  CSSDOC_DIRECTIVE_KIND: {
    name: "CSSDOC_DIRECTIVE_KIND",
    tier: 2,
    source: String.raw`(?:disable-next-line|disable-line|disable|enable|expect-error)\b`,
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
    pattern: (resolve: PatternResolver) =>
      `${resolve("DOT")}(${resolve("ALPHANUMERIC_EXTENDED")}+)`,
    flags: "u",
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
    pattern: (resolve: PatternResolver) =>
      String.raw`${resolve("COLON")}state${resolve("PAREN_OPEN")}\s*(${resolve("ALPHANUMERIC_EXTENDED")}+)\s*${resolve("PAREN_CLOSE")}`,
    flags: "u",
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
    pattern: (resolve: PatternResolver) =>
      String.raw`${resolve("COLON")}${resolve("COLON")}part${resolve("PAREN_OPEN")}\s*(${resolve("ALPHANUMERIC_EXTENDED")}+)\s*${resolve("PAREN_CLOSE")}`,
    flags: "u",
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
    pattern: (resolve: PatternResolver) =>
      `${resolve("COLON")}${resolve("COLON")}?${resolve("ALPHANUMERIC_EXTENDED")}+(${resolve("PAREN_OPEN")}[^${resolve("PAREN_CLOSE")}]*${resolve("PAREN_CLOSE")})?`,
    flags: "u",
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
    pattern: (resolve: PatternResolver) =>
      String.raw`(${resolve("STRUCTURE_RECORD_KIND")})\s+(${resolve("CSSDOC_QUALIFIED_REFERENCE")})(?:${resolve("COLON")}(${resolve("ALPHANUMERIC_EXTENDED")}+))?(?:\s+(private))?`,
    flags: "u",
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
    pattern: (resolve: PatternResolver) =>
      String.raw`(${resolve("CSSDOC_QUALIFIED_REFERENCE")})(?:${resolve("COLON")}(${resolve("ALPHANUMERIC_EXTENDED")}+))?(?:\s+(private))?`,
    flags: "u",
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
    pattern: (resolve: PatternResolver) =>
      `(?:${resolve("ALPHA")}|${resolve("UNDERSCORE_CHAR")})${resolve("ALPHANUMERIC_EXTENDED")}*`,
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
    pattern: (resolve: PatternResolver) =>
      `${resolve("DOT")}(${resolve("CSSDOC_BASE_CLASS_NAME")})`,
    flags: "u",
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
    pattern: (resolve: PatternResolver) => {
      const name = resolve("HTML_LOWERCASE_TAG_NAME_LIKE");
      return String.raw`${resolve("LESS_THAN")}?\s*(${name})\s*${resolve("GREATER_THAN")}?`;
    },
    flags: "u",
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
    pattern: (resolve: PatternResolver) => {
      const open = resolve("BRACKET_OPEN");
      const close = resolve("BRACKET_CLOSE");
      const single = resolve("QUOTE_SINGLE_CHAR");
      const double = resolve("QUOTE_DOUBLE_CHAR");
      const asterisk = resolve("ASTERISK_CHAR");
      const caret = resolve("CARET_CHAR");
      const dollar = resolve("DOLLAR_CHAR");
      const tilde = resolve("TILDE_CHAR");
      const pipe = resolve("PIPE_CHAR");
      return String.raw`${open}\s*class\s*([${tilde}${caret}${dollar}${asterisk}${pipe}]?)=\s*(?:${double}([^${double}]*)${double}|${single}([^${single}]*)${single}|([^${close}\s]*))\s*${close}`;
    },
    flags: "u",
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
    pattern: (resolve: PatternResolver) => {
      const open = resolve("BRACKET_OPEN");
      const close = resolve("BRACKET_CLOSE");
      const single = resolve("QUOTE_SINGLE_CHAR");
      const double = resolve("QUOTE_DOUBLE_CHAR");
      return String.raw`${open}(?:[^${close}${double}${single}]|${double}[^${double}]*${double}|${single}[^${single}]*${single})*${close}`;
    },
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
    pattern: (resolve: PatternResolver) =>
      String.raw`(?:${resolve("CSSDOC_ATTRIBUTE_SELECTOR")}|[^\s${resolve("BRACKET_OPEN")}]+)+`,
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
    pattern: (resolve: PatternResolver) => {
      const segment = `${resolve("ALPHANUMERIC_EXTENDED")}+`;
      return `${segment}(?:${resolve("DOT")}${segment})*`;
    },
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
    pattern: (resolve: PatternResolver) => {
      const open = resolve("BRACKET_OPEN");
      const close = resolve("BRACKET_CLOSE");
      const quotes = `[${resolve("QUOTE_DOUBLE_CHAR")}${resolve("QUOTE_SINGLE_CHAR")}]`;
      const name = resolve("ALPHANUMERIC_EXTENDED");
      return String.raw`slot(?:${open}\s*name\s*=\s*${quotes}?(${name}+)${quotes}?\s*${close})?`;
    },
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
    pattern: (resolve: PatternResolver) =>
      `${resolve("DOUBLE_DASH")}${resolve("ALPHANUMERIC_EXTENDED")}+`,
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
    pattern: (resolve: PatternResolver) => String.raw`${resolve("ALPHA")}[\w${resolve("DASH")}]*`,
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
    pattern: (resolve: PatternResolver) => {
      const chars = `[${resolve("ALPHA_LOWER", true)}${resolve("DIGIT", true)}]`;
      return `${chars}+(?:${resolve("DASH")}${chars}+)*`;
    },
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
    pattern: (resolve: PatternResolver) => `(?:—|${resolve("DASH")}{1,2})`,
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
    pattern: (resolve: PatternResolver) => String.raw`(?:[${resolve("DASH")}—]\s*)?`,
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
    pattern: (resolve: PatternResolver) =>
      String.raw`(?:${resolve("DOT")}?[\w-]+|${resolve("BRACKET_OPEN")}[^${resolve("BRACKET_CLOSE")}]*${resolve("BRACKET_CLOSE")})`,
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
    pattern: (resolve: PatternResolver) => {
      const alpha = resolve("ALPHA", true);
      const extended = resolve("ALPHANUMERIC_EXTENDED");
      return `[${alpha}](?:${extended})*`;
    },
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
    pattern: (resolve: PatternResolver) => {
      const alpha = resolve("ALPHA", true);
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
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 2,
    pattern: (resolve: PatternResolver) => {
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
    pattern: (resolve: PatternResolver) => {
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
    grammarRule: "AttributeModifier",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 2,
    pattern: (resolve: PatternResolver) => {
      const alpha = resolve("ALPHA", true);
      return `\\[(?<attr>[${alpha}]+)\\s*=\\s*(?<value>[^\\]]+)\\]`;
    },
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
        { input: "", reason: "empty" },
        { input: "[type=button", reason: "missing closing bracket" },
      ],
    },
  },
  CSSDOC_PSEUDO_SELECTOR: {
    name: "CSSDOC_PSEUDO_SELECTOR",
    tier: 2,
    source: String.raw`(?<pseudo>::?(?:before|after|first-letter|first-line|placeholder|selection|backdrop))`,
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
    pattern: (resolve: PatternResolver) => {
      const keywords = Object.keys(CSSDOC_CARDINALITY_KEYWORDS).join("|");
      const oneOrMore = Object.entries(CSSDOC_CARDINALITY_KEYWORDS)
        .filter(([, value]) => value === "one-or-more")
        .map(([key]) => key)
        .join("|");
      const digit = resolve("DIGIT");
      const colon = resolve("COLON");
      const dash = resolve("DASH");
      return String.raw`(?<card>(?:(?<oomKw>${oneOrMore})${colon}max${dash}(?<oomMax>${digit}+)|max${dash}(?<max>${digit}+)|(?<kw>${keywords})))`;
    },
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
    pattern: (resolve: PatternResolver) => {
      const at = resolve("AT");
      const wordBoundary = resolve("WORD_BOUNDARY");
      return `${at}structure${wordBoundary}`;
    },
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
    pattern: (resolve: PatternResolver) => {
      const at = resolve("AT");
      const alpha = resolve("ALPHA");
      const wordBoundary = resolve("WORD_BOUNDARY");
      return `${at}${alpha}+${wordBoundary}`;
    },
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
    pattern: (resolve: PatternResolver) => {
      const at = resolve("AT");
      const alpha = resolve("ALPHA");
      return `${at}${alpha}+`;
    },
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
    source: String.raw`(?:component|name|utility|declaration)`,
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
