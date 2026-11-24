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

// New pattern registry (single source of truth) with lazy-evaluated exports
export {
  PATTERNS,
  buildPattern,
  getPatternString,
  getPatternMetadata,
  getPatternsByTier,
  getPatternsByGrammarRule,
  getPatternsByStatus,
  getPatternsComposingOf,
  // All pattern exports (Tier 0-2) - generated via getters
  ALPHA,
  alpha,
  ALPHA_LOWER,
  alphaLower,
  ALPHA_UPPER,
  alphaUpper,
  ALPHANUMERIC,
  alphanumeric,
  ALPHANUMERIC_EXTENDED,
  alphanumericExtended,
  DIGIT,
  digit,
  DASH,
  dash,
  DOUBLE_DASH,
  doubleDash,
  DOT,
  dot,
  SPACE_TAB,
  spaceTab,
  BRACE_OPEN,
  braceOpen,
  BRACE_CLOSE,
  braceClose,
  PAREN_OPEN,
  parenOpen,
  PAREN_CLOSE,
  parenClose,
  COLON,
  colon,
  QUOTE,
  quote,
  HEX_DIGIT,
  hexDigit,
  HEX_DIGIT_OR_WILDCARD,
  hexDigitOrWildcard,
  CSS_IDENTIFIER_START,
  cssIdentifierStart,
  CSS_IDENTIFIER_START_WITH_DASH,
  cssIdentifierStartWithDash,
  CSS_IDENTIFIER_CONT,
  cssIdentifierCont,
  CSS_IDENTIFIER_CONT_NO_DASH,
  cssIdentifierContNoDash,
  WORD_BOUNDARY,
  wordBoundary,
  CSS_IDENTIFIER,
  cssIdentifier,
  CSS_NAME,
  cssName,
  CSS_NUMBER,
  cssNumber,
  CSS_PERCENTAGE,
  cssPercentage,
  CSS_DIMENSION,
  cssDimension,
  CSS_HASH_COLOR,
  cssHashColor,
  CSS_FUNCTION,
  cssFunction,
  CSS_KEYWORD,
  cssKeyword,
  CSS_UNICODE_RANGE,
  cssUnicodeRange,
  CSS_PROPERTY_NAME,
  cssPropertyName,
  CSSDOC_IDENTIFIER_PART,
  cssdocIdentifierPart,
  CSSDOC_IDENTIFIER,
  cssdocIdentifier,
  CSSDOC_RECORD_NAME,
  cssdocRecordName,
  CSSDOC_MODIFIER_SUFFIX,
  cssdocModifierSuffix,
  CSSDOC_MODIFIER_CHAINED,
  cssdocModifierChained,
  CSSDOC_MODIFIER_ATTRIBUTE,
  cssdocModifierAttribute,
  CSSDOC_TAG,
  cssdocTag,
  CSSDOC_TAG_ARG,
  cssdocTagArg,
  CSSDOC_STRUCTURE_REF,
  cssdocStructureRef,
  CSSDOC_CARDINALITY,
  cssdocCardinality,
  CSSDOC_CUSTOM_PROPERTY,
  cssdocCustomProperty,
  CSSDOC_INLINE_REF,
  cssdocInlineRef,
  CSSDOC_REF_NUM,
  cssdocRefNum,
  CSSDOC_STATE_VALUE,
  cssdocStateValue,
  CSSDOC_SELECTOR_VALUE,
  cssdocSelectorValue,
  CSSDOC_STRUCTURE_CARDINALITY,
  cssdocStructureCardinality,
  CSSDOC_SLOT_DECL,
  cssdocSlotDecl,
  CSSDOC_STRUCTURE_CLASS,
  cssdocStructureClass,
  CSSDOC_STRUCTURE_TAG,
  cssdocStructureTag,
  CSSDOC_STRUCTURE_COMPONENT,
  cssdocStructureComponent,
  CSSDOC_STRUCTURE_BRACE,
  cssdocStructureBrace,
  CSSDOC_INLINE_TAG_PATTERN,
  cssdocInlineTagPattern,
  CSSDOC_RECORD_TAG_PATTERN,
  cssdocRecordTagPattern,
  CSSDOC_MODIFIER_TAG_PATTERN,
  cssdocModifierTagPattern,
  CSSDOC_PART_TAG_PATTERN,
  cssdocPartTagPattern,
  CSSDOC_PROPERTY_TAG_PATTERN,
  cssdocPropertyTagPattern,
  CSSDOC_REF_TAG_PATTERN,
  cssdocRefTagPattern,
} from "./patterns.js";
export type { PatternDef } from "./patterns.js";

// Legacy registry (deprecated, kept for now during migration)
export {
  PATTERN_REGISTRY,
  getPatternMetadata as getPatternMetadataLegacy,
  getAllPatterns,
  getPatternsByGrammarRule as getPatternsByGrammarRuleLegacy,
  getPatternsByTier as getPatternsByTierLegacy,
  getPatternsByStatus as getPatternsByStatusLegacy,
  getPatternsBySource,
} from "./registry.js";
export type { PatternMetadata } from "./registry.js";

// Utilities for working with any tier of patterns
export { toRegExp } from "./lib.js";

// Re-export all tier modules (kept for backwards compatibility)
export * as CharacterClassPatterns from "./tiers/character-classes.js";
export * as CssSpecPatterns from "./tiers/css-spec.js";
export * as CssDocGrammarPatterns from "./tiers/css-doc-grammar.js";
export * as CssdocTokenPartsPatterns from "./tiers/cssdoc-token-parts.js";
export * as CssdocTagsPatterns from "./tiers/cssdoc-tags.js";
export * as CssdocLocalPatterns from "./tiers/cssdoc-local.js";
export * as CssdocBuildingBlocksPatterns from "./tiers/cssdoc-building-blocks.js";

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

export {
  // Tier 3c: Structure-specific building blocks (for syntax highlighters)
  BEM_BLOCK_PATTERN,
  BEM_ELEMENT_PATTERN,
  BEM_MODIFIER_PATTERN,
  RSCSS_VARIANT_PATTERN,
  RSCSS_COMPONENT_PATTERN,
  RSCSS_ELEMENT_PATTERN,
  RSCSS_HELPER_PATTERN,
  STATE_PREFIX_PATTERN,
  // Convenience string exports for structure syntax highlighting
  bemBlockSelector,
  bemElementSeparator,
  bemElementPart,
  bemModifierSeparator,
  bemModifierPart,
  rscssVariantPrefix,
  rscssVariantName,
  rscssComponentMinPattern,
  rscssElementPrefix,
  rscssElementName,
  rscssHelperPrefix,
  rscssHelperName,
  statePrefixes,
  stateSeparator,
  stateName,
  classChainPattern,
  varFunctionStart,
  varFunctionEnd,
  attributeSelectorOpen,
  attributeSelectorClose,
  pseudoClassPrefix,
  pseudoElementPrefix,
  selectorFunctionOpen,
  selectorFunctionClose,
  partKeyword,
  slottedKeyword,
  hostContextKeyword,
  stateKeyword,
  scopePreludeOpen,
  scopePreludeClose,
  structureClassSelector,
  cardinalityModifier,
  slotDeclaration,
  structureTagKeyword,
  structureComponentTag,
  structureBraceOpen,
  structureBraceClose,
  structureIdentifier,
} from "./tiers/cssdoc-building-blocks.js";

// Export type definitions
export type * from "./types.js";
