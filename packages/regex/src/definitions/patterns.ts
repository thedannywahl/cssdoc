/**
 * @cssdoc/regex/definitions/patterns
 *
 * Unified Pattern Definitions — Single source of truth for all regex patterns.
 * Each pattern is defined once with both ArkRegex and string representations.
 * Patterns are organized by functional areas:
 * - Character classes (Tier 0): ALPHA, DIGIT, etc.
 * - Punctuation (Tier 0-1): DOT_CHAR, DOT, COLON_CHAR, COLON, etc.
 * - CSS specification (Tier 1-2): CSS_IDENTIFIER, CSS_FUNCTION, etc.
 * - CssDoc tags (Tier 2-3): CSSDOC_TAG_NAME, CSSDOC_SELECTOR, etc.
 * - Token patterns (Tier 3): TOKEN_IDENTIFIER, TOKEN_WHITESPACE, etc.
 * - Tokenizer patterns (Tier 3): TOKENIZER_TAG, TOKENIZER_MODIFIER, etc.
 *
 * @module
 */

import { regex as arkRegex } from "arkregex";
import type { PatternResolver, UnifiedPatternDef } from "./types.ts";

/**
 * Complete unified pattern definitions.
 * Patterns are resolved lazily to handle composition dependencies.
 */
export const PATTERN_DEFINITIONS: Record<string, UnifiedPatternDef> = (() => {
  const rawDefs: Record<string, any> = {
    ALPHA: {
      name: "ALPHA",
      grammarRule: "Letter",
      tier: 0,
      source: String.raw`[A-Za-z]`,
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
      source: String.raw`[a-z]`,
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
      source: String.raw`[A-Z]`,
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
      pattern: (resolve: PatternResolver) => {
        const digit = resolve("DIGIT", true);
        const alpha = resolve("ALPHA", true);
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
      pattern: (resolve: PatternResolver) => {
        const alpha = resolve("ALPHA", true);
        const digit = resolve("DIGIT", true);
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
      source: String.raw`[0-9]`,
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
      source: String.raw`-`,
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
      source: String.raw`--`,
      description: "Double hyphen",
      fixtures: {
        passes: [{ input: "--" }],
        fails: [
          { input: "-", reason: "single dash" },
          { input: "", reason: "empty" },
        ],
      },
    },
    // DOT moved to tier 1 after DOT_CHAR definition
    HEX_DIGIT: {
      name: "HEX_DIGIT",
      tier: 0,
      source: String.raw`[0-9a-fA-F]`,
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
      source: String.raw`[0-9a-fA-F?]`,
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
      source: String.raw`[ \t]`,
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
      source: String.raw`\b`,
      description: "Zero-width word boundary",
      fixtures: {
        passes: [{ input: "a ", note: "boundary after word char" }],
        fails: [{ input: "aa", reason: "no boundary between letters" }],
      },
    },
    CSS_IDENTIFIER_START: {
      name: "CSS_IDENTIFIER_START",
      tier: 0,
      source: String.raw`[a-zA-Z_\u0080-\uFFFF]`,
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
      source: String.raw`[\w\-\u0080-\uFFFF]`,
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
      source: String.raw`[\w\u0080-\uFFFF]`,
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
      source: String.raw`[a-zA-Z_\-\u0080-\uFFFF]`,
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
    FORWARD_SLASH: {
      name: "FORWARD_SLASH",
      tier: 0,
      source: String.raw`\/`,
      description: "Forward slash punctuation",
      fixtures: {
        passes: [{ input: "/" }],
        fails: [
          { input: "\\", reason: "backslash" },
          { input: "|", reason: "pipe" },
          { input: "", reason: "empty" },
        ],
      },
    },
    ASTERISK: {
      name: "ASTERISK",
      tier: 0,
      source: String.raw`\*`,
      description: "Asterisk punctuation",
      fixtures: {
        passes: [{ input: "*" }],
        fails: [
          { input: "+", reason: "plus" },
          { input: "×", reason: "multiplication sign" },
          { input: "", reason: "empty" },
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
          { input: "button:max-5", note: "with max" },
        ],
        fails: [{ input: "", reason: "empty" }],
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
    // Single character patterns (for syntax highlighting)
    COLON_CHAR: {
      name: "COLON_CHAR",
      tier: 0,
      source: ":",
      description: "Colon character (literal)",
      fixtures: {
        passes: [{ input: ":" }],
        fails: [{ input: ";", reason: "semicolon" }],
      },
    },
    DOT_CHAR: {
      name: "DOT_CHAR",
      tier: 0,
      source: ".",
      description: "Period or dot character (literal)",
      fixtures: {
        passes: [{ input: "." }],
        fails: [
          { input: "…", reason: "ellipsis" },
          { input: ",", reason: "comma" },
        ],
      },
    },
    POUND_CHAR: {
      name: "POUND_CHAR",
      tier: 0,
      source: "#",
      description: "Hash or pound character (literal)",
      fixtures: {
        passes: [{ input: "#" }],
        fails: [
          { input: "@", reason: "at sign" },
          { input: "№", reason: "numero sign" },
        ],
      },
    },
    AT_CHAR: {
      name: "AT_CHAR",
      tier: 0,
      source: "@",
      description: "At sign character (literal)",
      fixtures: {
        passes: [{ input: "@" }],
        fails: [{ input: "#", reason: "hash" }],
      },
    },
    PIPE_CHAR: {
      name: "PIPE_CHAR",
      tier: 0,
      source: "|",
      description: "Pipe character (literal)",
      fixtures: {
        passes: [{ input: "|" }],
        fails: [{ input: "-", reason: "dash" }],
      },
    },
    PAREN_OPEN_CHAR: {
      name: "PAREN_OPEN_CHAR",
      tier: 0,
      source: "(",
      description: "Opening parenthesis character (literal)",
      fixtures: {
        passes: [{ input: "(" }],
        fails: [{ input: ")", reason: "closing" }],
      },
    },
    PAREN_CLOSE_CHAR: {
      name: "PAREN_CLOSE_CHAR",
      tier: 0,
      source: ")",
      description: "Closing parenthesis character (literal)",
      fixtures: {
        passes: [{ input: ")" }],
        fails: [{ input: "(", reason: "opening" }],
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
    BRACKET_OPEN_CHAR: {
      name: "BRACKET_OPEN_CHAR",
      tier: 0,
      source: "[",
      description: "Opening square bracket character (literal)",
      fixtures: {
        passes: [{ input: "[" }],
        fails: [{ input: "]", reason: "closing" }],
      },
    },
    BRACKET_CLOSE_CHAR: {
      name: "BRACKET_CLOSE_CHAR",
      tier: 0,
      source: "]",
      description: "Closing square bracket character (literal)",
      fixtures: {
        passes: [{ input: "]" }],
        fails: [{ input: "[", reason: "opening" }],
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
    QUOTE_SINGLE_CHAR: {
      name: "QUOTE_SINGLE_CHAR",
      tier: 0,
      source: "'",
      description: "Single quote character (literal)",
      fixtures: {
        passes: [{ input: "'" }],
        fails: [{ input: '"', reason: "double quote" }],
      },
    },
    QUOTE_DOUBLE_CHAR: {
      name: "QUOTE_DOUBLE_CHAR",
      tier: 0,
      source: '"',
      description: "Double quote character (literal)",
      fixtures: {
        passes: [{ input: '"' }],
        fails: [{ input: "'", reason: "single quote" }],
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
    BRACE_OPEN_CHAR: {
      name: "BRACE_OPEN_CHAR",
      tier: 0,
      source: "{",
      description: "Opening brace character (literal)",
      fixtures: {
        passes: [{ input: "{" }],
        fails: [{ input: "}", reason: "closing" }],
      },
    },
    BRACE_CLOSE_CHAR: {
      name: "BRACE_CLOSE_CHAR",
      tier: 0,
      source: "}",
      description: "Closing brace character (literal)",
      fixtures: {
        passes: [{ input: "}" }],
        fails: [{ input: "{", reason: "opening" }],
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
    // Token patterns for syntax highlighting (Tier 3b: composition building blocks)
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
    // Additional structure-specific patterns
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
    // CodeMirror / TextMate tokenizer patterns for cssdoc doc-comment tags
    // These are Tier 3 patterns that capture tag structures for syntax highlighting
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

  // Helper to escape a single character with a backslash
  const escapeChar = (resolve: PatternResolver, charName: string): string => {
    const char = resolve(charName);
    return `\\${char}`;
  };

  // Resolver function for composed patterns
  const resolver = (name: string, unwrap: boolean = false): string => {
    const def = rawDefs[name];
    if (!def) throw new Error(`Pattern ${name} not found`);

    let source: string;
    if (def.source) {
      source = def.source;
    } else if (def.pattern && typeof def.pattern === "string") {
      source = def.pattern;
    } else if (def.pattern && typeof def.pattern === "function") {
      source = def.pattern(resolver);
    } else {
      throw new Error(`No pattern source for ${name}`);
    }

    // Strip outer brackets if requested (for character class composition)
    return unwrap && source.startsWith("[") && source.endsWith("]") ? source.slice(1, -1) : source;
  };

  // Build final definitions with ArkRegex
  const result: Record<string, UnifiedPatternDef> = {};
  for (const [name, def] of Object.entries(rawDefs)) {
    const source = resolver(name);
    const flags = (def.flags || "") as "u" | "v" | "";

    result[name] = {
      ...def,
      name,
      source,
      ...(def.tier === 0 ? {} : { regex: arkRegex.as(source, flags as "u" | "v") }),
    };
  }

  return result;
})();
