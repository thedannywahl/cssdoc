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

/** A `-<prop>-<value>` (or boolean `-<flag>`) modifier on a component's base class. */
export interface CssModifier {
  /** The modifier class without the leading dot, e.g. `-color-secondary` or `-condensed`. */
  name: string;
  /** The property segment, e.g. `color` (the text after the first `-`, up to the next `-`). */
  prop: string;
  /** The value segment, e.g. `secondary`; absent for boolean modifiers. */
  value?: string;
  /** Prose from a `@modifier` doc tag, when authored. */
  description?: string;
  /**
   * Set when the modifier is deprecated. `canonical` (from an AST alias marker) is the modifier class
   * to use instead; `note` (from an authored inline deprecation tag on the `@modifier` line) is
   * free-text replacement guidance for cases where the replacement isn't itself a modifier.
   */
  deprecated?: { canonical?: string; note?: string };
}

/** A sub-element ("part") of a component — a scoped child class like `.item` or `.tip`. */
export interface CssPart {
  /** The part class without the leading dot, e.g. `item`. */
  name: string;
  /** Prose from a `@part` / `@csspart` doc tag, when authored. */
  description?: string;
}

/** A component state — a `:state()` / state-class the component reacts to (`@cssstate`). */
export interface CssState {
  /** The state name, e.g. `open` or `selected`. */
  name: string;
  /** Prose from a `@cssstate` doc tag, when authored. */
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
export type CssRecordKind = "component" | "utility" | "rule" | "declaration";

/**
 * A release stage from a modifier (flag) tag — `@alpha`, `@beta`, `@experimental`, `@internal`, or
 * `@public` — mirroring TSDoc's release-tag semantics.
 */
export type CssReleaseStage = "alpha" | "beta" | "experimental" | "internal" | "public";

/**
 * A node in an authored HTML-structure tree (`@structure`): a selector for the element and its
 * children. Emitters render it as an indented tree and, via {@link toMermaid}, as a diagram.
 */
export interface StructureNode {
  /** The node's selector/label, e.g. `.instui-tabs` or `.tab.-selected` or `button`. */
  selector: string;
  /** Child nodes (one indentation level deeper). */
  children: StructureNode[];
}

/** One documented CSS record: its base class plus everything derived from the CSS + doc comments. */
export interface CssDocEntry {
  /** The record name from `@component`/`@utility`/`@rule`/`@declaration`/`@name`, e.g. `button`. */
  name: string;
  /** Which kind of CSS surface this documents (defaults to `component`). */
  kind: CssRecordKind;
  /** The base class selector, e.g. `.instui-button` (inferred from the first bare-class rule). */
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
  /** AST-extracted modifiers, annotated with `@modifier` prose where authored. */
  modifiers: CssModifier[];
  /** AST-extracted sub-element parts, annotated with `@part`/`@csspart` prose where authored. */
  parts: CssPart[];
  /** States the component reacts to, from `@cssstate`. */
  states: CssState[];
  /** Named slots the component shell exposes, from `@slot`. */
  slots: CssSlot[];
  /** Every `--*` custom property referenced via `var(...)` inside this component's rules. */
  cssPropertiesConsumed: string[];
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
  /** The authored `@structure` HTML tree (top-level nodes), when present. */
  structure?: StructureNode[];
  /** `@demo <spec>` (e.g. `self:button`), when authored. */
  demo?: string;
  /** Component-level deprecation replacement text, when authored (the argument to a `@deprecated` tag). */
  deprecated?: string;
  /** `@see <ref>` cross-references. */
  see: string[];
  /**
   * Content of registered custom (block) tags, keyed by tag name without its `@`. Populated only for
   * tags added via configuration; unregistered unknown tags are ignored. Absent when none were found.
   */
  customBlocks?: Record<string, string[]>;
}

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
}
