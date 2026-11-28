/**
 * Tier 1 CSS patterns.
 *
 * @module
 */

import type { PatternDefinition } from "../types.ts";

/** CSS identifier */
export const CSS_IDENTIFIER: RegExp = /(?<identifier>[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)/;
/** CSS name */
export const CSS_NAME: RegExp = /(?<name>[a-zA-Z_\u0080-\uFFFF][\w\u0080-\uFFFF]*)/;
/** CSS number */
export const CSS_NUMBER: RegExp = /(?<number>(?<integer>\d+)(?:\.(?<decimal>\d+))?)/;
/** CSS percentage */
export const CSS_PERCENTAGE: RegExp = /(?<value>\d+(?:\.\d+)?)%/;
/** CSS dimension */
export const CSS_DIMENSION: RegExp =
  /(?<value>\d+(?:\.\d+)?)(?<unit>[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)/;
/** CSS hex color */
export const CSS_HASH_COLOR: RegExp = /#(?<color>[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)/;
/** CSS function call */
export const CSS_FUNCTION: RegExp = /(?<name>[a-zA-Z_\-\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)[ \t]*\(/;
/** CSS reserved keyword */
export const CSS_KEYWORD: RegExp = /(?<keyword>auto|inherit|initial|revert|revert-layer|unset)/;
/** CSS Unicode range */
export const CSS_UNICODE_RANGE: RegExp =
  /u\+(?<start>[0-9a-fA-F?]{1,6})(?:-(?<range>[0-9a-fA-F]{1,6}))?/;
/** CSS property or custom property name */
export const CSS_PROPERTY_NAME: RegExp =
  /(?<name>(?<custom>--)?[a-zA-Z_\u0080-\uFFFF][\w\-\u0080-\uFFFF]*)/;
/** Pseudo-selector with arguments like :is(), :has(), :not() */
export const PSEUDO_SELECTOR_FUNCTIONAL: RegExp = /:[A-Za-z][A-Za-z0-9\-_]*\([^)]*\)/;

/** CSS pattern definitions. */
export const TIER_1_CSS_PATTERNS: Record<string, PatternDefinition> = {
  CSS_IDENTIFIER: {
    name: "CSS_IDENTIFIER",
    grammarRule: "ident",
    grammarSource: "css",
    grammarRelation: "related",
    tier: 1,
    regex: CSS_IDENTIFIER,
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
        { input: "2button", reason: "starts with a digit" },
      ],
    },
  },
  CSS_NAME: {
    name: "CSS_NAME",
    grammarRule: "name",
    grammarSource: "css",
    grammarRelation: "related",
    tier: 1,
    regex: CSS_NAME,
    captures: { name: "CSS name without dashes" },
    description: "CSS name",
    composedFrom: ["CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT_NO_DASH"],
    fixtures: {
      passes: [
        { input: "background", note: "simple" },
        { input: "color", note: "simple" },
        { input: "_private" },
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
    grammarSource: "css",
    grammarRelation: "related",
    tier: 1,
    regex: CSS_NUMBER,
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
        { input: "1.", reason: "missing decimal digits" },
      ],
    },
  },
  CSS_PERCENTAGE: {
    name: "CSS_PERCENTAGE",
    grammarRule: "percentage",
    grammarSource: "css",
    grammarRelation: "related",
    tier: 1,
    regex: CSS_PERCENTAGE,
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
        { input: "%50", reason: "percent sign precedes number" },
      ],
    },
  },
  CSS_DIMENSION: {
    name: "CSS_DIMENSION",
    grammarRule: "dimension",
    grammarSource: "css",
    grammarRelation: "related",
    tier: 1,
    regex: CSS_DIMENSION,
    captures: { value: "Numeric value", unit: "Unit name (px, em, etc)" },
    description: "CSS dimension",
    composedFrom: ["DIGIT", "CSS_IDENTIFIER_START", "CSS_IDENTIFIER_CONT"],
    fixtures: {
      passes: [
        { input: "16px", note: "pixels" },
        { input: "2.5em", note: "decimal em" },
        { input: "12rem" },
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
    grammarSource: "css",
    grammarRelation: "related",
    tier: 1,
    regex: CSS_HASH_COLOR,
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
    grammarSource: "css",
    grammarRelation: "related",
    tier: 1,
    regex: CSS_FUNCTION,
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
        { input: "1rgb(", reason: "name starts with a digit" },
      ],
    },
  },
  CSS_KEYWORD: {
    name: "CSS_KEYWORD",
    grammarRule: "keyword",
    grammarSource: "css",
    grammarRelation: "related",
    tier: 1,
    regex: CSS_KEYWORD,
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
        { input: "inheritance", reason: "keyword followed by additional characters" },
      ],
    },
  },
  CSS_UNICODE_RANGE: {
    name: "CSS_UNICODE_RANGE",
    grammarRule: "unicode-range",
    grammarSource: "css",
    grammarRelation: "related",
    tier: 1,
    regex: CSS_UNICODE_RANGE,
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
    grammarSource: "css",
    grammarRelation: "related",
    tier: 1,
    regex: CSS_PROPERTY_NAME,
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
        { input: "--1color", reason: "custom name starts with a digit" },
      ],
    },
  },
  PSEUDO_SELECTOR_FUNCTIONAL: {
    name: "PSEUDO_SELECTOR_FUNCTIONAL",
    tier: 1,
    regex: PSEUDO_SELECTOR_FUNCTIONAL,
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
