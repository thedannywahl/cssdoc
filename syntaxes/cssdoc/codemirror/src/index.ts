/**
 * `@cssdoc/codemirror` — a CodeMirror 6 extension that highlights cssdoc doc-comment tags inside CSS
 * comments, the way TSDoc highlights JSDoc tags inside `/** … *\/` comments. It's the CodeMirror
 * counterpart to the TextMate grammar in `@cssdoc/tmlanguage`, sharing the same tag vocabulary and
 * regex patterns from `@cssdoc/regex`.
 *
 * The extension scans CSS comment nodes in the visible syntax tree. Colours ship as a base theme and
 * can be overridden.
 *
 * Uses tier-organized regex patterns from `@cssdoc/regex` for consistency and maintainability.
 *
 * @example
 * ```ts
 * import { cssdocHighlight } from "@cssdoc/codemirror";
 * import { css } from "@codemirror/lang-css";
 * import { EditorView } from "@codemirror/view";
 *
 * new EditorView({ extensions: [css(), cssdocHighlight()], parent: document.body });
 * ```
 *
 * @module \@cssdoc/codemirror
 */
import { syntaxTree } from "@codemirror/language";
import type { Extension, Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import {
  collectDocCommentBlocks,
  docCommentFenceRanges,
  type CssDocConfiguration,
} from "@cssdoc/core/lite";
import { highlightDirectives, highlightDocComment } from "@cssdoc/providers/highlighting";
import {
  ALPHANUMERIC_EXTENDED_SOURCE,
  SPACE_TAB_SOURCE,
  WORD_BOUNDARY_SOURCE,
  TOKEN_CUSTOM_PROPERTY_SOURCE,
  TOKENIZER_RECORD_TAG_SOURCE,
  TOKENIZER_MODIFIER_TAG_SOURCE,
  TOKENIZER_PART_TAG_SOURCE,
  TOKENIZER_PROPERTY_TAG_SOURCE,
  TOKENIZER_REF_TAG_SOURCE,
} from "@cssdoc/regex";
import { CSSDOC_TAGS, cssdocTagNamesByArgument, cssdocTagNamesByKind } from "@cssdoc/spec";
import { regex as arkRegex } from "arkregex";

/** Semantic token kind a doc-comment span maps to. Each becomes a `cm-cssdoc-<kind>` class. */
export type CssdocTokenType =
  | "tag"
  | "modifier"
  | "part"
  | "property"
  | "link"
  | "punct"
  | "ref"
  | "record"
  | "keyword"
  | "rule"
  | "markdown"
  | "markdown-emphasis"
  | "markdown-strong"
  | "markdown-heading"
  | "markdown-link";

/** A highlighted span within a comment. `from`/`to` are offsets into the scanned comment text. */
export interface CssdocToken {
  /** Inclusive start offset in the scanned comment. */
  from: number;
  /** Exclusive end offset in the scanned comment. */
  to: number;
  /** Highlight category for the span. */
  type: CssdocTokenType;
}

// The tag groups the matcher needs, all derived from the canonical vocabulary in @cssdoc/spec.
const alt = (names: readonly string[]): string => names.join("|");
const RECORD_TAGS = cssdocTagNamesByKind("record");
const MODIFIER_TAGS = cssdocTagNamesByArgument("modifier-name");
const PART_TAGS = [...cssdocTagNamesByArgument("part-name"), "selector", "pseudo"];
const PROPERTY_TAGS = cssdocTagNamesByArgument("custom-property");
const PLAIN_TAGS = CSSDOC_TAGS.filter(
  (t) =>
    t.kind !== "inline" &&
    t.kind !== "record" &&
    !t.argument &&
    t.name !== "selector" &&
    t.name !== "pseudo",
).map((t) => t.name);

/**
 * Pattern source to find and replace tag name placeholders in tokenizer patterns.
 * Tokenizer patterns from \@cssdoc/regex use `@\w+` as placeholders in their source strings,
 * which appears as `@\\w+` after escaping. This gets replaced with specific tag alternations
 * (INLINE_TAGS, RECORD_TAGS, etc.).
 */
const TAG_NAME_PLACEHOLDER_PATTERN = arkRegex.as(String.raw`@\\w\+`, "g");

/**
 * Create a tag alternation pattern for injecting into tokenizer patterns.
 * Produces a pattern like `@(?:component|variant|...)` from a list of tag names.
 */
const createTagAlternation = (tags: readonly string[]): string => `@(?:${alt(tags)})`;

/**
 * Inject tag alternations into generic tokenizer patterns.
 * Tokenizer patterns from \@cssdoc/regex use TAG_NAME_PLACEHOLDER as placeholders, which get
 * replaced with specific tag alternations (INLINE_TAGS, RECORD_TAGS, etc.).
 */
const injectTags = (pattern: string, tags: readonly string[]): string =>
  pattern.replace(TAG_NAME_PLACEHOLDER_PATTERN, createTagAlternation(tags));

// One left-to-right alternation, so matches never overlap. The `d` flag exposes per-group offsets.
// Token patterns follow structures defined in @cssdoc/regex/TOKENIZER_* patterns.
const TOKEN = arkRegex.as(
  [
    injectTags(TOKENIZER_RECORD_TAG_SOURCE, RECORD_TAGS),
    ...(MODIFIER_TAGS.length > 0 ? [injectTags(TOKENIZER_MODIFIER_TAG_SOURCE, MODIFIER_TAGS)] : []),
    injectTags(TOKENIZER_PART_TAG_SOURCE, PART_TAGS),
    injectTags(TOKENIZER_PROPERTY_TAG_SOURCE, PROPERTY_TAGS),
    injectTags(TOKENIZER_REF_TAG_SOURCE, ["ref"]),
    `(?<membertag>@(?:memberOf|member))${WORD_BOUNDARY_SOURCE}(?:${SPACE_TAB_SOURCE}+(?<membername>${ALPHANUMERIC_EXTENDED_SOURCE}+)(?:${SPACE_TAB_SOURCE}+(?<memberprivate>private)(?!${ALPHANUMERIC_EXTENDED_SOURCE}))?)?`,
    // bare block and record tags
    `(?<btag>@(?:${alt(PLAIN_TAGS)})${WORD_BOUNDARY_SOURCE})`,
    // a custom property named anywhere in the comment
    `(?<cprop>${TOKEN_CUSTOM_PROPERTY_SOURCE})`,
  ].join("|"),
  "dg",
);

const GROUP_TYPE: Record<string, CssdocTokenType> = {
  rtag: "tag",
  rname: "record",
  mtag: "tag",
  mname: "modifier",
  ptag: "tag",
  pname: "part",
  proptag: "tag",
  propname: "property",
  reftag: "tag",
  refnum: "ref",
  membertag: "tag",
  membername: "record",
  memberprivate: "keyword",
  btag: "tag",
  cprop: "property",
};

/**
 * Tokenize one CSS comment into doc-tag spans.
 *
 * @param text - Comment or unframed doc text.
 * @param configuration - Optional tag vocabulary.
 * @returns Spans relative to the supplied text.
 */
export const tokenizeComment = (
  text: string,
  configuration?: CssDocConfiguration,
): CssdocToken[] => {
  const out: CssdocToken[] = [];
  const directives = highlightDirectives(text);
  if (directives.length > 0) {
    return directives.map((range) => ({
      from: range.start,
      to: range.end,
      type: range.role === "directive" ? "keyword" : "rule",
    }));
  }
  const highlights = highlightDocComment(text, configuration);
  const blockTags = highlights.filter((highlight) => highlight.role === "blockTag");
  const allowedTags = new Set(blockTags.map((tag) => tag.start));
  const blocks = collectDocCommentBlocks(text, configuration);
  const fences = [
    ...docCommentFenceRanges(blocks),
    ...highlights.filter((highlight) => highlight.role === "code"),
  ];
  for (const m of text.matchAll(TOKEN)) {
    const groups = m.indices?.groups;
    if (!groups) continue;
    if (fences.some((range) => m.index >= range.start && m.index < range.end)) continue;
    if (
      highlights.some(
        (range) =>
          (range.role.startsWith("inline") ||
            range.role.startsWith("structure") ||
            range.role === "markdown") &&
          m.index >= range.start &&
          m.index < range.end,
      )
    ) {
      continue;
    }
    const blockTag =
      groups.rtag ??
      groups.mtag ??
      groups.ptag ??
      groups.proptag ??
      groups.reftag ??
      groups.membertag ??
      groups.btag;
    if (blockTag !== undefined && !allowedTags.has(blockTag[0])) continue;
    for (const key of Object.keys(groups)) {
      const gi = groups[key];
      if (gi !== undefined && gi[0] !== gi[1] && GROUP_TYPE[key]) {
        out.push({ from: gi[0], to: gi[1], type: GROUP_TYPE[key] });
      }
    }
  }
  for (const tag of blockTags) {
    if (!out.some((token) => token.type === "tag" && token.from === tag.start)) {
      out.push({ from: tag.start, to: tag.end, type: "tag" });
    }
  }
  for (const highlight of highlights) {
    if (highlight.role.startsWith("structure")) {
      const type: CssdocTokenType =
        highlight.role === "structureSelector"
          ? "part"
          : highlight.role === "structureAtRule"
            ? "tag"
            : "punct";
      out.push({ from: highlight.start, to: highlight.end, type });
      continue;
    }
    if (highlight.role === "markdown") {
      const type: CssdocTokenType =
        highlight.markdownKind === "emphasis" ||
        highlight.markdownKind === "strong" ||
        highlight.markdownKind === "heading" ||
        highlight.markdownKind === "link"
          ? `markdown-${highlight.markdownKind}`
          : "markdown";
      out.push({ from: highlight.start, to: highlight.end, type });
      continue;
    }
    if (highlight.role === "argument") {
      const type: CssdocTokenType = RECORD_TAGS.includes(highlight.tag)
        ? "record"
        : highlight.tag === "modifier"
          ? "modifier"
          : highlight.tag === "part" || highlight.tag === "selector"
            ? "part"
            : highlight.tag === "cssproperty" || highlight.tag === "property"
              ? "property"
              : "keyword";
      let cursor = highlight.start;
      const overlaps = out
        .filter((token) => token.from < highlight.end && token.to > highlight.start)
        .toSorted((a, b) => a.from - b.from);
      for (const token of overlaps) {
        if (cursor < token.from) out.push({ from: cursor, to: token.from, type });
        cursor = Math.max(cursor, token.to);
      }
      if (cursor < highlight.end) out.push({ from: cursor, to: highlight.end, type });
      continue;
    }
    const type =
      highlight.role === "inlineTag"
        ? "tag"
        : highlight.role === "inlinePunctuation" || highlight.role === "divider"
          ? "punct"
          : highlight.role === "inlineContent"
            ? "link"
            : undefined;
    if (type) out.push({ from: highlight.start, to: highlight.end, type });
  }
  return out.toSorted((a, b) => a.from - b.from);
};

/**
 * CodeMirror extension plugin that walks the syntax tree and highlights cssdoc doc-comment tags.
 * Returns decorations for each highlighted tag.
 */
const cssdocPlugin = (configuration?: CssDocConfiguration) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.generateDecorations(view);
      }

      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          syntaxTree(update.startState) !== syntaxTree(update.state)
        ) {
          this.decorations = this.generateDecorations(update.view);
        }
      }

      private generateDecorations(view: EditorView): DecorationSet {
        const decorations: Array<Range<Decoration>> = [];
        const seen = new Set<number>();
        for (const { from, to } of view.visibleRanges) {
          syntaxTree(view.state).iterate({
            from,
            to,
            enter(node) {
              if (node.name !== "Comment" || seen.has(node.from)) return;
              seen.add(node.from);
              const text = view.state.doc.sliceString(node.from, node.to);
              for (const token of tokenizeComment(text, configuration)) {
                const decoration = Decoration.mark({ class: `cm-cssdoc-${token.type}` });
                decorations.push(decoration.range(node.from + token.from, node.from + token.to));
              }
            },
          });
        }
        return Decoration.set(decorations, true);
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );

