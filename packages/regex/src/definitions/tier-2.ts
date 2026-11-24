/**
 * @cssdoc/regex/definitions/tier-2
 * Tier 2 CSS specification patterns
 * @module
 */

import type { RawPatternDef, PatternResolver } from "../types.ts";

export const TIER_2_PATTERNS: Record<string, RawPatternDef> = {
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
    grammarRule: "TagName",
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
      fails: [{ input: "", reason: "empty" }],
    },
  },
  CSSDOC_MODIFIER_NAME: {
    name: "CSSDOC_MODIFIER_NAME",
    grammarRule: "ModifierName",
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
    grammarRule: "ModifierAttribute",
    tier: 2,
    pattern: (resolve: PatternResolver) => {
      const alpha = resolve("ALPHA", true);
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
      ],
    },
  },
  CSSDOC_CARDINALITY: {
    name: "CSSDOC_CARDINALITY",
    grammarRule: "Cardinality",
    tier: 2,
    source: String.raw`(?<card>(?:one-or-more|zero-or-more|optional|exactly-one|max-\d+)?)`,
    captures: { card: "Cardinality modifier" },
    description: "Cardinality in structure",
    fixtures: {
      passes: [{ input: "optional" }, { input: "one-or-more" }, { input: "max-5" }],
      fails: [{ input: "many", reason: "not a valid cardinality" }],
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
      passes: [{ input: "@structure" }, { input: "@component" }],
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
    source: String.raw`(?:component|name|utility|rule|declaration|layout)`,
    description: "Structure record kind (component, name, utility, rule, declaration, or layout)",
    fixtures: {
      passes: [
        { input: "component" },
        { input: "name" },
        { input: "utility" },
        { input: "rule" },
        { input: "declaration" },
        { input: "layout" },
      ],
      fails: [
        { input: "unknown", reason: "not a valid record kind" },
        { input: "button", reason: "not a record kind" },
      ],
    },
  },
};
