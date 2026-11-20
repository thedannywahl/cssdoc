/**
 * Type Definitions for @cssdoc/regex
 *
 * Common types and interfaces used across pattern modules.
 *
 * @module
 */

import type { Regex } from "arkregex";

/**
 * Capture groups for CSS identifier patterns.
 */
export interface CssIdentifierCapture {
  identifier: string;
  chars?: string;
}

/**
 * Capture groups for CSS number patterns.
 */
export interface CssNumberCapture {
  number: string;
  integer: string;
  decimal?: string;
}

/**
 * Capture groups for CSS dimension patterns (number + unit).
 */
export interface CssDimensionCapture {
  value: string;
  unit: string;
}

/**
 * Capture groups for BEM patterns.
 */
export interface BemCapture {
  base?: string;
  block?: string;
  element?: string;
  mod?: string;
  className?: string;
  class?: string;
}

/**
 * Capture groups for modifier patterns.
 */
export interface ModifierCapture {
  name?: string;
  prop?: string;
  value?: string;
  quote?: string;
}

/**
 * Capture groups for tag patterns.
 */
export interface TagCapture {
  tag: string;
  arg?: string;
}

/**
 * Capture groups for attribute patterns.
 */
export interface AttributeCapture {
  attr: string;
  quote?: string;
  value?: string;
}

/**
 * Capture groups for pseudo-class/pseudo-element patterns.
 */
export interface PseudoCapture {
  name: string;
  arg?: string;
}

/**
 * Capture groups for combinator patterns.
 */
export interface CombinatorCapture {
  comb?: string;
  desc?: string;
}

/**
 * Capture groups for cardinality patterns.
 */
export interface CardinalityCapture {
  type?: "max" | "one-or-more-max";
  value?: string;
  keyword?: "optional" | "one-or-more" | "many";
}

/**
 * Map of pattern names to their compile-time inferred types.
 * This helps IDEs provide accurate completion and type checking.
 */
export type PatternTypes = {
  // CSS Spec (Tier 1)
  CSS_IDENTIFIER: Regex;
  CSS_NAME: Regex;
  CSS_NUMBER: Regex;
  CSS_PERCENTAGE: Regex;
  CSS_DIMENSION: Regex;
  CSS_HASH_COLOR: Regex;
  CSS_FUNCTION: Regex;
  CSS_KEYWORD: Regex;
  CSS_UNICODE_RANGE: Regex;
  CSS_PROPERTY_NAME: Regex;

  // CssDoc Grammar (Tier 2)
  CSSDOC_IDENTIFIER: Regex;
  CSSDOC_RECORD_NAME: Regex;
  CSSDOC_MODIFIER_SUFFIX: Regex;
  CSSDOC_MODIFIER_CHAINED: Regex;
  CSSDOC_MODIFIER_ATTRIBUTE: Regex;
  CSSDOC_TAG: Regex;
  CSSDOC_TAG_ARG: Regex;
  CSSDOC_STRUCTURE_REF: Regex;
  CSSDOC_CARDINALITY: Regex;
  CSSDOC_CUSTOM_PROPERTY: Regex;
  CSSDOC_INLINE_REF: Regex;

  // cssdoc-Specific (Tier 3)
  BEM_BLOCK: Regex;
  BEM_ELEMENT: Regex;
  BEM_MODIFIER: Regex;
  CLASS_REF: Regex;
  SINGLE_CLASS: Regex;
  ARIA_STATE: Regex;
  VAR_REFERENCE: Regex;
  GLOB_PATTERN: Regex;
  MODIFIER_CHAIN: Regex;
  ATTRIBUTE_SELECTOR: Regex;
  PSEUDO_CLASS: Regex;
  PSEUDO_ELEMENT: Regex;
  COMBINATOR: Regex;
  SCOPE_PRELUDE_BASE: Regex;
  RSCSS_VARIANT: Regex;
  RSCSS_COMPONENT: Regex;
  RSCSS_ELEMENT: Regex;
  RSCSS_HELPER: Regex;
};
