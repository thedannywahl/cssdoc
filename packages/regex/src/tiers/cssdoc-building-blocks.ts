/**
 * Tier 3: cssdoc Building Blocks
 *
 * Reusable patterns for constructing cssdoc-specific semantics.
 * These patterns combine Tier 1 and Tier 2 CSS patterns with Tier 0 character classes
 * to create building blocks that Tier 4 patterns compose into complete patterns with
 * full capture group semantics.
 *
 * Key distinction from Tier 4: These patterns are designed for reuse in multiple
 * contexts and may not have complete capture groups or full semantic meaning on their own.
 *
 * Organization:
 * - Selector conventions: BEM, RSCSS, State prefixes
 * - Structure syntax: Class selectors, cardinality modifiers, slot declarations, braces
 * - Custom properties and functions
 * - Pseudo-elements and pseudo-classes
 *
 * @module
 */

import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import {
  alpha,
  alphaLower,
  alphanumericExtended,
  braceClose,
  braceOpen,
  colon,
  dash,
  digit,
  dot,
} from "./character-classes.js";
import { cssIdentifierPattern, cssNamePattern } from "./css-spec.js";

// ============================================================================
// TIER 3 BUILDING BLOCK STRINGS
// ============================================================================

/**
 * BEM Block Selector
 * Matches a single CSS class that serves as a component block.
 * Pattern: `.block-name`
 * Used as a building block for component identification.
 *
 * @example
 * "button" or "my-component" (without the dot)
 */
export const bemBlockSelector: string = `${dot}(?<block>${cssIdentifierPattern})`;

/**
 * BEM Element Separator
 * The double underscore that separates block from element.
 */
export const bemElementSeparator: string = `__`;

/**
 * BEM Element Part
 * Pattern for the element part after `__`.
 * Matches valid identifiers suitable for element names.
 *
 * @example
 * "icon" or "close-button"
 */
export const bemElementPart: string = `(?<element>${cssIdentifierPattern})`;

/**
 * BEM Modifier Separator
 * The double dash that separates base from modifier.
 */
export const bemModifierSeparator: string = `--`;

/**
 * BEM Modifier Part
 * Pattern for the modifier part after `--`.
 * Matches valid identifiers suitable for modifier names.
 *
 * @example
 * "primary" or "large-active"
 */
export const bemModifierPart: string = `(?<mod>${cssIdentifierPattern})`;

/**
 * RSCSS Variant Prefix
 * The leading dash that marks RSCSS-style variants.
 */
export const rscssVariantPrefix: string = `${dot}${dash}`;

/**
 * RSCSS Variant Name
 * Pattern for RSCSS variant names (lowercase start).
 * Matches identifier starting with lowercase letter.
 *
 * @example
 * "wide" or "disabled"
 */
export const rscssVariantName: string = `(?<name>[a-z]${cssNamePattern})`;

/**
 * RSCSS Component Minimum Pattern
 * Pattern for multi-word component names (at least 2 hyphen-separated parts).
 * Matches component names like "like-button", "article-card".
 *
 * @example
 * "like-button" or "search-form"
 */
export const rscssComponentMinPattern: string = `[a-z]+${dash}[a-z]${cssNamePattern}`;

/**
 * RSCSS Element Prefix
 * The child combinator that precedes RSCSS element selectors.
 */
export const rscssElementPrefix: string = `>\\s*${dot}`;

/**
 * RSCSS Element Name
 * Pattern for RSCSS element names (single word, lowercase).
 * Matches simple alphanumeric identifiers without hyphens.
 *
 * @example
 * "title" or "avatar"
 */
export const rscssElementName: string = `(?<element>[a-z]+)`;

/**
 * RSCSS Helper Prefix
 * The underscore that marks RSCSS utility/helper classes.
 */
export const rscssHelperPrefix: string = `${dot}_`;

/**
 * RSCSS Helper Name
 * Pattern for RSCSS helper/utility names.
 * Matches identifier starting with lowercase letter.
 *
 * @example
 * "unmargin" or "pull-left"
 */
export const rscssHelperName: string = `(?<name>[a-z]${cssNamePattern})`;

/**
 * State Prefix List
 * Common state prefixes used in various CSS naming conventions.
 */
