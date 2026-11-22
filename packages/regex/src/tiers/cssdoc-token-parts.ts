/**
 * Tier 3a: CssDoc Token Parts
 *
 * Atomic patterns used to compose complete tag tokenizers.
 * These reusable sub-patterns reduce duplication and improve maintainability
 * when defining tokenizer patterns that match cssdoc tags with their arguments.
 *
 * Uses destructured `.source` strings from Tier 0 character classes for concise pattern composition.
 * Note: Character classes like `[A-Za-z]` cannot be nested inside other character classes
 * (would create invalid `[[A-Za-z]]`). Therefore:
 * - Use string patterns with quantifiers: `${alpha}+` ✓
 * - Use string patterns at alternation top level: `${dot}` ✓
 * - Avoid nesting inside character classes: `[${alpha}...]` ✗
 *
 * @module
 */

import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import {
  alpha,
  alphanumericExtended,
  colon,
  digit,
  dot,
  parenClose,
  parenOpen,
  spaceTab,
} from "./character-classes.js";

/**
 * Whitespace between tag keyword and argument.
 * Used by all tag tokenizers to allow optional horizontal space after `@tagname`.
 * Composed from Tier 0 spaceTab pattern
 */
export const TOKEN_WHITESPACE: Regex<"[ \\t]*", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`${spaceTab}*`,
  "u",
);

/**
 * Base identifier: starts with letter, contains letters, digits, underscore, hyphen.
 * Used for record names, modifier names, state names, etc.
 * Composed from Tier 0 alpha and alphanumericExtended patterns
 */
export const TOKEN_IDENTIFIER: Regex<"[A-Za-z][A-Za-z0-9_-]*", { names: {}; flags: "u" }> =
  arkRegex.as(String.raw`${alpha}${alphanumericExtended}*`, "u");

/**
 * Qualified identifier: dot-separated base identifiers.
 * Used for record names like `@component menu.item`.
 * Composed from Tier 0 alpha, dot, and alphanumericExtended patterns
 */
export const TOKEN_QUALIFIED_IDENTIFIER: Regex<
  "[A-Za-z][A-Za-z0-9_-]*(?:\\.[A-Za-z][A-Za-z0-9_-]*)*",
  { names: {}; flags: "u" }
> = arkRegex.as(
  String.raw`${alpha}${alphanumericExtended}*(?:${dot}${alpha}${alphanumericExtended}*)*`,
  "u",
);

/**
 * Optional qualified identifier wrapped in non-capturing group.
 * Used when identifier is optional in tag patterns.
 * Composed from Tier 0 alpha, dot, and alphanumericExtended patterns
 */
export const TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL: Regex<
  "(?:[A-Za-z][A-Za-z0-9_-]*(?:\\.[A-Za-z][A-Za-z0-9_-]*)*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(
  String.raw`(?:${alpha}${alphanumericExtended}*(?:${dot}${alpha}${alphanumericExtended}*)*)?`,
  "u",
);

/**
 * Modifier with optional leading dash: `-?identifier`.
 * Used for `@modifier -name` or `@release name` patterns.
 * Composed from Tier 0 alpha and alphanumericExtended patterns
 */
export const TOKEN_MODIFIER_NAME: Regex<"-?[A-Za-z][A-Za-z0-9_-]*", { names: {}; flags: "u" }> =
  arkRegex.as(String.raw`-?${alpha}${alphanumericExtended}*`, "u");

/**
 * Optional modifier name in non-capturing group.
 * Composed from Tier 0 alpha and alphanumericExtended patterns
 */
export const TOKEN_MODIFIER_NAME_OPTIONAL: Regex<
  "(?:-?[A-Za-z][A-Za-z0-9_-]*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(String.raw`(?:-?${alpha}${alphanumericExtended}*)?`, "u");

/**
 * Class selector with optional leading dot: `.?identifier`.
 * Used for `@part .header` or `@selector footer` patterns.
 * Composed from Tier 0 dot, alpha, and alphanumericExtended patterns
 */
export const TOKEN_CLASS_SELECTOR: Regex<"\\.?[A-Za-z][A-Za-z0-9_-]*", { names: {}; flags: "u" }> =
  arkRegex.as(String.raw`${dot}?${alpha}${alphanumericExtended}*`, "u");

/**
 * Optional class selector in non-capturing group.
 * Composed from Tier 0 dot, alpha, and alphanumericExtended patterns
 */
export const TOKEN_CLASS_SELECTOR_OPTIONAL: Regex<
  "(?:\\.?[A-Za-z][A-Za-z0-9_-]*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(String.raw`(?:${dot}?${alpha}${alphanumericExtended}*)?`, "u");

