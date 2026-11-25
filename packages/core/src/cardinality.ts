/**
 * Shared parsing and display helpers for {@link StructureNode.cardinality}. The three canonical
 * literals are a closed set; `max-<n>`/`one-or-more-max-<n>` carry an open-ended numeric bound.
 *
 * @module
 */
import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import {
  COLON_SOURCE,
  CSSDOC_CARDINALITY_KEYWORDS,
  CSSDOC_CARDINALITY_SOURCE,
  DIGIT_SOURCE,
} from "@cssdoc/regex";
import type { StructureNode } from "./model.ts";

type Cardinality = NonNullable<StructureNode["cardinality"]>;

/** Match a structure cardinality suffix at the end of a string. */
export const STRUCTURE_CARDINALITY: Regex = arkRegex.as(
  String.raw`${COLON_SOURCE}${CSSDOC_CARDINALITY_SOURCE}\s*$`,
  "u",
);
const TRAILING_CARDINALITY: Regex = arkRegex.as(
  String.raw`^(?<base>[\s\S]*?)${COLON_SOURCE}${CSSDOC_CARDINALITY_SOURCE}(?:\s+(?<private>private))?\s*$`,
  "u",
);
const BOUNDED_MAX: Regex = arkRegex.as(`^max-(${DIGIT_SOURCE}+)$`, "u");
const BOUNDED_ONE_OR_MORE_MAX: Regex = arkRegex.as(`^one-or-more-max-(${DIGIT_SOURCE}+)$`, "u");

/** Convert captured cardinality groups to a canonical value, if one is recognized. */
export function cardinalityFromMatch(
  groups: Record<string, string | undefined>,
): Cardinality | undefined {
  if (groups.oomMax) return `one-or-more-max-${groups.oomMax}` as `one-or-more-max-${number}`;
  if (groups.max) return `max-${groups.max}` as `max-${number}`;
  if (groups.kw && Object.hasOwn(CSSDOC_CARDINALITY_KEYWORDS, groups.kw)) {
    return CSSDOC_CARDINALITY_KEYWORDS[groups.kw];
  }
  return undefined;
}

/** Separate a trailing cardinality from structure parameters, retaining any private marker. */
export function splitTrailingCardinality(raw: string): {
  params: string;
  cardinality?: Cardinality;
} {
  const trimmed = raw.trim();
  const match = trimmed.match(TRAILING_CARDINALITY);
  if (!match?.groups || !match.groups.base) return { params: trimmed };
  const card = cardinalityFromMatch(match.groups);
  if (!card) return { params: trimmed };
  const suffix = match.groups.private ? " private" : "";
  return { params: `${match.groups.base.trim()}${suffix}`.trim(), cardinality: card };
}

/** The ER-style range token for a cardinality, e.g. `0..1`, `0..n`, `1..n`, `0..2`, `1..2`. */
export function cardinalityToken(cardinality: Cardinality): string {
  switch (cardinality) {
    case "optional":
      return "0..1";
    case "many":
      return "0..n";
    case "one-or-more":
      return "1..n";
    default: {
      const boundedMax = cardinality.match(BOUNDED_MAX);
      if (boundedMax) return `0..${boundedMax[1]}`;
      const boundedOneOrMoreMax = cardinality.match(BOUNDED_ONE_OR_MORE_MAX);
      if (boundedOneOrMoreMax) return `1..${boundedOneOrMoreMax[1]}`;
      return cardinality;
    }
  }
}

/** Only a plain `:optional` (0..1) renders as a dashed edge in the Mermaid flowchart. */
export function cardinalityIsDashed(cardinality: Cardinality): boolean {
  return cardinality === "optional";
}
