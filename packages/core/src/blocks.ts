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
import { scanCodeBoundaryLine, type CodeBoundaryState } from "./code-boundaries.ts";
import {
  docProseStart,
  hasStructureDocDivider,
  opensStructureAtRule,
  scanStructureLine,
  type StructureBoundaryState,
} from "./structure-boundaries.ts";

/** A tag block and its source range within a doc-comment input. */
export interface DocCommentBlock {
  /** Framing-free block text. */
  text: string;
  /** Inclusive UTF-16 offset of the tag opener. */
  start: number;
  /** Exclusive UTF-16 offset of the last non-whitespace character in the block. */
  end: number;
  /** Framing-free text segments and their corresponding source offsets. */
  segments: DocCommentSegment[];
}

/** A contiguous UTF-16 range shared by block text and the original comment. */
export interface DocCommentSegment {
  /** Inclusive offset into the block text. */
  textStart: number;
  /** Inclusive offset into the original comment. */
  sourceStart: number;
  /** Length in UTF-16 code units. */
  length: number;
}

/**
 * Map a range of framing-free block text back to the original comment.
 *
 * @param block - The block containing the range.
 * @param start - Inclusive UTF-16 offset in the block text.
 * @param end - Exclusive UTF-16 offset in the block text.
 * @returns The corresponding half-open range in the comment.
 * @throws If the offsets are not a valid range in the block.
 */
export function blockSourceRange(
  block: DocCommentBlock,
  start: number,
  end: number,
): { start: number; end: number } {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    end > block.text.length
  ) {
    throw new RangeError("Invalid doc-comment block range");
  }
  const point = (offset: number, preferPrevious: boolean): number => {
    for (const segment of block.segments) {
      const segmentEnd = segment.textStart + segment.length;
      if (
        (offset >= segment.textStart && offset < segmentEnd) ||
        (preferPrevious && offset === segmentEnd)
      ) {
        return segment.sourceStart + offset - segment.textStart;
      }
    }
    const last = block.segments[block.segments.length - 1];
    return last.sourceStart + last.length;
  };
  const sourceStart = point(start, false);
  return { start: sourceStart, end: start === end ? sourceStart : point(end, true) };
}

/**
 * Collect tag blocks while retaining their offsets in the comment input.
 *
 * @param raw - A block comment or its inner text.
 * @param configuration - The active tag configuration (defaults to the standard vocabulary).
 * @returns The tag blocks in source order.
 */
export function collectDocCommentBlocks(
  raw: string,
  configuration: CssDocConfiguration = new CssDocConfiguration(),
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
  let codeState: CodeBoundaryState = { containers: [], indented: false, paragraph: false };
  let leadingTrim = start - lineStart;
  for (const line of body.split("\n")) {
    const sourceStart = lines[lineIndex].start + leadingTrim;
    const inCode = blocks.length > 0 && !inStructureBlock && scanCodeBoundaryLine(line, codeState);
    const tagMatch = line.match(TAG_LINE);
    const isKnownTag =
      tagMatch !== null && configuration.tryGetTagDefinition(tagMatch[1]) !== undefined;
    const inNestedStructure = inStructureBlock && structureState.stack.includes(BRACE_OPEN_CHAR);
    const hasDocDivider =
      tagMatch !== null && inStructureBlock && !inNestedStructure && hasStructureDocDivider(line);
    const opensCssBlock =
      tagMatch !== null &&
      inStructureBlock &&
      !inNestedStructure &&
      !hasDocDivider &&
      opensStructureAtRule(line);
    const startsBlock =
      tagMatch !== null &&
      !inCode &&
      !opensCssBlock &&
      (hasDocDivider ||
        (isKnownTag
          ? !(
              inNestedStructure ||
              (inStructureBlock && tagMatch[1] !== "structure" && INDENTED_AT_RULE.test(line))
            )
          : !inStructureBlock));
    const lastNonWhitespace = line.trimEnd().length;
    if (startsBlock && tagMatch) {
      const tagStart = line.indexOf(AT_CHAR);
      const text = line.slice(tagStart);
      blocks.push({
        text,
        start: sourceStart + tagStart,
        end: sourceStart + lastNonWhitespace,
        segments: [{ textStart: 0, sourceStart: sourceStart + tagStart, length: text.length }],
      });
      inStructureBlock = tagMatch[1] === "structure";
      codeState = { containers: [], indented: false, paragraph: false };
      if (inStructureBlock) {
        structureState = { stack: [], comment: false, escaped: false };
        scanStructureLine(line.slice(tagMatch[0].length), structureState);
      } else {
        const proseStart = docProseStart(line);
        if (proseStart !== undefined) scanCodeBoundaryLine(line.slice(proseStart), codeState);
      }
    } else if (blocks.length) {
      const block = blocks[blocks.length - 1];
      block.segments.push({
        textStart: block.text.length,
        sourceStart: lines[lineIndex - 1].end,
        length: 1,
      });
      if (line.length) {
        block.segments.push({
          textStart: block.text.length + 1,
          sourceStart,
          length: line.length,
        });
      }
      block.text += `\n${line}`;
      if (lastNonWhitespace > 0) block.end = sourceStart + lastNonWhitespace;
      if (inStructureBlock) scanStructureLine(line, structureState);
    }
    lineIndex++;
    leadingTrim = 0;
  }
  return blocks;
}
