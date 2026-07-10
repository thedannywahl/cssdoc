/**
 * `@cssdoc/codemirror` — a CodeMirror 6 extension that highlights cssdoc doc-comment tags inside CSS
 * comments, the way TSDoc highlights JSDoc tags inside `/** … *\/` comments. It's the CodeMirror
 * counterpart to the TextMate grammar in `@cssdoc/tmlanguage`, sharing the same tag vocabulary:
 * `@component`, `@modifier`, `@part`/`@slot`, `@cssproperty`, `{@link …}`, and custom properties.
 *
 * Matches are found by walking the CSS syntax tree and scanning **comment nodes only**, so real CSS
 * at-rules like `@property`, `@scope`, and `@media` are never touched. Colours ship as a base theme
 * that adapts to the editor's light/dark theme, so it works out of the box and can be overridden.
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
import { syntaxTree } from "@codemirror/language";
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

/** Semantic token kind a doc-comment span maps to. Each becomes a `cm-cssdoc-<kind>` class. */
export type CssdocTokenType = "tag" | "modifier" | "part" | "property" | "link" | "punct";

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
const MODIFIER_TAGS = cssdocTagNamesByArgument("modifier-name");
const PART_TAGS = cssdocTagNamesByArgument("part-name");
const PROPERTY_TAGS = cssdocTagNamesByArgument("custom-property");
const PLAIN_TAGS = CSSDOC_TAGS.filter((t) => t.kind !== "inline" && !t.argument).map((t) => t.name);

// One left-to-right alternation, so matches never overlap. The `d` flag exposes per-group offsets.
const TOKEN = new RegExp(
  [
    // {@link ...} / {@label ...} / {@inheritDoc ...}
    `(?<ibrace>\\{)(?<itag>@(?:${alt(INLINE_TAGS)}))\\b[ \\t]*(?<itext>[^}]*)(?<iend>\\})?`,
    // @modifier -name
    `(?<mtag>@(?:${alt(MODIFIER_TAGS)}))\\b[ \\t]*(?<mname>-[A-Za-z][A-Za-z0-9-]*)?`,
    // @part / @csspart / @slot .name
    `(?<ptag>@(?:${alt(PART_TAGS)}))\\b[ \\t]*(?<pname>\\.?[A-Za-z][A-Za-z0-9_-]*)?`,
    // @cssproperty / @property --name
    `(?<rtag>@(?:${alt(PROPERTY_TAGS)}))\\b[ \\t]*(?<rname>--[A-Za-z][A-Za-z0-9-]*)?`,
    // bare block/record/flag tags
    `(?<btag>@(?:${alt(PLAIN_TAGS)}))\\b`,
    // a custom property named anywhere in the comment
    "(?<cprop>(?<![\\w-])--[A-Za-z][A-Za-z0-9-]*)",
  ].join("|"),
  "gd",
);

const GROUP_TYPE: Record<string, CssdocTokenType> = {
  ibrace: "punct",
  itag: "tag",
  itext: "link",
  iend: "punct",
  mtag: "tag",
  mname: "modifier",
  ptag: "tag",
  pname: "part",
  rtag: "tag",
  rname: "property",
  btag: "tag",
  cprop: "property",
};

// Inside a `@structure` body we lightly highlight the two things that carry meaning — the parts (class
// selectors) and the braces that show nesting — not a full CSS grammar. Selectors, pseudo-classes, and
// combinators are otherwise left plain.
const STRUCTURE_TAG = /@structure\b/gu;
const STRUCTURE_TOKEN = /\.[A-Za-z][\w-]*|[{}]/gu;

/** Tokenize one CSS comment's text into cssdoc doc-tag spans (offsets are relative to `text`). */
export const tokenizeComment = (text: string): CssdocToken[] => {
  const out: CssdocToken[] = [];
  for (const m of text.matchAll(TOKEN)) {
    const groups = m.indices?.groups;
    if (!groups) continue;
    for (const key of Object.keys(groups)) {
      const gi = groups[key];
      if (gi && gi[0] !== gi[1]) out.push({ from: gi[0], to: gi[1], type: GROUP_TYPE[key] });
    }
  }
  // Second pass: the body of each `@structure` (from the tag to the next tag or the comment end).
  for (const m of text.matchAll(STRUCTURE_TAG)) {
    const start = (m.index ?? 0) + m[0].length;
    const after = text.slice(start).search(/@[A-Za-z]/u);
    const end = after === -1 ? text.length : start + after;
    for (const s of text.slice(start, end).matchAll(STRUCTURE_TOKEN)) {
      const from = start + (s.index ?? 0);
      out.push({ from, to: from + s[0].length, type: s[0][0] === "." ? "part" : "punct" });
    }
  }
  return out;
};

const marks = new Map<CssdocTokenType, Decoration>();
const markFor = (type: CssdocTokenType): Decoration => {
  let mark = marks.get(type);
  if (!mark) {
    mark = Decoration.mark({ class: `cm-cssdoc-${type}` });
    marks.set(type, mark);
  }
  return mark;
};

const build = (view: EditorView): DecorationSet => {
  const found: CssdocToken[] = [];
  const tree = syntaxTree(view.state);
  for (const range of view.visibleRanges) {
    tree.iterate({
      from: range.from,
      to: range.to,
      enter(node) {
        if (node.name !== "Comment") return;
        const text = view.state.doc.sliceString(node.from, node.to);
        for (const t of tokenizeComment(text)) {
          found.push({ from: node.from + t.from, to: node.from + t.to, type: t.type });
        }
      },
    });
  }
  found.sort((a, b) => a.from - b.from || a.to - b.to);
  const builder = new RangeSetBuilder<Decoration>();
  for (const t of found) builder.add(t.from, t.to, markFor(t.type));
  return builder.finish();
};

// Colours ship with the extension and follow the editor's light/dark theme (GitHub Primer palette).
const baseTheme = EditorView.baseTheme({
  "&light .cm-cssdoc-tag": { color: "#8250df", fontWeight: "600" },
  "&dark .cm-cssdoc-tag": { color: "#d2a8ff", fontWeight: "600" },
  "&light .cm-cssdoc-modifier": { color: "#0550ae" },
  "&dark .cm-cssdoc-modifier": { color: "#79c0ff" },
  "&light .cm-cssdoc-part": { color: "#116329" },
  "&dark .cm-cssdoc-part": { color: "#7ee787" },
  "&light .cm-cssdoc-property": { color: "#953800" },
  "&dark .cm-cssdoc-property": { color: "#ffa657" },
  "&light .cm-cssdoc-link": { color: "#0969da", textDecoration: "underline" },
  "&dark .cm-cssdoc-link": { color: "#a5d6ff", textDecoration: "underline" },
  "&light .cm-cssdoc-punct": { color: "#6e7781" },
  "&dark .cm-cssdoc-punct": { color: "#8b949e" },
});

const plugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = build(view);
    }
    update(u: ViewUpdate): void {
      if (u.docChanged || u.viewportChanged) this.decorations = build(u.view);
    }
  },
  { decorations: (v) => v.decorations },
);

/** The cssdoc doc-comment highlighter. Add alongside a CSS language: `[css(), cssdocHighlight()]`. */
export const cssdocHighlight = (): Extension => [plugin, baseTheme];

export default cssdocHighlight;
