/**
 * \@cssdoc/regex/definitions/patterns
 *
 * Unified Pattern Definitions — Single source of truth for all regex patterns.
 * Each pattern is authored once as a native regex or literal syntax primitive.
 * Patterns are organized by tier.
 *
 * @module
 */

import type { UnifiedPatternDef, PatternDefinition } from "../types.ts";
import { TIER_0_PRIMITIVES_PATTERNS } from "./tier-0-primitives.ts";
import { TIER_1_COMMON_PATTERNS } from "./tier-1-common.ts";
import { TIER_1_CSS_PATTERNS } from "./tier-1-css.ts";
import { TIER_1_HTML_PATTERNS } from "./tier-1-html.ts";
import { TIER_1_JAVASCRIPT_PATTERNS } from "./tier-1-javascript.ts";
import { TIER_1_JSX_PATTERNS } from "./tier-1-jsx.ts";
import { TIER_1_MARKDOWN_PATTERNS } from "./tier-1-markdown.ts";
import { TIER_2_CSSDOC_GRAMMAR_PATTERNS } from "./tier-2-cssdoc-grammar.ts";
import { TIER_3_CSSDOC_TOKENS_PATTERNS } from "./tier-3-cssdoc-tokens.ts";

/**
 * Complete unified pattern definitions.
 * Sources and flags come from the canonical native declarations.
 */
export const PATTERN_DEFINITIONS: Record<string, UnifiedPatternDef> = (() => {
  // Keep the public registry's existing iteration order across the split.
  const { FILE_EXTENSION, ...commonPatterns } = TIER_1_COMMON_PATTERNS;
  const definitions: Record<string, PatternDefinition> = {
    ...TIER_0_PRIMITIVES_PATTERNS,
    FILE_EXTENSION,
    ...TIER_1_CSS_PATTERNS,
    ...commonPatterns,
    ...TIER_1_HTML_PATTERNS,
    ...TIER_1_JAVASCRIPT_PATTERNS,
    ...TIER_1_JSX_PATTERNS,
    ...TIER_1_MARKDOWN_PATTERNS,
    ...TIER_2_CSSDOC_GRAMMAR_PATTERNS,
    ...TIER_3_CSSDOC_TOKENS_PATTERNS,
  };

  const result: Record<string, UnifiedPatternDef> = {};
  for (const [name, def] of Object.entries(definitions)) {
    result[name] = {
      ...def,
      name,
      source: def.regex ? def.regex.source : def.source,
      ...(def.regex?.flags ? { flags: def.regex.flags } : {}),
    };
  }

  return result;
})();
