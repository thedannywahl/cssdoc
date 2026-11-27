import {
  ASTERISK_CHAR,
  BACKSLASH_CHAR,
  BRACE_CLOSE_CHAR,
  BRACE_OPEN_CHAR,
  BRACKET_CLOSE_CHAR,
  BRACKET_OPEN_CHAR,
  CSSDOC_DESCRIPTION_SEPARATOR_SOURCE,
  DASH_SOURCE,
  FORWARD_SLASH_CHAR,
  PAREN_CLOSE_CHAR,
  PAREN_OPEN_CHAR,
  QUOTE_DOUBLE_CHAR,
  QUOTE_SINGLE_CHAR,
  TOKENIZER_INLINE_TAG_SOURCE,
  CARRIAGE_RETURN_CHAR,
} from "@cssdoc/regex";
import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";

import type { FramedCommentLine } from "./framing.ts";

/** CSS lexical state carried between lines of a structure block. */
export interface StructureBoundaryState {
  /** Open CSS blocks, brackets, and functions, in nesting order. */
  stack: string[];
  /** Open CSS string delimiter, if any. */
  quote?: string;
  /** Whether a CSS comment is open. */
  comment: boolean;
  /** Whether the previous character escaped the next character. */
  escaped: boolean;
}

/** One tag-line header analysis, shared by block collection and prose/example parsing. */
export interface DocCommentHeaderAnalysis {
  /** End of the tag name and start of its argument/header text. */
  argumentStart: number;
  /** End of the argument/header text before the divider. */
  argumentEnd: number;
  /** Start of the description divider. */
  dividerStart: number;
  /** Exclusive end of the description divider. */
  dividerEnd: number;
  /** Start of framing-free prose after the divider and optional space. */
  proseStart: number;
}

/**
 * Analyze a tag header once, outside the block collector, prose extractor, and examples.
 *
 * @param line - The framing-free first line of one block.
 * @param argumentStart - Offset immediately after the matched tag name.
 * @returns Shared header ranges, or undefined when no top-level divider is present.
 */
export function analyzeDocCommentHeader(
  line: string,
  argumentStart: number,
): DocCommentHeaderAnalysis | undefined {
  const result = scanStructure(line, { stack: [], comment: false, escaped: false }, true);
  if (result.dividerAt === undefined || result.dividerLength === undefined) return undefined;
  const dividerEnd = result.dividerAt + result.dividerLength;
  while (
    argumentStart < line.length &&
    (line[argumentStart] === " " || line[argumentStart] === "\t")
  )
    argumentStart++;
  return {
    argumentStart,
    argumentEnd: result.dividerAt,
    dividerStart: result.dividerAt,
    dividerEnd,
    proseStart: line[dividerEnd] === " " ? dividerEnd + 1 : dividerEnd,
  };
}

/**
 * Advance the CSS lexical state over one framed structure line.
 *
 * @param line - The structure line, excluding its line feed.
 * @param state - Mutable state from earlier lines.
 * @returns Whether the line opened a top-level CSS block.
 */
export function scanStructureLine(line: string, state: StructureBoundaryState): boolean {
  return scanStructure(line, state, false).opened;
}

/**
 * Check for a documentation divider outside CSS strings and nested constructs.
 *
 * @param line - A potential at-rule or documentation tag line.
 * @returns Whether the line has a top-level description divider.
 */
export function hasStructureDocDivider(line: string): boolean {
  return scanStructure(line, { stack: [], comment: false, escaped: false }, true).divider;
}

/**
 * Find the text following a top-level documentation divider.
 *
 * @param line - The documentation tag line.
 * @returns The offset after the divider and its optional formatting space.
 */
export function docProseStart(line: string): number | undefined {
  const result = analyzeDocCommentHeader(line, 0);
  return result?.proseStart;
}