/**
 * CSS custom property name: `--identifier`.
 * Used for `@cssproperty --color-primary` patterns.
 * Composed from Tier 0 alpha and alphanumericExtended patterns
 */
export const TOKEN_CUSTOM_PROPERTY: Regex<"--[A-Za-z][A-Za-z0-9_-]*", { names: {}; flags: "u" }> =
  arkRegex.as(String.raw`--${alpha}${alphanumericExtended}*`, "u");

/**
 * Optional CSS custom property in non-capturing group.
 * Composed from Tier 0 alpha and alphanumericExtended patterns
 */
export const TOKEN_CUSTOM_PROPERTY_OPTIONAL: Regex<
  "(?:--[A-Za-z][A-Za-z0-9_-]*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(String.raw`(?:--${alpha}${alphanumericExtended}*)?`, "u");

/**
 * Numeric reference: digit(s) optionally followed by a dot.
 * Used for `@ref 1` or `@ref 2.` patterns.
 * Composed from Tier 0 digit and dot patterns
 */
export const TOKEN_REF_NUMBER: Regex<"\\d+\\.?", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`${digit}+${dot}?`,
  "u",
);

/**
 * Optional numeric reference in non-capturing group.
 * Composed from Tier 0 digit and dot patterns
 */
export const TOKEN_REF_NUMBER_OPTIONAL: Regex<"(?:\\d+\\.?)?", { names: {}; flags: "u" }> =
  arkRegex.as(String.raw`(?:${digit}+${dot}?)?`, "u");

/**
 * Pseudo-class or state: optional colon followed by identifier.
 * Used for `@cssstate :open` or `@cssstate disabled` patterns.
 * Also supports `@cssstate :state(active)` with function call syntax.
 * Composed from Tier 0 alpha, alphanumericExtended, colon, parenOpen, and parenClose patterns
 */
export const TOKEN_PSEUDO_CLASS: Regex<
  ":?[A-Za-z][A-Za-z0-9_-]*(?:\\([A-Za-z0-9_-]*\\))?",
  { names: {}; flags: "u" }
> = arkRegex.as(
  String.raw`${colon}?${alpha}${alphanumericExtended}*(?:${parenOpen}${alphanumericExtended}*${parenClose})?`,
  "u",
);

/**
 * Optional pseudo-class in non-capturing group.
 * Composed from Tier 0 alpha, alphanumericExtended, colon, parenOpen, and parenClose patterns
 */
export const TOKEN_PSEUDO_CLASS_OPTIONAL: Regex<
  "(?::?[A-Za-z][A-Za-z0-9_-]*(?:\\([A-Za-z0-9_-]*\\))?)?",
  { names: {}; flags: "u" }
> = arkRegex.as(
  String.raw`(?:${colon}?${alpha}${alphanumericExtended}*(?:${parenOpen}${alphanumericExtended}*${parenClose})?)?`,
  "u",
);

/**
 * Inline tag content: anything except closing brace.
 * Used for `{@link ...}` or `{@label ...}` patterns.
 */
export const TOKEN_INLINE_CONTENT: Regex<"[^}]*", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`[^}]*`,
  "u",
);

// Convenience string exports for use in template literals
export const tokenWhitespace: string = TOKEN_WHITESPACE.source;
export const tokenIdentifier: string = TOKEN_IDENTIFIER.source;
export const tokenQualifiedIdentifier: string = TOKEN_QUALIFIED_IDENTIFIER.source;
export const tokenQualifiedIdentifierOptional: string = TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL.source;
export const tokenModifierName: string = TOKEN_MODIFIER_NAME.source;
export const tokenModifierNameOptional: string = TOKEN_MODIFIER_NAME_OPTIONAL.source;
export const tokenClassSelector: string = TOKEN_CLASS_SELECTOR.source;
export const tokenClassSelectorOptional: string = TOKEN_CLASS_SELECTOR_OPTIONAL.source;
export const tokenCustomProperty: string = TOKEN_CUSTOM_PROPERTY.source;
export const tokenCustomPropertyOptional: string = TOKEN_CUSTOM_PROPERTY_OPTIONAL.source;
export const tokenRefNumber: string = TOKEN_REF_NUMBER.source;
export const tokenRefNumberOptional: string = TOKEN_REF_NUMBER_OPTIONAL.source;
export const tokenPseudoClass: string = TOKEN_PSEUDO_CLASS.source;
export const tokenPseudoClassOptional: string = TOKEN_PSEUDO_CLASS_OPTIONAL.source;
export const tokenInlineContent: string = TOKEN_INLINE_CONTENT.source;
