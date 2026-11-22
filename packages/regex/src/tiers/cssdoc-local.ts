/**
 * Tier 3: cssdoc-Specific Patterns
 *
 * Patterns for cssdoc-specific conventions and use cases:
 * BEM naming conventions, ARIA attribute matching, configuration globbing,
 * and other internal implementation patterns.
 *
 * These patterns are specific to cssdoc's architecture and conventions.
 * Not derived from W3C specs or formal grammars, but centralized here for
 * consistency, type safety, and single-source-of-truth maintenance.
 *
 * References to Tier 0 (Character Classes) are documented for transparency.
 *
 * @module
 */

import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";

/**
 * CSS Class Reference Pattern
 * Matches all CSS class selectors in a selector string.
 * Used in scoped-part scan and base class inference.
 * Uses Tier 0 DOT and ALPHA patterns
 *
 * Matches both regular classes (`.button`) and modifier classes (`.-active`, `.-size-lg`).
 * For chained modifiers, captures only the base part (before the value separator `-`).
 *
 * @example
 * // Returns all matches via exec or matchAll
 * const matches = [...".button.-active.-size-lg".matchAll(CLASS_REF)];
 * // matches[0]?.groups?.className === "button"
 * // matches[1]?.groups?.className === "active"
 * // matches[2]?.groups?.className === "size"
 */
export const CLASS_REF: Regex<
  "\\.(?:-)?(?<className>[A-Za-z_][\\w]*?)(?=-(?!\\.)|\\.($)",
  { names: { className: string }; flags: "gu" }
> = arkRegex.as(String.raw`\.(?:-)?(?<className>[A-Za-z_][\w]*?)(?=-(?!\.)|\.|$)`, "gu");

/**
 * Single CSS Class Selector Pattern
 * Matches a selector that is exactly one class (no other selectors).
 * Used as a filter candidate for base class inference.
 * Uses Tier 0 DOT and ALPHA patterns
 *
 * @example
 * SINGLE_CLASS.test(".button") // true
 * SINGLE_CLASS.test(".button.active") // false
 * SINGLE_CLASS.test("button") // false
 */
export const SINGLE_CLASS: Regex<
  "^\\.(?<class>[A-Za-z_][\\w-]*)$",
  { names: { class: string }; flags: "u" }
> = arkRegex.as(String.raw`^\.(?<class>[A-Za-z_][\w-]*)$`, "u");

/**
 * ARIA State Attribute Pattern
 * Matches ARIA state and data-state attributes.
 * Used to extract state information from attribute selectors.
 *
 * Example attributes:
 * - `[aria-disabled="true"]`
 * - `[aria-pressed="false"]`
 * - `[data-state="active"]`
 *
 * @example
 * ARIA_STATE.exec('[aria-disabled="true"]')?.groups // { attr: "aria-disabled", value: "true" }
 */
export const ARIA_STATE: Regex<
  "\\[\\s*(?<attr>aria-[\\w-]+|data-state)\\s*=\\s*[\"']?(?<value>[^\"']*)",
  { names: { attr: string; value: string }; flags: "u" }
> = arkRegex.as(String.raw`\[\s*(?<attr>aria-[\w-]+|data-state)\s*=\s*["']?(?<value>[^"']*)`, "u");

/**
 * Custom Property Variable Reference Pattern
 * Matches `var(--name)` patterns.
 * Used to track consumed custom properties.
 *
 * @example
 * VAR_REFERENCE.exec("var(--primary-color)")?.groups?.name // "--primary-color"
 */
export const VAR_REFERENCE: Regex<
  "var\\(\\s*(?<name>--[\\w-]+)",
  { names: { name: string }; flags: "gu" }
> = arkRegex.as(String.raw`var\(\s*(?<name>--[\w-]+)`, "gu");

