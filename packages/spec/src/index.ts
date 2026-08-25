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
  /** A one-line description of the tag's purpose, surfaced in editor completions/hover. */
  description?: string;
}

/**
 * Every standard cssdoc tag, in canonical order. Adopts the Custom Elements Manifest names
 * (`@cssproperty`, `@csspart`, `@cssstate`) where they exist, so the vocabulary is standards-aligned.
 */
export const CSSDOC_TAGS: readonly CssdocTag[] = [
  // Record-opening tags.
  {
    name: "component",
    kind: "record",
    recordKind: "component",
    description: "Opens a component record — the doc comment above its base class rule.",
  },
  { name: "name", kind: "record", recordKind: "component", description: "Alias for @component." },
  {
    name: "utility",
    kind: "record",
    recordKind: "utility",
    description: "Opens a utility record — a single-purpose class with no variants.",
  },
  {
    name: "rule",
    kind: "record",
    recordKind: "rule",
    description: "Opens a plain CSS rule record.",
  },
  {
    name: "declaration",
    kind: "record",
    recordKind: "declaration",
    description: "Opens a custom-property or custom-function declaration record.",
  },
  {
    name: "layout",
    kind: "record",
    recordKind: "layout",
    description: "Opens a layout record — a container/grid pattern rather than a component.",
  },
  // Prose (TSDoc-adopted).
  // `@selector` declares the component's base CSS selector when it isn't a plain class:
  // attribute, ID, compound, or :host/:host-context(). `@class` is its deprecated alias.
  {
    name: "selector",
    kind: "block",
    description: "Declares the record's base CSS selector when it isn't a plain class.",
  },
  {
    name: "class",
    kind: "block",
    aliasFor: "selector",
    description: "Deprecated alias for @selector.",
  },
  { name: "summary", kind: "block", description: "A one-line description of the record." },
  { name: "remarks", kind: "block", description: "Extended prose beyond the @summary." },
  {
    name: "privateRemarks",
    kind: "block",
    description: "Internal prose stripped from public output.",
  },
  // An internal development note; also recognized in `/* @todo … */` inline comments.
  {
    name: "todo",
    kind: "block",
    allowMultiple: true,
    description: "An internal to-do note.",
  },
  {
    name: "deprecated",
    kind: "block",
    description: "Marks the record deprecated, with an optional replacement note.",
  },
  { name: "example", kind: "block", allowMultiple: true, description: "A usage example." },
  { name: "see", kind: "block", allowMultiple: true, description: "A related link or reference." },
  { name: "since", kind: "block", description: "The version the record was introduced in." },
  { name: "group", kind: "block", description: "Groups the record under a category heading." },
  { name: "category", kind: "block", aliasFor: "group", description: "Alias for @group." },
  { name: "defaultValue", kind: "block", description: "The default value of a property/token." },
  // Annotation legends + local references.
  {
    name: "annotations",
    kind: "block",
    description: "A legend defining numbered @ref callouts used elsewhere in the record.",
  },
  {
    name: "ref",
    kind: "block",
    allowMultiple: true,
    description: "A numbered reference into the @annotations legend.",
  },
  // Object-model decorators.
  {
    name: "readonly",
    kind: "block",
    description: "Marks the record's properties as fixed once set.",
  },
  {
    name: "global",
    kind: "block",
    description: "Marks a modifier as applying to any record kind.",
  },
  {
    name: "interaction",
    kind: "block",
    description: "Marks a modifier as a JS-toggled hook with no CSS declarations of its own.",
  },
  {
    name: "alias",
    kind: "block",
    description: "Marks a modifier as a pure rename of a canonical one.",
  },
  {
    name: "preventExtensions",
    kind: "block",
    description: "Disallows adding new properties beyond those already declared.",
  },
  {
    name: "noextend",
    kind: "block",
    aliasFor: "preventExtensions",
    description: "Alias for @preventExtensions.",
  },
  {
    name: "sealed",
    kind: "block",
    description: "Disallows resetting declared properties with CSS-wide keywords.",
  },
  { name: "frozen", kind: "block", description: "Combines @readonly and @sealed." },
  // CSS surface (existing + Custom Elements Manifest).
  {
    name: "modifier",
    kind: "block",
    allowMultiple: true,
    argument: "modifier-name",
    description: "Documents a BEM-style modifier class.",
  },
  {
    name: "part",
    kind: "block",
    allowMultiple: true,
    argument: "part-name",
    description: "Documents a structural part/element of the component.",
  },
  // Distinct from `part`: a shadow-DOM exposed part (`::part(name)`), named by a bare identifier.
  {
    name: "csspart",
    kind: "block",
    allowMultiple: true,
    argument: "part-name",
    description: "Documents a shadow-DOM exposed part (::part()).",
  },
  {
    name: "cssproperty",
    kind: "block",
    allowMultiple: true,
    argument: "custom-property",
    description: "Documents a consumed or declared custom property.",
  },
  {
    name: "property",
    kind: "block",
    allowMultiple: true,
    aliasFor: "cssproperty",
    argument: "custom-property",
    description: "Alias for @cssproperty.",
  },
  // A component state: a custom `:state(x)` state, a native pseudo-class (`:disabled`), or a bracketed
  // attribute-reflected state (`[aria-sort="ascending"]`, `[data-state="open"]`) for ARIA/data-* states.
  {
    name: "cssstate",
    kind: "block",
    allowMultiple: true,
    description:
      "Documents a component state: a :state(), a native pseudo-class, or an ARIA/data-* attribute.",
  },
  // A native pseudo-element the component styles (`::before`, `::marker`, …), named by `::name`.
  {
    name: "pseudo",
    kind: "block",
    allowMultiple: true,
    description: "Documents a native pseudo-element the component styles (::before, ::marker…).",
  },
  // Prose for an optional-ancestor wrapper named in `@structure` (e.g. `.badge-wrapper`).
  {
    name: "wrapper",
    kind: "block",
    allowMultiple: true,
    argument: "part-name",
    description: "Documents an optional-ancestor wrapper named in @structure.",
  },
  {
    name: "slot",
    kind: "block",
    allowMultiple: true,
    argument: "part-name",
    description: "Documents a <slot> the component exposes.",
  },
  // A design token the component consumes (`var(--*)`); the set is derived from the CSS, this adds prose.
  {
    name: "tokens",
    kind: "block",
    allowMultiple: true,
    argument: "custom-property",
    description: "Documents a design token (custom property) the component consumes.",
  },
  // CSSOM at-rule surfaces.
  {
    name: "function",
    kind: "block",
    allowMultiple: true,
    description: "Documents a custom CSS function.",
  },
  {
    name: "keyframes",
    kind: "block",
    allowMultiple: true,
    description: "Documents a @keyframes animation.",
  },
  {
    name: "animation",
    kind: "block",
    allowMultiple: true,
    aliasFor: "keyframes",
    description: "Alias for @keyframes.",
  },
  {
    name: "layer",
    kind: "block",
    allowMultiple: true,
    description: "Documents a @layer the component participates in.",
  },
  {
    name: "container",
    kind: "block",
    allowMultiple: true,
    description: "Documents a @container query the component responds to.",
  },
  {
    name: "supports",
    kind: "block",
    allowMultiple: true,
    description: "Documents an @supports feature query the component relies on.",
  },
  {
    name: "media",
    kind: "block",
    allowMultiple: true,
    description: "Documents an @media query the component responds to.",
  },
  {
    name: "responsive",
    kind: "block",
    allowMultiple: true,
    aliasFor: "media",
    description: "Alias for @media.",
  },
  // Accessibility.
  {
    name: "a11y",
    kind: "block",
    allowMultiple: true,
    description: "Accessibility notes for the component.",
  },
  {
    name: "accessibility",
    kind: "block",
    allowMultiple: true,
    aliasFor: "a11y",
    description: "Alias for @a11y.",
  },
  // Structure & demo.
  {
    name: "structure",
    kind: "block",
    description: "The component's DOM shape, authored as a nested selector tree.",
  },
  {
    name: "element",
    kind: "block",
    allowMultiple: true,
    description: "An HTML element the component may render as.",
  },
  { name: "demo", kind: "block", description: "A link to a live demo." },
  // Usage, compatibility & related.
  { name: "usage", kind: "block", description: "Guidance on when and how to use the component." },
  {
    name: "compat",
    kind: "block",
    allowMultiple: true,
    description: "A browser/engine compatibility note.",
  },
  {
    name: "related",
    kind: "block",
    allowMultiple: true,
    description: "A loosely related record (see-also).",
  },
  // Declared family membership: distinct from `@structure` containment (fixed position) and from
  // `@related` (loose "see also") — feeds the parent's Subcomponents section. A trailing `private`
  // keyword means this record must only ever appear inside that parent.
  {
    name: "memberOf",
    kind: "block",
    description: "Declares this record as a member of a parent record.",
  },
  // The inverse direction of `@memberOf`: a parent declares its members directly, comma-separated —
  // for members that don't share a dotted name with this record.
  {
    name: "members",
    kind: "block",
    description: "Declares a parent's members directly, comma-separated.",
  },
  // A single parent-side member declaration (`@member child [private]`), repeatable.
  {
    name: "member",
    kind: "block",
    allowMultiple: true,
    description: "Declares one member record on a parent, optionally private.",
  },
  // Modifier (flag) tags — release stage.
  { name: "alpha", kind: "modifier", description: "Marks the record as alpha-stage." },
  { name: "beta", kind: "modifier", description: "Marks the record as beta-stage." },
  { name: "experimental", kind: "modifier", description: "Marks the record as experimental." },
  { name: "internal", kind: "modifier", description: "Marks the record as internal-only." },
  { name: "public", kind: "modifier", description: "Marks the record as public API." },
  { name: "stable", kind: "modifier", description: "Marks the record as stable." },
  // Inline tags.
  { name: "link", kind: "inline", description: "An inline link to another record or a URL." },
  { name: "inheritDoc", kind: "inline", description: "Inherits prose from another record." },
  {
    name: "label",
    kind: "inline",
    description: "An inline label for a @structure/@example annotation.",
  },
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
