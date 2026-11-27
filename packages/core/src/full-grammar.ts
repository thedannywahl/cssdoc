import { CARRIAGE_RETURN_CHAR, LINE_FEED_CHAR } from "@cssdoc/regex";
import { fromMarkdown } from "mdast-util-from-markdown";
import { CssDocConfiguration, type ProseMode } from "./configuration.ts";
import { parseDocComment as parsePlainDocComment, type ParsedDoc } from "./grammar.ts";
import { scanInlineTags } from "./inline.ts";
import type { CssParse } from "./model.ts";

/**
 * Find CommonMark inline and block code ranges in framing-free prose.
 *
 * @param text - Markdown prose.
 * @returns Half-open UTF-16 ranges relative to the prose.
 */
export function markdownCodeRanges(text: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  type Node = {
    type: string;
    position?: { start: { offset?: number }; end: { offset?: number } };
    children?: readonly Node[];
  };
  const visit = (node: Node): void => {
    if (node.type === "code" || node.type === "inlineCode") {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start === undefined || end === undefined) throw new Error("Markdown code has no offsets");
      ranges.push({ start, end });
      return;
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(fromMarkdown(text));
  return ranges;
}

function maskInlineTags(text: string, configuration: CssDocConfiguration): string {
  const masked = text.split("");
  for (const tag of scanInlineTags(text, configuration)) {
    if (!tag.closed) continue;
    for (let i = tag.start; i < tag.end; i++) {
      if (text[i] !== CARRIAGE_RETURN_CHAR && text[i] !== LINE_FEED_CHAR) masked[i] = "x";
    }
  }
  return masked.join("");
}

function effectiveMode(
  text: string,
  mode: ProseMode,
  configuration: CssDocConfiguration,
): "plain" | "markdown" {
  if (mode !== "auto") return mode;
  const signals = new Set([
    "emphasis",
    "strong",
    "link",
    "image",
    "inlineCode",
    "code",
    "heading",
    "list",
    "blockquote",
    "thematicBreak",
    "break",
  ]);
  const tree = fromMarkdown(maskInlineTags(text, configuration));
  let markdown = false;
  let paragraphs = 0;
  const visit = (node: unknown): void => {
    if (
      typeof node !== "object" ||
      node === null ||
      !("type" in node) ||
      typeof node.type !== "string"
    ) {
      throw new Error("Invalid Markdown AST node");
    }
    if (signals.has(node.type)) markdown = true;
    if (node.type === "paragraph") paragraphs++;
    if ("children" in node) {
      if (!Array.isArray(node.children)) throw new Error("Invalid Markdown AST children");
      for (const child of node.children) visit(child);
    }
  };
  visit(tree);
  return markdown || paragraphs > 1 ? "markdown" : "plain";
}

/**
 * Parse a doc comment with the configured full-core prose interpretation.
 *
 * @param raw - A complete doc comment or unframed text.
 * @param configuration - Active tags and prose settings.
 * @param parse - Optional CSS parser for structure trees.
 * @returns Parsed tags and source-preserving prose.
 */
export function parseDocComment(
  raw: string,
  configuration: CssDocConfiguration = new CssDocConfiguration(),
  parse?: CssParse,
): ParsedDoc {
  const doc = parsePlainDocComment(raw, configuration, parse);
  return {
    ...doc,
    prose: doc.prose.map((body) => ({
      ...body,
      mode: effectiveMode(
        body.text,
        configuration.proseModeFor(body.tag, body.remarkKind),
        configuration,
      ),
    })),
  };
}
