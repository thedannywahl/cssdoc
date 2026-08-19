/**
 * `@cssdoc/spec` — the canonical cssdoc tag vocabulary. This is the single source of truth for the
 * doc-comment tags: their names, syntactic kinds, aliases, and (for the three argument-bearing tags)
 * the shape of the argument they take. Everything that needs to know "what are the cssdoc tags"
 * derives it from here:
 *
 * - `@cssdoc/core` seeds its {@link https://cssdoc.dev parser configuration} from {@link CSSDOC_TAGS}.
 * - `@cssdoc/tmlanguage` generates its TextMate grammar from it.
 * - `@cssdoc/codemirror` builds its highlighter's matcher from it.
 *
 * The package is intentionally zero-dependency and data-only, so a syntax grammar can consume the
 * vocabulary without pulling in the CSS parser.
 *
 * @module @cssdoc/spec
 */

/** The syntactic kind of a tag, mirroring TSDoc's Block/Modifier/Inline split, plus cssdoc's `record`. */
export type CssdocTagKind = "record" | "block" | "modifier" | "inline";

/** The record kind a `record` tag opens. */
export type CssdocRecordKind = "component" | "utility" | "rule" | "declaration" | "layout";

/** The argument shape a tag accepts, for grammars that highlight it distinctly. */
export type CssdocTagArgument = "modifier-name" | "part-name" | "custom-property";

/** One tag in the canonical vocabulary. */
export interface CssdocTag {
  /** The tag name, without the leading `@` (e.g. `modifier`). */
  name: string;
  /** The tag's syntactic kind. */
  kind: CssdocTagKind;
  /** The canonical tag (without `@`) this tag is an alias of, e.g. `csspart` aliases `part`. */
  aliasFor?: string;
  /** Whether the tag may appear more than once in a comment. */
  allowMultiple?: boolean;
  /** For `record` tags, the {@link CssdocRecordKind} the tag selects. */
  recordKind?: CssdocRecordKind;
  /** For the argument-bearing tags, the shape of the token that follows the tag. */
  argument?: CssdocTagArgument;
}

/**
 * Every standard cssdoc tag, in canonical order. Adopts the Custom Elements Manifest names
 * (`@cssproperty`, `@csspart`, `@cssstate`) where they exist, so the vocabulary is standards-aligned.
 */
export const CSSDOC_TAGS: readonly CssdocTag[] = [
  // Record-opening tags.
  { name: "component", kind: "record", recordKind: "component" },
  { name: "name", kind: "record", recordKind: "component" },
  { name: "utility", kind: "record", recordKind: "utility" },
  { name: "rule", kind: "record", recordKind: "rule" },
  { name: "declaration", kind: "record", recordKind: "declaration" },
  { name: "layout", kind: "record", recordKind: "layout" },
  // Prose (TSDoc-adopted).
  // `@selector` declares the component's base CSS selector when it isn't a plain class:
  // attribute, ID, compound, or :host/:host-context(). `@class` is its deprecated alias.
  { name: "selector", kind: "block" },
  { name: "class", kind: "block", aliasFor: "selector" },
  { name: "summary", kind: "block" },
  { name: "remarks", kind: "block" },
  { name: "privateRemarks", kind: "block" },
  // An internal development note; also recognized in `/* @todo … */` inline comments.
  { name: "todo", kind: "block", allowMultiple: true },
  { name: "deprecated", kind: "block" },
  { name: "example", kind: "block", allowMultiple: true },
  { name: "see", kind: "block", allowMultiple: true },
  { name: "since", kind: "block" },
  { name: "group", kind: "block" },
  { name: "category", kind: "block", aliasFor: "group" },
  { name: "defaultValue", kind: "block" },
  // Annotation legends + local references.
  { name: "annotations", kind: "block" },
  { name: "ref", kind: "block", allowMultiple: true },
  // Object-model decorators.
  { name: "readonly", kind: "block" },
  { name: "global", kind: "block" },
  { name: "preventExtensions", kind: "block" },
  { name: "noextend", kind: "block", aliasFor: "preventExtensions" },
  { name: "sealed", kind: "block" },
  { name: "frozen", kind: "block" },
  // CSS surface (existing + Custom Elements Manifest).
  { name: "modifier", kind: "block", allowMultiple: true, argument: "modifier-name" },
  { name: "part", kind: "block", allowMultiple: true, argument: "part-name" },
  // Distinct from `part`: a shadow-DOM exposed part (`::part(name)`), named by a bare identifier.
  { name: "csspart", kind: "block", allowMultiple: true, argument: "part-name" },
  { name: "cssproperty", kind: "block", allowMultiple: true, argument: "custom-property" },
  {
    name: "property",
    kind: "block",
    allowMultiple: true,
    aliasFor: "cssproperty",
    argument: "custom-property",
  },
  // A component state: a custom `:state(x)` state, a native pseudo-class (`:disabled`), or a bracketed
  // attribute-reflected state (`[aria-sort="ascending"]`, `[data-state="open"]`) for ARIA/data-* states.
  { name: "cssstate", kind: "block", allowMultiple: true },
  // A native pseudo-element the component styles (`::before`, `::marker`, …), named by `::name`.
  { name: "pseudo", kind: "block", allowMultiple: true },
  // Prose for an optional-ancestor wrapper named in `@structure` (e.g. `.badge-wrapper`).
  { name: "wrapper", kind: "block", allowMultiple: true, argument: "part-name" },
  { name: "slot", kind: "block", allowMultiple: true, argument: "part-name" },
  // A design token the component consumes (`var(--*)`); the set is derived from the CSS, this adds prose.
  { name: "tokens", kind: "block", allowMultiple: true, argument: "custom-property" },
  // CSSOM at-rule surfaces.
  { name: "function", kind: "block", allowMultiple: true },
  { name: "keyframes", kind: "block", allowMultiple: true },
  { name: "animation", kind: "block", allowMultiple: true, aliasFor: "keyframes" },
  { name: "layer", kind: "block", allowMultiple: true },
  { name: "container", kind: "block", allowMultiple: true },
  { name: "supports", kind: "block", allowMultiple: true },
  { name: "media", kind: "block", allowMultiple: true },
  { name: "responsive", kind: "block", allowMultiple: true, aliasFor: "media" },
  // Accessibility.
  { name: "a11y", kind: "block", allowMultiple: true },
  { name: "accessibility", kind: "block", allowMultiple: true, aliasFor: "a11y" },
  // Structure & demo.
  { name: "structure", kind: "block" },
  { name: "element", kind: "block", allowMultiple: true },
  { name: "demo", kind: "block" },
  // Usage, compatibility & related.
  { name: "usage", kind: "block" },
  { name: "compat", kind: "block", allowMultiple: true },
  { name: "related", kind: "block", allowMultiple: true },
  // Declared family membership: distinct from `@structure` containment (fixed position) and from
  // `@related` (loose "see also") — feeds the parent's Subcomponents section. A trailing `private`
  // keyword means this record must only ever appear inside that parent.
  { name: "memberOf", kind: "block" },
  // The inverse direction of `@memberOf`: a parent declares its members directly, comma-separated —
  // for members that don't share a dotted name with this record.
  { name: "members", kind: "block" },
  // Modifier (flag) tags — release stage.
  { name: "alpha", kind: "modifier" },
  { name: "beta", kind: "modifier" },
  { name: "experimental", kind: "modifier" },
  { name: "internal", kind: "modifier" },
  { name: "public", kind: "modifier" },
  { name: "stable", kind: "modifier" },
  // Inline tags.
  { name: "link", kind: "inline" },
  { name: "inheritDoc", kind: "inline" },
  { name: "label", kind: "inline" },
];

