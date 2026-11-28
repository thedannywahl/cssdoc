/**
 * Tier 1 JavaScript-related host-scanning patterns.
 *
 * @module
 */

import type { PatternDefinition } from "../types.ts";

/** Start of input or a character that can precede a bare template-tag identifier */
export const JAVASCRIPT_TAGGED_TEMPLATE_BOUNDARY: RegExp = /(?:[^.\w$]|^)/u;
/** A dotted member or non-nested call suffix in a template-tag expression heuristic */
export const JAVASCRIPT_TAGGED_TEMPLATE_CHAIN_SEGMENT: RegExp = /(?:\.[\w$]+|\([^()]*\))/u;
/** Captured quoted or template literal heuristic without escape handling */
export const JAVASCRIPT_QUOTED_OR_TEMPLATE_LITERAL_LIKE: RegExp = /(["'`])((?:(?!\1)[\s\S])*)\1/u;

/** JavaScript template-tag and literal scanning pattern definitions. */
export const TIER_1_JAVASCRIPT_PATTERNS: Record<string, PatternDefinition> = {
  JAVASCRIPT_TAGGED_TEMPLATE_BOUNDARY: {
    name: "JAVASCRIPT_TAGGED_TEMPLATE_BOUNDARY",
    tier: 1,
    regex: JAVASCRIPT_TAGGED_TEMPLATE_BOUNDARY,

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
    regex: JAVASCRIPT_TAGGED_TEMPLATE_CHAIN_SEGMENT,

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
    regex: JAVASCRIPT_QUOTED_OR_TEMPLATE_LITERAL_LIKE,

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
