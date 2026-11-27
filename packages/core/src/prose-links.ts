import { CssDocConfiguration } from "./configuration.ts";
import { markdownCodeRanges } from "./full-grammar.ts";
import { fencedProseRanges, parseInlineLink, scanInlineTagsOutsideCode } from "./inline.ts";
import { parseReference, type CssDocReference } from "./reference.ts";

/** One public prose fragment, with private-link labels distinguished from authored prose. */
export type PublicProseFragment =
  | { kind: "prose"; text: string }
  | { kind: "literal"; text: string };

/** Result of projecting links in one prose field. */
export interface PublicProseProjection {
  /** Fragments in order; literal fragments must be rendered as plain text. */
  fragments: PublicProseFragment[];
  /** Whether a reference's visibility couldn't be established. */
  unavailable: boolean;
}

/**
 * Replace confirmed private-target links with literal labels without mutating authored prose.
 *
 * This helper doesn't build a lookup or decide visibility. Callers must provide the source
 * context for each prose field and handle unavailable references. Unresolved and malformed links
 * remain authored text; diagnostic settings don't affect the projection.
 *
 * @param text - Authored prose.
 * @param mode - Effective prose mode.
 * @param resolveVisibility - Resolve a structured reference in the prose's original scope.
 * @param configuration - Active inline-tag vocabulary.
 * @returns Public fragments and whether any visibility lookup was unavailable.
 */
export function projectPrivateLinks(
  text: string,
  mode: "plain" | "markdown",
  resolveVisibility: (reference: CssDocReference) => "private" | "public" | "unavailable",
  configuration: CssDocConfiguration = new CssDocConfiguration(),
): PublicProseProjection {
  const protectedRanges =
    mode === "markdown" ? markdownCodeRanges(text, configuration) : fencedProseRanges(text);
  const fragments: PublicProseFragment[] = [];
  let unavailable = false;
  let cursor = 0;
  for (const tag of scanInlineTagsOutsideCode(text, protectedRanges, configuration)) {
    if (tag.tag !== "link") continue;
    const link = parseInlineLink(text, tag);
    if (!link.ok || link.target.kind !== "reference") continue;
    const parsed = parseReference(link.target.value);
    if (!parsed.ok) continue;
    const visibility = resolveVisibility(parsed.reference);
    if (visibility === "unavailable") {
      unavailable = true;
      continue;
    }
    if (visibility !== "private") continue;
    if (cursor < tag.start) fragments.push({ kind: "prose", text: text.slice(cursor, tag.start) });
    fragments.push({ kind: "literal", text: link.label ?? "reference" });
    cursor = tag.end;
  }
  if (cursor < text.length) fragments.push({ kind: "prose", text: text.slice(cursor) });
  return { fragments, unavailable };
}
