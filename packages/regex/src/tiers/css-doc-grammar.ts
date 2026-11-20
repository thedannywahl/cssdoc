/**
 * Tier 2: CssDoc Grammar Patterns
 *
 * Patterns derived from the formal CssDoc specification grammar:
 * packages/spec/grammar/CssDoc.grammarkdown
 *
 * These patterns parse doc-comment syntax and structure definitions:
 * record names, modifier names, structure references, tags, and arguments.
 *
 * All patterns use modern named capture groups matching the grammar rule names.
 *
 * @module
 */

import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";

/**
 * CssDoc Identifier from grammar.
 * Starts with ASCII letter or underscore; followed by word chars (ASCII) or hyphens.
 * Grammar rule: Identifier :: IdentifierStart IdentifierPart*
 *
 * @example
 * CSSDOC_IDENTIFIER.exec("button")?.groups?.identifier // "button"
 * CSSDOC_IDENTIFIER.exec("my-component")?.groups?.identifier // "my-component"
 * CSSDOC_IDENTIFIER.exec("_private")?.groups?.identifier // "_private"
 */
export const CSSDOC_IDENTIFIER: Regex<
  "(?<identifier>[A-Za-z_][\\w-]*)",
  { names: { identifier: string } }
> = arkRegex.as(String.raw`(?<identifier>[A-Za-z_][\w-]*)`);

/**
 * CssDoc Record Name from grammar.
 * Qualified name for components: simple identifier or dot-separated identifiers.
 * Grammar rule: RecordName :: Identifier | RecordName '.' Identifier
 *
 * Used for naming documented components, potentially nested (e.g., "menu.item").
 *
 * @example
 * CSSDOC_RECORD_NAME.exec("button")?.groups?.parts // "button"
 * CSSDOC_RECORD_NAME.exec("menu.item")?.groups?.parts // "menu.item"
 * CSSDOC_RECORD_NAME.exec("form.field.radio")?.groups?.parts // "form.field.radio"
 */
export const CSSDOC_RECORD_NAME: Regex<
  "(?<parts>[A-Za-z_][\\w-]*(?:\\.[A-Za-z_][\\w-]*)*)",
  { names: { parts: string }; flags: "u" }
> = arkRegex.as(String.raw`(?<parts>[A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*)*)`, "u");

/**
 * CssDoc Modifier Name - Suffix Form from grammar.
 * The default BEM-like suffix form: base class with `--` separator and modifier name.
 * Grammar rule: SuffixModifierName :: Identifier '--' Value
 *
 * Example: `.button--primary`, `.button--size-lg`
 *
 * @example
 * const match = CSSDOC_MODIFIER_SUFFIX.exec("primary");
 * match?.groups?.name // "primary"
 *
 * @example
 * const match = CSSDOC_MODIFIER_SUFFIX.exec("size-lg");
 * match?.groups?.name // "size-lg"
 */
export const CSSDOC_MODIFIER_SUFFIX: Regex<
  "(?<name>[\\w-]+(?:-\\*)?)",
  { names: { name: string }; flags: "u" }
> = arkRegex.as(String.raw`(?<name>[\w-]+(?:-\*)?)`, "u");

/**
 * CssDoc Modifier Name - Chained Form from grammar.
 * Alternative form: separate prefixed class on the base (e.g., `.base.-name`).
 * Grammar rule: ChainedModifierName :: '-' Prop | '-' Prop '-' Value
 *
 * `Prop` is an identifier segment containing no hyphens (the first segment).
 * `Value` is the remainder, which may contain hyphens or be a `*` family.
 *
 * Examples: `.-active`, `.-size-lg`, `.-icon-*`
 *
 * @example
 * const match = CSSDOC_MODIFIER_CHAINED.exec("-active");
 * match?.groups?.prop // "active"
 * match?.groups?.value // undefined
 *
 * @example
 * const match = CSSDOC_MODIFIER_CHAINED.exec("-size-lg");
 * match?.groups?.prop // "size"
 * match?.groups?.value // "lg"
 */
export const CSSDOC_MODIFIER_CHAINED: Regex<
  "-(?<prop>[A-Za-z0-9]+)(?:-(?<value>[\\w-]+(?:-\\*)?))?",
  { names: { prop: string; value?: string }; flags: "u" }
> = arkRegex.as(String.raw`-(?<prop>[A-Za-z0-9]+)(?:-(?<value>[\w-]+(?:-\*)?))?`, "u");

/**
 * CssDoc Modifier Name - Attribute Form from grammar.
 * Alternative form: attribute selector on the base (e.g., `.base[disabled]`).
 * Grammar rule: AttributeModifier :: '[' ... ']'
 *
 * Note: Simplified to avoid backreferences for better compatibility.
 *
 * @example
 * const match = CSSDOC_MODIFIER_ATTRIBUTE.exec("[disabled]");
 * match?.groups?.name // "disabled"
 * match?.groups?.value // undefined
 *
 * @example
 * const match = CSSDOC_MODIFIER_ATTRIBUTE.exec("[aria-pressed=true]");
 * match?.groups?.name // "aria-pressed"
 * match?.groups?.value // "true"
 */
