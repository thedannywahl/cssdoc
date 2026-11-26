import {
  ASTERISK_SOURCE,
  COMMENT_END_SOURCE,
  COMMENT_LINE_MARKER_SOURCE,
  COMMENT_START_SOURCE,
  SPACE_TAB_SOURCE,
} from "@cssdoc/regex";
import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";

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
 * @param prefixes - Remove conventional markers or retain unframed text.
 * @returns The untrimmed lines and their ranges relative to `raw`.
 */
export function frameCommentLines(raw: string, prefixes: "framed" | "none"): FramedCommentLine[] {
  const FRAMED_COMMENT_LINE_PREFIX: Regex = arkRegex.as(
    `^${SPACE_TAB_SOURCE}*${COMMENT_LINE_MARKER_SOURCE} ?`,
    "u",
  );
  const COMMENT_OPENING: Regex = arkRegex.as(`^${COMMENT_START_SOURCE}${ASTERISK_SOURCE}?`, "u");
  // `$` also matches before a final newline; only strip a terminator at the actual end.
  const COMMENT_CLOSING: Regex = arkRegex.as(`${COMMENT_END_SOURCE}(?![\\s\\S])`, "u");
  const start = raw.match(COMMENT_OPENING)?.[0].length ?? 0;
  const end = raw.length - (raw.slice(start).match(COMMENT_CLOSING)?.[0].length ?? 0);
  const lines: FramedCommentLine[] = [];

  for (let cursor = start; cursor <= end;) {
    const newline = raw.indexOf("\n", cursor);
    const lineEnd = newline < 0 || newline >= end ? end : newline;
    const rawLine = raw.slice(cursor, lineEnd);
    const prefix =
      prefixes === "framed" ? rawLine.match(FRAMED_COMMENT_LINE_PREFIX)?.[0] : undefined;
    const prefixLength = prefix?.length ?? 0;
    const lineStart = cursor + prefixLength;
    lines.push({ text: raw.slice(lineStart, lineEnd), start: lineStart, end: lineEnd });
    if (lineEnd === end) break;
    cursor = lineEnd + 1;
  }
  return lines;
}