/**
 * Configuration Glob Pattern
 * Matches glob patterns with leading/trailing wildcards and middle path.
 * Used for file configuration matching.
 *
 * Example patterns:
 * - `*slash*slash*components*slash**` (escaped: `*\/components\/**`)
 * - `src*slash***slash*.css` (escaped: `src\/**\/*.css`)
 *
 * @example
 * GLOB_PATTERN.exec("*slash*slash*components*slash**")?.groups
 * // Returns { lead: "**", middle: "components", trail: "**" }
 */
export const GLOB_PATTERN: Regex<
  "^(?<lead>\\*{1,2})/(?<middle>.*?)/(?<trail>\\*{1,2})$",
  { names: { lead: string; middle: string; trail: string }; flags: "u" }
> = arkRegex.as(String.raw`^(?<lead>\*{1,2})/(?<middle>.*?)/(?<trail>\*{1,2})$`, "u");

/**
 * Modifier Chain Pattern
 * Matches consecutive modifier classes in a selector.
 * Used to extract and validate modifier sequences.
 *
 * Example: `.base.-active.-size-lg`
 *
 * @example
 * MODIFIER_CHAIN.exec(".-active.-size-lg")?.groups?.chain // ".-active.-size-lg"
 */
export const MODIFIER_CHAIN: Regex<
  "(?<chain>(?:\\.-[\\w-]+)+)",
  { names: { chain: string }; flags: "u" }
> = arkRegex.as(String.raw`(?<chain>(?:\.-[\w-]+)+)`, "u");

/**
 * Attribute Selector Pattern
 * Matches attribute selector syntax: `[attr]` or `[attr="value"]`
 * Used for state and modifier attribute extraction.
 *
 * Note: Simplified to avoid backreferences for better compatibility.
 *
 * @example
 * ATTRIBUTE_SELECTOR.exec("[disabled]")?.groups // { attr: "disabled" }
 * ATTRIBUTE_SELECTOR.exec("[aria-expanded=true]")?.groups // { attr: "aria-expanded", value: "true" }
 */
export const ATTRIBUTE_SELECTOR: Regex<
  "\\[(?<attr>[\\w-]+)(?:=(?<value>[\"']?[^\\]]*?)(?<quote>[\"'])?)\\?\\]",
  { names: { attr: string; value?: string; quote?: string }; flags: "u" }
> = arkRegex.as(String.raw`\[(?<attr>[\w-]+)(?:=(?<value>["']?[^\]]*?)(?<quote>["'])?)?\]`, "u");

/**
 * Pseudo-Class Pattern
 * Matches pseudo-class selectors like `:hover`, `:focus`, `:not(...)`
 * Used for state and hover/focus condition extraction.
 *
 * @example
 * PSEUDO_CLASS.exec(":hover")?.groups?.name // "hover"
 * PSEUDO_CLASS.exec(":not(.disabled)")?.groups?.name // "not"
 * PSEUDO_CLASS.exec(":not(.disabled)")?.groups?.arg // ".disabled"
 */
export const PSEUDO_CLASS: Regex<
  ":(?<name>[\\w-]+)(?:\\((?<arg>[^)]*)\\))?",
  { names: { name: string; arg?: string }; flags: "u" }
> = arkRegex.as(String.raw`:(?<name>[\w-]+)(?:\((?<arg>[^)]*)\))?`, "u");

/**
 * Pseudo-Element Pattern
 * Matches pseudo-elements like `::before`, `::after`
 * Used for pseudo-element extraction and tracking.
 *
 * @example
 * PSEUDO_ELEMENT.exec("::before")?.groups?.name // "before"
 * PSEUDO_ELEMENT.exec("::after")?.groups?.name // "after"
 */
export const PSEUDO_ELEMENT: Regex<":?:(?<name>[\\w-]+)", { names: { name: string }; flags: "u" }> =
  arkRegex.as(String.raw`:?:(?<name>[\w-]+)`, "u");

/**
 * Combinator Pattern
 * Matches CSS combinators: space (descendant), `>` (child), `+` (adjacent), `~` (general sibling)
 * Used for selector structure analysis.
 *
 * @example
 * COMBINATOR.test(">") // true (child)
 * COMBINATOR.test("+") // true (adjacent sibling)
 */
