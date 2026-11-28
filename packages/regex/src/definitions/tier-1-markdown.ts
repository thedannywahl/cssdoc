/**
 * Tier 1 Markdown-related patterns.
 *
 * @module
 */

import type { PatternDefinition } from "../types.ts";

/** Literal three-backtick fence marker. */
export const MARKDOWN_BACKTICK_FENCE_TEXT: string = "```";

/** One to six heading markers followed by whitespace */
export const MARKDOWN_ATX_HEADING_PREFIX: RegExp = /#{1,6}\s/;
/** Three backticks used as a Markdown fence marker, without line or block rules */
export const MARKDOWN_BACKTICK_FENCE: RegExp = /`{3}/u;
/** Three backticks after the start of a line and optional whitespace */
export const MARKDOWN_BACKTICK_FENCE_LINE_PREFIX: RegExp = /(?:^|\n)\s*`{3}/u;
/** Captured single-backtick-delimited span, including empty and multiline spans */
export const MARKDOWN_SINGLE_BACKTICK_CODE_SPAN: RegExp = /(`[^`]*`)/u;
/** Unordered list marker character, without surrounding whitespace */
export const MARKDOWN_UNORDERED_LIST_MARKER: RegExp = /[-*+]/u;
/** One or more ASCII digits followed by a period, without surrounding whitespace */
export const MARKDOWN_ORDERED_LIST_MARKER: RegExp = /\d+\./u;

/** Markdown heading, fence, code span, and list marker pattern definitions. */
export const TIER_1_MARKDOWN_PATTERNS: Record<string, PatternDefinition> = {
  MARKDOWN_ATX_HEADING_PREFIX: {
    name: "MARKDOWN_ATX_HEADING_PREFIX",
    tier: 1,
    regex: MARKDOWN_ATX_HEADING_PREFIX,
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
    regex: MARKDOWN_BACKTICK_FENCE,

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
    regex: MARKDOWN_BACKTICK_FENCE_LINE_PREFIX,

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
    regex: MARKDOWN_SINGLE_BACKTICK_CODE_SPAN,

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
    regex: MARKDOWN_UNORDERED_LIST_MARKER,

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
    regex: MARKDOWN_ORDERED_LIST_MARKER,

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
