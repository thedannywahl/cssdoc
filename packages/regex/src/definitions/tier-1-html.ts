/**
 * Tier 1 HTML-related patterns.
 *
 * @module
 */

import type { RawPatternDef, PatternResolver } from "../types.ts";

export const TIER_1_HTML_PATTERNS: Record<string, RawPatternDef> = {
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
};