export const statePrefixes: string = `(?<prefix>is|has|can|should|was)`;

/**
 * State Separator
 * Dash separating prefix from state name.
 */
export const stateSeparator: string = `${dash}`;

/**
 * State Name
 * Pattern for state name after prefix.
 * Matches valid CSS identifier.
 *
 * @example
 * "open" or "disabled"
 */
export const stateName: string = `(?<name>${cssIdentifierPattern})`;

/**
 * Class Chain Pattern (Base and Modifiers)
 * Repeating pattern for modifier classes chained to a base.
 * Pattern: `.class-name` repeated 1+ times
 *
 * @example
 * ".-active.-size-lg"
 */
export const classChainPattern: string = `(?:\\${dot}[\\w-]+)+`;

/**
 * Custom Property Reference Function
 * The `var()` function that references CSS custom properties.
 * Pattern: `var(` prefix before property name.
 */
export const varFunctionStart: string = `var\\(\\s*`;

/**
 * Custom Property Reference End
 * Closing pattern for var() function.
 */
export const varFunctionEnd: string = ``;

/**
 * Attribute Selector Wrapper
 * Opening bracket for attribute selectors.
 */
export const attributeSelectorOpen: string = `\\[\\s*`;

/**
 * Attribute Selector Close
 * Closing bracket for attribute selectors.
 */
export const attributeSelectorClose: string = `\\]`;

/**
 * Pseudo-Class Prefix
 * Single colon that marks pseudo-classes.
 */
export const pseudoClassPrefix: string = `:`;

/**
 * Pseudo-Element Prefix
 * Double colon (or single for compatibility) that marks pseudo-elements.
 */
export const pseudoElementPrefix: string = `::?`;

/**
 * Selector Function Wrapper
 * Opening paren for pseudo-class functions like `:not()`, `:is()`, etc.
 */
export const selectorFunctionOpen: string = `\\(`;

/**
 * Selector Function Close
 * Closing paren for pseudo-class functions.
 */
export const selectorFunctionClose: string = `\\)`;

/**
 * Part Pseudo-Element Keyword
 * The `part` keyword in `::part()` syntax.
 */
export const partKeyword: string = `part`;

/**
 * Slotted Pseudo-Element Keyword
 * The `slotted` keyword in `::slotted()` syntax.
 */
export const slottedKeyword: string = `slotted`;

/**
 * Host Context Pseudo-Class Keyword
 * The `host-context` keyword for scoped host styling.
 */
export const hostContextKeyword: string = `host${dash}context`;

/**
 * Custom State Pseudo-Class Keyword
 * The `state` keyword in `:state()` syntax.
 */
export const stateKeyword: string = `state`;

/**
 * Scope Prelude Wrapper
 * Opening paren in `@scope` prelude.
 */
export const scopePreludeOpen: string = `\\(\\s*`;

/**
 * Scope Prelude Close
 * Closing paren in `@scope` prelude.
 */
export const scopePreludeClose: string = `\\s*\\)`;

// ============================================================================
// STRUCTURE-SPECIFIC BUILDING BLOCKS
// ============================================================================

/**
 * Class Selector for Structure Bodies
 * Matches a dot followed by identifier (for `.class-name` in @structure).
 * Pattern: `.identifier`
 */
export const structureClassSelector: string = `${dot}${alpha}${alphanumericExtended}*`;

/**
 * Cardinality Modifier Pattern
 * Matches cardinality syntax in structure declarations.
 * Patterns: `:bare`, `:optional`, `:one-or-more`, `:max-5`, etc.
 * Format: `:keyword` or `:keyword-number`
 */
export const cardinalityModifier: string = `${colon}${alphaLower}${alphanumericExtended}*(?:${dash}${digit}+)?`;

/**
 * Slot Declaration Pattern
 * Matches `slot` or `slot[...]` in structure bodies.
 * Pattern: `slot` optionally followed by brackets with content
 */
export const slotDeclaration: string = `\\bslot(?:\\[[^\\]]*\\])?`;

/**
 * Structure Tag Pattern
 * The `@structure` tag at the start of a structure definition.
 */
export const structureTagKeyword: string = `@structure`;

/**
 * Structure Component/Variant Tag
 * The `@component` or `@variant` tag inside a structure definition.
 */
