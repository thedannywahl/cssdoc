import { fromMarkdown } from "mdast-util-from-markdown";

import { literalMarkdownText } from "./prose-text.ts";
import { safeProseUrl } from "./prose-url.ts";

type Node = {
  type: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: readonly Node[];
  url?: string;
  identifier?: string;
  alt?: string | null;
};

/**
 * Remove unsafe CommonMark link and image destinations without changing protected code.
 *
 * @param text - Markdown source.
 * @returns Markdown with unsafe destinations removed.
 */
export function sanitizeMarkdownLinks(text: string): string {
  const tree: Node = fromMarkdown(text);
  const definitions = new Map<string, string>();
  const collect = (node: Node): void => {
    if (
      node.type === "definition" &&
      node.identifier !== undefined &&
      node.url !== undefined &&
      !definitions.has(node.identifier)
    ) {
      definitions.set(node.identifier, node.url);
    }
    for (const child of node.children ?? []) collect(child);
  };
  collect(tree);
  const edits: { start: number; end: number; text: string }[] = [];
  const visit = (node: Node): void => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) {
      if (node.type === "code" || node.type === "inlineCode") return;
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
            ? literalMarkdownText(node.alt ?? "")
            : sanitizeMarkdownLinks(text.slice(first, last));
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
    result += text.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  return result + text.slice(cursor);
}
