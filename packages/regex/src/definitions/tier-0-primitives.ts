/**
 * \@cssdoc/regex/definitions/tier-0-primitives
 * Tier 0 character class patterns
 * @module
 */

import type { RawPatternDef, PatternResolver } from "../types.ts";

/** Regex source matching a character with special meaning in a regular expression. */
export const REGEX_METACHARACTER_SOURCE: string = String.raw`[\\^$.|?*+()[\]{}]`;

/** Primitive character and punctuation pattern definitions. */
export const TIER_0_PRIMITIVES_PATTERNS: Record<string, RawPatternDef> = {
  REGEX_METACHARACTER: {
    name: "REGEX_METACHARACTER",
    tier: 0,
    source: REGEX_METACHARACTER_SOURCE,
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
      const underscore = resolve("UNDERSCORE_CHAR");
      return `[${alpha}${digit}\\-${underscore}]`;
    },
    description: "Alphanumeric with underscore and hyphen",
    composedFrom: ["ALPHA", "DIGIT", "UNDERSCORE_CHAR"],
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
  UNDERSCORE_CHAR: {
    name: "UNDERSCORE_CHAR",
    tier: 0,
    source: "_",
    description: "Underscore character (literal)",
    fixtures: {
      passes: [{ input: "_" }],
      fails: [{ input: "-", reason: "hyphen" }],
    },
  },
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
  FORWARD_SLASH_CHAR: {
    name: "FORWARD_SLASH_CHAR",
    tier: 0,
    source: "/",
    description: "Forward slash character (literal)",
    fixtures: { passes: [{ input: "/" }], fails: [{ input: "\\", reason: "backslash" }] },
  },
  BACKSLASH_CHAR: {
    name: "BACKSLASH_CHAR",
    tier: 0,
    source: "\\",
    description: "Backslash character (literal)",
    fixtures: { passes: [{ input: "\\" }], fails: [{ input: "/", reason: "forward slash" }] },
  },
  DOC_COMMENT_START_TEXT: {
    name: "DOC_COMMENT_START_TEXT",
    tier: 0,
    pattern: (resolve: PatternResolver) =>
      `${resolve("FORWARD_SLASH_CHAR")}${resolve("ASTERISK_CHAR")}${resolve("ASTERISK_CHAR")}`,
    description: "CSS doc-comment opener as literal text",
    composedFrom: ["FORWARD_SLASH_CHAR", "ASTERISK_CHAR"],
    fixtures: { passes: [{ input: "/**" }], fails: [{ input: "/*", reason: "ordinary comment" }] },
  },
  COMMENT_END_TEXT: {
    name: "COMMENT_END_TEXT",
    tier: 0,
    pattern: (resolve: PatternResolver) =>
      `${resolve("ASTERISK_CHAR")}${resolve("FORWARD_SLASH_CHAR")}`,
    description: "CSS block comment closer as literal text",
    composedFrom: ["ASTERISK_CHAR", "FORWARD_SLASH_CHAR"],
    fixtures: { passes: [{ input: "*/" }], fails: [{ input: "/*", reason: "comment opener" }] },
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
    pattern: (resolve: PatternResolver) => `\\${resolve("ASTERISK_CHAR")}`,
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
    source: "*",
    description: "Asterisk character (literal)",
    fixtures: { passes: [{ input: "*" }], fails: [{ input: "+", reason: "plus" }] },
  },
  PLUS_CHAR: {
    name: "PLUS_CHAR",
    tier: 0,
    source: "+",
    description: "Plus character (literal)",
    fixtures: { passes: [{ input: "+" }], fails: [{ input: "*", reason: "asterisk" }] },
  },
  CARET_CHAR: {
    name: "CARET_CHAR",
    tier: 0,
    source: "^",
    description: "Caret character (literal)",
    fixtures: { passes: [{ input: "^" }], fails: [{ input: "$", reason: "dollar sign" }] },
  },
  DOLLAR_CHAR: {
    name: "DOLLAR_CHAR",
    tier: 0,
    source: "$",
    description: "Dollar sign character (literal)",
    fixtures: { passes: [{ input: "$" }], fails: [{ input: "^", reason: "caret" }] },
  },
  TILDE_CHAR: {
    name: "TILDE_CHAR",
    tier: 0,
    source: "~",
    description: "Tilde character (literal)",
    fixtures: { passes: [{ input: "~" }], fails: [{ input: "-", reason: "hyphen" }] },
  },
  AMPERSAND_CHAR: {
    name: "AMPERSAND_CHAR",
    tier: 0,
    source: "&",
    description: "Ampersand character (literal)",
    fixtures: { passes: [{ input: "&" }], fails: [{ input: "+", reason: "plus" }] },
  },
  EQUALS_CHAR: {
    name: "EQUALS_CHAR",
    tier: 0,
    source: "=",
    description: "Equals sign character (literal)",
    fixtures: { passes: [{ input: "=" }], fails: [{ input: "-", reason: "hyphen" }] },
  },
  LESS_THAN_CHAR: {
    name: "LESS_THAN_CHAR",
    tier: 0,
    source: "<",
    description: "Less-than character (literal)",
    fixtures: { passes: [{ input: "<" }], fails: [{ input: ">", reason: "greater-than" }] },
  },
  GREATER_THAN_CHAR: {
    name: "GREATER_THAN_CHAR",
    tier: 0,
    source: ">",
    description: "Greater-than character (literal)",
    fixtures: { passes: [{ input: ">" }], fails: [{ input: "<", reason: "less-than" }] },
  },
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
  BACKTICK_CHAR: {
    name: "BACKTICK_CHAR",
    tier: 0,
    source: "`",
    description: "Backtick character (literal)",
    fixtures: {
      passes: [{ input: "`" }],
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
};
