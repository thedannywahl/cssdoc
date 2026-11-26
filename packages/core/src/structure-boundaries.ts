import {
  ASTERISK_CHAR,
  BACKSLASH_CHAR,
  BRACE_CLOSE_CHAR,
  BRACE_OPEN_CHAR,
  BRACKET_CLOSE_CHAR,
  BRACKET_OPEN_CHAR,
  FORWARD_SLASH_CHAR,
  PAREN_CLOSE_CHAR,
  PAREN_OPEN_CHAR,
  QUOTE_DOUBLE_CHAR,
  QUOTE_SINGLE_CHAR,
} from "@cssdoc/regex";

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

/**
 * Advance the CSS lexical state over one framed structure line.
 *
 * @param line - The structure line, excluding its line feed.
 * @param state - Mutable state from earlier lines.
 * @returns Whether the line opened a top-level CSS block.
 */
export function scanStructureLine(line: string, state: StructureBoundaryState): boolean {
  if (line.endsWith("\r")) line = line.slice(0, -1);
  let opened = false;
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
    if (char === FORWARD_SLASH_CHAR && next === ASTERISK_CHAR) {
      state.comment = true;
      i++;
    } else if (char === QUOTE_SINGLE_CHAR || char === QUOTE_DOUBLE_CHAR) {
      state.quote = char;
    } else if (char === BRACE_OPEN_CHAR || char === BRACKET_OPEN_CHAR || char === PAREN_OPEN_CHAR) {
      if (char === BRACE_OPEN_CHAR && state.stack.length === 0) opened = true;
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
  return opened;
}
