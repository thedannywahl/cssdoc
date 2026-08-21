/**
 * The serializable CSS-documentation model — the output-agnostic IR produced by {@link parseCssDocs}.
 * Emitters (markdown, JSON, …) consume this; it carries no assumptions about any particular project,
 * class prefix, or output format.
 *
 * The model documents the modern CSSOM surface a stylesheet exposes: modifiers and parts, registered
 * custom properties (`@property`), custom functions (`@function`), animations (`@keyframes`), cascade
 * layers (`@layer`), conditional-support blocks (`@container`/`@supports`/`@media`), states, and slots.
 * Facts that can be derived from the CSS AST are derived (so they can't drift); doc-comment tags supply
 * the prose.
 *
 * @module
 */

/**
 * A modifier variation on a component's base class. How modifiers are spelled is configurable (see
 * {@link ParseOptions.modifierConvention}); the default is BEM (`.button--primary`).
 */
export interface CssModifier {
  /**
   * The modifier as written, minus its outer punctuation — its exact spelling depends on the
   * convention: `button--primary` (BEM, the default), `-color-secondary` (rscss), `primary`
   * (bare/OOCSS), or `data-variant="ghost"` (CUBE attribute).
   */
  name: string;
  /** The property segment — a grouping key derived from the modifier (e.g. `color`, `variant`, `primary`). */
  prop: string;
  /** The value segment, e.g. `secondary` or `ghost`; absent for boolean/flag modifiers. */
  value?: string;
  /**
   * Set when this is a `*` family (e.g. `-icon-*`) rather than a single modifier — authored as
   * `@modifier -icon-*` and/or derived from a `[class*="-icon-"]` selector. Concrete usages
   * (`-icon-arrow`) are matched against it as instances.
   */
  pattern?: boolean;
  /** Prose from a `@modifier` doc tag, when authored. */
  description?: string;
  /**
   * The original CSS selector when the modifier was authored with a non-class form (attribute, ID,
   * `:host`) or an alias — parallel to {@link CssPart.selector}. Absent for class and bare-name
   * modifiers, which are the common AST-derived forms.
   */
  selector?: string;
  /**
   * Set when the modifier is deprecated. `canonical` (from an AST alias marker) is the modifier class
   * to use instead; `note` (from an authored inline deprecation tag on the `@modifier` line) is
   * free-text replacement guidance for cases where the replacement isn't itself a modifier.
   */
  deprecated?: { canonical?: string; note?: string };
  /**
   * Set when the modifier is an alias of another modifier. `canonical` names the canonical modifier;
   * `note` carries optional authored guidance from an inline `@alias` tag.
   */
  alias?: { canonical?: string; note?: string };
  /**
   * Set via an authored inline `@modifier -x — @interaction …` marker: a class toggled by script (a
   * JS interaction hook, e.g. `-should-animate`) that carries no CSS declarations of its own. Exempts
   * the modifier from the "documented modifier isn't defined by any selector" check, since it's
   * expected to have no CSS backing.
   */
  interaction?: boolean;
  /**
   * Set via an authored inline `@modifier -x — @global …` marker: this modifier applies to any
   * component/layout/rule/declaration (not just its parent record). When set, the modifier is matched
   * globally during validation and consumption checks.
   */
  global?: boolean;
  /**
   * Set via an authored inline `@modifier -x — @affects <component>.<target> …` marker: this modifier
   * changes how a *descendant record* (typically a sub-component reached via `@structure`/`@memberOf`)
   * renders — e.g. `.table.-layout-stacked .table-cell::before {…}`. `target` is a part, pseudo-element,
   * or state name on `component`; the CSS rule causing the effect lives in that other record's own
   * stylesheet, not this one, so there'd otherwise be nothing on this modifier pointing a reader there.
   */
  affects?: { component: string; target: string; description?: string }[];
}

/** A sub-element ("part") of a component — a scoped child class like `.item` or `.tip`. */
export interface CssPart {
  /** The part's derived name without leading punctuation, e.g. `item` or `data-layout`. */
  name: string;
  /**
   * The original CSS selector when the part isn't a plain class, e.g. `[data-layout="x"]`, `#foo`,
   * `:host`. Absent for class parts (the selector is `.${name}`).
   */
  selector?: string;
  /** Prose from a `@part` doc tag, when authored. */
  description?: string;
  /** The part's own modifiers, e.g. `.block__element--active` on a BEM element. Present when non-empty. */
  modifiers?: CssModifier[];
}

