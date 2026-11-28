/**
 * Tier 1 common composed patterns.
 *
 * @module
 */

import type { PatternDefinition } from "../types.ts";

/** A CRLF, CR, or LF line ending */
export const LINE_ENDING: RegExp = /(?:\r\n|\r|\n)/u;
/** Lowercase ASCII filename extension, capturing the extension without the dot */
export const FILE_EXTENSION: RegExp = /\.([a-z]+)$/u;
/** Less-than character (regex pattern) */
export const LESS_THAN: RegExp = /</;
/** Greater-than character (regex pattern) */
export const GREATER_THAN: RegExp = />/;
/** CSS block comment start (/*) */
export const COMMENT_START: RegExp = /\/\*/;
/** CSS doc-comment opener (/**) */
export const DOC_COMMENT_START: RegExp = /\/\*\*/;
/** CSS block comment end (*\/) */
export const COMMENT_END: RegExp = /\*\//;
/** CSS block comment line marker (*) */
export const COMMENT_LINE_MARKER: RegExp = /\*/;
/** Leading whitespace and a single block-comment line marker */
export const COMMENT_LINE_PREFIX: RegExp = /^\s*\*\s?/;
/** One or more JavaScript whitespace characters */
export const WHITESPACE_RUN: RegExp = /\s+/u;
/** At sign (regex pattern) */
export const AT: RegExp = /@/;
/** Pipe (regex pattern) */
export const PIPE: RegExp = /\|/;
/** Opening parenthesis (regex pattern) */
export const PAREN_OPEN: RegExp = /\(/;
/** Closing parenthesis (regex pattern) */
export const PAREN_CLOSE: RegExp = /\)/;
/** Colon (regex pattern) */
export const COLON: RegExp = /:/;
/** Period or dot (regex pattern) */
export const DOT: RegExp = /\./;
/** Hash or pound (regex pattern) */
export const POUND: RegExp = /#/;
/** Opening square bracket (regex pattern) */
export const BRACKET_OPEN: RegExp = /\[/;
/** Closing square bracket (regex pattern) */
export const BRACKET_CLOSE: RegExp = /\]/;
/** Single quote (regex pattern) */
export const QUOTE_SINGLE: RegExp = /'/;
/** Double quote (regex pattern) */
export const QUOTE_DOUBLE: RegExp = /"/;
/** Opening brace (regex pattern) */
export const BRACE_OPEN: RegExp = /\{/;
/** Closing brace (regex pattern) */
export const BRACE_CLOSE: RegExp = /\}/;

