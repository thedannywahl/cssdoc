/**
 * Render an authored `@structure` tree ({@link StructureNode}[]) as a Mermaid flowchart, so an emitter
 * can show a component's HTML shape as a diagram. Output-agnostic: it returns Mermaid source; the host
 * decides how to render it (a ```mermaid fence, a live renderer, …).
 *
 * The diagram is *structured* — every node is classified and shaped by what it is, and cardinality
 * rides the edge (ER-style) rather than the label:
 *
 * - **root** (`:::cssdoc-root`, rectangle) — the record's own base element.
 * - **part** (`:::cssdoc-part`, rounded) — a sub-element selector like `.title` / `.item.-selected`.
 * - **slot** (`:::cssdoc-slot`, parallelogram) — a `slot` / `slot[name="x"]` content region, shown as
 *   ‹content› / ‹content: x›.
 * - **component** (`:::cssdoc-component`, stadium) — a child that is *itself* a documented record
 *   (resolved via {@link MermaidOptions.resolveComponent}); labelled by component name and linked to
 *   its page when an href is known.
 *
 * Edges carry cardinality from the child's {@link StructureNode.cardinality}: required `-->`, optional
 * `-.->|0..1|` (dashed), many `-->|0..n|`, one-or-more `-->|1..n|`. The four `classDef`s give a
 * readable standalone default; a host can restyle by targeting the class names (e.g. a VitePress theme
 * mapping them to `--vp-c-*`).
 *
 * @module
 */
import type { StructureNode } from "./model.ts";

/** Resolve a bare class name (no leading dot) to the sibling component it is the base class of. */
export type ResolveStructureComponent = (
  className: string,
) => { name: string; href?: string } | undefined;

/** Options for {@link toMermaid}. */
export interface MermaidOptions {
  /** Flowchart orientation (default `"TD"`, top-down). */
  direction?: "TD" | "LR";
  /**
   * The current record's base class, no leading dot (e.g. `alert`). Its top-level node renders as the
   * diagram root; a descendant that references the same class stays a part, never a sibling component.
   */
  self?: string;
  /**
   * Classify a bare class as a *sibling component* — a child that is itself a documented record. Such
   * nodes get the stadium shape, are labelled by component name, and (when an `href` is returned) link
   * to that component's page. Absent → every non-slot, non-root node is a plain part.
   */
  resolveComponent?: ResolveStructureComponent;
}

