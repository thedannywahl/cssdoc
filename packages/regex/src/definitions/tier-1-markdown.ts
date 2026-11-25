/**
 * Tier 1 Markdown-related patterns.
 *
 * @module
 */

import type { RawPatternDef, PatternResolver } from "../types.ts";

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
};
