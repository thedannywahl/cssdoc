import { safeProseUrl } from "@cssdoc/core";
import {
  BACKTICK_CHAR,
  BRACE_OPEN_CHAR,
  LESS_THAN_CHAR,
  LINE_ENDING_SOURCE,
  LINE_FEED_CHAR,
  TILDE_CHAR,
} from "@cssdoc/regex";
import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import { fromMarkdown } from "mdast-util-from-markdown";

type Node = {
  type: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: readonly Node[];
  url?: string;
  identifier?: string;
  alt?: string | null;
};

type Edit = { start: number; end: number; text: string };

function literal(text: string): string {
  let result = "";
  for (const char of text) {
    const code = char.codePointAt(0)!;
    result +=
      (code >= 33 && code <= 47) ||
      (code >= 58 && code <= 64) ||
      (code >= 91 && code <= 96) ||
      (code >= 123 && code <= 126)
        ? `&#${code};`
        : char;
  }
  return result;
}

/**
 * Render plain prose as literal text in Markdown, preserving line breaks.
 *
 * @param text - Authored text.
 * @returns Markdown-safe literal prose.
 */
export function plainProse(text: string): string {
  const LINE_ENDING: Regex = arkRegex.as(LINE_ENDING_SOURCE, "gu");
  return literal(text).replace(LINE_ENDING, `<br>${LINE_FEED_CHAR}`);
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
  return sanitize(text, true);
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
  return sanitize(text, false);
}

function sanitize(text: string, escape: boolean): string {
  const tree: Node = fromMarkdown(text);
  const definitions = new Map<string, string>();
  const collectDefinitions = (node: Node): void => {
    if (node.type === "definition" && node.identifier !== undefined && node.url !== undefined) {
      if (!definitions.has(node.identifier)) definitions.set(node.identifier, node.url);
    }
    for (const child of node.children ?? []) collectDefinitions(child);
  };
  collectDefinitions(tree);
  const edits: Edit[] = [];
  const visit = (node: Node): void => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) {
      if (node.type === "code" || node.type === "inlineCode") {
        edits.push({ start, end, text: text.slice(start, end) });
        return;
      }
      const image = node.type === "image" || node.type === "imageReference";
      const reference = node.type === "linkReference" || node.type === "imageReference";
      const destination = reference
        ? node.identifier === undefined
          ? undefined
          : definitions.get(node.identifier)
        : node.url;
      const link = node.type === "link" || node.type === "image" || reference;
      if (link && destination !== undefined && !safeProseUrl(destination, image)) {
        const first = node.children?.[0]?.position?.start.offset;
        const last = node.children?.at(-1)?.position?.end.offset;
        const label =
          image || first === undefined || last === undefined
            ? literal(node.alt ?? "")
            : sanitize(text.slice(first, last), escape);
        edits.push({ start, end, text: label });
        return;
      }
      if (node.type === "definition" && node.url !== undefined && !safeProseUrl(node.url)) {
        edits.push({ start, end, text: "" });
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
    result += (escape ? escapeFree(before) : before) + edit.text;
    cursor = edit.end;
  }
  const after = text.slice(cursor);
  return result + (escape ? escapeFree(after) : after);
}
