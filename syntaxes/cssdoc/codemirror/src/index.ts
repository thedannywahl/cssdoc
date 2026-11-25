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
import { regex as arkRegex } from "arkregex";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import {
  WORD_BOUNDARY_SOURCE,
  toRegExp,
  TOKEN_CLASS_SELECTOR_REQUIRED_DOT,
  COMMENT_START_SOURCE,
  COMMENT_LINE_MARKER_SOURCE,
  BRACE_OPEN_SOURCE,
  BRACE_CLOSE_SOURCE,
  BRACE_OPEN_CHAR,
  BRACE_CLOSE_CHAR,
  CSSDOC_STRUCTURE_TAG_KEYWORD,
  CSSDOC_ANY_TAG_KEYWORD,
  TOKEN_CUSTOM_PROPERTY_SOURCE,
  TOKENIZER_INLINE_TAG_SOURCE,
  TOKENIZER_RECORD_TAG_SOURCE,
  TOKENIZER_MODIFIER_TAG_SOURCE,
  TOKENIZER_PART_TAG_SOURCE,
  TOKENIZER_PROPERTY_TAG_SOURCE,
  TOKENIZER_REF_TAG_SOURCE,
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

// The tag groups the matcher needs, all derived from the canonical vocabulary in @cssdoc/spec.
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

/**
 * Pattern source to find and replace tag name placeholders in tokenizer patterns.
 * Tokenizer patterns from @cssdoc/regex use `@\w+` as placeholders in their source strings,
 * which appears as `@\\w+` after escaping. This gets replaced with specific tag alternations
 * (INLINE_TAGS, RECORD_TAGS, etc.).
 */
const TAG_NAME_PLACEHOLDER_PATTERN: RegExp = /@\\w\+/g;

/**
 * Create a tag alternation pattern for injecting into tokenizer patterns.
 * Produces a pattern like `@(?:component|variant|...)` from a list of tag names.
 */
const createTagAlternation = (tags: readonly string[]): string => `@(?:${alt(tags)})`;

/**
 * Inject tag alternations into generic tokenizer patterns.
 * Tokenizer patterns from @cssdoc/regex use TAG_NAME_PLACEHOLDER as placeholders, which get
 * replaced with specific tag alternations (INLINE_TAGS, RECORD_TAGS, etc.).
 */
const injectTags = (pattern: string, tags: readonly string[]): string =>
  pattern.replace(TAG_NAME_PLACEHOLDER_PATTERN, createTagAlternation(tags));

// One left-to-right alternation, so matches never overlap. The `d` flag exposes per-group offsets.
// Token patterns follow structures defined in @cssdoc/regex/TOKENIZER_* patterns.
const TOKEN = arkRegex.as(
  [
    injectTags(TOKENIZER_INLINE_TAG_SOURCE, INLINE_TAGS),
    injectTags(TOKENIZER_RECORD_TAG_SOURCE, RECORD_TAGS),
    ...(MODIFIER_TAGS.length ? [injectTags(TOKENIZER_MODIFIER_TAG_SOURCE, MODIFIER_TAGS)] : []),
    injectTags(TOKENIZER_PART_TAG_SOURCE, PART_TAGS),
    injectTags(TOKENIZER_PROPERTY_TAG_SOURCE, PROPERTY_TAGS),
    injectTags(TOKENIZER_REF_TAG_SOURCE, ["ref"]),
    // bare block and record tags
    `(?<btag>@(?:${alt(PLAIN_TAGS)})${WORD_BOUNDARY_SOURCE})`,
    // a custom property named anywhere in the comment
    `(?<cprop>${TOKEN_CUSTOM_PROPERTY_SOURCE})`,
  ].join("|"),
  "dg",
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
          // Opening brace (see BRACE_OPEN in @cssdoc/regex)
          if (text_at_range[0] === BRACE_OPEN_CHAR) {
            out.push({ from: gi[0], to: gi[0] + 1, type: "punct" });
          }
          // Closing brace (if present) (see BRACE_CLOSE in @cssdoc/regex)
          const closeIdx = text_at_range.lastIndexOf(BRACE_CLOSE_CHAR);
          if (closeIdx !== -1) {
            out.push({ from: gi[0] + closeIdx, to: gi[1], type: "punct" });
          }
        }
        out.push({ from: gi[0], to: gi[1], type: GROUP_TYPE[key] });
      }
    }
  }
  // Second pass: highlight meaningful elements within each `@structure` body (from the tag to the next tag or comment end).
  for (const m of text.matchAll(toRegExp(CSSDOC_STRUCTURE_TAG_KEYWORD))) {
    const start = (m.index ?? 0) + m[0].length;
    const after = text.slice(start).search(toRegExp(CSSDOC_ANY_TAG_KEYWORD));
    const end = after === -1 ? text.length : start + after;
    const body = text.slice(start, end);

    // Pattern to match class selectors with required dot to avoid matching bare identifiers
    const classPattern = toRegExp(TOKEN_CLASS_SELECTOR_REQUIRED_DOT);
    for (const m of body.matchAll(classPattern)) {
      const from = start + (m.index ?? 0);
      out.push({ from, to: from + m[0].length, type: "part" });
    }

    // Pattern to match braces for nesting visualization
    const bracePattern = arkRegex.as(`${BRACE_OPEN_SOURCE}|${BRACE_CLOSE_SOURCE}`, "gu");
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
