/**
 * Tier 1 HTML-related patterns.
 *
 * @module
 */

import type { RawPatternDef, PatternResolver } from "../types.ts";

export const TIER_1_HTML_PATTERNS: Record<string, RawPatternDef> = {
  HTML_STANDARD_ELEMENT_NAME: {
    name: "HTML_STANDARD_ELEMENT_NAME",
    tier: 1,
    pattern: (resolve: PatternResolver) =>
      `${resolve("ALPHA_LOWER")}[${resolve("ALPHA_LOWER", true)}${resolve("DIGIT", true)}]*`,
    description: "Lowercase ASCII built-in-style element name shape, without validating membership",
    composedFrom: ["ALPHA_LOWER", "DIGIT"],
    fixtures: {
      passes: [{ input: "div" }, { input: "button" }, { input: "h1" }],
      fails: [
        { input: "my-element", reason: "custom-element-shaped name" },
        { input: "Button", reason: "uppercase" },
        { input: "-div", reason: "starts with hyphen" },
        { input: "", reason: "empty" },
      ],
    },
  },
  HTML_LOWERCASE_TAG_NAME_LIKE: {
    name: "HTML_LOWERCASE_TAG_NAME_LIKE",
    tier: 1,
    pattern: (resolve: PatternResolver) =>
      `${resolve("ALPHA_LOWER")}[${resolve("ALPHA_LOWER", true)}${resolve("DIGIT", true)}${resolve("DASH")}]*`,
    flags: "u",
    description: "Lowercase ASCII tag-name heuristic with digits and hyphens, not a validator",
    composedFrom: ["ALPHA_LOWER", "DIGIT", "DASH"],
    fixtures: {
      passes: [{ input: "div" }, { input: "h1" }, { input: "x-" }, { input: "font-face" }],
      fails: [
        { input: "Button", reason: "uppercase" },
        { input: "x-a.b", reason: "dot isn't accepted" },
        { input: "1div", reason: "starts with a digit" },
      ],
    },
  },
  HTML_CUSTOM_ELEMENT_LIKE_NAME: {
    name: "HTML_CUSTOM_ELEMENT_LIKE_NAME",
    tier: 1,
    pattern: (resolve: PatternResolver) => {
      const start = resolve("ALPHA_LOWER");
      const chars = `[${resolve("ALPHA_LOWER", true)}${resolve("DIGIT", true)}${resolve("DOT_CHAR")}${resolve("UNDERSCORE_CHAR")}${resolve("DASH")}]`;
      return `${start}${chars}*${resolve("DASH")}${chars}+`;
    },
    flags: "u",
    description: "ASCII custom-element-shaped name heuristic, not the complete HTML name grammar",
    composedFrom: ["ALPHA_LOWER", "DIGIT", "DOT_CHAR", "UNDERSCORE_CHAR", "DASH"],
    fixtures: {
      passes: [{ input: "x-button" }, { input: "a-b.c_1" }, { input: "x--" }],
      fails: [
        { input: "button", reason: "missing hyphen" },
        { input: "x-", reason: "missing suffix" },
        { input: "X-button", reason: "uppercase" },
        { input: "x-ñ", reason: "non-ASCII character" },
      ],
    },
  },
  HTML_CUSTOM_ELEMENT_NAME: {
    name: "HTML_CUSTOM_ELEMENT_NAME",
    tier: 1,
    pattern: (resolve: PatternResolver) => {
      const chars = String.raw`[^${resolve("ALPHA_UPPER", true)}\0\t\n\f\r ${resolve("FORWARD_SLASH_CHAR")}${resolve("GREATER_THAN_CHAR")}]`;
      const beforeDash = String.raw`[^${resolve("ALPHA_UPPER", true)}\0\t\n\f\r ${resolve("FORWARD_SLASH_CHAR")}${resolve("GREATER_THAN_CHAR")}${resolve("DASH")}]`;
      const reserved =
        "annotation-xml|color-profile|font-face|font-face-src|font-face-uri|font-face-format|font-face-name|missing-glyph";
      return `(?!(?:${reserved})(?!${chars}))${resolve("ALPHA_LOWER")}${beforeDash}*${resolve("DASH")}${chars}*`;
    },
    flags: "u",
    description: "Valid custom element name under the HTML and DOM standards",
    composedFrom: ["ALPHA_LOWER", "ALPHA_UPPER", "DASH", "FORWARD_SLASH_CHAR", "GREATER_THAN_CHAR"],
    fixtures: {
      passes: [
        { input: "my-element" },
        { input: "x-" },
        { input: "a-b.c_1" },
        { input: "x-ñ" },
        { input: "x-😀" },
        { input: "x-<" },
        { input: "font-face-extra" },
      ],
      fails: [
        { input: "button", reason: "missing hyphen" },
        { input: "X-button", reason: "uppercase initial" },
        { input: "x-Button", reason: "uppercase character" },
        { input: "font-face", reason: "reserved name" },
        { input: "x-a/b", reason: "slash" },
        { input: "x-a>", reason: "greater-than sign" },
        { input: "x-\0", reason: "NUL" },
        { input: "x-a b", reason: "ASCII whitespace" },
      ],
    },
  },
  HTML_ELEMENT_NAME: {
    name: "HTML_ELEMENT_NAME",
    tier: 1,
    pattern: (resolve: PatternResolver) =>
      `(?:${resolve("HTML_CUSTOM_ELEMENT_NAME")}|${resolve("HTML_STANDARD_ELEMENT_NAME")})`,
    flags: "u",
    description: "Built-in-style or custom-element-shaped name, without validating membership",
    composedFrom: ["HTML_CUSTOM_ELEMENT_NAME", "HTML_STANDARD_ELEMENT_NAME"],
    fixtures: {
      passes: [
        { input: "div" },
        { input: "h1" },
        { input: "my-element" },
        { input: "a-b.c_1" },
        { input: "x-" },
        { input: "x-ñ" },
      ],
      fails: [
        { input: "Button", reason: "uppercase" },
        { input: "-div", reason: "starts with hyphen" },
        { input: "font-face", reason: "reserved custom element name" },
        { input: "", reason: "empty" },
      ],
    },
  },
  HTML_LIKE_TAG_NAME: {
    name: "HTML_LIKE_TAG_NAME",
    tier: 1,
    pattern: (resolve: PatternResolver) => String.raw`${resolve("ALPHA")}[\w${resolve("DASH")}]*`,
    flags: "u",
    description: "ASCII host-tag name heuristic with word characters and hyphens",
    composedFrom: ["ALPHA", "DASH"],
    fixtures: {
      passes: [{ input: "div" }, { input: "Button" }, { input: "x_1-item" }],
      fails: [
        { input: "my.component", reason: "dot isn't accepted" },
        { input: "1div", reason: "starts with a digit" },
        { input: "élément", reason: "non-ASCII initial" },
      ],
    },
  },
  HTML_LIKE_DOTTED_TAG_NAME: {
    name: "HTML_LIKE_DOTTED_TAG_NAME",
    tier: 1,
    pattern: (resolve: PatternResolver) =>
      String.raw`${resolve("ALPHA")}[\w${resolve("DOT_CHAR")}${resolve("DASH")}]*`,
    flags: "u",
    description: "ASCII host-tag name heuristic that also accepts dots, as in JSX member names",
    composedFrom: ["ALPHA", "DOT_CHAR", "DASH"],
    fixtures: {
      passes: [{ input: "div" }, { input: "Button.Root" }, { input: "x_1-item" }],
      fails: [
        { input: "1div", reason: "starts with a digit" },
        { input: "élément", reason: "non-ASCII initial" },
      ],
    },
  },
  HTML_QUOTED_ATTRIBUTE_VALUE: {
    name: "HTML_QUOTED_ATTRIBUTE_VALUE",
    tier: 1,
    pattern: (resolve: PatternResolver) => {
      const double = resolve("QUOTE_DOUBLE_CHAR");
      const single = resolve("QUOTE_SINGLE_CHAR");
      return `(?:${double}([^${double}]*)${double}|${single}([^${single}]*)${single})`;
    },
    flags: "u",
    description: "Double- or single-quoted attribute value, capturing the unquoted content",
    composedFrom: ["QUOTE_DOUBLE_CHAR", "QUOTE_SINGLE_CHAR"],
    fixtures: {
      passes: [{ input: '"value"' }, { input: "'value'" }, { input: '""' }, { input: '"a\nb"' }],
      fails: [
        { input: "value", reason: "unquoted" },
        { input: "\"value'", reason: "mismatched quotes" },
      ],
    },
  },
  HTML_LIKE_CLASS_ATTRIBUTE_NAME: {
    name: "HTML_LIKE_CLASS_ATTRIBUTE_NAME",
    tier: 1,
    source: "(?:className|class)",
    flags: "u",
    description: "HTML class or JSX className attribute name",
    fixtures: {
      passes: [{ input: "class" }, { input: "className" }],
      fails: [
        { input: "classname", reason: "case differs" },
        { input: "class:list", reason: "directive" },
      ],
    },
  },
  HTML_QUOTED_ATTRIBUTE: {
    name: "HTML_QUOTED_ATTRIBUTE",
    tier: 1,
    pattern: (resolve: PatternResolver) =>
      String.raw`([:\w${resolve("DASH")}]+)\s*${resolve("EQUALS_CHAR")}\s*${resolve("HTML_QUOTED_ATTRIBUTE_VALUE")}`,
    flags: "u",
    description: "ASCII-like attribute name and quoted value, capturing the name and either value",
    composedFrom: ["DASH", "EQUALS_CHAR", "HTML_QUOTED_ATTRIBUTE_VALUE"],
    fixtures: {
      passes: [{ input: 'class="x"' }, { input: "data-state = 'open'" }, { input: ':class=""' }],
      fails: [
        { input: "disabled", reason: "no value" },
        { input: "class=x", reason: "unquoted value" },
      ],
    },
  },
  HTML_COMMENT: {
    name: "HTML_COMMENT",
    tier: 1,
    pattern: (resolve: PatternResolver) =>
      String.raw`${resolve("LESS_THAN_CHAR")}!${resolve("DOUBLE_DASH")}[\s\S]*?${resolve("DOUBLE_DASH")}${resolve("GREATER_THAN_CHAR")}`,
    flags: "u",
    description: "Non-greedy HTML comment delimiter heuristic, not a complete HTML comment parser",
    composedFrom: ["LESS_THAN_CHAR", "DOUBLE_DASH", "GREATER_THAN_CHAR"],
    fixtures: {
      passes: [{ input: "<!---->" }, { input: "<!-- text -->" }, { input: "<!-- a\nb -->" }],
      fails: [
        { input: "<!-- unfinished", reason: "no closing delimiter" },
        { input: "/* text */", reason: "CSS comment" },
      ],
    },
  },
  HTML_LIKE_STYLE_OPEN_TAG: {
    name: "HTML_LIKE_STYLE_OPEN_TAG",
    tier: 1,
    pattern: (resolve: PatternResolver) =>
      `${resolve("LESS_THAN_CHAR")}style([^${resolve("GREATER_THAN_CHAR")}]*)${resolve("GREATER_THAN_CHAR")}`,
    flags: "u",
    description: "Style opener prefix heuristic capturing text up to the first greater-than sign",
    composedFrom: ["LESS_THAN_CHAR", "GREATER_THAN_CHAR"],
    fixtures: {
      passes: [{ input: "<style>" }, { input: '<style lang="scss">' }, { input: "<styles>" }],
      fails: [
        { input: "<style", reason: "missing greater-than sign" },
        { input: "</style>", reason: "closing tag" },
      ],
    },
  },
};
