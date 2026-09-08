/** An edit expressed as offsets in the current document text. */
export interface CssDocEdit {
  start: number;
  end: number;
  newText: string;
}

const RECORD_TAG = /^\s*\*?\s*@(component|name|utility|rule|declaration|layout)\s+\S+/u;

const lineStart = (text: string, offset: number): number => {
  const newline = text.lastIndexOf("\n", offset - 1);
  return newline < 0 ? 0 : newline + 1;
};

const lineEnd = (text: string, start: number): number => {
  const newline = text.indexOf("\n", start);
  return newline < 0 ? text.length : newline;
};

const lineIndent = (text: string, offset: number): string => {
  const start = lineStart(text, offset);
  return text.slice(start, lineEnd(text, start)).match(/^\s*/u)?.[0] ?? "";
};

const isCssDocRecord = (line: string): boolean => RECORD_TAG.test(line);

/**
 * Find edits needed after a document change. Only the first body line of a `/**` block can identify it
 * as CSSDoc, which keeps TSDoc and ordinary block comments out of the formatter.
 */
export function cssDocEdits(text: string, formatBlankLines: boolean): CssDocEdit[] {
  const edits: CssDocEdit[] = [];
  const opener = /\/\*\*/gu;
  let match: RegExpExecArray | null;

  while ((match = opener.exec(text))) {
    const openerStart = match.index;
    const bodyStart = text.indexOf("\n", openerStart + 3);
    if (bodyStart < 0) continue;

    const recordStart = bodyStart + 1;
    const recordEnd = lineEnd(text, recordStart);
    if (!isCssDocRecord(text.slice(recordStart, recordEnd))) continue;

    const closeStart = text.indexOf("*/", recordEnd);
    const indent = lineIndent(text, openerStart);
    const newline = text.includes("\r\n") ? "\r\n" : "\n";

    if (closeStart < 0) {
      edits.push({
        start: text.length,
        end: text.length,
        newText: `${text.endsWith("\n") ? "" : newline}${indent} */`,
      });
      continue;
    }

    if (!formatBlankLines) continue;
    let current = recordEnd + 1;
    while (current < closeStart) {
      const end = lineEnd(text, current);
      if (text.slice(current, end).trim() === "") {
        edits.push({ start: current, end, newText: `${indent} * ` });
      }
      current = end + 1;
    }
  }

  return edits;
}
