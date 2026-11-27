import { fromMarkdown } from "mdast-util-from-markdown";
import { toHast } from "mdast-util-to-hast";
import { toHtml } from "hast-util-to-html";
import { sanitize } from "hast-util-sanitize";
import { safeProseUrl } from "@cssdoc/core";
import { unescapeInlineOpeners } from "@cssdoc/core/prose";

type MarkdownNode = {
  type: string;
  children?: MarkdownNode[];
};

function escapeRawHtml(node: MarkdownNode): void {
  if (node.type === "html") node.type = "text";
  for (const child of node.children ?? []) escapeRawHtml(child);
}

type HtmlNode = ReturnType<typeof toHast>;

function sanitizeHtml(node: HtmlNode): void {
  if (node.type === "element") {
    const property = node.tagName === "a" ? "href" : node.tagName === "img" ? "src" : undefined;
    if (property) {
      const value = node.properties[property];
      if (typeof value !== "string" || !safeProseUrl(value, property === "src")) {
        delete node.properties[property];
      }
    }
  }
  if ("children" in node) {
    for (const child of node.children) sanitizeHtml(child);
  }
}

/**
 * Render CommonMark with escaped raw HTML and restricted destinations.
 *
 * @param text - Authored prose.
 * @param inline - Omit the wrapping paragraph for a single paragraph.
 * @param mode - Effective interpretation of this prose.
 * @returns Safe HTML.
 */
export function renderProse(
  text: string,
  inline = false,
  mode: "plain" | "markdown" = "markdown",
): string {
  const prepared = unescapeInlineOpeners(text, mode);
  if (mode === "plain") {
    const escaped = toHtml({ type: "text", value: prepared });
    const tag = inline ? "span" : "p";
    return `<${tag} class="prose-plain">${escaped}</${tag}>`;
  }
  const tree = fromMarkdown(prepared);
  escapeRawHtml(tree);
  const html = sanitize(toHast(tree));
  if (html.type !== "root") throw new Error("Expected a sanitized HTML root");
  sanitizeHtml(html);
  if (inline && html.type === "root" && html.children.length === 1) {
    const child = html.children[0];
    if (child.type === "element" && child.tagName === "p") {
      return toHtml(child.children, { allowDangerousHtml: false });
    }
  }
  return toHtml(html, { allowDangerousHtml: false });
}
