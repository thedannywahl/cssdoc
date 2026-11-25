/**
 * Tier 1 JSX-related host-scanning patterns.
 *
 * @module
 */

import type { RawPatternDef, PatternResolver } from "../types.ts";

/** JSX tag and class attribute scanning pattern definitions. */
export const TIER_1_JSX_PATTERNS: Record<string, RawPatternDef> = {
  HTML_LIKE_DOTTED_TAG_NAME: {
    name: "HTML_LIKE_DOTTED_TAG_NAME",
    tier: 1,
    pattern: (resolve: PatternResolver) =>
      String.raw`${resolve("ALPHA")}[\w${resolve("DOT_CHAR")}${resolve("DASH")}]*`,
    flags: "u",
    description: "ASCII host-tag name heuristic that also accepts dots, as in JSX member names",
    composedFrom: ["ALPHA", "DOT_CHAR", "DASH"],
    fixtures: {
      passes: [{ input: "div" }, { input: "Button.Root" }, { input: "x_1-item" }],
      fails: [
        { input: "1div", reason: "starts with a digit" },
        { input: "élément", reason: "non-ASCII initial" },
      ],
    },
  },
  HTML_LIKE_CLASS_ATTRIBUTE_NAME: {
    name: "HTML_LIKE_CLASS_ATTRIBUTE_NAME",
    tier: 1,
    source: "(?:className|class)",
    flags: "u",
    description: "HTML class or JSX className attribute name",
    fixtures: {
      passes: [{ input: "class" }, { input: "className" }],
      fails: [
        { input: "classname", reason: "case differs" },
        { input: "class:list", reason: "directive" },
      ],
    },
  },
};
