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
 * References to Tier 0 (Character Classes) and Tier 1 (W3C CSS) are documented where applicable.
 *
 * @module
 */

import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import {
  alphanumericExtended,
  dash,
  doubleDash,
  quote,
  cssIdentifierStart,
  cssIdentifierCont,
} from "./character-classes.js";

/**
 * CssDoc identifier part: `[A-Za-z_][\w-]*`
 * ASCII letter or underscore followed by word chars (ASCII) or hyphens.
 * Used as the core building block for cssdoc identifiers, record names, and structure references.
 * CssDoc is intentionally ASCII-only (unlike CSS which includes non-ASCII identifiers).
 */
export const CSSDOC_IDENTIFIER_PART: Regex<"[A-Za-z_][\\w-]*", { names: {}; flags: "u" }> =
  arkRegex.as(String.raw`[A-Za-z_][\w-]*`, "u");

export const cssdocIdentifierPart: string = CSSDOC_IDENTIFIER_PART.source;

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
> = arkRegex.as(String.raw`(?<identifier>${cssdocIdentifierPart})`, "u");

/**
 * CssDoc Record Name from grammar.
 * Qualified name for components: simple identifier or dot-separated identifiers.
 * Grammar rule: RecordName :: Identifier | RecordName '.' Identifier
 * Composed from: Tier 0 DOT pattern
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
> = arkRegex.as(String.raw`(?<parts>${cssdocIdentifierPart}(?:\.${cssdocIdentifierPart})*)`, "u");

/**
 * CssDoc Modifier Name - Suffix Form from grammar.
 * The default BEM-like suffix form: base class with `--` separator and modifier name.
 * Grammar rule: SuffixModifierName :: Identifier '--' Value
 * Uses Tier 1 CSS identifier patterns to accept any valid CSS identifier.
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
> = arkRegex.as(String.raw`(?<name>${cssIdentifierStart}${cssIdentifierCont}*(?:${dash}\*)?)`, "u");

/**
 * CssDoc Modifier Name - Chained Form from grammar.
 * Alternative form: separate prefixed class on the base (e.g., `.base.-name`).
 * Grammar rule: ChainedModifierName :: '-' Prop | '-' Prop '-' Value
 * Uses Tier 0 DASH pattern
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
> = arkRegex.as(
  String.raw`-(?<prop>${cssIdentifierStart}${cssIdentifierCont}*)(?:-(?<value>${cssIdentifierStart}${cssIdentifierCont}*(?:${dash}\*)?))?`,
  "u",
);

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
> = arkRegex.as(
  String.raw`\[(?<name>${alphanumericExtended}+)(?:=(?<value>${quote}?[^\]]*?)(?<quote>${quote})?)?\]`,
  "u",
);

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
  String.raw`(?<ref>${cssdocIdentifierPart}(?:\.${cssdocIdentifierPart})*)(?::(?<type>[\w-]+))?`,
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
> = arkRegex.as(String.raw`${doubleDash}(?<name>[\w-]+)`, "u");

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

/**
 * CssDoc Ref Number from grammar.
 * Numeric reference within `@ref` annotation (e.g., `@ref 1`, `@ref 1.`).
 *
 * @example
 * CSSDOC_REF_NUM.exec("1")?.groups?.num // "1"
 * CSSDOC_REF_NUM.exec("1.")?.groups?.num // "1"
 */
export const CSSDOC_REF_NUM: Regex<"(?<num>\\d+)\\.?", { names: { num: string }; flags: "u" }> =
  arkRegex.as(String.raw`(?<num>\d+)\.?`, "u");

/**
 * CssDoc State Value from grammar.
 * State token for `@cssstate` tag (e.g., `:open`, `:state(open)`, `:disabled`).
 *
 * @example
 * CSSDOC_STATE_VALUE.exec(":open")?.groups?.name // "open"
 * CSSDOC_STATE_VALUE.exec(":state(open)")?.groups // { name: "state", param: "open" }
 * CSSDOC_STATE_VALUE.exec(":disabled")?.groups?.name // "disabled"
 */