/**
 * How a component state is spelled — the CSSOM custom state `:state(x)`, a native pseudo-class
 * (`:disabled`), a state class from the convention's `statePrefixes` (`.is-open`), or a bracketed
 * attribute-reflected state (`[aria-sort="ascending"]`). Only `custom` maps to a Custom Elements
 * Manifest `cssStates` entry.
 */
export type CssStateKind = "custom" | "pseudo-class" | "class" | "attribute";

/** A component state — from `:state()`, a native pseudo-class, a state class, or an attribute (`@cssstate`). */
export interface CssState {
  /**
   * The state's derived name without its punctuation, e.g. `open`, `selected`, `disabled`, or
   * `aria-sort="ascending"` for an attribute state.
   */
  name: string;
  /** How the state is expressed in CSS. */
  kind: CssStateKind;
  /** Prose from a `@cssstate` doc tag, when authored. */
  description?: string;
  /** The full bracketed selector for an `attribute` state, e.g. `[aria-sort="ascending"]`. */
  selector?: string;
}

/**
 * A native pseudo-element a component styles (`::before`, `::marker`, `::selection`, …) — from a
 * `@pseudo` doc tag or derived from a `::name` selector. Shadow `::part()` parts are modeled separately
 * as {@link CssPart} (`shadowParts`), since only they map to a Custom Elements Manifest entry.
 */
export interface CssPseudoElement {
  /** The pseudo-element name without the leading `::`, e.g. `before`. */
  name: string;
  /** Prose from a `@pseudo` doc tag, when authored. */
  description?: string;
}

/** A named slot a component shell exposes (`@slot`, Custom Elements Manifest). */
export interface CssSlot {
  /** The slot name (empty string for the default slot). */
  name: string;
  /** Prose from a `@slot` doc tag, when authored. */
  description?: string;
}

/** A custom property the component declares (`@property`) or documents (`@cssproperty`). */
export interface CssPropertyDeclared {
  /** The custom-property name, e.g. `--value`. */
  name: string;
  /** The `@property` `syntax` descriptor, e.g. `<number>`, when known. */
  syntax?: string;
  /** The `@property` `inherits` flag, when declared. */
  inherits?: boolean;
  /** The default value (`@property` `initial-value`, or an authored `@defaultValue`), when known. */
  defaultValue?: string;
  /** Prose from a `@cssproperty` doc tag, when authored. */
  description?: string;
}

/** A CSS custom function (`@function --name`) the stylesheet defines. */
export interface CssFunction {
  /** The function name, e.g. `--negate`. */
  name: string;
  /** The declared parameters, e.g. `["--value"]`, when derivable from the `@function` at-rule. */
  parameters: string[];
  /** The `result` descriptor/type, when declared. */
  result?: string;
  /** Prose from a `@function` doc tag, when authored. */
  description?: string;
}

/** An animation the component exposes (`@keyframes` at-rule / `@animation` doc tag). */
export interface CssAnimation {
  /** The animation (keyframes) name. */
  name: string;
  /** Prose from an `@animation`/`@keyframes` doc tag, when authored. */
  description?: string;
}

/** A cascade layer the stylesheet participates in (`@layer`). */
export interface CssLayer {
  /** The layer name, possibly dotted (e.g. `theme.dark`). */
  name: string;
  /** Prose from a `@layer` doc tag, when authored. */
  description?: string;
}

/** A conditional-support block the component's rules sit under. */
export interface CssCondition {
  /** Which at-rule expressed the condition. */
  type: "container" | "supports" | "media";
  /** The condition text, e.g. `(min-width: 40rem)` or `(display: grid)`. */
  query: string;
  /** A container name, for `@container` blocks that target a named container. */
  containerName?: string;
  /** Prose from a `@container`/`@supports`/`@media`/`@responsive` doc tag, when authored. */
  description?: string;
}

/**
 * What kind of CSS surface a record documents. `component` is a namespaced component class with
 * `-modifier`s and parts; `utility` a single-purpose class family; `rule` bare-element/reset styling;
 * `declaration` a custom-property / `@property` registration layer. The record-opening tag chooses it
 * (`@component`/`@utility`/`@rule`/`@declaration`); `@name` is an alias for `component`.
 */
export type CssRecordKind = "component" | "utility" | "rule" | "declaration" | "layout";

/**
 * The resolved element constraints for one `@element` declaration profile.
 *
 * - `any=true` means unrestricted elements.
 * - `allowed` is the effective allow-set after group expansion and negation.
 */