/**
 * CodeMirror extension that highlights cssdoc doc-comment tags and provides a base theme.
 * @param configuration - Optional tag vocabulary.
 * @returns A CodeMirror extension combining the highlighting plugin and theme.
 */
export const cssdocHighlight = (configuration?: CssDocConfiguration): Extension => [
  cssdocPlugin(configuration),
  EditorView.baseTheme({
    ".cm-cssdoc-tag": { color: "#d73a49" },
    ".cm-cssdoc-modifier": { color: "#6f42c1" },
    ".cm-cssdoc-part": { color: "#005cc5" },
    ".cm-cssdoc-property": { color: "#24292e" },
    ".cm-cssdoc-link": { color: "#0366d6", textDecoration: "underline" },
    ".cm-cssdoc-punct": { color: "#6a737d" },
    ".cm-cssdoc-ref": { color: "#032f62" },
    ".cm-cssdoc-record": { color: "#24292e", fontWeight: "bold" },
    ".cm-cssdoc-keyword": { color: "#d73a49" },
    ".cm-cssdoc-rule": { color: "#6f42c1" },
    ".cm-cssdoc-markdown": { color: "#6a737d" },
    ".cm-cssdoc-markdown-emphasis": { fontStyle: "italic" },
    ".cm-cssdoc-markdown-strong": { fontWeight: "bold" },
    ".cm-cssdoc-markdown-heading": { fontWeight: "bold" },
    ".cm-cssdoc-markdown-link": { color: "#0366d6", textDecoration: "underline" },
  }),
];
