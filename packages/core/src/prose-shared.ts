import {
  AT_SOURCE,
  BRACE_CLOSE_SOURCE,
  BRACE_OPEN_SOURCE,
  CARRIAGE_RETURN_CHAR,
  CSSDOC_BLOCK_TAG_NAME_SOURCE,
  LINE_ENDING_SOURCE,
  LINE_FEED_CHAR,
  SPACE_TAB_SOURCE,
} from "@cssdoc/regex";
import { regex as arkRegex } from "arkregex";
import { blockSourceRange, type DocCommentBlock } from "./blocks.ts";
import { type CssDocConfiguration } from "./configuration.ts";
import { docProseStart } from "./structure-boundaries.ts";

/** Source-preserving prose extracted from a doc-comment block. */
export interface DocCommentProse {
  /** Canonical block-tag name without `@`. */
  tag: string;
  /** Authored header before the prose divider. */
  header: string;
  /** Framing-free authored prose. */
  text: string;
  /** Effective interpretation; lite always uses plain. */
  mode: "plain" | "markdown";
  /** Remark kind, if present. */
  remarkKind?: string;
  /** Whether the prose is private. */
  private?: boolean;
  /** Model field populated by this occurrence, when it is the effective value. */
  field?: "remarks" | "usage";
  /** Index into the record's examples, for example prose. */
  exampleIndex?: number;
  /** UTF-16 range relative to the original comment. */
  span: { start: number; end: number };
}

/**
 * Collect prose after explicit dividers without changing block ownership.
 *
 * @param raw - Original doc comment.
 * @param blocks - Source-mapped blocks from the shared scanner.
 * @param configuration - Active tag vocabulary.
 * @returns Prose bodies in source order, initially interpreted as plain.
 */
export function collectProse(
  raw: string,
  blocks: readonly DocCommentBlock[],
  configuration: CssDocConfiguration,
): DocCommentProse[] {
  const TAG = arkRegex.as(`^${AT_SOURCE}(${CSSDOC_BLOCK_TAG_NAME_SOURCE})`, "u");
  const ENDING = arkRegex.as(LINE_ENDING_SOURCE, "u");
  const PRIVATE = arkRegex.as(`${BRACE_OPEN_SOURCE}${AT_SOURCE}private${BRACE_CLOSE_SOURCE}`, "u");
  const FIRST_WORD = arkRegex.as(`^${SPACE_TAB_SOURCE}*([^\\s{]+)`, "u");
  const result: DocCommentProse[] = [];
  let examples = 0;
  for (const block of blocks) {
    const tagMatch = TAG.exec(block.text);
    if (!tagMatch) continue;
    const definition = configuration.tryGetTagDefinition(tagMatch[1]);
    if (
      !definition ||
      !configuration.isTagSupported(definition) ||
      definition.syntaxKind === "inline"
    )
      continue;
    const exampleIndex = definition.canonicalName === "example" ? examples++ : undefined;
    const lineEnd = block.text.search(ENDING);
    let firstLine = block.text.slice(0, lineEnd < 0 ? undefined : lineEnd);
    if (lineEnd >= 0 && firstLine.endsWith(CARRIAGE_RETURN_CHAR))
      firstLine = firstLine.slice(0, -1);
    const proseStart = docProseStart(firstLine);
    if (proseStart === undefined) continue;
    const dividerEnd = proseStart - (firstLine[proseStart - 1] === " " ? 1 : 0);
    const header = firstLine.slice(0, dividerEnd - 1);
    const remarkKind =
      definition.canonicalName === "remarks"
        ? FIRST_WORD.exec(header.slice(tagMatch[0].length))?.[1]
        : undefined;
    let end = definition.canonicalName === "structure" ? firstLine.length : block.text.length;
    if (block.text[end - 1] === CARRIAGE_RETURN_CHAR) {
      const last = blockSourceRange(block, end - 1, end);
      if (raw[last.end] === LINE_FEED_CHAR) end--;
    }
    let start = proseStart;
    if (start === firstLine.length && lineEnd >= 0 && start < end) {
      const ending = ENDING.exec(block.text.slice(start));
      if (ending?.index === 0) start += Math.min(ending[0].length, end - start);
    }
    result.push({
      tag: definition.canonicalName,
      header,
      text: block.text.slice(start, end),
      mode: "plain",
      ...(remarkKind ? { remarkKind } : {}),
      ...(PRIVATE.test(header) ||
      definition.canonicalName === "privateRemarks" ||
      definition.canonicalName === "todo" ||
      remarkKind === "todo"
        ? { private: true }
        : {}),
      ...(exampleIndex === undefined ? {} : { exampleIndex }),
      span: blockSourceRange(block, start, end),
    });
  }
  return result;
}