export const COMBINATOR: Regex<
  "\\s*(?<comb>[>+~])\\s*|(?<desc>\\s+)",
  { names: { comb?: string; desc?: string }; flags: "u" }
> = arkRegex.as(String.raw`\s*(?<comb>[>+~])\s*|(?<desc>\s+)`, "u");

/**
 * Scope Prelude Base Pattern
 * Extracts bare class name from `@scope` prelude (e.g., `(.pfx-alert)`)
 * Used to determine scope ownership for `&`/`:scope` resolution.
 *
 * @example
 * SCOPE_PRELUDE_BASE.exec("(.button)")?.groups?.base // "button"
 */
export const SCOPE_PRELUDE_BASE: Regex<
  "\\(\\s*\\.(?<base>[A-Za-z_][\\w-]*)\\s*\\)",
  { names: { base: string }; flags: "u" }
> = arkRegex.as(String.raw`\(\s*\.(?<base>[A-Za-z_][\w-]*)\s*\)`, "u");

/**
 * BEM Block Pattern
 * Matches a CSS class selector that is exactly one class (the component block).
 * Used to identify the main documented component's class.
 *
 * @example
 * BEM_BLOCK.exec(".button")?.groups?.block // "button"
 * BEM_BLOCK.exec(".my-component")?.groups?.block // "my-component"
 */
export const BEM_BLOCK: Regex<
  "\\.(?<block>[A-Za-z_][\\w-]*)",
  { names: { block: string }; flags: "u" }
> = arkRegex.as(String.raw`\.(?<block>[A-Za-z_][\w-]*)`, "u");

/**
 * BEM Element Pattern
 * Matches BEM double underscore element syntax: `.block__element`
 * Used to extract block and element parts from compound selectors.
 *
 * @example
 * BEM_ELEMENT.exec(".button__icon")?.groups // { block: "button", element: "icon" }
 */
export const BEM_ELEMENT: Regex<
  "\\.(?<block>[\\w-]+)__(?<element>[\\w-]+)",
  { names: { block: string; element: string }; flags: "gu" }
> = arkRegex.as(String.raw`\.(?<block>[\w-]+)__(?<element>[\w-]+)`, "gu");

/**
 * BEM Modifier Pattern
 * Matches BEM double dash modifier syntax: `.block--modifier`
 * Used for identifying modifier conventions and extracting modifier names.
 *
 * @example
 * BEM_MODIFIER.exec(".button--primary")?.groups // { base: "button", mod: "primary" }
 */
export const BEM_MODIFIER: Regex<
  "\\.(?<base>[\\w-]+)--(?<mod>[\\w-]+)",
  { names: { base: string; mod: string }; flags: "gu" }
> = arkRegex.as(String.raw`\.(?<base>[\w-]+)--(?<mod>[\w-]+)`, "gu");

/**
 * RSCSS Variant Pattern
 * Matches RSCSS variant naming: dash-prefixed modifier on components and elements.
 * Applied to both components and their elements: `.-wide`, `.-disabled`, `.-small`
 * Pattern: `.-variant-name`
 * Used for RSCSS variant/modifier extraction.
 *
 * @example
 * RSCSS_VARIANT.exec(".-wide")?.groups?.name // "wide"
 * RSCSS_VARIANT.exec(".-disabled")?.groups?.name // "disabled"
 * RSCSS_VARIANT.exec(".-small")?.groups?.name // "small"
 */
export const RSCSS_VARIANT: Regex<
  "\\.-(?<name>[a-z][\\w-]*)",
  { names: { name: string }; flags: "u" }
> = arkRegex.as(String.raw`\.-(?<name>[a-z][\w-]*)`, "u");