export const CSSDOC_STATE_VALUE: Regex<
  ":?(?<name>[A-Za-z][\\w-]*)(?:\\((?<param>[\\w-]*)\\))?",
  { names: { name: string; param?: string }; flags: "u" }
> = arkRegex.as(String.raw`:?(?<name>[A-Za-z][\w-]*)(?:\((?<param>[\w-]*)\))?`, "u");

/**
 * CssDoc Selector/Pseudo/Class Value from grammar.
 * Value for `@selector`, `@pseudo`, `@class` tags (e.g., `.alert-box`, `::before`).
 *
 * @example
 * CSSDOC_SELECTOR_VALUE.exec(".alert-box")?.groups?.value // ".alert-box"
 * CSSDOC_SELECTOR_VALUE.exec("::before")?.groups?.value // "::before"
 * CSSDOC_SELECTOR_VALUE.exec("alert-container")?.groups?.value // "alert-container"
 */
export const CSSDOC_SELECTOR_VALUE: Regex<
  "(?<value>\\.?[A-Za-z][A-Za-z0-9_-]*)",
  { names: { value: string }; flags: "u" }
> = arkRegex.as(String.raw`(?<value>\.?[A-Za-z][A-Za-z0-9_-]*)`, "u");

/**
 * CssDoc Structure Cardinality Modifier from grammar.
 * Cardinality suffix on component/variant references in @structure (e.g., `:optional`, `:max-1`).
 *
 * @example
 * CSSDOC_STRUCTURE_CARDINALITY.exec(":optional")?.groups?.keyword // "optional"
 * CSSDOC_STRUCTURE_CARDINALITY.exec(":max-1")?.groups?.maxValue // "1"
 * CSSDOC_STRUCTURE_CARDINALITY.exec(":one-or-more:max-2")?.groups // { keyword: "one-or-more", maxValue: "2" }
 */
export const CSSDOC_STRUCTURE_CARDINALITY: Regex<
  ":(?:(?<keyword>optional|one-or-more|many)(?::max-(?<maxValue>\\d+))?|max-(?<justMax>\\d+))",
  { names: { keyword?: string; maxValue?: string; justMax?: string }; flags: "u" }
> = arkRegex.as(
  String.raw`:(?:(?<keyword>optional|one-or-more|many)(?::max-(?<maxValue>\d+))?|max-(?<justMax>\d+))`,
  "u",
);

/**
 * CssDoc Slot Declaration from grammar.
 * Slot reference in @structure body (e.g., `slot`, `slot[name="x"]`).
 *
 * @example
 * CSSDOC_SLOT_DECL.exec("slot")?.groups?.name // undefined
 * CSSDOC_SLOT_DECL.exec("slot[name=\"x\"]")?.groups?.name // "x"
 * CSSDOC_SLOT_DECL.exec("slot[name='content']")?.groups?.name // "content"
 */
export const CSSDOC_SLOT_DECL: Regex<
  "\\bslot(?:\\[name=(?:[\"']?(?<name>[\\w-]*)[\"']?)?\\])?",
  { names: { name?: string }; flags: "u" }
> = arkRegex.as(String.raw`\bslot(?:\[name=(?:["']?(?<name>[\w-]*)["']?)?\])?`, "u");

/**
 * CssDoc Structure Class Selector from grammar.
 * Class selector within @structure body (e.g., `.pfx-alert`, `.button-group`).
 *
 * @example
 * CSSDOC_STRUCTURE_CLASS.exec(".pfx-alert")?.groups?.class // "pfx-alert"
 * CSSDOC_STRUCTURE_CLASS.exec(".button-group")?.groups?.class // "button-group"
 */
export const CSSDOC_STRUCTURE_CLASS: Regex<
  "\\.(?<class>[A-Za-z][A-Za-z0-9_-]*)",
  { names: { class: string }; flags: "u" }
> = arkRegex.as(String.raw`\.(?<class>[A-Za-z][A-Za-z0-9_-]*)`, "u");

/**
 * CssDoc Structure Tag (`@structure` body tag).
 * Marks the opening `@structure` keyword that begins a structure definition.
 *
 * @example
 * CSSDOC_STRUCTURE_TAG.exec("@structure")?.groups?.tag // "structure"
 */
