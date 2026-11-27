/**
 * Tier 1 Markdown-related patterns.
 *
 * @module
 */

import type { RawPatternDef, PatternResolver } from "../types.ts";

/** Markdown heading, fence, code span, and list marker pattern definitions. */
export const TIER_1_MARKDOWN_PATTERNS: Record<string, RawPatternDef> = {
  MARKDOWN_ATX_HEADING_PREFIX: {
    name: "MARKDOWN_ATX_HEADING_PREFIX",
    tier: 1,
    pattern: (resolve: PatternResolver) => String.raw`${resolve("POUND_CHAR")}{1,6}\s`,
    description: "One to six heading markers followed by whitespace",
    composedFrom: ["POUND_CHAR"],
    fixtures: {
      passes: [{ input: "# " }, { input: "### " }, { input: "######\t" }],
      fails: [
        { input: "#", reason: "missing whitespace" },
        { input: "#title", reason: "missing whitespace" },
        { input: "####### ", reason: "more than six markers" },
      ],
    },
  },
  MARKDOWN_BACKTICK_FENCE: {
    name: "MARKDOWN_BACKTICK_FENCE",
    tier: 1,
    pattern: (resolve: PatternResolver) => `${resolve("BACKTICK_CHAR")}{3}`,
    flags: "u",
    description: "Three backticks used as a Markdown fence marker, without line or block rules",
    composedFrom: ["BACKTICK_CHAR"],
    fixtures: {
      passes: [{ input: "```" }],
      fails: [
        { input: "``", reason: "fewer than three backticks" },
        { input: "~~~", reason: "tilde fence" },
      ],
    },
  },
  MARKDOWN_BACKTICK_FENCE_LINE_PREFIX: {
    name: "MARKDOWN_BACKTICK_FENCE_LINE_PREFIX",
    tier: 1,
    pattern: (resolve: PatternResolver) =>
      String.raw`(?:^|${resolve("LINE_FEED")})\s*${resolve("MARKDOWN_BACKTICK_FENCE")}`,
    flags: "u",
    description: "Three backticks after the start of a line and optional whitespace",
    composedFrom: ["LINE_FEED", "MARKDOWN_BACKTICK_FENCE"],
    fixtures: {
      passes: [{ input: "```" }, { input: "  ```" }, { input: "\n\t```" }],
      fails: [
        { input: "text ```", reason: "not at the start of a line" },
        { input: "~~~", reason: "tilde fence" },
      ],
    },
  },
  MARKDOWN_SINGLE_BACKTICK_CODE_SPAN: {
    name: "MARKDOWN_SINGLE_BACKTICK_CODE_SPAN",
    tier: 1,
    pattern: (resolve: PatternResolver) => {
      const backtick = resolve("BACKTICK_CHAR");
      return `(${backtick}[^${backtick}]*${backtick})`;
    },
    flags: "u",
    description: "Captured single-backtick-delimited span, including empty and multiline spans",
    composedFrom: ["BACKTICK_CHAR"],
    fixtures: {
      passes: [{ input: "`code`" }, { input: "``" }, { input: "`a\nb`" }],
      fails: [
        { input: "`unclosed", reason: "missing closing backtick" },
        { input: "`a`b`", reason: "extra backtick" },
      ],
    },
  },
  MARKDOWN_UNORDERED_LIST_MARKER: {
    name: "MARKDOWN_UNORDERED_LIST_MARKER",
    tier: 1,
    pattern: (resolve: PatternResolver) =>
      `[${resolve("DASH")}${resolve("ASTERISK_CHAR")}${resolve("PLUS_CHAR")}]`,
    flags: "u",
    description: "Unordered list marker character, without surrounding whitespace",
    composedFrom: ["DASH", "ASTERISK_CHAR", "PLUS_CHAR"],
    fixtures: {
      passes: [{ input: "-" }, { input: "*" }, { input: "+" }],
      fails: [
        { input: ">", reason: "blockquote marker" },
        { input: "1.", reason: "ordered marker" },
      ],
    },
  },
  MARKDOWN_ORDERED_LIST_MARKER: {
    name: "MARKDOWN_ORDERED_LIST_MARKER",
    tier: 1,
    pattern: (resolve: PatternResolver) => `${resolve("DIGIT")}+${resolve("DOT")}`,
    flags: "u",
    description: "One or more ASCII digits followed by a period, without surrounding whitespace",
    composedFrom: ["DIGIT", "DOT"],
    fixtures: {
      passes: [{ input: "1." }, { input: "00." }, { input: "123." }],
      fails: [
        { input: "1)", reason: "parenthesis delimiter" },
        { input: ".", reason: "missing digits" },
        { input: "١.", reason: "non-ASCII digit" },
      ],
    },
  },
};
