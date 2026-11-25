/**
 * Tier 1 CSS patterns.
 *
 * @module
 */

import type { RawPatternDef, PatternResolver } from "../types.ts";

/** CSS pattern definitions. */
export const TIER_1_CSS_PATTERNS: Record<string, RawPatternDef> = {
  CSS_IDENTIFIER: {
    name: "CSS_IDENTIFIER",
    grammarRule: "ident",
    tier: 1,
    pattern: (resolve: PatternResolver) => {
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
    pattern: (resolve: PatternResolver) => {
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
    pattern: (resolve: PatternResolver) => {
      const digit = resolve("DIGIT", true);
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
    pattern: (resolve: PatternResolver) => {
      const digit = resolve("DIGIT", true);
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
    pattern: (resolve: PatternResolver) => {
      const digit = resolve("DIGIT", true);
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
    pattern: (resolve: PatternResolver) => {
      const hex = resolve("HEX_DIGIT", true);
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
    pattern: (resolve: PatternResolver) => {
      const start = resolve("CSS_IDENTIFIER_START_WITH_DASH");
      const cont = resolve("CSS_IDENTIFIER_CONT");
      const space = resolve("SPACE_TAB", true);
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
    source: String.raw`(?<keyword>auto|inherit|initial|revert|revert-layer|unset)`,
    captures: { keyword: "CSS keyword" },
    description: "CSS reserved keyword",
    fixtures: {
      passes: [
        { input: "auto" },
        { input: "inherit" },
        { input: "initial" },
        { input: "revert" },
        { input: "revert-layer" },
        { input: "unset" },
      ],
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
    pattern: (resolve: PatternResolver) => {
      const hexWild = resolve("HEX_DIGIT_OR_WILDCARD", true);
      const hex = resolve("HEX_DIGIT", true);
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
    pattern: (resolve: PatternResolver) => {
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
  PSEUDO_SELECTOR_FUNCTIONAL: {
    name: "PSEUDO_SELECTOR_FUNCTIONAL",
    tier: 1,
    pattern: (resolve: PatternResolver) => {
      const colon = resolve("COLON");
      const alpha = resolve("ALPHA", true);
      const extended = resolve("ALPHANUMERIC_EXTENDED");
      const parenOpen = resolve("PAREN_OPEN");
      const parenClose = resolve("PAREN_CLOSE");
      return `${colon}[${alpha}](?:${extended})*${parenOpen}[^)]*${parenClose}`;
    },
    description: "Pseudo-selector with arguments like :is(), :has(), :not()",
    composedFrom: ["COLON", "ALPHA", "ALPHANUMERIC_EXTENDED", "PAREN_OPEN", "PAREN_CLOSE"],
    fixtures: {
      passes: [
        { input: ":is(.foo)" },
        { input: ":has(.bar)" },
        { input: ":not(.baz)" },
        { input: ":where(a, b)" },
      ],
      fails: [
        { input: "is(.foo)", reason: "missing colon" },
        { input: ":active", reason: "no arguments" },
        { input: "", reason: "empty" },
      ],
    },
  },
};
