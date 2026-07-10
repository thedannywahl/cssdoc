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
export type CssdocRecordKind = "component" | "utility" | "rule" | "declaration";

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
  // Prose (TSDoc-adopted).
  { name: "class", kind: "block" },
  { name: "summary", kind: "block" },
  { name: "remarks", kind: "block" },
  { name: "privateRemarks", kind: "block" },
  { name: "deprecated", kind: "block" },
  { name: "example", kind: "block", allowMultiple: true },
  { name: "see", kind: "block", allowMultiple: true },
  { name: "since", kind: "block" },
  { name: "group", kind: "block" },
  { name: "category", kind: "block", aliasFor: "group" },
  { name: "defaultValue", kind: "block" },
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
  { name: "cssstate", kind: "block", allowMultiple: true },
  { name: "slot", kind: "block", allowMultiple: true, argument: "part-name" },
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
  { name: "demo", kind: "block" },
  // Modifier (flag) tags — release stage.
  { name: "alpha", kind: "modifier" },
  { name: "beta", kind: "modifier" },
  { name: "experimental", kind: "modifier" },
  { name: "internal", kind: "modifier" },
  { name: "public", kind: "modifier" },
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
