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
};
