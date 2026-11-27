import { BACKTICK_CHAR, GREATER_THAN_CHAR, TILDE_CHAR } from "@cssdoc/regex";

type Container = { kind: "quote" } | { kind: "list"; indent: number };

/** State for recognizing code blocks in framing-free documentation text. */
export interface CodeBoundaryState {
  /** Active Markdown containers, from outermost to innermost. */
  containers: Container[];
  /** An open fenced code block. */
  fence?: { marker: string; length: number; containers: Container[] };
  /** Whether an indented code block is active. */
  indented: boolean;
  /** Whether a paragraph is active in the current container. */
  paragraph: boolean;
}

type Cursor = { index: number; column: number; virtual: number };

function isBlank(text: string): boolean {
  for (const char of text) {
    if (char !== " " && char !== "\t" && char !== "\r") return false;
  }
  return true;
}

function whitespace(line: string, cursor: Cursor, limit: number): number {
  const start = cursor.column;
  while (cursor.column - start < limit) {
    if (cursor.virtual > 0) {
      const width = Math.min(cursor.virtual, limit - (cursor.column - start));
      cursor.virtual -= width;
      cursor.column += width;
      continue;
    }
    const char = line[cursor.index];
    if (char !== " " && char !== "\t") break;
    const width = char === "\t" ? 4 - (cursor.column % 4) : 1;
    cursor.index++;
    cursor.virtual = width;
  }
  return cursor.column - start;
}

function quotePrefix(line: string, cursor: Cursor): boolean {
  const saved = { ...cursor };
  whitespace(line, cursor, 3);
  if (cursor.virtual > 0 || line[cursor.index] !== GREATER_THAN_CHAR) {
    Object.assign(cursor, saved);
    return false;
  }
  cursor.index++;
  cursor.column++;
  whitespace(line, cursor, 1);
  return true;
}

function listPrefix(line: string, cursor: Cursor): number | undefined {
  const saved = { ...cursor };
  whitespace(line, cursor, 3);
  if (cursor.virtual > 0) {
    Object.assign(cursor, saved);
    return undefined;
  }
  const markerStart = cursor.index;
  const char = line[cursor.index];
  if (char === "-" || char === "+" || char === "*") {
    cursor.index++;
    cursor.column++;
  } else {
    while (
      cursor.index - markerStart < 9 &&
      line[cursor.index] >= "0" &&
      line[cursor.index] <= "9"
    ) {
      cursor.index++;
      cursor.column++;
    }
    if (
      cursor.index === markerStart ||
      (line[cursor.index] !== "." && line[cursor.index] !== ")")
    ) {
      Object.assign(cursor, saved);
      return undefined;
    }
    cursor.index++;
    cursor.column++;
  }
  if (line[cursor.index] !== " " && line[cursor.index] !== "\t") {
    Object.assign(cursor, saved);
    return undefined;
  }
  const paddingStart = { ...cursor };
  const padding = whitespace(line, cursor, 4);
  if (padding === 0 || isBlank(line.slice(cursor.index))) {
    Object.assign(cursor, saved);
    return undefined;
  }
  if (cursor.virtual > 0 || line[cursor.index] === " " || line[cursor.index] === "\t") {
    Object.assign(cursor, paddingStart);
    whitespace(line, cursor, 1);
  }
  return cursor.column - saved.column;
}

function containerPrefix(
  line: string,
  previous: readonly Container[],
  addContainers: boolean,
): { cursor: Cursor; containers: Container[]; matched: boolean } {
  const cursor: Cursor = { index: 0, column: 0, virtual: 0 };
  const containers: Container[] = [];
  for (const container of previous) {
    if (container.kind === "quote") {
      if (!quotePrefix(line, cursor)) return { cursor, containers, matched: false };
    } else {
      const saved = { ...cursor };
      if (whitespace(line, cursor, container.indent) < container.indent) {
        Object.assign(cursor, saved);
        return { cursor, containers, matched: false };
      }
    }
    containers.push(container);
  }
  if (addContainers) {
    while (true) {
      if (quotePrefix(line, cursor)) {
        containers.push({ kind: "quote" });
        continue;
      }
      const content = { ...cursor };
      whitespace(line, content, 3);
      if (content.virtual === 0 && isThematicBreak(line.slice(content.index))) break;
      const indent = listPrefix(line, cursor);
      if (indent === undefined) break;
      containers.push({ kind: "list", indent });
    }
  }
  return { cursor, containers, matched: true };
}