/**
 * RSCSS Component Pattern
 * Matches RSCSS component naming: two or more words with hyphens (lowercase).
 * Examples: `.like-button`, `.article-card`, `.search-form`
 * Pattern: `.component-name` with at least two hyphen-separated words
 * Used to identify RSCSS component base classes.
 *
 * @example
 * RSCSS_COMPONENT.exec(".like-button")?.groups?.component // "like-button"
 * RSCSS_COMPONENT.exec(".article-card")?.groups?.component // "article-card"
 * RSCSS_COMPONENT.exec(".search-form")?.groups?.component // "search-form"
 */
export const RSCSS_COMPONENT: Regex<
  "\\.(?<component>[a-z]+-[a-z][\\w-]*)",
  { names: { component: string }; flags: "u" }
> = arkRegex.as(String.raw`\.(?<component>[a-z]+-[a-z][\w-]*)`, "u");

/**
 * RSCSS Element Selector Pattern
 * Matches RSCSS element selector with child combinator: `> .element`
 * Elements are single-word classnames using `>` to prevent bleeding through nested components.
 * Pattern: `> .element-name` (single word, no hyphens)
 * Used for identifying RSCSS element selectors in CSS rules.
 *
 * @example
 * RSCSS_ELEMENT.exec("> .title")?.groups?.element // "title"
 * RSCSS_ELEMENT.exec("> .avatar")?.groups?.element // "avatar"
 * RSCSS_ELEMENT.exec(">  .firstname")?.groups?.element // "firstname"
 */
export const RSCSS_ELEMENT: Regex<
  ">\\s*\\.(?<element>[a-z]+)",
  { names: { element: string }; flags: "u" }
> = arkRegex.as(String.raw`>\s*\.(?<element>[a-z]+)`, "u");

/**
 * RSCSS Helper Pattern
 * Matches RSCSS helper/utility class naming: underscore-prefixed.
 * Helpers are general-purpose classes typically using !important.
 * Examples: `._unmargin`, `._center`, `._pull-left`
 * Pattern: `._helper-name` with hyphens allowed
 * Used for utility and helper class extraction.
 *
 * @example
 * RSCSS_HELPER.exec("._unmargin")?.groups?.name // "unmargin"
 * RSCSS_HELPER.exec("._center")?.groups?.name // "center"
 * RSCSS_HELPER.exec("._pull-left")?.groups?.name // "pull-left"
 */
export const RSCSS_HELPER: Regex<
  "\\._(?<name>[a-z][\\w-]*)",
  { names: { name: string }; flags: "u" }
> = arkRegex.as(String.raw`\._(?<name>[a-z][\w-]*)`, "u");

/**
 * Bare Chained Modifier Pattern
 * Alternative convention: any class chained to the base with no special prefix.
 * Pattern: `.base.modifier-name`
 * Used for bare/OOCSS convention support.
 *
 * @example
 * BARE_MODIFIER.exec("active")?.groups?.name // "active"
 * BARE_MODIFIER.exec("size-lg")?.groups?.name // "size-lg"
 */
export const BARE_MODIFIER: Regex<
  "(?<name>[A-Za-z_][\\w-]*)",
  { names: { name: string }; flags: "u" }
> = arkRegex.as(String.raw`(?<name>[A-Za-z_][\w-]*)`, "u");

/**
 * State Prefix Pattern
 * Matches common state prefixes used in conventions.
 * Default prefixes: `is-`, `has-`, `can-`, `should-`, `was-`
 * Pattern: prefix followed by state name.
 *
 * @example
 * STATE_PREFIX.exec("is-open")?.groups // { prefix: "is", name: "open" }
 * STATE_PREFIX.exec("has-focus")?.groups // { prefix: "has", name: "focus" }
 */
export const STATE_PREFIX: Regex<
  "(?<prefix>is|has|can|should|was)-(?<name>[A-Za-z_][\\w-]*)",
  { names: { prefix: string; name: string }; flags: "u" }
> = arkRegex.as(String.raw`(?<prefix>is|has|can|should|was)-(?<name>[A-Za-z_][\w-]*)`, "u");

/**
 * Element/Part Name Pattern
 * Matches BEM-style element names: base connected with `__` separator.
 * Pattern: `.base__element`
 * Used for structured part/element extraction.
 *
 * @example
 * ELEMENT_NAME.exec("button__icon")?.groups // { base: "button", element: "icon" }
 */