export interface CssElementProfile {
  /** Whether this profile allows any HTML element. */
  any: boolean;
  /** The normalized effective allow-set (sorted, de-duplicated). */
  allowed: string[];
  /** Positively authored element names after normalization (sorted, de-duplicated). */
  include: string[];
  /** Negated element names after normalization (sorted, de-duplicated). */
  exclude: string[];
  /** Positively authored MDN-style group aliases (sorted, de-duplicated). */
  groups: string[];
  /** Negated MDN-style group aliases (sorted, de-duplicated). */
  excludedGroups: string[];
}

/** Resolved `@element` constraints: the default profile plus optional named profiles. */
export interface CssElementConstraints {
  /** The unnamed/default `@element` profile for this record. */
  default: CssElementProfile;
  /** Named `@element <profile>: ...` profiles. */
  profiles: Record<string, CssElementProfile>;
}

/**
 * A release stage from a modifier (flag) tag — `@alpha`, `@beta`, `@experimental`, `@internal`,
 * `@public`, or `@stable` — mirroring TSDoc's release-tag semantics.
 */
export type CssReleaseStage = "alpha" | "beta" | "experimental" | "internal" | "public" | "stable";

/**
 * A node in an authored structure tree (`@structure`), written as nested CSS: a compound selector for
 * the element and its children (the rules nested inside it). Emitters render the tree and, via
 * {@link toMermaid}, a diagram.
 */
export interface StructureNode {
  /** The node's compound selector, e.g. `.tabs`, `.tab.-selected`, or `.list:has(.tab)`. Empty string for `@scope` boundary nodes. */
  selector: string;
  /**
   * How often the child may appear, from a trailing pseudo on the selector: `:optional`/`:opt` (0..1),
   * `:many` (0..n), or `:one-or-more`/`:more` (1..n). Absent means the child is required (present when
   * the component is used). A pseudo, not a `/* … *\/` comment, because `@structure` lives inside a doc
   * comment where comments can't nest; an unknown pseudo is valid selector syntax and is stripped from
   * the stored selector.
   */
  cardinality?: "optional" | "many" | "one-or-more";
  /**
   * When present, this node is a `@scope` boundary. The value is the `@scope` prelude,
   * e.g. `(.component)` from `@scope (.component) { … }`.
   */
  scope?: string;
  /** The full single-selector argument from a `:is(…)` compound — means this element itself carries that selector (co-location, not containment). E.g. `.pfx-card`, `button`, `#id`, `[attr="val"]`. */
  colocated?: string;
  /** Prose from a `@wrapper` doc tag matching this node's class, when authored (annotates the node). */
  description?: string;
  /** Child nodes (rules nested one brace level deeper). */
  children: StructureNode[];
}

/**
 * One alternative DOM shape for a component, from a top-level `@variant <name>? { … }` block inside
 * `@structure` — only present when the author needs to say "pick one of these" (e.g. a `<label>`
 * wrapping a control vs. a `<label for>` + a sibling control), as opposed to {@link StructureNode}'s
 * default of "these roots all coexist".
 */
export interface StructureVariant {
  /** The author-supplied name from `@variant <name>`, when given (bare `@variant` omits it). */
  name?: string;
  /** This variant's root nodes, parsed the same way a plain `@structure` body is. */
  nodes: StructureNode[];
}

/**
 * A design token the component consumes via `var(--*)`. The set is derived from the CSS; an authored
 * `@tokens` tag annotates one with prose (and may add a token not literally found via `var()`). Type and
 * resolved value are not modeled here — an emitter resolves them via its own token source (e.g. a
 * `resolveToken` hook).
 */
export interface CssTokenConsumed {
  /** The custom-property name, e.g. `--color-primary`. */
  name: string;
  /** Prose from an `@tokens` doc tag, when authored. */
  description?: string;
}

/** A related component cross-reference (`@related`). */
export interface CssRelated {
  /** The related record's name, e.g. `card`. */
  name: string;
  /** Prose from the `@related` tag, when authored. */
  description?: string;
}

/**
 * A declared family membership (`@memberOf`) — distinct from `@structure` containment (a fixed position
 * inside one parent's tree) and from `@related` (a loose, undirected "see also"). Feeds the parent's
 * Subcomponents section even when this record isn't nested in the parent's own `@structure`.
 */