function fenceAt(
  line: string,
  cursor: Cursor,
): { marker: string; length: number; rest: string } | undefined {
  const at = { ...cursor };
  whitespace(line, at, 3);
  if (at.virtual > 0) return undefined;
  const marker = line[at.index];
  if (marker !== BACKTICK_CHAR && marker !== TILDE_CHAR) return undefined;
  const start = at.index;
  while (line[at.index] === marker) at.index++;
  const length = at.index - start;
  if (length < 3) return undefined;
  return { marker, length, rest: line.slice(at.index) };
}

function isThematicBreak(line: string): boolean {
  const marker = line[0];
  if (marker !== "-" && marker !== "*" && marker !== "_") return false;
  let count = 0;
  for (const char of line) {
    if (char === marker) count++;
    else if (char !== " " && char !== "\t" && char !== "\r") return false;
  }
  return count >= 3;
}

function endsParagraph(line: string): boolean {
  let index = 0;
  while (line[index] === "#") index++;
  if (
    index > 0 &&
    index <= 6 &&
    (index === line.length || line[index] === " " || line[index] === "\t" || line[index] === "\r")
  ) {
    return true;
  }

  if (isThematicBreak(line)) return true;
  const marker = line[0];
  if (marker !== "=" && marker !== "-") return false;
  let seenSpace = false;
  for (const char of line) {
    if (char === marker) {
      if (seenSpace) return false;
    } else if (char === " " || char === "\t" || char === "\r") {
      seenSpace = true;
    } else {
      return false;
    }
  }
  return true;
}

/**
 * Advance Markdown code-block state for one framing-free line.
 *
 * @param line - The line, without its line feed.
 * @param state - Mutable state for the current documentation block.
 * @returns Whether this line belongs to a fenced or indented code block.
 */
export function scanCodeBoundaryLine(line: string, state: CodeBoundaryState): boolean {
  if (state.fence) {
    const prefix = containerPrefix(line, state.fence.containers, false);
    const fence = prefix.matched ? fenceAt(line, prefix.cursor) : undefined;
    if (
      fence &&
      fence.marker === state.fence.marker &&
      fence.length >= state.fence.length &&
      isBlank(fence.rest)
    ) {
      state.fence = undefined;
      state.paragraph = false;
    }
    return true;
  }

  let prefix = containerPrefix(line, state.containers, true);
  if (!prefix.matched) {
    const continuation = { ...prefix.cursor };
    if (
      state.paragraph &&
      whitespace(line, continuation, 4) === 4 &&
      !isBlank(line.slice(continuation.index))
    ) {
      return false;
    }
    prefix = containerPrefix(line, prefix.containers, true);
    state.paragraph = false;
    state.indented = false;
  }
  if (prefix.containers.length !== state.containers.length) state.paragraph = false;
  state.containers = prefix.containers;
  const content = line.slice(prefix.cursor.index);
  if (isBlank(content)) {
    state.paragraph = false;
    return state.indented;
  }
  const indentation = { ...prefix.cursor };
  const indent = whitespace(line, indentation, 4);
  if (state.indented && indent >= 4) return true;
  state.indented = false;
  if (!state.paragraph && indent >= 4) {
    state.indented = true;
    return true;
  }
  const fence = fenceAt(line, prefix.cursor);
  if (fence && (fence.marker !== BACKTICK_CHAR || !fence.rest.includes(BACKTICK_CHAR))) {
    state.fence = { marker: fence.marker, length: fence.length, containers: [...state.containers] };
    state.paragraph = false;
    return true;
  }
  state.paragraph = indent > 3 || !endsParagraph(line.slice(indentation.index));
  return false;
}
