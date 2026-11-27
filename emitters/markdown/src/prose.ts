import { literalMarkdownText } from "@cssdoc/core";
import { sanitizeMarkdownLinks as sanitizeLinks, unescapeInlineOpeners } from "@cssdoc/core/prose";
import {
  BACKTICK_CHAR,
  BRACE_OPEN_CHAR,
  LESS_THAN_CHAR,
  LINE_ENDING_SOURCE,
  LINE_FEED_CHAR,
  PIPE_CHAR,
  TILDE_CHAR,
} from "@cssdoc/regex";
import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toHtml } from "hast-util-to-html";

type Node = {
  type: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: readonly Node[];
  value?: string;
};

type Edit = { start: number; end: number; text: string };

function vueSafeCode(value: string, inline: boolean): string {
  const LINE_ENDING: Regex = arkRegex.as(LINE_ENDING_SOURCE, "gu");
  const code = {
    type: "element" as const,
    tagName: "code",
    properties: inline ? { "v-pre": "" } : {},
    children: [
      { type: "text" as const, value: inline ? value.replace(LINE_ENDING, " ") : `${value}\n` },
    ],
  };
  const html = inline
    ? toHtml(code)
    : toHtml({ type: "element", tagName: "pre", properties: { "v-pre": "" }, children: [code] });
  return html.replaceAll(PIPE_CHAR, "&#124;").replaceAll(LINE_FEED_CHAR, "&#10;");
}

/**
 * Render plain prose as literal text in Markdown, preserving line breaks.
 *
 * @param text - Authored text.
 * @returns Markdown-safe literal prose.
 */
export function plainProse(text: string): string {
  const LINE_ENDING: Regex = arkRegex.as(LINE_ENDING_SOURCE, "gu");
  return literalMarkdownText(unescapeInlineOpeners(text, "plain")).replace(
    LINE_ENDING,
    `<br>${LINE_FEED_CHAR}`,
  );
}

function escapeFree(text: string): string {
  return text
    .replaceAll(LESS_THAN_CHAR, "&lt;")
    .replaceAll(BRACE_OPEN_CHAR.repeat(2), "&#123;&#123;");
}

/**
 * Escape Vue-sensitive prose and remove unsafe CommonMark link destinations.
 *
 * @param text - Authored Markdown.
 * @returns Safe Markdown with code regions preserved.
 */
export function safeMarkdownProse(text: string): string {
  return escapeMarkdown(sanitizeLinks(unescapeInlineOpeners(text, "markdown")));
}

/**
 * Keep an unclosed authored fence from consuming subsequent generated blocks.
 *
 * @param text - Authored Markdown rendered as a standalone block.
 * @returns Safe Markdown with any document-spanning fence closed.
 */
export function safeMarkdownBlock(text: string): string {
  const safe = safeMarkdownProse(text);
  const probe = `${safe}\n\n# cssdoc-boundary`;
  const node: Node | undefined = fromMarkdown(probe).children.at(-1);
  const start = node?.position?.start.offset;
  if (
    node?.type !== "code" ||
    start === undefined ||
    start >= safe.length ||
    node.position?.end.offset !== probe.length
  ) {
    return safe;
  }
  const marker = safe[start];
  if (marker !== BACKTICK_CHAR && marker !== TILDE_CHAR) {
    throw new Error("Unclosed Markdown code block has no opening fence");
  }
  let end = start;
  while (safe[end] === marker) end++;
  return `${safe}\n${marker.repeat(end - start)}`;
}

/**
 * Remove unsafe destinations from a complete generated Markdown document.
 *
 * @param text - Generated Markdown, including trusted emitter markup.
 * @returns Markdown with unsafe destinations removed.
 */
export function sanitizeMarkdownLinks(text: string): string {
  return sanitizeLinks(text);
}

function escapeMarkdown(text: string): string {
  const tree: Node = fromMarkdown(text);
  const edits: Edit[] = [];
  const visit = (node: Node): void => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) {
      if (node.type === "code" || node.type === "inlineCode") {
        const source = text.slice(start, end);
        const fenced = source.startsWith(BACKTICK_CHAR) || source.startsWith(TILDE_CHAR);
        const protect =
          (node.type === "inlineCode" || !fenced) &&
          node.value?.includes(BRACE_OPEN_CHAR.repeat(2));
        edits.push({
          start,
          end,
          text:
            protect && node.value !== undefined
              ? vueSafeCode(node.value, node.type === "inlineCode")
              : source,
        });
        return;
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  let result = "";
  let cursor = 0;
  for (const edit of edits.toSorted((a, b) => a.start - b.start)) {
    const before = text.slice(cursor, edit.start);
    result += escapeFree(before) + edit.text;
    cursor = edit.end;
  }
  const after = text.slice(cursor);
  return result + escapeFree(after);
}