/** The names (without `@`) of every standard tag, in canonical order. */
export const CSSDOC_TAG_NAMES: readonly string[] = CSSDOC_TAGS.map((t) => t.name);

/** The names of the tags of a given kind, in canonical order. */
export const cssdocTagNamesByKind = (kind: CssdocTagKind): string[] =>
  CSSDOC_TAGS.filter((t) => t.kind === kind).map((t) => t.name);

/** The names of the tags that take a given argument shape, in canonical order. */
export const cssdocTagNamesByArgument = (argument: CssdocTagArgument): string[] =>
  CSSDOC_TAGS.filter((t) => t.argument === argument).map((t) => t.name);

/**
 * MDN-style HTML element group aliases used by `@element` declarations.
 *
 * Keys are kebab-cased aliases; values are the concrete HTML element names in that group.
 * This is a versioned local snapshot (not live-fetched at runtime) so parsing/linting is deterministic.
 */
export const HTML_ELEMENT_GROUPS: Readonly<Record<string, readonly string[]>> = {
  "main-root": ["html"],
  "document-metadata": ["base", "head", "link", "meta", "style", "title"],
  "sectioning-root": ["body"],
  "content-sectioning": [
    "address",
    "article",
    "aside",
    "footer",
    "header",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hgroup",
    "main",
    "nav",
    "search",
    "section",
  ],
  "text-content": [
    "blockquote",
    "dd",
    "div",
    "dl",
    "dt",
    "figcaption",
    "figure",
    "hr",
    "li",
    "menu",
    "ol",
    "p",
    "pre",
    "ul",
  ],
  "inline-text-semantics": [
    "a",
    "abbr",
    "b",
    "bdi",
    "bdo",
    "br",
    "cite",
    "code",
    "data",
    "dfn",
    "em",
    "i",
    "kbd",
    "mark",
    "q",
    "rp",
    "rt",
    "ruby",
    "s",
    "samp",
    "small",
    "span",
    "strong",
    "sub",
    "sup",
    "time",
    "u",
    "var",
    "wbr",
  ],
  "image-and-multimedia": ["area", "audio", "img", "map", "track", "video"],
  "embedded-content": ["embed", "fencedframe", "iframe", "object", "picture", "source"],
  "svg-and-mathml": ["svg", "math"],
  scripting: ["canvas", "noscript", "script"],
  "demarcating-edits": ["del", "ins"],
  "table-content": [
    "caption",
    "col",
    "colgroup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
  ],
  forms: [
    "button",
    "datalist",
    "fieldset",
    "form",
    "input",
    "label",
    "legend",
    "meter",
    "optgroup",
    "option",
    "output",
    "progress",
    "select",
    "selectedcontent",
    "textarea",
  ],
  "interactive-elements": ["details", "dialog", "geolocation", "summary"],
  "web-components": ["slot", "template"],
  "obsolete-and-deprecated-elements": [
    "acronym",
    "big",
    "center",
    "content",
    "dir",
    "font",
    "frame",
    "frameset",
    "image",
    "marquee",
    "menuitem",
    "nobr",
    "noembed",
    "noframes",
    "param",
    "plaintext",
    "rb",
    "rtc",
    "shadow",
    "strike",
    "tt",
    "xmp",
  ],
};

/** All known HTML elements from {@link HTML_ELEMENT_GROUPS}, sorted and de-duplicated. */
export const HTML_ELEMENT_NAMES: readonly string[] = [
  ...new Set(Object.values(HTML_ELEMENT_GROUPS).flatMap((v) => v)),
].sort((a, b) => a.localeCompare(b));
