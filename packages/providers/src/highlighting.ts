import {
  CssDocConfiguration,
  blockSourceRange,
  fencedProseRanges,
  scanInlineTagsOutsideCode,
  type DocCommentBlock,
} from "@cssdoc/core/lite";
import { markdownCodeRanges, parseDocComment } from "@cssdoc/core/prose";
import {
  AT_SOURCE,
  CARRIAGE_RETURN_CHAR,
  CSSDOC_BLOCK_TAG_NAME_SOURCE,
  LINE_FEED_CHAR,
} from "@cssdoc/regex";
import { regex as arkRegex } from "arkregex";

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
    | "code";
  /** Canonical name of the containing tag, without `@`. */
  tag: string;
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
    )
      to--;
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
  if (!doc.blocks.length) {
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
      : [{ text: block.text.slice(match[0].length), offset: match[0].length }];
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
    }
  }
  return result.toSorted((a, b) => a.start - b.start);
}
