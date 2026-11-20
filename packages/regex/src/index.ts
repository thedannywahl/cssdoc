/**
 * @cssdoc/regex
 *
 * Type-safe, ArkRegex-based pattern library for cssdoc.
 * Centralizes CSS, grammar-driven, and cssdoc-specific regex patterns with modern named capture groups.
 *
 * ## Overview
 *
 * This package provides a unified library of regex patterns used throughout cssdoc:
 *
 * - **Tier 1 (W3C CSS)**: Standard CSS patterns from W3C formal grammar
 *   - Identifiers, keywords, colors, functions, properties, units
 * - **Tier 2 (CssDoc Grammar)**: Patterns from CssDoc.grammarkdown specification
 *   - Record names, modifiers, tags, structure references, cardinality
 * - **Tier 3 (cssdoc-Specific)**: Local implementation patterns
 *   - BEM conventions, ARIA attributes, configuration globbing
 *
 * ## Benefits
 *
 * - **Type Safety**: All patterns use named capture groups with TypeScript inference
 * - **IDE Completion**: Auto-complete shows all available capture groups
 * - **Single Source of Truth**: Each pattern defined once, used everywhere
 * - **Maintainability**: Patterns traceable to specs and documentation
 * - **Security**: ArkRegex prevents ReDoS vulnerabilities
 * - **Zero Runtime Overhead**: Types-only, compile-time inference only
 *
 * ## Usage
 *
 * ```typescript
 * import { CssPatterns, CssDocPatterns, ModifierPatterns } from "@cssdoc/regex";
 *
 * // Tier 1: W3C CSS patterns
 * const colorMatch = CssPatterns.CSS_HASH_COLOR.exec("#ffffff");
 * const color = colorMatch?.groups?.color; // "ffffff"
 *
 * // Tier 2: Grammar patterns
 * const tagMatch = CssDocPatterns.CSSDOC_TAG.exec("@component");
 * const tag = tagMatch?.groups?.tag; // "component"
 *
 * // Tier 3: cssdoc-specific patterns
 * const bemMatch = ModifierPatterns.BEM_MODIFIER.exec(".button--primary");
 * const { base, mod } = bemMatch?.groups ?? {}; // "button", "primary"
 * ```
 *
 * @module
 */

export { regex } from "arkregex";
export type { Regex } from "arkregex";

// Re-export all tier modules
export * as CssSpecPatterns from "./tiers/css-spec.js";
export * as CssDocGrammarPatterns from "./tiers/css-doc-grammar.js";
export * as CssdocLocalPatterns from "./tiers/cssdoc-local.js";

// Convenience re-exports: grouped by usage
export {
  // Tier 1: W3C CSS Spec patterns
  CSS_IDENTIFIER,
  CSS_NAME,
  CSS_NUMBER,
  CSS_PERCENTAGE,
  CSS_DIMENSION,
  CSS_HASH_COLOR,
  CSS_FUNCTION,
  CSS_KEYWORD,
  CSS_UNICODE_RANGE,
  CSS_PROPERTY_NAME,
} from "./tiers/css-spec.js";

export {
  // Tier 2: CssDoc Grammar patterns
  CSSDOC_IDENTIFIER,
  CSSDOC_RECORD_NAME,
  CSSDOC_MODIFIER_SUFFIX,
  CSSDOC_MODIFIER_CHAINED,
  CSSDOC_MODIFIER_ATTRIBUTE,
  CSSDOC_TAG,
  CSSDOC_TAG_ARG,
  CSSDOC_STRUCTURE_REF,
  CSSDOC_CARDINALITY,
  CSSDOC_CUSTOM_PROPERTY,
  CSSDOC_INLINE_REF,
} from "./tiers/css-doc-grammar.js";

export {
  // Tier 3: cssdoc-Specific patterns
  BEM_BLOCK,
  BEM_ELEMENT,
  BEM_MODIFIER,
  CLASS_REF,
  SINGLE_CLASS,
  ARIA_STATE,
  VAR_REFERENCE,
  GLOB_PATTERN,
  MODIFIER_CHAIN,
  ATTRIBUTE_SELECTOR,
  PSEUDO_CLASS,
  PSEUDO_ELEMENT,
  COMBINATOR,
  SCOPE_PRELUDE_BASE,
  RSCSS_VARIANT,
  RSCSS_COMPONENT,
  RSCSS_ELEMENT,
  RSCSS_HELPER,
} from "./tiers/cssdoc-local.js";

// Export type definitions
export type * from "./types.js";
