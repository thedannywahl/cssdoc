/**
 * Tier 1 common composed patterns.
 *
 * @module
 */

import type { RawPatternDef, PatternResolver } from "../types.ts";
import { escapeChar } from "../lib.ts";

/** Common punctuation and text pattern definitions. */
export const TIER_1_COMMON_PATTERNS: Record<string, RawPatternDef> = {
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
  COMMENT_LINE_PREFIX: {
    name: "COMMENT_LINE_PREFIX",
    tier: 1,
    pattern: (resolve: PatternResolver) => String.raw`^\s*${resolve("COMMENT_LINE_MARKER")}\s?`,
    description: "Leading whitespace and a single block-comment line marker",
    composedFrom: ["COMMENT_LINE_MARKER"],
    fixtures: {
      passes: [{ input: "*" }, { input: "  * " }, { input: "\t*\t" }],
      fails: [{ input: "  text", reason: "no comment line marker" }],
    },
  },
  WHITESPACE_RUN: {
    name: "WHITESPACE_RUN",
    tier: 1,
    source: String.raw`\s+`,
    flags: "u",
    description: "One or more JavaScript whitespace characters",
    fixtures: {
      passes: [{ input: " " }, { input: "\t\n" }, { input: "\u00a0" }],
      fails: [{ input: "", reason: "requires at least one whitespace character" }],
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
