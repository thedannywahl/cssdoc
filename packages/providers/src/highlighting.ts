import {
  CssDocConfiguration,
  blockSourceRange,
  fencedProseRanges,
  scanInlineTagsOutsideCode,
  type DocCommentBlock,
} from "@cssdoc/core/lite";
import {
  markdownCodeRanges,
  markdownSyntaxRanges,
  parseDocComment,
  type MarkdownSyntaxRange,
} from "@cssdoc/core/prose";
import {
  AT_SOURCE,
  CARRIAGE_RETURN_CHAR,
  CSSDOC_BLOCK_TAG_NAME_SOURCE,
  LINE_ENDING_SOURCE,
  LINE_FEED_CHAR,
} from "@cssdoc/regex";
import { regex as arkRegex } from "arkregex";

import { tokenize, tokenTypes } from "./css-tokenizer.ts";

export { highlightDirectives } from "./directives.ts";
export type { DirectiveHighlight } from "./directives.ts";

/** A source-mapped doc-comment highlighting span. */
export interface DocHighlight {
  /** Inclusive UTF-16 offset in the supplied comment. */
  start: number;
  /** Exclusive UTF-16 offset in the supplied comment. */
  end: number;
  /** Semantic role of this span. */
  role:
    | "blockTag"
    | "argument"
    | "divider"
    | "inlineTag"
    | "inlinePunctuation"
    | "inlineContent"
    | "markdown"
    | "structureSelector"
    | "structureAtRule"
    | "structurePunctuation"
    | "code";
  /** Canonical name of the containing tag, without `@`. */
  tag: string;
  /** Markdown construct for a Markdown span. */
  markdownKind?: MarkdownSyntaxRange["kind"];
}

function addStructureHighlights(
  result: DocHighlight[],
  block: DocCommentBlock,
  start: number,
): void {
  const text = block.text.slice(start);
  let dot: number | undefined;
  let bracketStart: number | undefined;
  let brackets = 0;
  const append = (from: number, to: number, role: DocHighlight["role"]): void => {
    for (const range of mappedRanges(block, start + from, start + to)) {
      result.push({ ...range, role, tag: "structure" });
    }
  };
  tokenize(text, (type, from, to) => {
    if (brackets) {
      if (type === tokenTypes.LeftSquareBracket) brackets++;
      else if (type === tokenTypes.RightSquareBracket) {
        brackets--;
        if (brackets === 0 && bracketStart !== undefined) {
          append(bracketStart, to, "structureSelector");
          bracketStart = undefined;
        }
      }
      return;
    }
    if (dot !== undefined) {
      if (type === tokenTypes.Ident && from === dot + 1) {
        append(dot, to, "structureSelector");
        dot = undefined;
        return;
      }
      dot = undefined;
    }
    if (type === tokenTypes.Delim && text[from] === ".") dot = from;
    else if (type === tokenTypes.LeftSquareBracket) {
      bracketStart = from;
      brackets = 1;
    } else if (type === tokenTypes.Hash) append(from, to, "structureSelector");
    else if (type === tokenTypes.AtKeyword) append(from, to, "structureAtRule");
    else if (type === tokenTypes.LeftCurlyBracket || type === tokenTypes.RightCurlyBracket) {
      append(from, to, "structurePunctuation");
    }
  });
  if (bracketStart !== undefined) append(bracketStart, text.length, "structureSelector");
}

function addMarkdownHighlights(
  result: DocHighlight[],
  text: string,
  code: readonly { start: number; end: number }[],
  map: (start: number, end: number) => { start: number; end: number }[],
  configuration: CssDocConfiguration,
  tag: string,
): void {
  const markdown = markdownSyntaxRanges(text, configuration);
  const blocked = [...code, ...scanInlineTagsOutsideCode(text, code, configuration)];
  const boundaries = [
    ...new Set([
      ...markdown.flatMap((range) => [range.start, range.end]),
      ...blocked.flatMap((range) => [range.start, range.end]),
    ]),
  ].toSorted((a, b) => a - b);
  for (let i = 0; i + 1 < boundaries.length; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    if (blocked.some((range) => start < range.end && end > range.start)) continue;
    const scope = markdown
      .filter((range) => start >= range.start && end <= range.end)
      .toSorted((a, b) => b.depth - a.depth)[0];
    if (!scope) continue;
    for (const source of map(start, end)) {
      result.push({ ...source, role: "markdown", tag, markdownKind: scope.kind });
    }
  }
}

function textOffset(block: DocCommentBlock, sourceOffset: number): number {
  const segment = block.segments.find(
    (part) => sourceOffset >= part.sourceStart && sourceOffset < part.sourceStart + part.length,
  );
  if (!segment) throw new Error("Prose start is outside its source-mapped block");
  return segment.textStart + sourceOffset - segment.sourceStart;
}

function mappedRanges(
  block: DocCommentBlock,
  start: number,
  end: number,
): { start: number; end: number }[] {
  return block.segments.flatMap((segment) => {
    const from = Math.max(start, segment.textStart);
    let to = Math.min(end, segment.textStart + segment.length);
    while (
      to > from &&
      (block.text[to - 1] === CARRIAGE_RETURN_CHAR || block.text[to - 1] === LINE_FEED_CHAR)
    ) {
      to--;
    }
    return from < to ? [blockSourceRange(block, from, to)] : [];
  });
}