export interface CssMemberOf {
  /** The parent record's name, e.g. `table`. */
  component: string;
  /**
   * Set by a trailing `private` keyword (`@memberOf side-nav-bar private`): this record must only ever
   * appear inside `component`, never standalone or under a different parent. Named after TypeScript's
   * own scoping keyword ("only usable within the declaring scope"), and independent of `@sealed`/
   * `@noextend` — those constrain a record's own extensibility, this constrains where it may appear.
   */
  private: boolean;
}

/** One parent-side member declaration (`@member <name> [private]`). */
export interface CssMemberDeclaration {
  /** The member record's name, e.g. `table-cell`. */
  name: string;
  /** Whether this declaration marks the member private to the parent. */
  private: boolean;
}

/** One annotation legend row from `@annotations`. */
export interface CssAnnotation {
  /** Numeric reference index, consumed by `@ref`. */
  ref: number;
  /** Free-form legend text for that index. */
  text: string;
}

/** Record-level object-model decorators. */
export type CssDecorator = "readonly" | "preventExtensions" | "sealed" | "frozen";

/** Where a record was authored, for source links. Positions are 1-based, matching PostCSS. */
export interface CssSource {
  /** The file the record was parsed from, when {@link ParseOptions.fileName} was supplied. */
  file?: string;
  /** The 1-based line of the record's opening doc comment. */
  line?: number;
  /** The 1-based column of the record's opening doc comment. */
  column?: number;
}

/** One documented CSS record: its base class plus everything derived from the CSS + doc comments. */
export interface CssDocEntry {
  /** The record name from `@component`/`@utility`/`@rule`/`@declaration`/`@name`, e.g. `button`. */
  name: string;
  /** Which kind of CSS surface this documents (defaults to `component`). */
  kind: CssRecordKind;
  /** The base CSS selector — a class (`.button`), attribute (`[data-layout="x"]`), ID (`#foo`),
   *  or shadow-DOM pseudo (`:host`) — inferred from the first bare-class rule or set explicitly via
   *  `@selector`. Always non-empty (falls back to `.${name}` when inference fails). */
  className: string;
  /** One-line summary from `@summary`. */
  summary?: string;
  /** Extended prose from `@remarks`. */
  remarks?: string;
  /** Internal-only prose from `@privateRemarks` (emitters may choose to omit it from public output). */
  privateRemarks?: string;
  /** The release stage from a modifier flag tag (`@alpha`/`@beta`/`@experimental`/`@internal`/`@public`). */
  releaseStage?: CssReleaseStage;
  /** Version introduced, from `@since`. */
  since?: string;
  /** A documentation group/category, from `@group`/`@category`. */
  group?: string;
  /** Accessibility guidance, from `@a11y`/`@accessibility`. */
  accessibility?: string;
  /**
   * Set when this record carries a `@global` tag — its modifiers (and per-modifier `@global` flags)
   * apply to any component/layout/rule/declaration, not just this record's base class. Used during
   * validation and consumption checks to resolve modifier matches globally.
   */
  global?: boolean;
  /** AST-extracted modifiers, annotated with `@modifier` prose where authored. */
  modifiers: CssModifier[];
  /** AST-extracted sub-element parts (class-based), annotated with `@part` prose where authored. */
  parts: CssPart[];
  /** Shadow-DOM exposed parts (`::part(name)`), from `@csspart` or a `::part()` selector. */
  shadowParts: CssPart[];
  /** Native pseudo-elements the component styles (`::before`, `::marker`, …), from `@pseudo` or a selector. */
  pseudoElements: CssPseudoElement[];
  /** States the component reacts to, from `@cssstate`, `:state()`, pseudo-classes, or state classes. */
  states: CssState[];
  /** Named slots the component shell exposes, from `@slot`. */
  slots: CssSlot[];
  /** Allowed HTML elements from `@element` (default + optional named profiles). */
  elements?: CssElementConstraints;
  /**
   * Internal to-do notes, from `@todo` tags and `/* @todo … *\/` inline comments. Development notes,
   * not public API — emitters may omit them (like {@link CssDocEntry.privateRemarks}).
   */
  todos: string[];
  /**
   * Design tokens this component consumes: every `--*` custom property referenced via `var(...)` inside
   * its rules, each annotated with `@tokens` prose where authored (and including any `@tokens`-declared
   * token not literally found via `var()`).
   */
  cssPropertiesConsumed: CssTokenConsumed[];
  /** Custom properties this component declares (`@property`) or documents (`@cssproperty`). */
  cssPropertiesDeclared: CssPropertyDeclared[];
  /** CSS custom functions (`@function`) this component defines. */
  functions: CssFunction[];
  /** Animations (`@keyframes`) this component exposes. */
  animations: CssAnimation[];
  /** Cascade layers (`@layer`) this component participates in. */
  layers: CssLayer[];
  /** Conditional-support blocks (`@container`/`@supports`/`@media`) the rules sit under. */
  conditions: CssCondition[];
  /** `@example` blocks, verbatim. */
  examples: string[];
  /**
   * The authored `@structure` element tree (top-level nodes), when present. When the `@structure` body
   * uses `@variant` blocks (see {@link structureVariants}), this holds the first variant's nodes only,
   * for back-compat with any code that hasn't been updated to read `structureVariants`.
   */
  structure?: StructureNode[];
  /**
   * Alternative DOM shapes for this component, when the authored `@structure` body contains one or
   * more top-level `@variant` blocks — absent for the common case of a single, non-variant structure.
   */
  structureVariants?: StructureVariant[];
  /** An optional prose description leading the `@structure` body, when authored. */
  structureDescription?: string;
  /** `@demo <spec>` (e.g. `self:button`), when authored. */
  demo?: string;
  /** Component-level deprecation replacement text, when authored (the argument to a `@deprecated` tag). */
  deprecated?: string;
  /** `@see <ref>` cross-references. */
  see: string[];
  /** Usage prose from `@usage` — how to include the stylesheet / use the component. */
  usage?: string;
  /** Local annotation legend rows from `@annotations`, in author order. */
  annotations: CssAnnotation[];
  /** Local annotation references from `@ref`, in author order. */
  refs: number[];
  /** Record-level object-model decorators. */
  decorators: CssDecorator[];
  /** Browser-support / feature-compatibility notes from `@compat`. */
  compat: string[];
  /** Related components from `@related`. */
  related: CssRelated[];
  /**
   * Declared family membership from `@memberOf` — this record is a member of another named record,
   * optionally `private` (must only ever appear inside that parent). Absent when not authored.
   */
  memberOf?: CssMemberOf;
  /** Member record names from `@members` — the inverse direction, declared on the parent. */
  members?: string[];
  /** Structured parent-side member declarations from repeated `@member` tags. */
  memberDeclarations?: CssMemberDeclaration[];
  /** Where the record was authored, when position info is available (for source links). */
  source?: CssSource;
  /**
   * Content of registered custom (block) tags, keyed by tag name without its `@`. Populated only for
   * tags added via configuration; unregistered unknown tags are ignored. Absent when none were found.
   */
  customBlocks?: Record<string, string[]>;
}

