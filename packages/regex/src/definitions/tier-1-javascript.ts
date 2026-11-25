/**
 * Tier 1 JavaScript-related host-scanning patterns.
 *
 * @module
 */

import type { RawPatternDef, PatternResolver } from "../types.ts";

/** JavaScript template-tag and literal scanning pattern definitions. */
export const TIER_1_JAVASCRIPT_PATTERNS: Record<string, RawPatternDef> = {
  JAVASCRIPT_TAGGED_TEMPLATE_BOUNDARY: {
    name: "JAVASCRIPT_TAGGED_TEMPLATE_BOUNDARY",
    tier: 1,
    pattern: (resolve: PatternResolver) =>
      String.raw`(?:[^${resolve("DOT_CHAR")}\w${resolve("DOLLAR_CHAR")}]|^)`,
    flags: "u",
    description: "Start of input or a character that can precede a bare template-tag identifier",
    composedFrom: ["DOT_CHAR", "DOLLAR_CHAR"],
    fixtures: {
      passes: [{ input: "" }, { input: " " }, { input: "=" }],
      fails: [
        { input: ".", reason: "member access" },
        { input: "$", reason: "identifier character" },
        { input: "a", reason: "identifier character" },
      ],
    },
  },
  JAVASCRIPT_TAGGED_TEMPLATE_CHAIN_SEGMENT: {
    name: "JAVASCRIPT_TAGGED_TEMPLATE_CHAIN_SEGMENT",
    tier: 1,
    pattern: (resolve: PatternResolver) =>
      `(?:${resolve("DOT")}[${resolve("ALPHA", true)}${resolve("DIGIT", true)}${resolve("UNDERSCORE_CHAR")}${resolve("DOLLAR_CHAR")}]+|${resolve("PAREN_OPEN")}[^${resolve("PAREN_OPEN_CHAR")}${resolve("PAREN_CLOSE_CHAR")}]*${resolve("PAREN_CLOSE")})`,
    flags: "u",
    description: "A dotted member or non-nested call suffix in a template-tag expression heuristic",
    composedFrom: [
      "DOT",
      "ALPHA",
      "DIGIT",
      "UNDERSCORE_CHAR",
      "DOLLAR_CHAR",
      "PAREN_OPEN",
      "PAREN_OPEN_CHAR",
      "PAREN_CLOSE_CHAR",
      "PAREN_CLOSE",
    ],
    fixtures: {
      passes: [{ input: ".button" }, { input: ".$_1" }, { input: "('div')" }, { input: "()" }],
      fails: [
        { input: ".", reason: "missing member name" },
        { input: "(fn())", reason: "nested parentheses" },
        { input: "[0]", reason: "computed member" },
      ],
    },
  },
  JAVASCRIPT_QUOTED_OR_TEMPLATE_LITERAL_LIKE: {
    name: "JAVASCRIPT_QUOTED_OR_TEMPLATE_LITERAL_LIKE",
    tier: 1,
    pattern: (resolve: PatternResolver) =>
      String.raw`([${resolve("QUOTE_DOUBLE_CHAR")}${resolve("QUOTE_SINGLE_CHAR")}${resolve("BACKTICK_CHAR")}])((?:(?!\1)[\s\S])*)\1`,
    flags: "u",
    description: "Captured quoted or template literal heuristic without escape handling",
    composedFrom: ["QUOTE_DOUBLE_CHAR", "QUOTE_SINGLE_CHAR", "BACKTICK_CHAR"],
    fixtures: {
      passes: [{ input: '"text"' }, { input: "'text'" }, { input: "`text`" }, { input: "``" }],
      fails: [
        { input: '"text', reason: "unclosed literal" },
        { input: "text", reason: "unquoted text" },
      ],
    },
  },
};
