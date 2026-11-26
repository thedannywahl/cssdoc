import {
  AT_CHAR,
  AT_SOURCE,
  BRACE_OPEN_CHAR,
  COMMENT_START_SOURCE,
  CSSDOC_BLOCK_TAG_NAME_SOURCE,
} from "@cssdoc/regex";
import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import { CssDocConfiguration } from "./configuration.ts";
import { frameCommentLines } from "./framing.ts";
import { scanStructureLine, type StructureBoundaryState } from "./structure-boundaries.ts";

/** A tag block and its source range within a doc-comment input. */
export interface DocCommentBlock {
  /** Framing-free block text. */
  text: string;
  /** Inclusive UTF-16 offset of the tag opener. */
  start: number;
  /** Exclusive UTF-16 offset of the last non-whitespace character in the block. */
  end: number;
}

/**
 * Collect tag blocks while retaining their offsets in the comment input.
 *
 * @param raw - A block comment or its inner text.
 * @param configuration - The active tag configuration.
 * @returns The tag blocks in source order.
 */
export function collectDocCommentBlocks(
  raw: string,
  configuration: CssDocConfiguration,
): DocCommentBlock[] {
  const TAG_LINE: Regex = arkRegex.as(
    String.raw`^\s*${AT_SOURCE}(${CSSDOC_BLOCK_TAG_NAME_SOURCE})`,
    "u",
  );
  const INDENTED_AT_RULE: Regex = arkRegex.as(String.raw`^\s+${AT_SOURCE}`, "u");
  const COMMENT_OPENING: Regex = arkRegex.as(`^${COMMENT_START_SOURCE}`, "u");
  const lines = frameCommentLines(raw, COMMENT_OPENING.test(raw) ? "framed" : "none");
  const text = lines.map((line) => line.text).join("\n");
  const start = text.length - text.trimStart().length;
  const body = text.slice(start, text.trimEnd().length);
  let lineIndex = 0;
  let lineStart = 0;
  while (lineIndex < lines.length - 1 && lineStart + lines[lineIndex].text.length < start) {
    lineStart += lines[lineIndex].text.length + 1;
    lineIndex++;
  }

  const blocks: DocCommentBlock[] = [];
  let inStructureBlock = false;
  let structureState: StructureBoundaryState = { stack: [], comment: false, escaped: false };
  let leadingTrim = start - lineStart;
  for (const line of body.split("\n")) {
    const sourceStart = lines[lineIndex].start + leadingTrim;
    const tagMatch = line.match(TAG_LINE);
    const isKnownTag =
      tagMatch !== null && configuration.tryGetTagDefinition(tagMatch[1]) !== undefined;
    const startsBlock =
      tagMatch !== null &&
      (isKnownTag
        ? !(
            inStructureBlock &&
            (structureState.stack.includes(BRACE_OPEN_CHAR) ||
              (tagMatch[1] !== "structure" && INDENTED_AT_RULE.test(line)))
          )
        : !inStructureBlock);
    const lastNonWhitespace = line.trimEnd().length;
    if (startsBlock && tagMatch) {
      const tagStart = line.indexOf(AT_CHAR);
      blocks.push({
        text: line.trim(),
        start: sourceStart + tagStart,
        end: sourceStart + lastNonWhitespace,
      });
      inStructureBlock = tagMatch[1] === "structure";
      if (inStructureBlock) {
        structureState = { stack: [], comment: false, escaped: false };
        scanStructureLine(line.slice(tagMatch[0].length), structureState);
      }
    } else if (blocks.length) {
      const block = blocks[blocks.length - 1];
      block.text += `\n${line}`;
      if (lastNonWhitespace > 0) block.end = sourceStart + lastNonWhitespace;
      if (inStructureBlock) scanStructureLine(line, structureState);
    }
    lineIndex++;
    leadingTrim = 0;
  }
  return blocks;
}
