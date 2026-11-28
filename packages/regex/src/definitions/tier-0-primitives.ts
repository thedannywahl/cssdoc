/**
 * \@cssdoc/regex/definitions/tier-0-primitives
 * Tier 0 character class patterns
 * @module
 */

import type { PatternDefinition } from "../types.ts";

/** Carriage return character (literal) */
export const CARRIAGE_RETURN_CHAR = "\r";
/** Line feed character (literal) */
export const LINE_FEED_CHAR = "\n";
/** Carriage return character (regex pattern) */
export const CARRIAGE_RETURN: RegExp = /\r/;
/** Line feed character (regex pattern) */
export const LINE_FEED: RegExp = /\n/;
/** A character with special meaning in a regular expression */
export const REGEX_METACHARACTER: RegExp = /[\\^$.|?*+()[\]{}]/;
/** Alphabetic character (ASCII letters) */
export const ALPHA: RegExp = /[A-Za-z]/;
/** Lowercase alphabetic character */
export const ALPHA_LOWER: RegExp = /[a-z]/;
/** Uppercase alphabetic character */
export const ALPHA_UPPER: RegExp = /[A-Z]/;
/** Alphanumeric character (letter or digit) */
export const ALPHANUMERIC: RegExp = /[0-9A-Za-z]/;
/** Alphanumeric with underscore and hyphen */
export const ALPHANUMERIC_EXTENDED: RegExp = /[\w\-]/;
/** Single digit */
export const DIGIT: RegExp = /\d/;
/** Hyphen-minus character */
export const DASH: RegExp = /-/;
/** Double hyphen */
export const DOUBLE_DASH: RegExp = /--/;
/** Underscore character (literal) */
export const UNDERSCORE_CHAR = "_";
/** Hexadecimal digit */
export const HEX_DIGIT: RegExp = /[0-9a-fA-F]/;
/** Hexadecimal digit or wildcard */
export const HEX_DIGIT_OR_WILDCARD: RegExp = /[0-9a-fA-F?]/;
/** Space or tab whitespace */
export const SPACE_TAB: RegExp = /[ \t]/;
/** Zero-width word boundary */
export const WORD_BOUNDARY: RegExp = /\b/;
/** CSS identifier start */
export const CSS_IDENTIFIER_START: RegExp = /[a-zA-Z_\u0080-\uFFFF]/;
/** CSS identifier continuation */
export const CSS_IDENTIFIER_CONT: RegExp = /[\w\-\u0080-\uFFFF]/;
/** CSS identifier continuation (no dash) */
export const CSS_IDENTIFIER_CONT_NO_DASH: RegExp = /[\w\u0080-\uFFFF]/;
/** CSS identifier start (with dash) */
export const CSS_IDENTIFIER_START_WITH_DASH: RegExp = /[a-zA-Z_\-\u0080-\uFFFF]/;
/** Forward slash character (literal) */
export const FORWARD_SLASH_CHAR = "/";
/** Backslash character (literal) */
export const BACKSLASH_CHAR = "\\";
/** CSS doc-comment opener as literal text */
export const DOC_COMMENT_START_TEXT = "/**";
/** CSS block comment closer as literal text */
export const COMMENT_END_TEXT = "*/";
/** Forward slash punctuation */
export const FORWARD_SLASH: RegExp = /\//;
/** Asterisk punctuation */
export const ASTERISK: RegExp = /\*/;
/** Asterisk character (literal) */
export const ASTERISK_CHAR = "*";
/** Plus character (literal) */
export const PLUS_CHAR = "+";
/** Caret character (literal) */
export const CARET_CHAR = "^";
/** Dollar sign character (literal) */
export const DOLLAR_CHAR = "$";
/** Tilde character (literal) */
export const TILDE_CHAR = "~";
/** Ampersand character (literal) */
export const AMPERSAND_CHAR = "&";
/** Equals sign character (literal) */
export const EQUALS_CHAR = "=";
/** Less-than character (literal) */
export const LESS_THAN_CHAR = "<";
/** Greater-than character (literal) */
export const GREATER_THAN_CHAR = ">";
/** Colon character (literal) */
export const COLON_CHAR = ":";
/** Period or dot character (literal) */
export const DOT_CHAR = ".";
/** Hash or pound character (literal) */
export const POUND_CHAR = "#";
/** At sign character (literal) */
export const AT_CHAR = "@";
/** Pipe character (literal) */
export const PIPE_CHAR = "|";
/** Opening parenthesis character (literal) */
export const PAREN_OPEN_CHAR = "(";
/** Closing parenthesis character (literal) */
export const PAREN_CLOSE_CHAR = ")";
/** Opening square bracket character (literal) */
export const BRACKET_OPEN_CHAR = "[";
/** Closing square bracket character (literal) */
export const BRACKET_CLOSE_CHAR = "]";
/** Single quote character (literal) */
export const QUOTE_SINGLE_CHAR = "'";
/** Double quote character (literal) */
export const QUOTE_DOUBLE_CHAR = '"';
/** Backtick character (literal) */
export const BACKTICK_CHAR = "`";
/** Opening brace character (literal) */
export const BRACE_OPEN_CHAR = "{";
/** Closing brace character (literal) */
export const BRACE_CLOSE_CHAR = "}";

