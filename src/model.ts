/**
 * The serializable CSS-documentation model — the output-agnostic IR produced by {@link parseCssDocs}.
 * Emitters (markdown, JSON, …) consume this; it carries no assumptions about any particular project,
 * class prefix, or output format.
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
  /** Set when the modifier is a deprecated alias; `canonical` is the modifier to use instead. */
  deprecated?: { canonical: string };
}

/** A sub-element ("part") of a component — a scoped child class like `.item` or `.tip`. */
export interface CssPart {
  /** The part class without the leading dot, e.g. `item`. */
  name: string;
  /** Prose from a `@part` / `@csspart` doc tag, when authored. */
  description?: string;
}

/** A custom property the component declares (`@property --x`) or documents (`@cssproperty`). */
export interface CssPropertyDeclared {
  /** The custom-property name, e.g. `--value`. */
  name: string;
  /** The `@property` `syntax` descriptor, e.g. `<number>`, when known. */
  syntax?: string;
  /** Prose from a `@cssproperty` doc tag, when authored. */
  description?: string;
}

/** One documented CSS component: its base class plus everything derived from the CSS + doc comments. */
export interface CssDocEntry {
  /** The record name from `@component`/`@name`, e.g. `button`. */
  name: string;
  /** The base class selector, e.g. `.instui-button` (inferred from the first bare-class rule). */
  className: string;
  /** One-line summary from `@summary`. */
  summary?: string;
  /** AST-extracted modifiers, annotated with `@modifier` prose where authored. */
  modifiers: CssModifier[];
  /** AST-extracted sub-element parts, annotated with `@part`/`@csspart` prose where authored. */
  parts: CssPart[];
  /** Every `--*` custom property referenced via `var(...)` inside this component's rules. */
  cssPropertiesConsumed: string[];
  /** Custom properties this component declares (`@property`) or documents (`@cssproperty`). */
  cssPropertiesDeclared: CssPropertyDeclared[];
  /** `@example` blocks, verbatim. */
  examples: string[];
  /** `@demo <spec>` (e.g. `self:button`), when authored. */
  demo?: string;
  /** Component-level `@deprecated <replacement>` text, when authored. */
  deprecated?: string;
  /** `@see <ref>` cross-references. */
  see: string[];
}

/** Options for {@link parseCssDocs}. */
export interface ParseOptions {
  /**
   * How records are delimited. By default a new record begins at any doc comment (`/** … *\/`) that
   * carries an `@component` or `@name` tag, which is the recommended, framework-agnostic convention.
   * Supply a custom test to split on something else (e.g. a per-component header comment).
   */
  isRecordBoundary?: (commentText: string) => string | undefined;
}
