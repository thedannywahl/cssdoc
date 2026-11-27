import { CssDocConfiguration, collectDocCommentBlocks } from "@cssdoc/core/lite";
import { AT_SOURCE, CSSDOC_BLOCK_TAG_NAME_SOURCE } from "@cssdoc/regex";
import { regex as arkRegex } from "arkregex";

/** A source-mapped doc-comment highlighting span. */
export interface DocHighlight {
  /** Inclusive UTF-16 offset in the supplied comment. */
  start: number;
  /** Exclusive UTF-16 offset in the supplied comment. */
  end: number;
  /** Semantic role of this span. */
  role: "blockTag";
  /** Canonical name of the recognized tag, without `@`. */
  tag: string;
}

/**
 * Highlight recognized block-tag openers using the shared doc-comment boundary scanner.
 *
 * @param text - One complete or incomplete doc comment.
 * @param configuration - Active tag vocabulary.
 * @returns Non-overlapping spans in source order. Disabled and unknown tags aren't highlighted.
 */
export function highlightDocComment(
  text: string,
  configuration: CssDocConfiguration = new CssDocConfiguration(),
): DocHighlight[] {
  const TAG = arkRegex.as(`^${AT_SOURCE}(${CSSDOC_BLOCK_TAG_NAME_SOURCE})`, "u");
  const result: DocHighlight[] = [];
  for (const block of collectDocCommentBlocks(text, configuration)) {
    const match = TAG.exec(block.text);
    if (!match) continue;
    const definition = configuration.tryGetTagDefinition(match[1]);
    if (
      !definition ||
      !configuration.isTagSupported(definition) ||
      definition.syntaxKind === "inline"
    ) {
      continue;
    }
    result.push({
      start: block.start,
      end: block.start + match[0].length,
      role: "blockTag",
      tag: definition.canonicalName,
    });
  }
  return result;
}