export const ELEMENT_NAME: Regex<
  "(?<base>[A-Za-z_][\\w-]*)__(?<element>[A-Za-z_][\\w-]*)",
  { names: { base: string; element: string }; flags: "u" }
> = arkRegex.as(String.raw`(?<base>[A-Za-z_][\w-]*)__(?<element>[A-Za-z_][\w-]*)`, "u");

/**
 * Shadow DOM Part Pseudo-Element Pattern
 * Matches `::part(name)` pseudo-element for named slots in shadow DOM.
 * Used to extract part name from pseudo-element.
 *
 * @example
 * PART_PSEUDO.exec("::part(icon)")?.groups?.name // "icon"
 */
export const PART_PSEUDO: Regex<
  "::part\\((?<name>[A-Za-z_][\\w-]*)\\)",
  { names: { name: string }; flags: "u" }
> = arkRegex.as(String.raw`::part\((?<name>[A-Za-z_][\w-]*)\)`, "u");

/**
 * Shadow DOM Slot Pseudo-Element Pattern
 * Matches `::slotted(selector)` pseudo-element for slot selection.
 * Used to extract selector or class name from slotted pseudo-element.
 *
 * @example
 * SLOTTED_PSEUDO.exec("::slotted(.icon)")?.groups?.selector // ".icon"
 */
export const SLOTTED_PSEUDO: Regex<
  "::slotted\\((?<selector>[^)]+)\\)",
  { names: { selector: string }; flags: "u" }
> = arkRegex.as(String.raw`::slotted\((?<selector>[^)]+)\)`, "u");

/**
 * Host Context Pseudo-Class Pattern
 * Matches `:host-context(selector)` for scoped host styling.
 * Used to extract ancestor context selector.
 *
 * @example
 * HOST_CONTEXT.exec(":host-context(.dark-mode)")?.groups?.selector // ".dark-mode"
 */
export const HOST_CONTEXT: Regex<
  ":host-context\\((?<selector>[^)]+)\\)",
  { names: { selector: string }; flags: "u" }
> = arkRegex.as(String.raw`:host-context\((?<selector>[^)]+)\)`, "u");

/**
 * Custom State Pseudo-Class Pattern
 * Matches `:state(name)` for custom element state styling.
 * Used to extract custom state name.
 *
 * @example
 * CUSTOM_STATE.exec(":state(selected)")?.groups?.name // "selected"
 */
export const CUSTOM_STATE: Regex<
  ":state\\((?<name>[A-Za-z_][\\w-]*)\\)",
  { names: { name: string }; flags: "u" }
> = arkRegex.as(String.raw`:state\((?<name>[A-Za-z_][\w-]*)\)`, "u");

// Convenience string exports for use in template literals
export const bemBlock: string = BEM_BLOCK.source;
export const bemElement: string = BEM_ELEMENT.source;
export const bemModifier: string = BEM_MODIFIER.source;
export const classRef: string = CLASS_REF.source;
export const singleClass: string = SINGLE_CLASS.source;
export const ariaState: string = ARIA_STATE.source;
export const varReference: string = VAR_REFERENCE.source;
export const globPattern: string = GLOB_PATTERN.source;
export const modifierChain: string = MODIFIER_CHAIN.source;
export const attributeSelector: string = ATTRIBUTE_SELECTOR.source;
export const pseudoClass: string = PSEUDO_CLASS.source;
export const pseudoElement: string = PSEUDO_ELEMENT.source;
export const combinator: string = COMBINATOR.source;
export const scopePreludeBase: string = SCOPE_PRELUDE_BASE.source;
export const rscssVariant: string = RSCSS_VARIANT.source;
export const rscssComponent: string = RSCSS_COMPONENT.source;
export const rscssElement: string = RSCSS_ELEMENT.source;
export const rscssHelper: string = RSCSS_HELPER.source;
