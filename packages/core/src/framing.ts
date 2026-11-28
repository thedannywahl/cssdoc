import { CARRIAGE_RETURN_CHAR, LINE_FEED_CHAR } from "@cssdoc/regex";

/** One comment line after optional framing removal, with offsets into the original input. */
export interface FramedCommentLine {
  /** Line text, excluding the line break but retaining a carriage return preceding a line feed. */
  text: string;
  /** Inclusive UTF-16 offset of the line text in the original input. */
  start: number;
  /** Exclusive UTF-16 offset of the line text in the original input. */
  end: number;
  /** The source character terminating the line, if any. */
  ending: typeof LINE_FEED_CHAR | typeof CARRIAGE_RETURN_CHAR | "";
}

/**
 * Remove comment delimiters and optionally remove leading comment markers without losing offsets.
 *
 * @param raw - A block comment or its inner text.
 * @param prefixes - Remove conventional markers or retain unframed text.
 * @returns The untrimmed lines and their ranges relative to `raw`.
 */
export function frameCommentLines(raw: string, prefixes: "framed" | "none"): FramedCommentLine[] {
  const FRAMED_COMMENT_LINE_PREFIX: RegExp = /^[ \t]*\* ?/u;
  const COMMENT_OPENING: RegExp = /^\/\*\*?/u;
  // `$` also matches before a final newline; only strip a terminator at the actual end.
  const COMMENT_CLOSING: RegExp = /\*\/$/u;
  const start = COMMENT_OPENING.exec(raw)?.[0].length ?? 0;
  const end = raw.length - (COMMENT_CLOSING.exec(raw.slice(start))?.[0].length ?? 0);
  const lines: FramedCommentLine[] = [];

  for (let cursor = start; cursor <= end;) {
    let lineEnd = cursor;
    while (
      lineEnd < end &&
      raw[lineEnd] !== CARRIAGE_RETURN_CHAR &&
      raw[lineEnd] !== LINE_FEED_CHAR
    ) {
      lineEnd++;
    }
    if (
      lineEnd < end &&
      raw[lineEnd] === CARRIAGE_RETURN_CHAR &&
      raw[lineEnd + 1] === LINE_FEED_CHAR
    ) {
      lineEnd++;
    }
    const ending =
      lineEnd < end
        ? raw[lineEnd] === LINE_FEED_CHAR
          ? LINE_FEED_CHAR
          : CARRIAGE_RETURN_CHAR
        : "";
    const rawLine = raw.slice(cursor, lineEnd);
    const prefix =
      prefixes === "framed" ? FRAMED_COMMENT_LINE_PREFIX.exec(rawLine)?.[0] : undefined;
    const prefixLength = prefix?.length ?? 0;
    const lineStart = cursor + prefixLength;
    lines.push({ text: raw.slice(lineStart, lineEnd), start: lineStart, end: lineEnd, ending });
    if (lineEnd === end) break;
    cursor = lineEnd + 1;
  }
  return lines;
}
