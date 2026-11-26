import { COMMENT_LINE_MARKER_SOURCE, COMMENT_LINE_PREFIX, SPACE_TAB_SOURCE } from "@cssdoc/regex";
import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";

const FRAMED_COMMENT_LINE_PREFIX: Regex = arkRegex.as(
  `^${SPACE_TAB_SOURCE}*${COMMENT_LINE_MARKER_SOURCE} ?`,
  "u",
);

/** One comment line after optional framing removal, with offsets into the original input. */
export interface FramedCommentLine {
  /** Line text, excluding the line feed but retaining a preceding carriage return. */
  text: string;
  /** Inclusive UTF-16 offset of the line text in the original input. */
  start: number;
  /** Exclusive UTF-16 offset of the line text in the original input. */
  end: number;
}

/**
 * Remove comment delimiters and optionally remove leading comment markers without losing offsets.
 *
 * @param raw - A block comment or its inner text.
 * @param prefixes - Remove conventional markers, retain unframed text, or preserve legacy behavior.
 * @returns The untrimmed lines and their ranges relative to `raw`.
 */
export function frameCommentLines(
  raw: string,
  prefixes: "framed" | "none" | "legacy",
): FramedCommentLine[] {
  const start = raw.startsWith("/**") ? 3 : raw.startsWith("/*") ? 2 : 0;
  const end = raw.slice(start).endsWith("*/") ? raw.length - 2 : raw.length;
  const lines: FramedCommentLine[] = [];

  for (let cursor = start; cursor <= end;) {
    const newline = raw.indexOf("\n", cursor);
    const lineEnd = newline < 0 || newline >= end ? end : newline;
    const rawLine = raw.slice(cursor, lineEnd);
    const prefix =
      prefixes === "legacy"
        ? rawLine.match(COMMENT_LINE_PREFIX)?.[0]
        : prefixes === "framed"
          ? rawLine.match(FRAMED_COMMENT_LINE_PREFIX)?.[0]
          : undefined;
    const prefixLength = prefix?.length ?? 0;
    const lineStart = cursor + prefixLength;
    lines.push({ text: raw.slice(lineStart, lineEnd), start: lineStart, end: lineEnd });
    if (lineEnd === end) break;
    cursor = lineEnd + 1;
  }
  return lines;
}
