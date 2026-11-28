/**
 * Shared parsing and display helpers for {@link StructureNode.cardinality}. The three canonical
 * literals are a closed set; `max-<n>`/`one-or-more-max-<n>` carry an open-ended numeric bound.
 *
 * @module
 */

import { CSSDOC_CARDINALITY_KEYWORDS } from "@cssdoc/regex";

import type { StructureNode } from "./model.ts";

type Cardinality = NonNullable<StructureNode["cardinality"]>;

/** Match a structure cardinality suffix at the end of a string. */
export const STRUCTURE_CARDINALITY: RegExp =
  /:(?<card>(?<oomKw>one-or-more|more):max-(?<oomMax>\d+)|max-(?<max>\d+)|(?<kw>optional|opt|many|one-or-more|more))\s*$/u;
const TRAILING_CARDINALITY: RegExp =
  /^(?<base>[\s\S]*?):(?<card>(?<oomKw>one-or-more|more):max-(?<oomMax>\d+)|max-(?<max>\d+)|(?<kw>optional|opt|many|one-or-more|more))(?:\s+(?<private>private))?\s*$/u;
const BOUNDED_MAX: RegExp = /^max-(\d+)$/u;
const BOUNDED_ONE_OR_MORE_MAX: RegExp = /^one-or-more-max-(\d+)$/u;

function isBoundedCardinality(value: string): value is Cardinality {
  return BOUNDED_MAX.test(value) || BOUNDED_ONE_OR_MORE_MAX.test(value);
}

/** Convert captured cardinality groups to a canonical value, if one is recognized. */
export function cardinalityFromMatch(
  groups: Record<string, string | undefined>,
): Cardinality | undefined {
  const bounded = groups.oomMax
    ? `one-or-more-max-${groups.oomMax}`
    : groups.max
      ? `max-${groups.max}`
      : undefined;
  if (bounded !== undefined) return isBoundedCardinality(bounded) ? bounded : undefined;
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
  const match = TRAILING_CARDINALITY.exec(trimmed);
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
      const boundedMax = BOUNDED_MAX.exec(cardinality);
      if (boundedMax) return `0..${boundedMax[1]}`;
      const boundedOneOrMoreMax = BOUNDED_ONE_OR_MORE_MAX.exec(cardinality);
      if (boundedOneOrMoreMax) return `1..${boundedOneOrMoreMax[1]}`;
      return cardinality;
    }
  }
}

/** Only a plain `:optional` (0..1) renders as a dashed edge in the Mermaid flowchart. */
export function cardinalityIsDashed(cardinality: Cardinality): boolean {
  return cardinality === "optional";
}
