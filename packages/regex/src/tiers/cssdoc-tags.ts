/**
 * Tier 3b: CssDoc Tag Tokenizer Patterns
 *
 * Complete tag patterns composed from atomic token parts (cssdoc-token-parts.ts).
 * These patterns match cssdoc tags with their arguments in comments and are
 * used by syntax highlighters (CodeMirror, TextMate) for tokenization and scoping.
 *
 * Unlike grammar patterns that parse individual elements, these are "tokenizer patterns"
 * that match complete tag+argument combinations with specific capture groups for styling.
 *
 * @module
 */

import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import {
  TOKEN_CLASS_SELECTOR_OPTIONAL,
  TOKEN_CUSTOM_PROPERTY_OPTIONAL,
  TOKEN_MODIFIER_NAME_OPTIONAL,
  TOKEN_PSEUDO_CLASS_OPTIONAL,
  TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL,
  TOKEN_REF_NUMBER_OPTIONAL,
  TOKEN_WHITESPACE,
} from "./cssdoc-token-parts.js";

/**
 * Inline tag pattern matching `{@link ...}` / `{@label ...}` / `{@inheritDoc ...}`
 *
 * Matches the full inline tag structure with captures for the opening brace, tag name,
 * content, and closing brace (optional).
 *
 * Composed from: TOKEN_INLINE_CONTENT
 *
 * @example
 * Pattern: `(\{)(@(?:link|label|inheritDoc))\b[ \t]*([^}]*)(\})?`
 * Matches: `{@link https://example.com}`, `{@label myLabel`
 */
export const CSSDOC_INLINE_TAG_TOKENIZER: Regex<
  "(\\{)(@(?:link|label|inheritDoc))\\b[ \\t]*([^}]*)(\\})?",
  { names: {}; flags: "u" }
> = arkRegex.as(String.raw`(\{)(@(?:link|label|inheritDoc))\b[ \t]*([^}]*)(\})?`, "u");

/**
 * Record tag pattern matching `@component name` / `@name name` / etc.
 *
 * Matches a record tag followed by an optional qualified name (dot-separated identifiers).
 *
 * Composed from: TOKEN_WHITESPACE, TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL
 *
 * @example
 * Matches: `@component button`, `@name menu.item`
 */
export const CSSDOC_RECORD_TAG_TOKENIZER: Regex<
  "(@(?:component|name|utility|rule|declaration|layout))\\b[ \\t]*([A-Za-z][A-Za-z0-9_-]*(?:\\.[A-Za-z][A-Za-z0-9_-]*)*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(
  String.raw`(@(?:component|name|utility|rule|declaration|layout))\b${TOKEN_WHITESPACE.source}(${TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL.source})`,
  "u",
);

/**
 * Modifier tag pattern matching `@modifier -name` / `@release -name` / etc.
 *
 * Matches a modifier tag followed by an optional modifier name (with optional leading dash).
 *
 * Composed from: TOKEN_WHITESPACE, TOKEN_MODIFIER_NAME_OPTIONAL
 *
 * @example
 * Matches: `@modifier -primary`, `@release secondary`
 */
export const CSSDOC_MODIFIER_TAG_TOKENIZER: Regex<
  "(@(?:modifier|release))\\b[ \\t]*(-?[A-Za-z][A-Za-z0-9_-]*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(
  String.raw`(@(?:modifier|release))\b${TOKEN_WHITESPACE.source}(${TOKEN_MODIFIER_NAME_OPTIONAL.source})`,
  "u",
);

/**
 * Part tag pattern matching `@part .name` / `@slot .name` / `@selector .name` / etc.
 *
 * Matches a part-related tag followed by an optional class selector or identifier.
 *
 * Composed from: TOKEN_WHITESPACE, TOKEN_CLASS_SELECTOR_OPTIONAL
 *
 * @example
 * Matches: `@part .header`, `@selector footer`, `@pseudo`
 */
export const CSSDOC_PART_TAG_TOKENIZER: Regex<
  "(@(?:part|csspart|slot|selector|class|pseudo))\\b[ \\t]*(\\.?[A-Za-z][A-Za-z0-9_-]*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(
  String.raw`(@(?:part|csspart|slot|selector|class|pseudo))\b${TOKEN_WHITESPACE.source}(${TOKEN_CLASS_SELECTOR_OPTIONAL.source})`,
  "u",
);

/**
 * Property tag pattern matching `@cssproperty --name` / `@property --name`
 *
 * Matches a custom property tag followed by an optional CSS custom property name.
 *
 * Composed from: TOKEN_WHITESPACE, TOKEN_CUSTOM_PROPERTY_OPTIONAL
 *
 * @example
 * Matches: `@cssproperty --color-primary`, `@property --size`
 */
export const CSSDOC_PROPERTY_TAG_TOKENIZER: Regex<
  "(@(?:cssproperty|property))\\b[ \\t]*(--[A-Za-z][A-Za-z0-9-]*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(
  String.raw`(@(?:cssproperty|property))\b${TOKEN_WHITESPACE.source}(${TOKEN_CUSTOM_PROPERTY_OPTIONAL.source})`,
  "u",
);

/**
 * Ref tag pattern matching `@ref 1` / `@ref 1.`
 *
 * Matches the `@ref` tag followed by an optional numeric reference or range end.
 *
 * Composed from: TOKEN_WHITESPACE, TOKEN_REF_NUMBER_OPTIONAL
 *
 * @example
 * Matches: `@ref 1`, `@ref 2.`
 */
export const CSSDOC_REF_TAG_TOKENIZER: Regex<
  "(@(?:ref))\\b[ \\t]*(\\d+\\.?)?",
  { names: {}; flags: "u" }
> = arkRegex.as(
  String.raw`(@(?:ref))\b${TOKEN_WHITESPACE.source}(${TOKEN_REF_NUMBER_OPTIONAL.source})`,
  "u",
);

/**
 * State tag pattern matching `@cssstate :state(...)` / `@cssstate :disabled`
 *
 * Matches the `@cssstate` tag followed by an optional state selector or pseudoclass.
 *
 * Composed from: TOKEN_WHITESPACE, TOKEN_PSEUDO_CLASS_OPTIONAL
 *
 * @example
 * Matches: `@cssstate :open`, `@cssstate disabled`, `@cssstate :state(active)`
 */
export const CSSDOC_STATE_TAG_TOKENIZER: Regex<
  "(@(?:cssstate))\\b[ \\t]*(:?[A-Za-z][A-Za-z0-9_-]*(?:\\([A-Za-z0-9_-]*\\))?)?",
  { names: {}; flags: "u" }
> = arkRegex.as(
  String.raw`(@(?:cssstate))\b${TOKEN_WHITESPACE.source}(${TOKEN_PSEUDO_CLASS_OPTIONAL.source})`,
  "u",
);

/**
 * Structure component tag pattern matching `@component name` / `@variant name` inside `@structure`
 *
 * Matches component or variant tags within a structure definition, followed by optional names.
 *
 * Composed from: TOKEN_WHITESPACE, TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL
 *
 * @example
 * Matches: `@component button`, `@variant primary`
 */
export const CSSDOC_STRUCTURE_COMPONENT_TAG_TOKENIZER: Regex<
  "(@(?:component|variant))\\b[ \\t]*([A-Za-z][A-Za-z0-9_-]*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(
  String.raw`(@(?:component|variant))\b${TOKEN_WHITESPACE.source}(${TOKEN_QUALIFIED_IDENTIFIER_OPTIONAL.source})`,
  "u",
);