export const structureComponentTag: string = `@(?:component|variant)`;

/**
 * Structure Braces
 * Opening and closing braces used for nesting in structures.
 */
export const structureBraceOpen: string = braceOpen;
export const structureBraceClose: string = braceClose;

/**
 * Structure Identifier Pattern
 * Identifier used after @component or @variant in structures.
 * Pattern: letter followed by identifier characters
 */
export const structureIdentifier: string = `${alpha}${alphanumericExtended}*`;

// ============================================================================
// CONVENIENCE REGEX PATTERNS (combining building blocks)
// ============================================================================

/**
 * BEM Block Regex
 * Complete pattern for a BEM block selector.
 */
export const BEM_BLOCK_PATTERN: Regex<
  "\\.(?<block>[A-Za-z_][\\w-]*)",
  { names: { block: string } }
> = arkRegex.as(bemBlockSelector, "u");

export const bemBlockPattern: string = BEM_BLOCK_PATTERN.source;

/**
 * BEM Element Regex
 * Complete pattern for BEM block__element selector.
 */
export const BEM_ELEMENT_PATTERN: Regex<
  "\\.(?<block>[\\w-]+)__(?<element>[\\w-]+)",
  { names: { block: string; element: string }; flags: "gu" }
> = arkRegex.as(`${dot}(?<block>${cssNamePattern})${bemElementSeparator}${bemElementPart}`, "gu");

export const bemElementPattern: string = BEM_ELEMENT_PATTERN.source;

/**
 * BEM Modifier Regex
 * Complete pattern for BEM block--modifier selector.
 */
export const BEM_MODIFIER_PATTERN: Regex<
  "\\.(?<base>[\\w-]+)--(?<mod>[\\w-]+)",
  { names: { base: string; mod: string }; flags: "gu" }
> = arkRegex.as(`${dot}(?<base>${cssNamePattern})${bemModifierSeparator}${bemModifierPart}`, "gu");

export const bemModifierPattern: string = BEM_MODIFIER_PATTERN.source;

/**
 * RSCSS Variant Regex
 * Complete pattern for RSCSS variant selector.
 */
export const RSCSS_VARIANT_PATTERN: Regex<
  "\\.-(?<name>[a-z][\\w-]*)",
  { names: { name: string } }
> = arkRegex.as(`${rscssVariantPrefix}${rscssVariantName}`, "u");

export const rscssVariantPattern: string = RSCSS_VARIANT_PATTERN.source;

/**
 * RSCSS Component Regex
 * Complete pattern for RSCSS component selector.
 */
export const RSCSS_COMPONENT_PATTERN: Regex<
  "\\.(?<component>[a-z]+-[a-z][\\w-]*)",
  { names: { component: string } }
> = arkRegex.as(`${dot}(?<component>${rscssComponentMinPattern})`, "u");

export const rscssComponentPattern: string = RSCSS_COMPONENT_PATTERN.source;

/**
 * RSCSS Element Regex
 * Complete pattern for RSCSS element selector.
 */
export const RSCSS_ELEMENT_PATTERN: Regex<
  ">\\s*\\.(?<element>[a-z]+)",
  { names: { element: string } }
> = arkRegex.as(`${rscssElementPrefix}${rscssElementName}`, "u");

export const rscssElementPattern: string = RSCSS_ELEMENT_PATTERN.source;

/**
 * RSCSS Helper Regex
 * Complete pattern for RSCSS helper selector.
 */
export const RSCSS_HELPER_PATTERN: Regex<"\\._(?<name>[a-z][\\w-]*)", { names: { name: string } }> =
  arkRegex.as(`${rscssHelperPrefix}${rscssHelperName}`, "u");

export const rscssHelperPattern: string = RSCSS_HELPER_PATTERN.source;

/**
 * State Prefix Regex
 * Complete pattern for common state prefixes.
 */
export const STATE_PREFIX_PATTERN: Regex<
  "(?<prefix>is|has|can|should|was)-(?<name>[A-Za-z_][\\w-]*)",
  { names: { prefix: string; name: string } }
> = arkRegex.as(`${statePrefixes}${stateSeparator}${stateName}`, "u");

export const statePrefixPattern: string = STATE_PREFIX_PATTERN.source;