/** Match a `slot` / `slot[name="x"]` node (a light-DOM content region → the default/named slot). */
const SLOT_NODE = /^slot(?:\[\s*name\s*=\s*["']?([\w-]+)["']?\s*\])?$/u;

type NodeClass = "cssdoc-root" | "cssdoc-part" | "cssdoc-slot" | "cssdoc-component";

/** The child edge for each cardinality (dashed + `0..1` for optional; a count label for the ranges). */
const EDGE: Record<NonNullable<StructureNode["cardinality"]> | "required", string> = {
  required: "-->",
  optional: "-.->|0..1|",
  many: "-->|0..n|",
  "one-or-more": "-->|1..n|",
};

/** The ER range token for a cardinality — used on the root's label, which has no incoming edge. */
const CARDINALITY_TOKEN: Record<NonNullable<StructureNode["cardinality"]>, string> = {
  optional: "0..1",
  many: "0..n",
  "one-or-more": "1..n",
};

/** Wrap a node's label in the shape mermaid draws for its class. */
const SHAPE: Record<NodeClass, (id: string, label: string) => string> = {
  "cssdoc-root": (id, l) => `${id}["${l}"]`,
  "cssdoc-part": (id, l) => `${id}("${l}")`,
  "cssdoc-slot": (id, l) => `${id}[/"${l}"/]`,
  "cssdoc-component": (id, l) => `${id}(["${l}"])`,
};

/** The classDef palette — a readable standalone default; hosts restyle by class name. */
const CLASS_DEFS = [
  "classDef cssdoc-root fill:#eef2ff,stroke:#6366f1,color:#1e1b4b;",
  "classDef cssdoc-part fill:#f8fafc,stroke:#94a3b8,color:#0f172a;",
  "classDef cssdoc-slot fill:#f0fdf4,stroke:#4ade80,color:#14532d;",
  "classDef cssdoc-component fill:#fff7ed,stroke:#fb923c,color:#7c2d12;",
];

/** The leading bare class of a compound selector, e.g. `.item.-selected` → `item`. */
const firstClass = (selector: string): string | undefined => selector.match(/\.([\w-]+)/u)?.[1];

/** Escape a label for a quoted Mermaid node body. */
const esc = (text: string): string => text.replace(/"/gu, "&quot;");

interface Classified {
  klass: NodeClass;
  label: string;
  /** A sibling component's page, when resolved — emitted as a `click` link. */
  href?: string;
}

/** Classify one node: slot → root → sibling component → plain part. */
function classify(node: StructureNode, isRoot: boolean, options: MermaidOptions): Classified {
  const slot = node.selector.match(SLOT_NODE);
  if (slot) return { klass: "cssdoc-slot", label: slot[1] ? `‹content: ${slot[1]}›` : "‹content›" };
  if (isRoot) {
    // A root has no incoming edge to carry its cardinality (an optional-ancestor wrapper), so it rides
    // the label instead — matching the text tree.
    const card = node.cardinality ? ` (${CARDINALITY_TOKEN[node.cardinality]})` : "";
    return { klass: "cssdoc-root", label: `${node.selector}${card}` };
  }
  const primary = firstClass(node.selector);
  if (primary && primary !== options.self) {
    const component = options.resolveComponent?.(primary);
    if (component)
      return { klass: "cssdoc-component", label: component.name, href: component.href };
  }
  return { klass: "cssdoc-part", label: node.selector };
}

/**
 * Convert a structure tree to a Mermaid `flowchart` definition. Each node gets a stable id (`n0`, `n1`,
 * …) in depth-first order; a parent connects to each child with an edge carrying the child's
 * cardinality. Nodes are shaped + classed by kind ({@link classify}); sibling components with an href
 * get a `click` link.
 *
 * @param roots - Top-level {@link StructureNode}s (an authored `@structure`).
 * @param options - {@link MermaidOptions}.
 * @returns Mermaid source, or an empty string when there are no nodes.
 *
 * @example
 * ```ts
 * toMermaid([{ selector: ".tabs", children: [{ selector: ".panel", cardinality: "many", children: [] }] }]);
 * // flowchart TD
 * //   n0[".tabs"]:::cssdoc-root
 * //   n1(".panel"):::cssdoc-part
 * //   n0 -->|0..n| n1
 * //   classDef cssdoc-root …
 * ```
 */
export function toMermaid(roots: StructureNode[], options: MermaidOptions = {}): string {
  if (!roots.length) return "";
  const nodes: string[] = [];
  const edges: string[] = [];
  const links: string[] = [];
  let counter = 0;

  const walk = (node: StructureNode, isRoot: boolean): string => {
    const id = `n${counter++}`;
    const { klass, label, href } = classify(node, isRoot, options);
    // A node's authored prose (`@wrapper`) rides its label, matching the text tree.
    const shown = node.description ? `${label} — ${node.description}` : label;
    nodes.push(`  ${SHAPE[klass](id, esc(shown))}:::${klass}`);
    if (href) links.push(`  click ${id} "${href}"`);
    for (const child of node.children) {
      const childId = walk(child, false);
      edges.push(`  ${id} ${EDGE[child.cardinality ?? "required"]} ${childId}`);
    }
    return id;
  };
  for (const root of roots) walk(root, true);

  return [
    `flowchart ${options.direction ?? "TD"}`,
    ...nodes,
    ...edges,
    ...links,
    ...CLASS_DEFS.map((d) => `  ${d}`),
  ].join("\n");
}
