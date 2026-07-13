/**
 * Render an authored `@structure` tree ({@link StructureNode}[]) as a Mermaid flowchart, so an emitter
 * can show a component's HTML shape as a diagram. Output-agnostic: it returns Mermaid source; the host
 * decides how to render it (a ```mermaid fence, a live renderer, …).
 *
 * @module
 */
import type { StructureNode } from "./model.ts";

const CARDINALITY_LABEL = { optional: " (optional)", many: " (0..n)", "one-or-more": " (1..n)" };
const SLOT_NODE = /^slot(?:\[\s*name\s*=\s*["']?([\w-]+)["']?\s*\])?$/u;

/**
 * A node's label: its selector (a `slot` node shown as ‹content›) plus a cardinality suffix, quoted for a
 * Mermaid node body (quoting allows dots, brackets, and spaces).
 */
const label = (node: StructureNode): string => {
  const slot = node.selector.match(SLOT_NODE);
  const base = slot ? (slot[1] ? `‹content: ${slot[1]}›` : "‹content›") : node.selector;
  const text = `${base}${node.cardinality ? CARDINALITY_LABEL[node.cardinality] : ""}`;
  return `"${text.replace(/"/gu, "&quot;")}"`;
};

/**
 * Convert a structure tree to a Mermaid `flowchart` definition. Each node gets a stable id (`n0`, `n1`,
 * …) in depth-first order; edges connect a parent to each child.
 *
 * @param roots - Top-level {@link StructureNode}s (an authored `@structure`).
 * @param options - `direction` sets the flowchart orientation (default `TD`, top-down).
 * @returns Mermaid source, or an empty string when there are no nodes.
 *
 * @example
 * ```ts
 * toMermaid([{ selector: ".tabs", children: [{ selector: ".panel", children: [] }] }]);
 * // flowchart TD
 * //   n0[".tabs"]
 * //   n1[".panel"]
 * //   n0 --> n1
 * ```
 */
export function toMermaid(
  roots: StructureNode[],
  options: { direction?: "TD" | "LR" } = {},
): string {
  if (!roots.length) return "";
  const lines: string[] = [`flowchart ${options.direction ?? "TD"}`];
  const edges: string[] = [];
  let counter = 0;
  const walk = (node: StructureNode): string => {
    const id = `n${counter++}`;
    lines.push(`  ${id}[${label(node)}]`);
    for (const child of node.children) edges.push(`  ${id} --> ${walk(child)}`);
    return id;
  };
  for (const root of roots) walk(root);
  return [...lines, ...edges].join("\n");
}