/** A PostCSS parse function — turns a source string into a Root. Inject one to read a non-CSS dialect. */
export type CssParse = (css: string) => import("postcss").Root;

/** Options for {@link parseCssDocs}. */
export interface ParseOptions {
  /**
   * How records are delimited. By default a new record begins at any doc comment (`/** … *\/`) that
   * carries an `@component` or `@name` tag, which is the recommended, framework-agnostic convention.
   * Supply a custom test to split on something else (e.g. a per-component header comment).
   */
  isRecordBoundary?: (commentText: string) => string | undefined;
  /**
   * The tag configuration (standard + custom tags, and which are supported). Defaults to a fresh
   * {@link CssDocConfiguration} with every standard tag enabled — i.e. the full built-in vocabulary.
   * Supply one (e.g. from `@cssdoc/config`) to register custom tags or disable standard ones.
   */
  configuration?: import("./configuration.ts").CssDocConfiguration;
  /**
   * The modifier convention — how modifier classes are spelled (BEM `.button--primary` by default;
   * `rscss`, `bare`, or a custom `ModifierConvention` for SUIT/CUBE/etc.). Overrides the
   * `configuration`'s convention when both are given.
   */
  modifierConvention?: import("./modifier.ts").ModifierConventionInput;
  /**
   * The PostCSS parser to read `css` with. Defaults to `postcss.parse` (plain CSS). Inject a dialect
   * parser (e.g. `postcss-scss`/`postcss-less` via `@cssdoc/dialects`) to document `.scss`/`.less`.
   */
  parse?: CssParse;
  /**
   * The source file name to record on each entry's {@link CssSource}, enabling source links. The parser
   * always records line/column; supply this to also record the file.
   */
  fileName?: string;
}