/** Primitive character and punctuation pattern definitions. */
export const TIER_0_PRIMITIVES_PATTERNS: Record<string, PatternDefinition> = {
  CARRIAGE_RETURN_CHAR: {
    name: "CARRIAGE_RETURN_CHAR",
    tier: 0,
    source: CARRIAGE_RETURN_CHAR,
    description: "Carriage return character (literal)",
    fixtures: {
      passes: [{ input: "\r" }],
      fails: [
        { input: "\n", reason: "line feed" },
        { input: " ", reason: "space" },
      ],
    },
  },
  LINE_FEED_CHAR: {
    name: "LINE_FEED_CHAR",
    tier: 0,
    source: LINE_FEED_CHAR,
    description: "Line feed character (literal)",
    fixtures: {
      passes: [{ input: "\n" }],
      fails: [
        { input: "\r", reason: "carriage return" },
        { input: " ", reason: "space" },
      ],
    },
  },
  CARRIAGE_RETURN: {
    name: "CARRIAGE_RETURN",
    tier: 0,
    regex: CARRIAGE_RETURN,
    description: "Carriage return character (regex pattern)",
    fixtures: {
      passes: [{ input: "\r" }],
      fails: [
        { input: "\n", reason: "line feed" },
        { input: " ", reason: "space" },
      ],
    },
  },
  LINE_FEED: {
    name: "LINE_FEED",
    tier: 0,
    regex: LINE_FEED,
    description: "Line feed character (regex pattern)",
    fixtures: {
      passes: [{ input: "\n" }],
      fails: [
        { input: "\r", reason: "carriage return" },
        { input: " ", reason: "space" },
      ],
    },
  },
  REGEX_METACHARACTER: {
    name: "REGEX_METACHARACTER",
    tier: 0,
    regex: REGEX_METACHARACTER,
    description: "A character with special meaning in a regular expression",
    fixtures: {
      passes: [{ input: "." }, { input: "[" }, { input: "]" }, { input: "\\" }],
      fails: [
        { input: "-", reason: "ordinary character" },
        { input: "a", reason: "ordinary character" },
      ],
    },
  },
  ALPHA: {
    name: "ALPHA",
    grammarRule: "Letter",
    grammarSource: "cssdoc",
    grammarRelation: "exact",
    tier: 0,
    regex: ALPHA,
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
    regex: ALPHA_LOWER,
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
    regex: ALPHA_UPPER,
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
    regex: ALPHANUMERIC,
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
    regex: ALPHANUMERIC_EXTENDED,
    description: "Alphanumeric with underscore and hyphen",
    composedFrom: ["ALPHA", "DIGIT", "UNDERSCORE_CHAR"],
    fixtures: {
      passes: [{ input: "a" }, { input: "0" }, { input: "_" }, { input: "-" }],
      fails: [
        { input: " ", reason: "space" },
        { input: "", reason: "empty" },
        { input: ".", reason: "period is not an identifier character" },
      ],
    },
  },
  DIGIT: {
    name: "DIGIT",
    grammarRule: "Digit",
    grammarSource: "cssdoc",
    grammarRelation: "exact",
    tier: 0,
    regex: DIGIT,
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
    regex: DASH,
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
    regex: DOUBLE_DASH,
    description: "Double hyphen",
    fixtures: {
      passes: [{ input: "--" }],
      fails: [
        { input: "-", reason: "single dash" },
        { input: "", reason: "empty" },
        { input: "---", reason: "three dashes" },
      ],
    },
  },
  UNDERSCORE_CHAR: {
    name: "UNDERSCORE_CHAR",
    tier: 0,
    source: UNDERSCORE_CHAR,
    description: "Underscore character (literal)",
    fixtures: {
      passes: [{ input: "_" }],
      fails: [
        { input: "-", reason: "hyphen" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  HEX_DIGIT: {
    name: "HEX_DIGIT",
    tier: 0,
    regex: HEX_DIGIT,
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
    regex: HEX_DIGIT_OR_WILDCARD,
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
    regex: SPACE_TAB,
    description: "Space or tab whitespace",
    fixtures: {
      passes: [{ input: " " }, { input: "\t" }],
      fails: [
        { input: "\n", reason: "newline" },
        { input: "", reason: "empty" },
        { input: "\r", reason: "carriage return" },
      ],
    },
  },
  WORD_BOUNDARY: {
    name: "WORD_BOUNDARY",
    tier: 0,
    regex: WORD_BOUNDARY,
    description: "Zero-width word boundary",
    fixtures: {
      passes: [{ input: "a ", note: "boundary after word char" }, { input: "a" }, { input: "_!" }],
      fails: [
        { input: "  ", reason: "no word characters" },
        { input: "---", reason: "no word characters" },
      ],
    },
  },
  CSS_IDENTIFIER_START: {
    name: "CSS_IDENTIFIER_START",
    tier: 0,
    regex: CSS_IDENTIFIER_START,
    description: "CSS identifier start",
    fixtures: {
      passes: [{ input: "a" }, { input: "_" }, { input: "é" }],
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
    regex: CSS_IDENTIFIER_CONT,
    description: "CSS identifier continuation",
    fixtures: {
      passes: [{ input: "a" }, { input: "0" }, { input: "_" }, { input: "-" }, { input: "é" }],
      fails: [
        { input: " ", reason: "space" },
        { input: "", reason: "empty" },
        { input: ".", reason: "period is not an identifier continuation" },
      ],
    },
  },
  CSS_IDENTIFIER_CONT_NO_DASH: {
    name: "CSS_IDENTIFIER_CONT_NO_DASH",
    tier: 0,
    regex: CSS_IDENTIFIER_CONT_NO_DASH,
    description: "CSS identifier continuation (no dash)",
    fixtures: {
      passes: [{ input: "a" }, { input: "0" }, { input: "_" }, { input: "é" }],
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
    regex: CSS_IDENTIFIER_START_WITH_DASH,
    description: "CSS identifier start (with dash)",
    fixtures: {
      passes: [{ input: "a" }, { input: "_" }, { input: "-" }, { input: "é" }],
      fails: [
        { input: "0", reason: "digit" },
        { input: " ", reason: "space" },
        { input: "", reason: "empty" },
      ],
    },
  },
  FORWARD_SLASH_CHAR: {
    name: "FORWARD_SLASH_CHAR",
    tier: 0,
    source: FORWARD_SLASH_CHAR,
    description: "Forward slash character (literal)",
    fixtures: {
      passes: [{ input: "/" }],
      fails: [
        { input: "\\", reason: "backslash" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  BACKSLASH_CHAR: {
    name: "BACKSLASH_CHAR",
    tier: 0,
    source: BACKSLASH_CHAR,
    description: "Backslash character (literal)",
    fixtures: {
      passes: [{ input: "\\" }],
      fails: [
        { input: "/", reason: "forward slash" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  DOC_COMMENT_START_TEXT: {
    name: "DOC_COMMENT_START_TEXT",
    tier: 0,
    source: DOC_COMMENT_START_TEXT,
    description: "CSS doc-comment opener as literal text",
    composedFrom: ["FORWARD_SLASH_CHAR", "ASTERISK_CHAR"],
    fixtures: {
      passes: [{ input: "/**" }],
      fails: [
        { input: "/*", reason: "ordinary comment" },
        { input: "/***", reason: "extra asterisk" },
      ],
    },
  },
  COMMENT_END_TEXT: {
    name: "COMMENT_END_TEXT",
    tier: 0,
    source: COMMENT_END_TEXT,
    description: "CSS block comment closer as literal text",
    composedFrom: ["ASTERISK_CHAR", "FORWARD_SLASH_CHAR"],
    fixtures: {
      passes: [{ input: "*/" }],
      fails: [
        { input: "/*", reason: "comment opener" },
        { input: "**/", reason: "extra asterisk" },
      ],
    },
  },
  FORWARD_SLASH: {
    name: "FORWARD_SLASH",
    tier: 0,
    regex: FORWARD_SLASH,
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
    regex: ASTERISK,
    description: "Asterisk punctuation",
    composedFrom: ["ASTERISK_CHAR"],
    fixtures: {
      passes: [{ input: "*" }],
      fails: [
        { input: "+", reason: "plus" },
        { input: "×", reason: "multiplication sign" },
        { input: "", reason: "empty" },
      ],
    },
  },
  ASTERISK_CHAR: {
    name: "ASTERISK_CHAR",
    tier: 0,
    source: ASTERISK_CHAR,
    description: "Asterisk character (literal)",
    fixtures: {
      passes: [{ input: "*" }],
      fails: [
        { input: "+", reason: "plus" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  PLUS_CHAR: {
    name: "PLUS_CHAR",
    tier: 0,
    source: PLUS_CHAR,
    description: "Plus character (literal)",
    fixtures: {
      passes: [{ input: "+" }],
      fails: [
        { input: "*", reason: "asterisk" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  CARET_CHAR: {
    name: "CARET_CHAR",
    tier: 0,
    source: CARET_CHAR,
    description: "Caret character (literal)",
    fixtures: {
      passes: [{ input: "^" }],
      fails: [
        { input: "$", reason: "dollar sign" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  DOLLAR_CHAR: {
    name: "DOLLAR_CHAR",
    tier: 0,
    source: DOLLAR_CHAR,
    description: "Dollar sign character (literal)",
    fixtures: {
      passes: [{ input: "$" }],
      fails: [
        { input: "^", reason: "caret" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  TILDE_CHAR: {
    name: "TILDE_CHAR",
    tier: 0,
    source: TILDE_CHAR,
    description: "Tilde character (literal)",
    fixtures: {
      passes: [{ input: "~" }],
      fails: [
        { input: "-", reason: "hyphen" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  AMPERSAND_CHAR: {
    name: "AMPERSAND_CHAR",
    tier: 0,
    source: AMPERSAND_CHAR,
    description: "Ampersand character (literal)",
    fixtures: {
      passes: [{ input: "&" }],
      fails: [
        { input: "+", reason: "plus" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  EQUALS_CHAR: {
    name: "EQUALS_CHAR",
    tier: 0,
    source: EQUALS_CHAR,
    description: "Equals sign character (literal)",
    fixtures: {
      passes: [{ input: "=" }],
      fails: [
        { input: "-", reason: "hyphen" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  LESS_THAN_CHAR: {
    name: "LESS_THAN_CHAR",
    tier: 0,
    source: LESS_THAN_CHAR,
    description: "Less-than character (literal)",
    fixtures: {
      passes: [{ input: "<" }],
      fails: [
        { input: ">", reason: "greater-than" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  GREATER_THAN_CHAR: {
    name: "GREATER_THAN_CHAR",
    tier: 0,
    source: GREATER_THAN_CHAR,
    description: "Greater-than character (literal)",
    fixtures: {
      passes: [{ input: ">" }],
      fails: [
        { input: "<", reason: "less-than" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  COLON_CHAR: {
    name: "COLON_CHAR",
    tier: 0,
    source: COLON_CHAR,
    description: "Colon character (literal)",
    fixtures: {
      passes: [{ input: ":" }],
      fails: [
        { input: ";", reason: "semicolon" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  DOT_CHAR: {
    name: "DOT_CHAR",
    tier: 0,
    source: DOT_CHAR,
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
    source: POUND_CHAR,
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
    source: AT_CHAR,
    description: "At sign character (literal)",
    fixtures: {
      passes: [{ input: "@" }],
      fails: [
        { input: "#", reason: "hash" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  PIPE_CHAR: {
    name: "PIPE_CHAR",
    tier: 0,
    source: PIPE_CHAR,
    description: "Pipe character (literal)",
    fixtures: {
      passes: [{ input: "|" }],
      fails: [
        { input: "-", reason: "dash" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  PAREN_OPEN_CHAR: {
    name: "PAREN_OPEN_CHAR",
    tier: 0,
    source: PAREN_OPEN_CHAR,
    description: "Opening parenthesis character (literal)",
    fixtures: {
      passes: [{ input: "(" }],
      fails: [
        { input: ")", reason: "closing" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  PAREN_CLOSE_CHAR: {
    name: "PAREN_CLOSE_CHAR",
    tier: 0,
    source: PAREN_CLOSE_CHAR,
    description: "Closing parenthesis character (literal)",
    fixtures: {
      passes: [{ input: ")" }],
      fails: [
        { input: "(", reason: "opening" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  BRACKET_OPEN_CHAR: {
    name: "BRACKET_OPEN_CHAR",
    tier: 0,
    source: BRACKET_OPEN_CHAR,
    description: "Opening square bracket character (literal)",
    fixtures: {
      passes: [{ input: "[" }],
      fails: [
        { input: "]", reason: "closing" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  BRACKET_CLOSE_CHAR: {
    name: "BRACKET_CLOSE_CHAR",
    tier: 0,
    source: BRACKET_CLOSE_CHAR,
    description: "Closing square bracket character (literal)",
    fixtures: {
      passes: [{ input: "]" }],
      fails: [
        { input: "[", reason: "opening" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  QUOTE_SINGLE_CHAR: {
    name: "QUOTE_SINGLE_CHAR",
    tier: 0,
    source: QUOTE_SINGLE_CHAR,
    description: "Single quote character (literal)",
    fixtures: {
      passes: [{ input: "'" }],
      fails: [
        { input: '"', reason: "double quote" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  QUOTE_DOUBLE_CHAR: {
    name: "QUOTE_DOUBLE_CHAR",
    tier: 0,
    source: QUOTE_DOUBLE_CHAR,
    description: "Double quote character (literal)",
    fixtures: {
      passes: [{ input: '"' }],
      fails: [
        { input: "'", reason: "single quote" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  BACKTICK_CHAR: {
    name: "BACKTICK_CHAR",
    tier: 0,
    source: BACKTICK_CHAR,
    description: "Backtick character (literal)",
    fixtures: {
      passes: [{ input: "`" }],
      fails: [
        { input: "'", reason: "single quote" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  BRACE_OPEN_CHAR: {
    name: "BRACE_OPEN_CHAR",
    tier: 0,
    source: BRACE_OPEN_CHAR,
    description: "Opening brace character (literal)",
    fixtures: {
      passes: [{ input: "{" }],
      fails: [
        { input: "}", reason: "closing" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
  BRACE_CLOSE_CHAR: {
    name: "BRACE_CLOSE_CHAR",
    tier: 0,
    source: BRACE_CLOSE_CHAR,
    description: "Closing brace character (literal)",
    fixtures: {
      passes: [{ input: "}" }],
      fails: [
        { input: "{", reason: "opening" },
        { input: "a", reason: "letter, not the punctuation" },
      ],
    },
  },
};