export const CSSDOC_MODIFIER_ATTRIBUTE: Regex<
  "\\[(?<name>[\\w-]+)(?:=(?<value>[\"']?[^\\]]*?)(?<quote>[\"'])?)\\?\\]",
  { names: { name: string; value?: string; quote?: string }; flags: "u" }
> = arkRegex.as(String.raw`\[(?<name>[\w-]+)(?:=(?<value>["']?[^\]]*?)(?<quote>["'])?)?\]`, "u");

/**
 * CssDoc Tag from grammar.
 * Doc-comment tag with optional argument.
 * Pattern: `@` followed by tag name and optional argument.
 *
 * Example tags: `@component`, `@modifier`, `@part`, `@example`, etc.
 *
 * @example
 * CSSDOC_TAG.exec("@component")?.groups?.tag // "component"
 * CSSDOC_TAG.exec("@modifier active")?.groups // { tag: "modifier", arg: "active" }
 */
export const CSSDOC_TAG: Regex<
  "@(?<tag>[\\w-]+)(?:\\s+(?<arg>\\S+))?",
  { names: { tag: string; arg?: string }; flags: "u" }
> = arkRegex.as(String.raw`@(?<tag>[\w-]+)(?:\s+(?<arg>\S+))?`, "u");

/**
 * CssDoc Tag Argument from grammar.
 * Argument to a tag (record reference, modifier reference, etc.).
 *
 * @example
 * CSSDOC_TAG_ARG.exec("button.primary")?.groups?.arg // "button.primary"
 */
export const CSSDOC_TAG_ARG: Regex<"(?<arg>\\S+)", { names: { arg: string }; flags: "u" }> =
  arkRegex.as(String.raw`(?<arg>\S+)`, "u");

/**
 * CssDoc Structure Reference from grammar.
 * Reference to a structure record or member in doc comments.
 * Can be qualified (dots for nesting) and optionally typed.
 *
 * @example
 * CSSDOC_STRUCTURE_REF.exec("button")?.groups?.ref // "button"
 * CSSDOC_STRUCTURE_REF.exec("menu.item:submenu")?.groups?.ref // "menu.item"
 * CSSDOC_STRUCTURE_REF.exec("menu.item:submenu")?.groups?.type // "submenu"
 */
export const CSSDOC_STRUCTURE_REF: Regex<
  "(?<ref>[A-Za-z_][\\w-]*(?:\\.[A-Za-z_][\\w-]*)*)(?::(?<type>[\\w-]+))?",
  { names: { ref: string; type?: string }; flags: "u" }
> = arkRegex.as(
  String.raw`(?<ref>[A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*)*)(?::(?<type>[\w-]+))?`,
  "u",
);

/**
 * CssDoc Cardinality Keyword from grammar.
 * Cardinality modifiers for structure members.
 * Examples: `max-5`, `one-or-more`, `optional`, `many`
 *
 * @example
 * CSSDOC_CARDINALITY.exec("max-5")?.groups?.type // "max"
 * CSSDOC_CARDINALITY.exec("max-5")?.groups?.value // "5"
 * CSSDOC_CARDINALITY.exec("optional")?.groups?.keyword // "optional"
 */
export const CSSDOC_CARDINALITY: Regex<
  "(?:(?<type>max|one-or-more-max)-(?<value>\\d+)|(?<keyword>optional|one-or-more|many))",
  { names: { type?: string; value?: string; keyword?: string }; flags: "u" }
> = arkRegex.as(
  String.raw`(?:(?<type>max|one-or-more-max)-(?<value>\d+)|(?<keyword>optional|one-or-more|many))`,
  "u",
);

/**
 * CssDoc Custom Property Reference from grammar.
 * Reference to a CSS custom property (CSS variable).
 * Pattern: `--` followed by identifier.
 *
 * @example
 * CSSDOC_CUSTOM_PROPERTY.exec("--primary-color")?.groups?.name // "primary-color"
 */
export const CSSDOC_CUSTOM_PROPERTY: Regex<
  "--(?<name>[\\w-]+)",
  { names: { name: string }; flags: "u" }
> = arkRegex.as(String.raw`--(?<name>[\w-]+)`, "u");

/**
 * CssDoc Inline Reference from grammar.
 * Inline reference in prose (e.g., `{@link}`, `{@inheritDoc}`).
 *
 * @example
 * CSSDOC_INLINE_REF.exec("{@link button}")?.groups // { tag: "link", ref: "button" }
 */
export const CSSDOC_INLINE_REF: Regex<
  "\\{@(?<tag>[\\w-]+)\\s+(?<ref>\\S+)\\}",
  { names: { tag: string; ref: string }; flags: "u" }
> = arkRegex.as(String.raw`\{@(?<tag>[\w-]+)\s+(?<ref>\S+)\}`, "u");
