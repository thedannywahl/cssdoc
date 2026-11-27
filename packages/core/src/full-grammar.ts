import {
  AT_CHAR,
  BACKSLASH_CHAR,
  BRACE_OPEN_CHAR,
  CARRIAGE_RETURN_CHAR,
  LINE_FEED_CHAR,
} from "@cssdoc/regex";
import { fromMarkdown } from "mdast-util-from-markdown";

import { CssDocConfiguration, type ProseMode } from "./configuration.ts";
import { parseDocComment as parsePlainDocComment, type ParsedDoc } from "./grammar.ts";
import { fencedProseRanges, scanInlineTags, scanInlineTagsOutsideCode } from "./inline.ts";
import type { CssParse } from "./model.ts";

/**
 * Find CommonMark inline and block code ranges in framing-free prose.
 *
 * @param text - Markdown prose.
 * @param configuration - Active inline-tag vocabulary.
 * @returns Half-open UTF-16 ranges relative to the prose.
 */
export function markdownCodeRanges(
  text: string,
  configuration: CssDocConfiguration = new CssDocConfiguration(),
): { start: number; end: number }[] {
  const ranges: { start: number; end: number; block: boolean }[] = [];
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
      ranges.push({ start, end, block: node.type === "code" });
      return;
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(fromMarkdown(text));
  const tags = scanInlineTags(text, configuration).filter((tag) => tag.closed);
  return ranges
    .filter(
      (range) =>
        range.block ||
        !tags.some(
          (tag) =>
            tag.start < range.start &&
            tag.end >= range.end &&
            !ranges.some((code) => code.start <= tag.start && code.end > tag.start),
        ),
    )
    .map(({ start, end }) => ({ start, end }));
}

/** A source range for one Markdown construct. Nested constructs can overlap. */
export interface MarkdownSyntaxRange {
  /** Inclusive UTF-16 source offset. */
  start: number;
  /** Exclusive UTF-16 source offset. */
  end: number;
  /** Markdown AST node type. */
  kind:
    | "emphasis"
    | "strong"
    | "link"
    | "image"
    | "heading"
    | "list"
    | "blockquote"
    | "thematicBreak";
  /** Nesting depth for resolving overlapping constructs. */
  depth: number;
}

/**
 * Find Markdown construct ranges while keeping cssdoc inline tags opaque.
 *
 * @param text - Markdown prose.
 * @param configuration - Active inline-tag vocabulary.
 * @returns Source-relative ranges, including nested constructs.
 */
export function markdownSyntaxRanges(
  text: string,
  configuration: CssDocConfiguration = new CssDocConfiguration(),
): MarkdownSyntaxRange[] {
  const code = markdownCodeRanges(text, configuration);
  const masked = text.split("");
  for (const tag of scanInlineTagsOutsideCode(text, code, configuration)) {
    if (!tag.closed) continue;
    for (let i = tag.start; i < tag.end; i++) {
      if (text[i] !== CARRIAGE_RETURN_CHAR && text[i] !== LINE_FEED_CHAR) masked[i] = "x";
    }
  }
  const kinds = new Set<MarkdownSyntaxRange["kind"]>([
    "emphasis",
    "strong",
    "link",
    "image",
    "heading",
    "list",
    "blockquote",
    "thematicBreak",
  ]);
  const ranges: MarkdownSyntaxRange[] = [];
  type Node = {
    type: string;
    position?: { start: { offset?: number }; end: { offset?: number } };
    children?: readonly Node[];
  };
  const visit = (node: Node, depth: number): void => {
    const kind = [...kinds].find((item) => item === node.type);
    if (kind) {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start === undefined || end === undefined) throw new Error("Markdown node has no offsets");
      ranges.push({ start, end, kind, depth });
    }
    for (const child of node.children ?? []) visit(child, depth + 1);
  };
  visit(fromMarkdown(masked.join("")), 0);
  return ranges;
}

/**
 * Find odd backslash runs that escape inline openers outside protected code.
 *
 * @param text - Framing-free authored prose.
 * @param mode - Effective prose mode.
 * @param configuration - Active inline-tag vocabulary.
 * @returns Half-open ranges covering the backslash runs, in source order.
 */
export function escapedInlineOpenerRanges(
  text: string,
  mode: "plain" | "markdown",
  configuration: CssDocConfiguration = new CssDocConfiguration(),
): { start: number; end: number }[] {
  const code =
    mode === "markdown" ? markdownCodeRanges(text, configuration) : fencedProseRanges(text);
  const ranges: { start: number; end: number }[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== BACKSLASH_CHAR) continue;
    const start = i;
    while (text[i] === BACKSLASH_CHAR) i++;
    if (
      (i - start) % 2 === 1 &&
      text[i] === BRACE_OPEN_CHAR &&
      text[i + 1] === AT_CHAR &&
      !code.some((range) => start >= range.start && start < range.end)
    ) {
      ranges.push({ start, end: i });
    }
  }
  return ranges;
}

/**
 * Remove the escaping backslash from inline openers while preserving protected code.
 *
 * Markdown output uses entities for remaining backslashes so the Markdown parser doesn't consume
 * them as escapes. The result is intended for rendering, not storage or source mapping.
 *
 * @param text - Framing-free authored prose.
 * @param mode - Effective prose mode.
 * @param configuration - Active inline-tag vocabulary.
 * @returns Prose prepared for the selected renderer.
 */
export function unescapeInlineOpeners(
  text: string,
  mode: "plain" | "markdown",
  configuration?: CssDocConfiguration,
): string {
  let cursor = 0;
  let result = "";
  for (const range of escapedInlineOpenerRanges(text, mode, configuration)) {
    result += text.slice(cursor, range.start);
    result += (mode === "markdown" ? "&#92;" : BACKSLASH_CHAR).repeat(range.end - range.start - 1);
    if (mode === "markdown") result += "&#123;";
    cursor = range.end + (mode === "markdown" ? 1 : 0);
  }
  return result + text.slice(cursor);
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
  const references = new Set<string>();
  const collectReferences = (node: unknown): void => {
    if (typeof node !== "object" || node === null) return;
    if (
      "type" in node &&
      node.type === "definition" &&
      "identifier" in node &&
      typeof node.identifier === "string"
    ) {
      references.add(node.identifier);
    }
    if ("children" in node && Array.isArray(node.children)) {
      for (const child of node.children) collectReferences(child);
    }
  };
  collectReferences(tree);
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
    if (
      (node.type === "linkReference" || node.type === "imageReference") &&
      "identifier" in node &&
      typeof node.identifier === "string" &&
      references.has(node.identifier)
    ) {
      markdown = true;
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
