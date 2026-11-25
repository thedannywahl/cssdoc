/**
 * @cssdoc/regex/definitions/tier-1
 * Tier 1 composed patterns
 * @module
 */

import type { RawPatternDef, PatternResolver } from "../types.ts";
import { escapeChar } from "../lib.ts";

export const TIER_1_PATTERNS: Record<string, RawPatternDef> = {
  FILE_EXTENSION: {
    name: "FILE_EXTENSION",
    tier: 1,
    pattern: (resolve: PatternResolver) => `${resolve("DOT")}(${resolve("ALPHA_LOWER")}+)$`,
    flags: "u",
    description: "Lowercase ASCII filename extension, capturing the extension without the dot",
    composedFrom: ["DOT", "ALPHA_LOWER"],
    fixtures: {
      passes: [{ input: ".scss" }, { input: ".js" }],
      fails: [
        { input: ".CSS", reason: "uppercase" },
        { input: ".css1", reason: "non-letter suffix" },
      ],
    },
  },
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
  HTML_ELEMENT_NAME: {
    name: "HTML_ELEMENT_NAME",
    tier: 1,
    source: String.raw`[a-z][a-z0-9-]*`,
    description: "HTML element name (lowercase letters, digits, hyphens)",
    fixtures: {
      passes: [{ input: "div" }, { input: "button" }, { input: "my-element" }, { input: "h1" }],
      fails: [
        { input: "Button", reason: "uppercase" },
        { input: "-div", reason: "starts with hyphen" },
        { input: "", reason: "empty" },
      ],
    },
  },
  LESS_THAN: {
    name: "LESS_THAN",
    tier: 1,
    pattern: (resolve: PatternResolver) => resolve("LESS_THAN_CHAR"),
    description: "Less-than character (regex pattern)",
    composedFrom: ["LESS_THAN_CHAR"],
    fixtures: {
      passes: [{ input: "<" }],
      fails: [{ input: ">", reason: "greater-than" }],
    },
  },
  GREATER_THAN: {
    name: "GREATER_THAN",
    tier: 1,
    pattern: (resolve: PatternResolver) => resolve("GREATER_THAN_CHAR"),
    description: "Greater-than character (regex pattern)",
    composedFrom: ["GREATER_THAN_CHAR"],
    fixtures: {
      passes: [{ input: ">" }],
      fails: [{ input: "<", reason: "less-than" }],
    },
  },
  COMMENT_START: {
    name: "COMMENT_START",
    tier: 1,
    pattern: (resolve: PatternResolver) => {
      const slash = resolve("FORWARD_SLASH");
      const asterisk = resolve("ASTERISK");
      return `${slash}${asterisk}`;
    },
    description: "CSS block comment start (/*)",
    composedFrom: ["FORWARD_SLASH", "ASTERISK"],
    fixtures: {
      passes: [{ input: "/*" }],
      fails: [
        { input: "/", reason: "single slash" },
        { input: "*", reason: "single asterisk" },
        { input: "*/", reason: "comment end" },
        { input: "", reason: "empty" },
      ],
    },
  },
  DOC_COMMENT_START: {
    name: "DOC_COMMENT_START",
    tier: 1,
    pattern: (resolve: PatternResolver) => `${resolve("COMMENT_START")}${resolve("ASTERISK")}`,
    description: "CSS doc-comment opener (/**)",
    composedFrom: ["COMMENT_START", "ASTERISK"],
    fixtures: {
      passes: [{ input: "/**" }],
      fails: [
        { input: "/*", reason: "ordinary comment opener" },
        { input: "**/", reason: "comment end" },
      ],
    },
  },
  COMMENT_END: {
    name: "COMMENT_END",
    tier: 1,
    pattern: (resolve: PatternResolver) => `${resolve("ASTERISK")}${resolve("FORWARD_SLASH")}`,
    description: "CSS block comment end (*/)",
    composedFrom: ["ASTERISK", "FORWARD_SLASH"],
    fixtures: {
      passes: [{ input: "*/" }],
      fails: [
        { input: "/*", reason: "comment opener" },
        { input: "*", reason: "single asterisk" },
        { input: "/", reason: "single slash" },
      ],
    },
  },
  COMMENT_LINE_MARKER: {
    name: "COMMENT_LINE_MARKER",
    tier: 1,
    source: String.raw`\*`,
    description: "CSS block comment line marker (*)",
    fixtures: {
      passes: [{ input: "*" }],
      fails: [
        { input: "/", reason: "slash" },
        { input: "**", reason: "double asterisk" },
        { input: "", reason: "empty" },
      ],
    },
  },
  AT: {
    name: "AT",
    tier: 1,
    pattern: (resolve: PatternResolver) => resolve("AT_CHAR"),
    description: "At sign (regex pattern)",
    composedFrom: ["AT_CHAR"],
    fixtures: {
      passes: [{ input: "@" }],
      fails: [{ input: "#", reason: "hash" }],
    },
  },
  PIPE: {
    name: "PIPE",
    tier: 1,
    pattern: (resolve: PatternResolver) => escapeChar(resolve, "PIPE_CHAR"),
    description: "Pipe (regex pattern)",
    composedFrom: ["PIPE_CHAR"],
    fixtures: {
      passes: [{ input: "|" }],
      fails: [{ input: "-", reason: "dash" }],
    },
  },
  PAREN_OPEN: {
    name: "PAREN_OPEN",
    tier: 1,
    pattern: (resolve: PatternResolver) => escapeChar(resolve, "PAREN_OPEN_CHAR"),
    description: "Opening parenthesis (regex pattern)",
    composedFrom: ["PAREN_OPEN_CHAR"],
    fixtures: {
      passes: [{ input: "(" }],
      fails: [{ input: ")", reason: "closing" }],
    },
  },
  PAREN_CLOSE: {
    name: "PAREN_CLOSE",
    tier: 1,
    pattern: (resolve: PatternResolver) => escapeChar(resolve, "PAREN_CLOSE_CHAR"),
    description: "Closing parenthesis (regex pattern)",
    composedFrom: ["PAREN_CLOSE_CHAR"],
    fixtures: {
      passes: [{ input: ")" }],
      fails: [{ input: "(", reason: "opening" }],
    },
  },
  COLON: {
    name: "COLON",
    tier: 1,
    pattern: (resolve: PatternResolver) => resolve("COLON_CHAR"),
    description: "Colon (regex pattern)",
    composedFrom: ["COLON_CHAR"],
    fixtures: {
      passes: [{ input: ":" }],
      fails: [{ input: ";", reason: "semicolon" }],
    },
  },
  DOT: {
    name: "DOT",
    tier: 1,
    pattern: (resolve: PatternResolver) => escapeChar(resolve, "DOT_CHAR"),
    description: "Period or dot (regex pattern)",
    composedFrom: ["DOT_CHAR"],
    fixtures: {
      passes: [{ input: "." }],
      fails: [
        { input: "…", reason: "ellipsis" },
        { input: ",", reason: "comma" },
      ],
    },
  },
  POUND: {
    name: "POUND",
    tier: 1,
    pattern: (resolve: PatternResolver) => resolve("POUND_CHAR"),
    description: "Hash or pound (regex pattern)",
    composedFrom: ["POUND_CHAR"],
    fixtures: {
      passes: [{ input: "#" }],
      fails: [
        { input: "@", reason: "at sign" },
        { input: "№", reason: "numero sign" },
      ],
    },
  },
  BRACKET_OPEN: {
    name: "BRACKET_OPEN",
    tier: 1,
    pattern: (resolve: PatternResolver) => escapeChar(resolve, "BRACKET_OPEN_CHAR"),
    description: "Opening square bracket (regex pattern)",
    composedFrom: ["BRACKET_OPEN_CHAR"],
    fixtures: {
      passes: [{ input: "[" }],
      fails: [{ input: "]", reason: "closing" }],
    },
  },
  BRACKET_CLOSE: {
    name: "BRACKET_CLOSE",
    tier: 1,
    pattern: (resolve: PatternResolver) => escapeChar(resolve, "BRACKET_CLOSE_CHAR"),
    description: "Closing square bracket (regex pattern)",
    composedFrom: ["BRACKET_CLOSE_CHAR"],
    fixtures: {
      passes: [{ input: "]" }],
      fails: [{ input: "[", reason: "opening" }],
    },
  },
  QUOTE_SINGLE: {
    name: "QUOTE_SINGLE",
    tier: 1,
    pattern: (resolve: PatternResolver) => escapeChar(resolve, "QUOTE_SINGLE_CHAR"),
    description: "Single quote (regex pattern)",
    composedFrom: ["QUOTE_SINGLE_CHAR"],
    fixtures: {
      passes: [{ input: "'" }],
      fails: [{ input: '"', reason: "double quote" }],
    },
  },
  QUOTE_DOUBLE: {
    name: "QUOTE_DOUBLE",
    tier: 1,
    pattern: (resolve: PatternResolver) => escapeChar(resolve, "QUOTE_DOUBLE_CHAR"),
    description: "Double quote (regex pattern)",
    composedFrom: ["QUOTE_DOUBLE_CHAR"],
    fixtures: {
      passes: [{ input: '"' }],
      fails: [{ input: "'", reason: "single quote" }],
    },
  },
  BRACE_OPEN: {
    name: "BRACE_OPEN",
    tier: 1,
    pattern: (resolve: PatternResolver) => escapeChar(resolve, "BRACE_OPEN_CHAR"),
    description: "Opening brace (regex pattern)",
    composedFrom: ["BRACE_OPEN_CHAR"],
    fixtures: {
      passes: [{ input: "{" }],
      fails: [{ input: "}", reason: "closing" }],
    },
  },
  BRACE_CLOSE: {
    name: "BRACE_CLOSE",
    tier: 1,
    pattern: (resolve: PatternResolver) => escapeChar(resolve, "BRACE_CLOSE_CHAR"),
    description: "Closing brace (regex pattern)",
    composedFrom: ["BRACE_CLOSE_CHAR"],
    fixtures: {
      passes: [{ input: "}" }],
      fails: [{ input: "{", reason: "opening" }],
    },
  },
};
