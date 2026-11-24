/**
 * `@cssdoc/codemirror` — a CodeMirror 6 extension that highlights cssdoc doc-comment tags inside CSS
 * comments, the way TSDoc highlights JSDoc tags inside `/** … *\/` comments. It's the CodeMirror
 * counterpart to the TextMate grammar in `@cssdoc/tmlanguage`, sharing the same tag vocabulary and
 * regex patterns from `@cssdoc/regex`.
 *
 * Matches are found by walking the CSS syntax tree and scanning **comment nodes only**, so real CSS
 * at-rules like `@property`, `@scope`, and `@media` are never touched. Colours ship as a base theme
 * that adapts to the editor's light/dark theme, so it works out of the box and can be overridden.
 *
 * Uses tier-organized regex patterns from `@cssdoc/regex` for consistency and maintainability.
 *
 * @example
 * ```ts
 * import { cssdocHighlight } from "@cssdoc/codemirror";
 * import { css } from "@codemirror/lang-css";
 * new EditorView({ extensions: [css(), cssdocHighlight()], parent });
 * ```
 *
 * @module @cssdoc/codemirror
 */
import { RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { CSSDOC_TAGS, cssdocTagNamesByArgument, cssdocTagNamesByKind } from "@cssdoc/spec";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import {
  ALPHA_SOURCE,
  SPACE_TAB_SOURCE,
  WORD_BOUNDARY_SOURCE,
  toRegExp,
  TOKEN_CLASS_SELECTOR_REQUIRED_DOT,
  COMMENT_START_SOURCE,
  COMMENT_LINE_MARKER_SOURCE,
  BRACE_OPEN,
  BRACE_CLOSE,
  TOKEN_QUALIFIED_IDENTIFIER_SOURCE,
  TOKEN_MODIFIER_NAME_SOURCE,
  TOKEN_CLASS_SELECTOR_SOURCE,
  TOKEN_CUSTOM_PROPERTY_SOURCE,
  TOKEN_REF_NUMBER_SOURCE,
  TOKEN_INLINE_CONTENT_SOURCE,
} from "@cssdoc/regex";

/** Semantic token kind a doc-comment span maps to. Each becomes a `cm-cssdoc-<kind>` class. */
export type CssdocTokenType =
  | "tag"
  | "modifier"
  | "part"
  | "property"
  | "link"
  | "punct"
  | "ref"
  | "record";

/** A highlighted span within a comment. `from`/`to` are offsets into the scanned comment text. */
export interface CssdocToken {
  from: number;
  to: number;
  type: CssdocTokenType;
}

// The tag groups the matcher needs, all derived from the canonical vocabulary in @cssdoc/spec. Plain
// tags are everything that isn't inline and takes no structured argument.
const alt = (names: readonly string[]): string => names.join("|");
const INLINE_TAGS = cssdocTagNamesByKind("inline");
const RECORD_TAGS = cssdocTagNamesByKind("record");
const MODIFIER_TAGS = cssdocTagNamesByArgument("modifier-name");
const PART_TAGS = [...cssdocTagNamesByArgument("part-name"), "selector", "class", "pseudo"];
const PROPERTY_TAGS = cssdocTagNamesByArgument("custom-property");
const PLAIN_TAGS = CSSDOC_TAGS.filter(
  (t) =>
    t.kind !== "inline" &&
    t.kind !== "record" &&
    !t.argument &&
    t.name !== "selector" &&
    t.name !== "class" &&
    t.name !== "pseudo",
).map((t) => t.name);

// One left-to-right alternation, so matches never overlap. The `d` flag exposes per-group offsets.
// Patterns use tier-organized regex patterns from @cssdoc/regex for consistency.
const TOKEN = new RegExp(
  [
    // {@link ...} / {@label ...} / {@inheritDoc ...}
    `(?<inline>\\{(?<itag>@(?:${alt(INLINE_TAGS)}))${WORD_BOUNDARY_SOURCE}${SPACE_TAB_SOURCE}*(?<itext>${TOKEN_INLINE_CONTENT_SOURCE})\\}?)`,
    // @component/@name/@utility/@rule/@declaration/@layout name(.name)*
    `(?<record>(?<rtag>@(?:${alt(RECORD_TAGS)}))${WORD_BOUNDARY_SOURCE}${SPACE_TAB_SOURCE}*(?<rname>${TOKEN_QUALIFIED_IDENTIFIER_SOURCE})?)`,
    // @modifier -name
    `(?<modifier>(?<mtag>@(?:${alt(MODIFIER_TAGS)}))${WORD_BOUNDARY_SOURCE}${SPACE_TAB_SOURCE}*(?<mname>${TOKEN_MODIFIER_NAME_SOURCE})?)`,
    // @part / @csspart / @slot / @selector / @pseudo / @class .name
    `(?<part>(?<ptag>@(?:${alt(PART_TAGS)}))${WORD_BOUNDARY_SOURCE}${SPACE_TAB_SOURCE}*(?<pname>${TOKEN_CLASS_SELECTOR_SOURCE})?)`,
    // @cssproperty / @property --name
    `(?<property>(?<proptag>@(?:${alt(PROPERTY_TAGS)}))${WORD_BOUNDARY_SOURCE}${SPACE_TAB_SOURCE}*(?<propname>${TOKEN_CUSTOM_PROPERTY_SOURCE})?)`,
    // @ref 1 / @ref 1.
    `(?<ref>(?<reftag>@(?:ref))${WORD_BOUNDARY_SOURCE}${SPACE_TAB_SOURCE}*(?<refnum>${TOKEN_REF_NUMBER_SOURCE})?)`,
    // bare block/record/flag tags
    `(?<btag>@(?:${alt(PLAIN_TAGS)})${WORD_BOUNDARY_SOURCE})`,
    // a custom property named anywhere in the comment
    `(?<cprop>${TOKEN_CUSTOM_PROPERTY_SOURCE})`,
  ].join("|"),
  "gd",
);

const GROUP_TYPE: Record<string, CssdocTokenType> = {
  inline: "tag",
  itag: "tag",
  itext: "link",
  record: "record",
  rtag: "tag",
  rname: "record",
  modifier: "modifier",
  mtag: "tag",
  mname: "modifier",
  part: "part",
  ptag: "tag",
  pname: "part",
  property: "property",
  proptag: "tag",
  propname: "property",
  ref: "ref",
  reftag: "tag",
  refnum: "ref",
  btag: "tag",
  cprop: "property",
};

/** Tokenize one CSS comment's text into cssdoc doc-tag spans (offsets are relative to `text`). */
export const tokenizeComment = (text: string): CssdocToken[] => {
  const out: CssdocToken[] = [];
  for (const m of text.matchAll(TOKEN)) {
    const groups = m.indices?.groups;
    if (!groups) continue;
    for (const key of Object.keys(groups)) {
      const gi = groups[key];
      if (gi && gi[0] !== gi[1]) {
        // Special handling for inline tags: highlight braces as punctuation
        if (key === "inline") {
          const text_at_range = text.slice(gi[0], gi[1]);
          // Opening brace
          if (text_at_range[0] === "{") {
            out.push({ from: gi[0], to: gi[0] + 1, type: "punct" });
          }
          // Closing brace (if present)
          const closeIdx = text_at_range.lastIndexOf("}");
          if (closeIdx !== -1) {
            out.push({ from: gi[0] + closeIdx, to: gi[1], type: "punct" });
          }
        }
        out.push({ from: gi[0], to: gi[1], type: GROUP_TYPE[key] });
      }
    }
  }
  // Second pass: highlight meaningful elements within each `@structure` body (from the tag to the next tag or comment end).
  const structureTagRegex = /@structure\b/gu;
  for (const m of text.matchAll(structureTagRegex)) {
    const start = (m.index ?? 0) + m[0].length;
    const after = text.slice(start).search(new RegExp(`@${ALPHA_SOURCE}`, "u"));
    const end = after === -1 ? text.length : start + after;
    const body = text.slice(start, end);

    // Pattern to match class selectors with required dot to avoid matching bare identifiers
    const classPattern = toRegExp(TOKEN_CLASS_SELECTOR_REQUIRED_DOT);
    for (const m of body.matchAll(classPattern)) {
      const from = start + (m.index ?? 0);
      out.push({ from, to: from + m[0].length, type: "part" });
    }

    // Pattern to match braces for nesting visualization
    const bracePattern = new RegExp(`${BRACE_OPEN.source}|${BRACE_CLOSE.source}`, "gu");
    for (const m of body.matchAll(bracePattern)) {
      const from = start + (m.index ?? 0);
      out.push({ from, to: from + m[0].length, type: "punct" });
    }
  }
  return out;
};

/** Tokenize one CSS comment and add highlighting decorations. */
const tokenizeAndDecorate = (commentText: string): CssdocToken[] => tokenizeComment(commentText);

/**
 * CodeMirror extension plugin that walks the syntax tree and highlights cssdoc doc-comment tags.
 * Returns decorations for each highlighted tag.
 */
const cssdocPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.generateDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.generateDecorations(update.view);
      }
    }

    private generateDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      EditorView.baseTheme({
        ".cm-cssdoc-tag": { color: "var(--cssdoc-tag, #d73a49)" },
        ".cm-cssdoc-modifier": { color: "var(--cssdoc-modifier, #6f42c1)" },
        ".cm-cssdoc-part": { color: "var(--cssdoc-part, #005cc5)" },
        ".cm-cssdoc-property": { color: "var(--cssdoc-property, #24292e)" },
        ".cm-cssdoc-link": { color: "var(--cssdoc-link, #0366d6)", textDecoration: "underline" },
        ".cm-cssdoc-punct": { color: "var(--cssdoc-punct, #6a737d)" },
        ".cm-cssdoc-ref": { color: "var(--cssdoc-ref, #032f62)" },
        ".cm-cssdoc-record": { color: "var(--cssdoc-record, #24292e)", fontWeight: "bold" },
      });

      for (const { from: startLine, to: endLine } of view.visibleRanges) {
        for (let pos = startLine; pos < endLine;) {
          const line = view.state.doc.lineAt(pos);
          const lineText = line.text;

          // Only process CSS comments (/* ... */)
          const trimmed = lineText.trim();
          if (
            trimmed.startsWith(COMMENT_START_SOURCE) ||
            trimmed.startsWith(COMMENT_LINE_MARKER_SOURCE)
          ) {
            const tokens = tokenizeAndDecorate(lineText);
            for (const token of tokens) {
              const cls_name = `cm-cssdoc-${token.type}`;
              const decoration = Decoration.mark({ class: cls_name });
              builder.add(line.from + token.from, line.from + token.to, decoration);
            }
          }

          pos = line.to + 1;
        }
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

/**
 * CodeMirror extension that highlights cssdoc doc-comment tags and provides a base theme.
 * @returns A CodeMirror extension combining the highlighting plugin and theme
 */
export const cssdocHighlight = (): Extension => [
  cssdocPlugin,
  EditorView.baseTheme({
    ".cm-cssdoc-tag": { color: "#d73a49" },
    ".cm-cssdoc-modifier": { color: "#6f42c1" },
    ".cm-cssdoc-part": { color: "#005cc5" },
    ".cm-cssdoc-property": { color: "#24292e" },
    ".cm-cssdoc-link": { color: "#0366d6", textDecoration: "underline" },
    ".cm-cssdoc-punct": { color: "#6a737d" },
    ".cm-cssdoc-ref": { color: "#032f62" },
    ".cm-cssdoc-record": { color: "#24292e", fontWeight: "bold" },
  }),
];
