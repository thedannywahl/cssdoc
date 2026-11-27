import {
  AT_CHAR,
  BACKSLASH_CHAR,
  BRACE_CLOSE_CHAR,
  BRACE_OPEN_CHAR,
  BRACKET_CLOSE_CHAR,
  BRACKET_OPEN_CHAR,
  CARRIAGE_RETURN_CHAR,
  LINE_FEED_CHAR,
  PAREN_CLOSE_CHAR,
  PAREN_OPEN_CHAR,
  QUOTE_DOUBLE_CHAR,
  CSSDOC_BLOCK_TAG_NAME_SOURCE,
} from "@cssdoc/regex";
import { regex as arkRegex } from "arkregex";
import { fromMarkdown } from "mdast-util-from-markdown";
import { CssDocConfiguration, type ProseMode } from "./configuration.ts";
import { parseDocComment as parsePlainDocComment, type ParsedDoc } from "./grammar.ts";
import type { CssParse } from "./model.ts";

function maskInlineTags(text: string, configuration: CssDocConfiguration): string {
  const name = arkRegex.as(`^(${CSSDOC_BLOCK_TAG_NAME_SOURCE})(?=\\s|\\})`, "u");
  const masked = text.split("");
  for (let start = 0; start + 1 < text.length; start++) {
    if (text[start] !== BRACE_OPEN_CHAR || text[start + 1] !== AT_CHAR) continue;
    let slashes = 0;
    for (let i = start - 1; i >= 0 && text[i] === BACKSLASH_CHAR; i--) slashes++;
    if (slashes % 2) continue;
    const tag = name.exec(text.slice(start + 2))?.[1];
    const definition = tag && configuration.tryGetTagDefinition(tag);
    if (!definition || definition.syntaxKind !== "inline") continue;
    const stack: string[] = [];
    let quote = false;
    let escaped = false;
    for (let end = start + 2 + tag.length; end < text.length; end++) {
      const char = text[end];
      if (escaped) {
        escaped = false;
      } else if (char === BACKSLASH_CHAR) {
        escaped = true;
      } else if (char === QUOTE_DOUBLE_CHAR) {
        quote = !quote;
      } else if (!quote) {
        if (char === PAREN_OPEN_CHAR || char === BRACKET_OPEN_CHAR) stack.push(char);
        else if (char === PAREN_CLOSE_CHAR && stack.at(-1) === PAREN_OPEN_CHAR) stack.pop();
        else if (char === BRACKET_CLOSE_CHAR && stack.at(-1) === BRACKET_OPEN_CHAR) stack.pop();
        else if (char === BRACE_CLOSE_CHAR && stack.length === 0) {
          for (let i = start; i <= end; i++) {
            if (text[i] !== CARRIAGE_RETURN_CHAR && text[i] !== LINE_FEED_CHAR) masked[i] = "x";
          }
          start = end;
          break;
        }
      }
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
