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
 * - **Tier 0 (Character Classes)**: Generic character class patterns
 *   - Alphabetic, alphanumeric, digits, punctuation, whitespace
 * - **Tier 1 (W3C CSS)**: Standard CSS patterns from W3C formal grammar
 *   - Identifiers, keywords, colors, functions, properties, units
 * - **Tier 2 (CssDoc Grammar)**: Patterns from CssDoc.grammarkdown specification
 *   - Record names, modifiers, tags, structure references, cardinality
 * - **Tier 3 (cssdoc-Specific)**: Local implementation patterns
 *   - Token parts and tag tokenizers, BEM conventions, ARIA attributes, configuration globbing
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

// Utilities for working with any tier of patterns
export { toRegExp } from "./lib.js";

// Re-export all tier modules
export * as CharacterClassPatterns from "./tiers/character-classes.js";
export * as CssSpecPatterns from "./tiers/css-spec.js";
export * as CssDocGrammarPatterns from "./tiers/css-doc-grammar.js";
export * as CssdocTokenPartsPatterns from "./tiers/cssdoc-token-parts.js";
export * as CssdocTagsPatterns from "./tiers/cssdoc-tags.js";
export * as CssdocLocalPatterns from "./tiers/cssdoc-local.js";

// Convenience re-exports: grouped by usage
export {
  // Tier 0: Character Class patterns
  ALPHA,
  ALPHA_LOWER,
  ALPHA_UPPER,
  ALPHANUMERIC,
  ALPHANUMERIC_EXTENDED,
  DIGIT,
  DASH,
  DOUBLE_DASH,
  DOT,
  SPACE_TAB,
  BRACE_OPEN,
  BRACE_CLOSE,
  PAREN_OPEN,
  PAREN_CLOSE,
  COLON,
  CSS_IDENTIFIER_START,
  CSS_IDENTIFIER_CONT,
  CSS_IDENTIFIER_CONT_NO_DASH,
  WORD_BOUNDARY,
  // Convenience string exports for use in template literals
  alpha,
  alphaLower,
  alphaUpper,
  alphanumeric,
  alphanumericExtended,
  digit,
  dash,
  doubleDash,
  dot,
  spaceTab,
  braceOpen,
  braceClose,
  parenOpen,
  parenClose,
  colon,
  cssIdentifierStart,
  cssIdentifierCont,
  cssIdentifierContNoDash,
  wordBoundary,
} from "./tiers/character-classes.js";

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
  // Convenience string exports for use in template literals
  cssIdentifier,
  cssName,
  cssNumber,
  cssPercentage,
  cssDimension,
  cssHashColor,
  cssFunction,
  cssKeyword,
  cssUnicodeRange,
  cssPropertyName,
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
  CSSDOC_REF_NUM,
  CSSDOC_STATE_VALUE,
  CSSDOC_SELECTOR_VALUE,
  CSSDOC_STRUCTURE_CARDINALITY,
  CSSDOC_SLOT_DECL,
  CSSDOC_STRUCTURE_CLASS,
  CSSDOC_STRUCTURE_TAG,
  CSSDOC_STRUCTURE_COMPONENT,
  CSSDOC_STRUCTURE_BRACE,
  CSSDOC_INLINE_TAG_PATTERN,
  CSSDOC_RECORD_TAG_PATTERN,
  CSSDOC_MODIFIER_TAG_PATTERN,
  CSSDOC_PART_TAG_PATTERN,
  CSSDOC_PROPERTY_TAG_PATTERN,
  CSSDOC_REF_TAG_PATTERN,
  // Convenience string exports for use in template literals
  cssdocIdentifier,
  cssdocRecordName,
  cssdocModifierSuffix,
  cssdocModifierChained,
  cssdocModifierAttribute,
  cssdocTag,
  cssdocTagArg,
  cssdocStructureRef,
  cssdocCardinality,
  cssdocCustomProperty,
  cssdocInlineRef,
  cssdocRefNum,
  cssdocStateValue,
  cssdocSelectorValue,
  cssdocStructureCardinality,
  cssdocSlotDecl,
  cssdocStructureClass,
  cssdocStructureTag,
  cssdocStructureComponent,
  cssdocStructureBrace,
  cssdocInlineTagPattern,
  cssdocRecordTagPattern,
  cssdocModifierTagPattern,
  cssdocPartTagPattern,
  cssdocPropertyTagPattern,
  cssdocRefTagPattern,
} from "./tiers/css-doc-grammar.js";

export {
  // Tier 3a: CssDoc Token Parts (atomic patterns for composing tokenizers)
  TOKEN_WHITESPACE,
  TOKEN_IDENTIFIER,
  TOKEN_QUALIFIED_IDENTIFIER,
  TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL,
  TOKEN_MODIFIER_NAME,
  TOKEN_MODIFIER_NAME_OPTIONAL,
  TOKEN_CLASS_SELECTOR,
  TOKEN_CLASS_SELECTOR_OPTIONAL,
  TOKEN_CUSTOM_PROPERTY,
  TOKEN_CUSTOM_PROPERTY_OPTIONAL,
  TOKEN_REF_NUMBER,
  TOKEN_REF_NUMBER_OPTIONAL,
  TOKEN_PSEUDO_CLASS,
  TOKEN_PSEUDO_CLASS_OPTIONAL,
  TOKEN_INLINE_CONTENT,
  // Convenience string exports for use in template literals
  tokenWhitespace,
  tokenIdentifier,
  tokenQualifiedIdentifier,
  tokenQualifiedIdentifierOptional,
  tokenModifierName,
  tokenModifierNameOptional,
  tokenClassSelector,
  tokenClassSelectorOptional,
  tokenCustomProperty,
  tokenCustomPropertyOptional,
  tokenRefNumber,
  tokenRefNumberOptional,
  tokenPseudoClass,
  tokenPseudoClassOptional,
  tokenInlineContent,
} from "./tiers/cssdoc-token-parts.js";

export {
  // Tier 3b: CssDoc Tag Tokenizer patterns (for syntax highlighters)
  CSSDOC_INLINE_TAG_TOKENIZER,
  CSSDOC_RECORD_TAG_TOKENIZER,
  CSSDOC_MODIFIER_TAG_TOKENIZER,
  CSSDOC_PART_TAG_TOKENIZER,
  CSSDOC_PROPERTY_TAG_TOKENIZER,
  CSSDOC_REF_TAG_TOKENIZER,
  CSSDOC_STATE_TAG_TOKENIZER,
  CSSDOC_STRUCTURE_COMPONENT_TAG_TOKENIZER,
  // Convenience string exports for use in template literals
  cssdocInlineTagTokenizer,
  cssdocRecordTagTokenizer,
  cssdocModifierTagTokenizer,
  cssdocPartTagTokenizer,
  cssdocPropertyTagTokenizer,
  cssdocRefTagTokenizer,
  cssdocStateTagTokenizer,
  cssdocStructureComponentTagTokenizer,
} from "./tiers/cssdoc-tags.js";

export {
  // Tier 4: cssdoc-Specific patterns
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
  // Convenience string exports for use in template literals
  bemBlock,
  bemElement,
  bemModifier,
  classRef,
  singleClass,
  ariaState,
  varReference,
  globPattern,
  modifierChain,
  attributeSelector,
  pseudoClass,
  pseudoElement,
  combinator,
  scopePreludeBase,
  rscssVariant,
  rscssComponent,
  rscssElement,
  rscssHelper,
} from "./tiers/cssdoc-local.js";

// Export type definitions
export type * from "./types.js";