/**
 * Check whether a top-level at-rule opens a CSS block rather than header metadata.
 *
 * @param line - The potential at-rule line.
 * @param lines - The framed comment lines.
 * @param lineIndex - The index of the potential at-rule line.
 * @returns Whether it opens a CSS block.
 */
export function opensStructureAtRule(
  line: string,
  lines: readonly FramedCommentLine[],
  lineIndex: number,
): boolean {
  const INLINE_TAG: Regex = arkRegex.as(`^${TOKENIZER_INLINE_TAG_SOURCE}`, "u");
  const state: StructureBoundaryState = { stack: [], comment: false, escaped: false };
  for (let index = lineIndex; index < lines.length; index++) {
    const text = index === lineIndex ? line : lines[index].text;
    if (index > lineIndex && state.stack.length === 0 && !state.comment && !state.quote) {
      const trimmed = text.trim();
      if (!trimmed) continue;
      if (!trimmed.startsWith(BRACE_OPEN_CHAR)) return false;
    }
    const result = scanStructure(text, state, false);
    if (result.openAt !== undefined) {
      const tag = text.slice(result.openAt).match(INLINE_TAG)?.[0];
      return !(tag?.endsWith(BRACE_CLOSE_CHAR) && tag.indexOf(BRACE_OPEN_CHAR, 1) === -1);
    }
  }
  return false;
}

function scanStructure(
  line: string,
  state: StructureBoundaryState,
  findDivider: boolean,
): {
  opened: boolean;
  divider: boolean;
  openAt?: number;
  dividerAt?: number;
  dividerLength?: number;
} {
  const SEPARATOR: Regex | undefined = findDivider
    ? arkRegex.as(`^(?!${DASH_SOURCE}{2})${CSSDOC_DESCRIPTION_SEPARATOR_SOURCE}(?=\\s|$)`, "u")
    : undefined;
  if (line.endsWith(CARRIAGE_RETURN_CHAR)) line = line.slice(0, -1);
  let opened = false;
  let openAt: number | undefined;
  let divider = false;
  let dividerAt: number | undefined;
  let dividerLength: number | undefined;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (state.comment) {
      if (char === ASTERISK_CHAR && next === FORWARD_SLASH_CHAR) {
        state.comment = false;
        i++;
      }
      continue;
    }
    if (state.escaped) {
      state.escaped = false;
      continue;
    }
    if (char === BACKSLASH_CHAR) {
      state.escaped = true;
      continue;
    }
    if (state.quote) {
      if (char === state.quote) state.quote = undefined;
      continue;
    }
    if (
      SEPARATOR &&
      state.stack.length === 0 &&
      i > 0 &&
      (line[i - 1] === " " || line[i - 1] === "\t")
    ) {
      const match = line.slice(i).match(SEPARATOR);
      if (match) {
        divider = true;
        dividerAt = i;
        dividerLength = match[0].length;
        break;
      }
    }
    if (char === FORWARD_SLASH_CHAR && next === ASTERISK_CHAR) {
      state.comment = true;
      i++;
    } else if (char === QUOTE_SINGLE_CHAR || char === QUOTE_DOUBLE_CHAR) {
      state.quote = char;
    } else if (char === BRACE_OPEN_CHAR || char === BRACKET_OPEN_CHAR || char === PAREN_OPEN_CHAR) {
      if (char === BRACE_OPEN_CHAR && state.stack.length === 0) {
        opened = true;
        openAt ??= i;
      }
      state.stack.push(char);
    } else if (
      (char === BRACE_CLOSE_CHAR && state.stack.at(-1) === BRACE_OPEN_CHAR) ||
      (char === BRACKET_CLOSE_CHAR && state.stack.at(-1) === BRACKET_OPEN_CHAR) ||
      (char === PAREN_CLOSE_CHAR && state.stack.at(-1) === PAREN_OPEN_CHAR)
    ) {
      state.stack.pop();
    }
  }
  if (state.escaped) state.escaped = false;
  else state.quote = undefined;
  return { opened, divider, openAt, dividerAt, dividerLength };
}
