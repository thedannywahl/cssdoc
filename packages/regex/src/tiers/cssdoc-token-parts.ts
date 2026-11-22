/**
 * Tier 3a: CssDoc Token Parts
 *
 * Atomic patterns used to compose complete tag tokenizers.
 * These reusable sub-patterns reduce duplication and improve maintainability
 * when defining tokenizer patterns that match cssdoc tags with their arguments.
 *
 * Documents reference to Tier 0 (Character Classes) where applicable for transparency
 * on the foundation of these patterns.
 *
 * @module
 */

import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";

/**
 * Whitespace between tag keyword and argument.
 * Used by all tag tokenizers to allow optional horizontal space after `@tagname`.
 * References Tier 0 SPACE_TAB pattern conceptually
 */
export const TOKEN_WHITESPACE: Regex<"[ \\t]*", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`[ \t]*`,
  "u",
);

/**
 * Base identifier: starts with letter, contains letters, digits, underscore, hyphen.
 * Used for record names, modifier names, state names, etc.
 * Uses Tier 0 ALPHA pattern for the start
 */
export const TOKEN_IDENTIFIER: Regex<"[A-Za-z][A-Za-z0-9_-]*", { names: {}; flags: "u" }> =
  arkRegex.as(String.raw`[A-Za-z][A-Za-z0-9_-]*`, "u");

/**
 * Qualified identifier: dot-separated base identifiers.
 * Used for record names like `@component menu.item`.
 * Uses Tier 0 DOT pattern for separators
 */
export const TOKEN_QUALIFIED_IDENTIFIER: Regex<
  "[A-Za-z][A-Za-z0-9_-]*(?:\\.[A-Za-z][A-Za-z0-9_-]*)*",
  { names: {}; flags: "u" }
> = arkRegex.as(String.raw`[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*`, "u");

/**
 * Optional qualified identifier wrapped in non-capturing group.
 * Used when identifier is optional in tag patterns.
 * Uses Tier 0 DOT pattern for separators
 */
export const TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL: Regex<
  "(?:[A-Za-z][A-Za-z0-9_-]*(?:\\.[A-Za-z][A-Za-z0-9_-]*)*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(String.raw`(?:[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*)?`, "u");

/**
 * Modifier with optional leading dash: `-?identifier`.
 * Used for `@modifier -name` or `@release name` patterns.
 * Uses Tier 0 ALPHA pattern for the start
 */
export const TOKEN_MODIFIER_NAME: Regex<"-?[A-Za-z][A-Za-z0-9_-]*", { names: {}; flags: "u" }> =
  arkRegex.as(String.raw`-?[A-Za-z][A-Za-z0-9_-]*`, "u");

/**
 * Optional modifier name in non-capturing group.
 * Uses Tier 0 ALPHA pattern for the start
 */
export const TOKEN_MODIFIER_NAME_OPTIONAL: Regex<
  "(?:-?[A-Za-z][A-Za-z0-9_-]*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(String.raw`(?:-?[A-Za-z][A-Za-z0-9_-]*)?`, "u");

/**
 * Class selector with optional leading dot: `.?identifier`.
 * Used for `@part .header` or `@selector footer` patterns.
 * Uses Tier 0 DOT pattern and ALPHA pattern
 */
export const TOKEN_CLASS_SELECTOR: Regex<"\\.?[A-Za-z][A-Za-z0-9_-]*", { names: {}; flags: "u" }> =
  arkRegex.as(String.raw`\.?[A-Za-z][A-Za-z0-9_-]*`, "u");

/**
 * Optional class selector in non-capturing group.
 * Uses Tier 0 DOT and ALPHA patterns
 */
export const TOKEN_CLASS_SELECTOR_OPTIONAL: Regex<
  "(?:\\.?[A-Za-z][A-Za-z0-9_-]*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(String.raw`(?:\.?[A-Za-z][A-Za-z0-9_-]*)?`, "u");

/**
 * CSS custom property name: `--identifier`.
 * Used for `@cssproperty --color-primary` patterns.
 * Uses Tier 0 ALPHA pattern
 */
export const TOKEN_CUSTOM_PROPERTY: Regex<"--[A-Za-z][A-Za-z0-9-]*", { names: {}; flags: "u" }> =
  arkRegex.as(String.raw`--[A-Za-z][A-Za-z0-9-]*`, "u");

/**
 * Optional CSS custom property in non-capturing group.
 * Uses Tier 0 ALPHA pattern
 */
export const TOKEN_CUSTOM_PROPERTY_OPTIONAL: Regex<
  "(?:--[A-Za-z][A-Za-z0-9-]*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(String.raw`(?:--[A-Za-z][A-Za-z0-9-]*)?`, "u");

/**
 * Numeric reference: digit(s) optionally followed by a dot.
 * Used for `@ref 1` or `@ref 2.` patterns.
 * Uses Tier 0 DIGIT pattern
 */
export const TOKEN_REF_NUMBER: Regex<"\\d+\\.?", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`\d+\.?`,
  "u",
);

/**
 * Optional numeric reference in non-capturing group.
 * Uses Tier 0 DIGIT pattern
 */
export const TOKEN_REF_NUMBER_OPTIONAL: Regex<"(?:\\d+\\.?)?", { names: {}; flags: "u" }> =
  arkRegex.as(String.raw`(?:\d+\.?)?`, "u");

/**
 * Pseudo-class or state: optional colon followed by identifier.
 * Used for `@cssstate :open` or `@cssstate disabled` patterns.
 * Also supports `@cssstate :state(active)` with function call syntax.
 * Uses Tier 0 ALPHA pattern
 */
export const TOKEN_PSEUDO_CLASS: Regex<
  ":?[A-Za-z][A-Za-z0-9_-]*(?:\\([A-Za-z0-9_-]*\\))?",
  { names: {}; flags: "u" }
> = arkRegex.as(String.raw`:?[A-Za-z][A-Za-z0-9_-]*(?:\([A-Za-z0-9_-]*\))?`, "u");

/**
 * Optional pseudo-class in non-capturing group.
 * Uses Tier 0 ALPHA pattern
 */
export const TOKEN_PSEUDO_CLASS_OPTIONAL: Regex<
  "(?::?[A-Za-z][A-Za-z0-9_-]*(?:\\([A-Za-z0-9_-]*\\))?)?",
  { names: {}; flags: "u" }
> = arkRegex.as(String.raw`(?::?[A-Za-z][A-Za-z0-9_-]*(?:\([A-Za-z0-9_-]*\))?)?`, "u");

/**
 * Inline tag content: anything except closing brace.
 * Used for `{@link ...}` or `{@label ...}` patterns.
 */
export const TOKEN_INLINE_CONTENT: Regex<"[^}]*", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`[^}]*`,
  "u",
);
