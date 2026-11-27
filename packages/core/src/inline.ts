import {
  AT_CHAR,
  BACKSLASH_CHAR,
  BRACE_CLOSE_CHAR,
  BRACE_OPEN_CHAR,
  BRACKET_CLOSE_CHAR,
  BRACKET_OPEN_CHAR,
  CSSDOC_BLOCK_TAG_NAME_SOURCE,
  LINE_ENDING_SOURCE,
  PAREN_CLOSE_CHAR,
  PAREN_OPEN_CHAR,
  QUOTE_DOUBLE_CHAR,
} from "@cssdoc/regex";
import { regex as arkRegex } from "arkregex";
import { CssDocConfiguration } from "./configuration.ts";
import { scanCodeBoundaryLine, type CodeBoundaryState } from "./code-boundaries.ts";

/** A recognized inline tag, with UTF-16 offsets relative to the scanned text. */
export interface InlineTag {
  /** Inclusive offset of the opening brace. */
  start: number;
  /** Exclusive offset of the closing brace, or the end of incomplete input. */
  end: number;
  /** Exclusive offset of the tag name, including its at sign. */
  nameEnd: number;
  /** Canonical tag name, without the at sign. */
  tag: string;
  /** Whether the closing brace was found. */
  closed: boolean;
}

/**
 * Find fenced code lines in framing-free prose, including an incomplete fence.
 *
 * @param text - Authored prose.
 * @returns Half-open UTF-16 ranges relative to the prose.
 */
export function fencedProseRanges(text: string): { start: number; end: number }[] {
  const ENDING = arkRegex.as(LINE_ENDING_SOURCE, "gu");
  const state: CodeBoundaryState = { containers: [], indented: false, paragraph: false };
  const ranges: { start: number; end: number }[] = [];
  let start = 0;
  for (const ending of [...text.matchAll(ENDING), undefined]) {
    const end = ending?.index ?? text.length;
    const wasFenced = state.fence !== undefined;
    scanCodeBoundaryLine(text.slice(start, end), state);
    if ((wasFenced || state.fence) && end > start) ranges.push({ start, end });
    start = end + (ending?.[0].length ?? 0);
  }
  return ranges;
}

/**
 * Scan recognized inline tags without interpreting their arguments.
 *
 * @param text - Text to scan.
 * @param configuration - Active tag vocabulary.
 * @returns Non-overlapping ranges in source order, including incomplete tags.
 */
export function scanInlineTags(
  text: string,
  configuration: CssDocConfiguration = new CssDocConfiguration(),
): InlineTag[] {
  const NAME = arkRegex.as(`^(${CSSDOC_BLOCK_TAG_NAME_SOURCE})(?=\\s|\\}|$)`, "u");
  const result: InlineTag[] = [];
  for (let start = 0; start + 1 < text.length; start++) {
    if (text[start] !== BRACE_OPEN_CHAR || text[start + 1] !== AT_CHAR) continue;
    let slashes = 0;
    for (let i = start - 1; i >= 0 && text[i] === BACKSLASH_CHAR; i--) slashes++;
    if (slashes % 2 !== 0) continue;
    const name = NAME.exec(text.slice(start + 2))?.[1];
    const definition = name && configuration.tryGetTagDefinition(name);
    if (
      !definition ||
      definition.syntaxKind !== "inline" ||
      !configuration.isTagSupported(definition)
    )
      continue;

    const nameEnd = start + 2 + name.length;
    const stack: string[] = [];
    let quote = false;
    let escaped = false;
    let end = nameEnd;
    for (; end < text.length; end++) {
      const char = text[end];
      if (escaped) {
        escaped = false;
      } else if (char === BACKSLASH_CHAR) {
        escaped = true;
      } else if (char === QUOTE_DOUBLE_CHAR) {
        quote = !quote;
      } else if (!quote) {
        if (char === PAREN_OPEN_CHAR || char === BRACKET_OPEN_CHAR) stack.push(char);
        else if (char === PAREN_CLOSE_CHAR && stack.at(-1) === PAREN_OPEN_CHAR) stack.pop();
        else if (char === BRACKET_CLOSE_CHAR && stack.at(-1) === BRACKET_OPEN_CHAR) stack.pop();
        else if (char === BRACE_CLOSE_CHAR && stack.length === 0) break;
      }
    }
    const closed = end < text.length;
    result.push({
      start,
      end: closed ? end + 1 : end,
      nameEnd,
      tag: definition.canonicalName,
      closed,
    });
    start = end;
  }
  return result;
}