function addInlineHighlights(
  result: DocHighlight[],
  text: string,
  code: readonly { start: number; end: number }[],
  map: (start: number, end: number) => { start: number; end: number }[],
  configuration: CssDocConfiguration,
  tag: string,
): void {
  for (const range of code) {
    for (const source of map(range.start, range.end)) result.push({ ...source, role: "code", tag });
  }
  for (const inline of scanInlineTagsOutsideCode(text, code, configuration)) {
    const append = (start: number, end: number, role: DocHighlight["role"]): void => {
      for (const source of map(start, end)) result.push({ ...source, role, tag: inline.tag });
    };
    append(inline.start, inline.start + 1, "inlinePunctuation");
    append(inline.start + 1, inline.nameEnd, "inlineTag");
    let contentStart = inline.nameEnd;
    const contentEnd = inline.closed ? inline.end - 1 : inline.end;
    while (contentStart < contentEnd && text[contentStart].trim() === "") contentStart++;
    if (contentStart < contentEnd) append(contentStart, contentEnd, "inlineContent");
    if (inline.closed) append(inline.end - 1, inline.end, "inlinePunctuation");
  }
}

/**
 * Highlight recognized tags and protected code using source-mapped prose boundaries.
 *
 * @param text - One complete or incomplete doc comment.
 * @param configuration - Active tag vocabulary.
 * @returns Non-overlapping spans in source order. Disabled and unknown tags aren't highlighted.
 */
export function highlightDocComment(
  text: string,
  configuration: CssDocConfiguration = new CssDocConfiguration(),
): DocHighlight[] {
  const TAG = arkRegex.as(`^${AT_SOURCE}(${CSSDOC_BLOCK_TAG_NAME_SOURCE})`, "u");
  const result: DocHighlight[] = [];
  const doc = parseDocComment(text, configuration);
  if (doc.blocks.length === 0) {
    const mode = configuration.proseModeFor("remarks");
    addInlineHighlights(
      result,
      text,
      mode === "plain" ? fencedProseRanges(text) : markdownCodeRanges(text, configuration),
      (start, end) => {
        const ranges: { start: number; end: number }[] = [];
        let lineStart = start;
        for (let i = start; i < end; i++) {
          if (text[i] !== CARRIAGE_RETURN_CHAR && text[i] !== LINE_FEED_CHAR) continue;
          if (lineStart < i) ranges.push({ start: lineStart, end: i });
          lineStart = i + 1;
        }
        if (lineStart < end) ranges.push({ start: lineStart, end });
        return ranges;
      },
      configuration,
      "",
    );
  }
  for (const [index, block] of doc.blocks.entries()) {
    const match = TAG.exec(block.text);
    if (!match) continue;
    const definition = configuration.tryGetTagDefinition(match[1]);
    if (
      !definition ||
      !configuration.isTagSupported(definition) ||
      definition.syntaxKind === "inline"
    ) {
      continue;
    }
    result.push({
      start: block.start,
      end: block.start + match[0].length,
      role: "blockTag",
      tag: definition.canonicalName,
    });
    const next = doc.blocks[index + 1]?.start ?? text.length;
    const body = doc.prose.find((item) => item.span.start >= block.start && item.span.start < next);
    const proseStart = body && body.text ? textOffset(block, body.span.start) : block.text.length;
    const LINE_ENDING = arkRegex.as(LINE_ENDING_SOURCE, "u");
    const firstLineEnding = LINE_ENDING.exec(block.text);
    const structureStart =
      definition.canonicalName === "structure" && firstLineEnding
        ? firstLineEnding.index + firstLineEnding[0].length
        : block.text.length;
    if (body) {
      const headerEnd = body.header.length;
      const header = block.text.slice(match[0].length, headerEnd);
      const inline = scanInlineTagsOutsideCode(header, [], configuration);
      let cursor = 0;
      for (const boundary of [...inline, { start: header.length, end: header.length }]) {
        let start = cursor;
        let end = boundary.start;
        while (start < end && header[start].trim() === "") start++;
        while (end > start && header[end - 1].trim() === "") end--;
        for (const source of mappedRanges(block, match[0].length + start, match[0].length + end)) {
          result.push({ ...source, role: "argument", tag: definition.canonicalName });
        }
        cursor = boundary.end;
      }
      for (const source of mappedRanges(block, headerEnd, headerEnd + 1)) {
        result.push({ ...source, role: "divider", tag: definition.canonicalName });
      }
    }
    const parts = body
      ? [
          { text: block.text.slice(match[0].length, proseStart), offset: match[0].length },
          { text: body.text, offset: proseStart, mode: body.mode },
        ]
      : [{ text: block.text.slice(match[0].length, structureStart), offset: match[0].length }];
    for (const part of parts) {
      const code =
        part.mode === "markdown"
          ? markdownCodeRanges(part.text, configuration)
          : fencedProseRanges(part.text);
      addInlineHighlights(
        result,
        part.text,
        code,
        (start, end) => mappedRanges(block, part.offset + start, part.offset + end),
        configuration,
        definition.canonicalName,
      );
      if (part.mode === "markdown") {
        addMarkdownHighlights(
          result,
          part.text,
          code,
          (start, end) => mappedRanges(block, part.offset + start, part.offset + end),
          configuration,
          definition.canonicalName,
        );
      }
    }
    if (definition.canonicalName === "structure") {
      addStructureHighlights(result, block, structureStart);
    }
  }
  return result.toSorted((a, b) => a.start - b.start);
}
