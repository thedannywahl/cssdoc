/**
 * Shared helpers for {@link StructureNode.cardinality} display, used by both the Mermaid renderer and
 * markdown emitter so the ER-style range token and dashed-vs-solid edge choice stay in one place. The
 * three legacy literals are a closed set; `max-<n>`/`one-or-more-max-<n>` are open-ended (a specific
 * bound), so they're handled by pattern rather than a `Record` lookup.
 *
 * @module
 */
import type { StructureNode } from "./model.ts";

type Cardinality = NonNullable<StructureNode["cardinality"]>;

const BOUNDED_MAX_RE = /^max-(\d+)$/u;
const BOUNDED_ONE_OR_MORE_MAX_RE = /^one-or-more-max-(\d+)$/u;

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
      const boundedMax = cardinality.match(BOUNDED_MAX_RE);
      if (boundedMax) return `0..${boundedMax[1]}`;
      const boundedOneOrMoreMax = cardinality.match(BOUNDED_ONE_OR_MORE_MAX_RE);
      if (boundedOneOrMoreMax) return `1..${boundedOneOrMoreMax[1]}`;
      return cardinality;
    }
  }
}

/** Only a plain `:optional` (0..1) renders as a dashed edge in the Mermaid flowchart. */
export function cardinalityIsDashed(cardinality: Cardinality): boolean {
  return cardinality === "optional";
}