/** Common punctuation and text pattern definitions. */
export const TIER_1_COMMON_PATTERNS: Record<string, PatternDefinition> = {
  LINE_ENDING: {
    name: "LINE_ENDING",
    tier: 1,
    regex: LINE_ENDING,

    description: "A CRLF, CR, or LF line ending",
    composedFrom: ["CARRIAGE_RETURN", "LINE_FEED"],
    fixtures: {
      passes: [{ input: "\r\n" }, { input: "\r" }, { input: "\n" }],
      fails: [
        { input: " ", reason: "space" },
        { input: "\n\r", reason: "two line endings" },
      ],
    },
  },
  FILE_EXTENSION: {
    name: "FILE_EXTENSION",
    tier: 1,
    regex: FILE_EXTENSION,

    description: "Lowercase ASCII filename extension, capturing the extension without the dot",
    composedFrom: ["DOT", "ALPHA_LOWER"],
    fixtures: {
      passes: [{ input: ".scss" }, { input: ".js" }, { input: ".css" }],
      fails: [
        { input: ".CSS", reason: "uppercase" },
        { input: ".css1", reason: "non-letter suffix" },
      ],
    },
  },
  LESS_THAN: {
    name: "LESS_THAN",
    tier: 1,
    regex: LESS_THAN,
    description: "Less-than character (regex pattern)",
    composedFrom: ["LESS_THAN_CHAR"],
    fixtures: {
      passes: [{ input: "<" }],
      fails: [
        { input: ">", reason: "greater-than" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  GREATER_THAN: {
    name: "GREATER_THAN",
    tier: 1,
    regex: GREATER_THAN,
    description: "Greater-than character (regex pattern)",
    composedFrom: ["GREATER_THAN_CHAR"],
    fixtures: {
      passes: [{ input: ">" }],
      fails: [
        { input: "<", reason: "less-than" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  COMMENT_START: {
    name: "COMMENT_START",
    tier: 1,
    regex: COMMENT_START,
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
    grammarRule: "CommentOpen",
    grammarSource: "cssdoc",
    grammarRelation: "exact",
    tier: 1,
    regex: DOC_COMMENT_START,
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
    grammarRule: "CommentClose",
    grammarSource: "cssdoc",
    grammarRelation: "exact",
    tier: 1,
    regex: COMMENT_END,
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
    regex: COMMENT_LINE_MARKER,
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
    grammarRule: "LinePrefix",
    grammarSource: "cssdoc",
    grammarRelation: "related",
    tier: 1,
    regex: COMMENT_LINE_PREFIX,
    description: "Leading whitespace and a single block-comment line marker",
    composedFrom: ["COMMENT_LINE_MARKER"],
    fixtures: {
      passes: [{ input: "*" }, { input: "  * " }, { input: "\t*\t" }],
      fails: [
        { input: "  text", reason: "no comment line marker" },
        { input: "**", reason: "two comment markers" },
      ],
    },
  },
  WHITESPACE_RUN: {
    name: "WHITESPACE_RUN",
    tier: 1,
    regex: WHITESPACE_RUN,

    description: "One or more JavaScript whitespace characters",
    fixtures: {
      passes: [{ input: " " }, { input: "\t\n" }, { input: "\u00A0" }],
      fails: [
        { input: "", reason: "requires at least one whitespace character" },
        { input: "x", reason: "letter" },
        { input: " \tx", reason: "contains a letter" },
      ],
    },
  },
  AT: {
    name: "AT",
    grammarRule: "BlockSigil",
    grammarSource: "cssdoc",
    grammarRelation: "exact",
    tier: 1,
    regex: AT,
    description: "At sign (regex pattern)",
    composedFrom: ["AT_CHAR"],
    fixtures: {
      passes: [{ input: "@" }],
      fails: [
        { input: "#", reason: "hash" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  PIPE: {
    name: "PIPE",
    tier: 1,
    regex: PIPE,
    description: "Pipe (regex pattern)",
    composedFrom: ["PIPE_CHAR"],
    fixtures: {
      passes: [{ input: "|" }],
      fails: [
        { input: "-", reason: "dash" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  PAREN_OPEN: {
    name: "PAREN_OPEN",
    tier: 1,
    regex: PAREN_OPEN,
    description: "Opening parenthesis (regex pattern)",
    composedFrom: ["PAREN_OPEN_CHAR"],
    fixtures: {
      passes: [{ input: "(" }],
      fails: [
        { input: ")", reason: "closing" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  PAREN_CLOSE: {
    name: "PAREN_CLOSE",
    tier: 1,
    regex: PAREN_CLOSE,
    description: "Closing parenthesis (regex pattern)",
    composedFrom: ["PAREN_CLOSE_CHAR"],
    fixtures: {
      passes: [{ input: ")" }],
      fails: [
        { input: "(", reason: "opening" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  COLON: {
    name: "COLON",
    tier: 1,
    regex: COLON,
    description: "Colon (regex pattern)",
    composedFrom: ["COLON_CHAR"],
    fixtures: {
      passes: [{ input: ":" }],
      fails: [
        { input: ";", reason: "semicolon" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  DOT: {
    name: "DOT",
    tier: 1,
    regex: DOT,
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
    regex: POUND,
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
    regex: BRACKET_OPEN,
    description: "Opening square bracket (regex pattern)",
    composedFrom: ["BRACKET_OPEN_CHAR"],
    fixtures: {
      passes: [{ input: "[" }],
      fails: [
        { input: "]", reason: "closing" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  BRACKET_CLOSE: {
    name: "BRACKET_CLOSE",
    tier: 1,
    regex: BRACKET_CLOSE,
    description: "Closing square bracket (regex pattern)",
    composedFrom: ["BRACKET_CLOSE_CHAR"],
    fixtures: {
      passes: [{ input: "]" }],
      fails: [
        { input: "[", reason: "opening" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  QUOTE_SINGLE: {
    name: "QUOTE_SINGLE",
    tier: 1,
    regex: QUOTE_SINGLE,
    description: "Single quote (regex pattern)",
    composedFrom: ["QUOTE_SINGLE_CHAR"],
    fixtures: {
      passes: [{ input: "'" }],
      fails: [
        { input: '"', reason: "double quote" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  QUOTE_DOUBLE: {
    name: "QUOTE_DOUBLE",
    tier: 1,
    regex: QUOTE_DOUBLE,
    description: "Double quote (regex pattern)",
    composedFrom: ["QUOTE_DOUBLE_CHAR"],
    fixtures: {
      passes: [{ input: '"' }],
      fails: [
        { input: "'", reason: "single quote" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  BRACE_OPEN: {
    name: "BRACE_OPEN",
    tier: 1,
    regex: BRACE_OPEN,
    description: "Opening brace (regex pattern)",
    composedFrom: ["BRACE_OPEN_CHAR"],
    fixtures: {
      passes: [{ input: "{" }],
      fails: [
        { input: "}", reason: "closing" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  BRACE_CLOSE: {
    name: "BRACE_CLOSE",
    tier: 1,
    regex: BRACE_CLOSE,
    description: "Closing brace (regex pattern)",
    composedFrom: ["BRACE_CLOSE_CHAR"],
    fixtures: {
      passes: [{ input: "}" }],
      fails: [
        { input: "{", reason: "opening" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
};