export const CSSDOC_STRUCTURE_TAG: Regex<"@structure\\b", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`@structure\b`,
  "u",
);

/**
 * CssDoc Structure Component/Variant Reference from grammar.
 * Reference to a component or variant within a structure body (e.g., `@component button`, `@variant primary`).
 * Captures the tag and optional name.
 *
 * @example
 * CSSDOC_STRUCTURE_COMPONENT.exec("@component button")?.groups // { tag: "@component", name: "button" }
 * CSSDOC_STRUCTURE_COMPONENT.exec("@variant primary")?.groups // { tag: "@variant", name: "primary" }
 */
export const CSSDOC_STRUCTURE_COMPONENT: Regex<
  "(@(?:component|variant))\\b[ \\t]*([A-Za-z][\\w-]*)?",
  { names: { tag: string; name?: string }; flags: "u" }
> = arkRegex.as(String.raw`(@(?:component|variant))\b[ \t]*([A-Za-z][\w-]*)?`, "u");

/**
 * CssDoc Structure Braces from grammar.
 * Opening and closing braces within structure bodies for nesting.
 *
 * @example
 * CSSDOC_STRUCTURE_BRACE.exec("{")?.groups // {} (matches "{" or "}")
 */
export const CSSDOC_STRUCTURE_BRACE: Regex<"[{}]", { names: {}; flags: "u" }> = arkRegex.as(
  String.raw`[{}]`,
  "u",
);

/**
 * Inline Tag Pattern.
 * Matches inline tags like `{@link}`, `{@label}`, `{@inheritDoc}` within prose.
 * Captures the opening brace, tag name, text content, and optional closing brace.
 *
 * @example
 * Pattern: `(\{)(@(?:link|label|inheritDoc))\b[ \t]*([^}]*)(\})?`
 */
export const CSSDOC_INLINE_TAG_PATTERN: Regex<
  "(\\{)(@(?:link|label|inheritDoc))\\b[ \\t]*([^}]*)(\\})?",
  { names: {}; flags: "u" }
> = arkRegex.as(String.raw`(\{)(@(?:link|label|inheritDoc))\b[ \t]*([^}]*)(\})?`, "u");

/**
 * Record/Component Tag Pattern.
 * Matches tags like `@component`, `@name`, `@utility`, `@rule`, etc. with optional qualified name.
 * Captures the tag and optional dotted name (e.g., `menu.item`).
 *
 * @example
 * Pattern: `(@(?:component|name|utility|rule|declaration|layout))\b[ \t]*([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*)?`
 */
export const CSSDOC_RECORD_TAG_PATTERN: Regex<
  "(@(?:component|name|utility|rule|declaration|layout))\\b[ \\t]*([A-Za-z][A-Za-z0-9_-]*(?:\\.[A-Za-z][A-Za-z0-9_-]*)*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(
  String.raw`(@(?:component|name|utility|rule|declaration|layout))\b[ \t]*([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*)?`,
  "u",
);

/**
 * Modifier Tag Pattern.
 * Matches tags like `@modifier`, `@variant` with optional hyphenated modifier name.
 *
 * @example
 * Pattern: `(@(?:modifier|variant))\b[ \t]*(-[A-Za-z][A-Za-z0-9-]*)?`
 */
export const CSSDOC_MODIFIER_TAG_PATTERN: Regex<
  "(@(?:modifier|variant))\\b[ \\t]*(-[A-Za-z][A-Za-z0-9-]*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(String.raw`(@(?:modifier|variant))\b[ \t]*(-[A-Za-z][A-Za-z0-9-]*)?`, "u");

/**
 * Part Tag Pattern.
 * Matches tags like `@part`, `@csspart`, `@slot`, `@selector`, `@pseudo`, `@class` with optional value.
 *
 * @example
 * Pattern: `(@(?:part|csspart|slot|selector|pseudo|class))\b[ \t]*(\\.?[A-Za-z][A-Za-z0-9_-]*)?`
 */
export const CSSDOC_PART_TAG_PATTERN: Regex<
  "(@(?:part|csspart|slot|selector|pseudo|class))\\b[ \\t]*(\\\.?[A-Za-z][A-Za-z0-9_-]*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(
  String.raw`(@(?:part|csspart|slot|selector|pseudo|class))\b[ \t]*(\\.?[A-Za-z][A-Za-z0-9_-]*)?`,
  "u",
);

/**
 * Property/Custom Property Tag Pattern.
 * Matches tags like `@cssproperty`, `@property` with optional CSS custom property reference.
 *
 * @example
 * Pattern: `(@(?:cssproperty|property))\b[ \t]*(--[A-Za-z][A-Za-z0-9-]*)?`
 */
export const CSSDOC_PROPERTY_TAG_PATTERN: Regex<
  "(@(?:cssproperty|property))\\b[ \\t]*(--[A-Za-z][A-Za-z0-9-]*)?",
  { names: {}; flags: "u" }
> = arkRegex.as(
  String.raw`(@(?:cssproperty|property))\b[ \t]*(${doubleDash}${cssIdentifierStart}${cssIdentifierCont}*)?`,
  "u",
);

/**
 * Ref Tag Pattern.
 * Matches the `@ref` tag with optional numeric reference.
 *
 * @example
 * Pattern: `(@(?:ref))\b[ \t]*(\d+\.?)?`
 */
export const CSSDOC_REF_TAG_PATTERN: Regex<
  "(@(?:ref))\\b[ \\t]*(\\d+\\.?)?",
  { names: {}; flags: "u" }
> = arkRegex.as(String.raw`(@(?:ref))\b[ \t]*(\d+\.?)?`, "u");

// Convenience string exports for use in template literals
export const cssdocIdentifier: string = CSSDOC_IDENTIFIER.source;
export const cssdocRecordName: string = CSSDOC_RECORD_NAME.source;
export const cssdocModifierSuffix: string = CSSDOC_MODIFIER_SUFFIX.source;
export const cssdocModifierChained: string = CSSDOC_MODIFIER_CHAINED.source;
export const cssdocModifierAttribute: string = CSSDOC_MODIFIER_ATTRIBUTE.source;
export const cssdocTag: string = CSSDOC_TAG.source;
export const cssdocTagArg: string = CSSDOC_TAG_ARG.source;
export const cssdocStructureRef: string = CSSDOC_STRUCTURE_REF.source;
export const cssdocCardinality: string = CSSDOC_CARDINALITY.source;
export const cssdocCustomProperty: string = CSSDOC_CUSTOM_PROPERTY.source;
export const cssdocInlineRef: string = CSSDOC_INLINE_REF.source;
export const cssdocRefNum: string = CSSDOC_REF_NUM.source;
export const cssdocStateValue: string = CSSDOC_STATE_VALUE.source;
export const cssdocSelectorValue: string = CSSDOC_SELECTOR_VALUE.source;
export const cssdocStructureCardinality: string = CSSDOC_STRUCTURE_CARDINALITY.source;
export const cssdocSlotDecl: string = CSSDOC_SLOT_DECL.source;
export const cssdocStructureClass: string = CSSDOC_STRUCTURE_CLASS.source;
export const cssdocStructureTag: string = CSSDOC_STRUCTURE_TAG.source;
export const cssdocStructureComponent: string = CSSDOC_STRUCTURE_COMPONENT.source;
export const cssdocStructureBrace: string = CSSDOC_STRUCTURE_BRACE.source;
export const cssdocInlineTagPattern: string = CSSDOC_INLINE_TAG_PATTERN.source;
export const cssdocRecordTagPattern: string = CSSDOC_RECORD_TAG_PATTERN.source;
export const cssdocModifierTagPattern: string = CSSDOC_MODIFIER_TAG_PATTERN.source;
export const cssdocPartTagPattern: string = CSSDOC_PART_TAG_PATTERN.source;
export const cssdocPropertyTagPattern: string = CSSDOC_PROPERTY_TAG_PATTERN.source;
export const cssdocRefTagPattern: string = CSSDOC_REF_TAG_PATTERN.source;
