/**
 * Pure markdown rendering of the `@cssdoc/core` model — no filesystem. {@link renderEntry} renders one
 * record, {@link renderIndex} the overview. The output targets `typedoc-plugin-markdown` /
 * `typedoc-vitepress-theme` conventions (GFM tables, ```mermaid``` and ```demo``` fences, VitePress-safe
 * prose escaping), so CSS pages theme identically to a TypeDoc site.
 *
 * @module
 */
import type { CssDocEntry, CssRecordKind, StructureNode } from "@cssdoc/core";
import { toMermaid } from "@cssdoc/core";

/**
 * Resolve a consumed custom property to its type/value for the "Tokens consumed" table. Supplied by the
 * caller; when absent, tokens are listed
 * without type/value columns.
 */
export type ResolveToken = (name: string) => { syntax?: string; value?: string } | undefined;

/** Resolve a record to a source link (file/line), for the "Source" line. Supplied by the caller. */
export type ResolveSource = (entry: CssDocEntry) => { href: string; label?: string } | undefined;

/**
 * The reorderable `##` sections of a record page, in default render order. The page header (title,
 * base-class line, deprecation warning, remarks, and the Since/Group/Source meta line) is fixed above
 * these. Pass {@link RenderEntryOptions.sectionOrder} to reorder or drop sections.
 */
export type SectionKey =
  | "demo"
  | "examples"
  | "usage"
  | "modifiers"
  | "parts"
  | "shadowParts"
  | "states"
  | "slots"
  | "structure"
  | "subcomponents"
  | "cssProperties"
  | "functions"
  | "animations"
  | "layers"
  | "conditions"
  | "tokensConsumed"
  | "compat"
  | "accessibility"
  | "related"
  | "see";

/** The default order of the reorderable `##` sections. */
export const DEFAULT_SECTION_ORDER: readonly SectionKey[] = [
  "demo",
  "examples",
  "usage",
  "modifiers",
  "parts",
  "shadowParts",
  "states",
  "slots",
  "structure",
  "subcomponents",
  "cssProperties",
  "functions",
  "animations",
  "layers",
  "conditions",
  "tokensConsumed",
  "compat",
  "accessibility",
  "related",
  "see",
];

/** Options controlling how one entry renders. */
export interface RenderEntryOptions {
  /** Resolve a consumed token's type/value (adds Type + Value columns to "Tokens consumed"). */
  resolveToken?: ResolveToken;
  /** Choose the demo spec for an entry (defaults to `entry.demo`). */
  resolveDemo?: (entry: CssDocEntry) => string | undefined;
  /** Resolve a record to a source link, rendered on the meta line as `**Source:** [label](href)`. */
  resolveSource?: ResolveSource;
  /**
   * Produce an include/usage snippet for a record, rendered as a fenced block in the "Usage" section
   * alongside any authored `@usage` prose (e.g. the `@import` line and class-prefix convention).
   */
  importSnippet?: (entry: CssDocEntry) => string | undefined;
  /** Base href for `@related` cross-links (defaults to `./`). Set to `""` to render names without links. */
  baseHref?: string;
  /**
   * Resolve a bare class name to the component whose base class it is (for `@structure` sibling
   * references) — returns the component's name + page href, else `undefined`. Supplied by `buildCssApi`
   * from the full set of records; powers the "Subcomponents" section.
   */
  resolveComponent?: (className: string) => { name: string; href: string } | undefined;
  /** Reorder (or drop) the `##` sections; defaults to {@link DEFAULT_SECTION_ORDER}. */
  sectionOrder?: readonly SectionKey[];
  /** Heading prefix for the page title (defaults to no prefix, i.e. just the record name). */
  headingPrefix?: string;
}

/** Options controlling how the index renders. */
export interface RenderIndexOptions {
  /** The index H1 (defaults to `"CSS API reference"`). */
  title?: string;
  /** An intro paragraph under the H1. */
  intro?: string;
  /** Link prefix for page links (defaults to `"/"`; e.g. `"/api/css/"`). */
  baseHref?: string;
}

/** Sidebar/index groups, in display order. Only kinds with records appear. */
export const KIND_GROUPS: readonly { kind: CssRecordKind; label: string }[] = [
  { kind: "component", label: "Components" },
  { kind: "utility", label: "Utilities" },
  { kind: "rule", label: "Rules" },
  { kind: "declaration", label: "Declarations" },
];

/**
 * Escape prose for VitePress markdown (which compiles through Vue's SFC parser): a raw `<tag>` reads as
 * an HTML element and `{{ }}` as interpolation. Backticked code spans are exempt (Vue skips them), so
 * only free prose is escaped.
 */
export function escProse(text: string): string {
  return text
    .split(/(`[^`]*`)/gu)
    .map((seg, i) =>
      i % 2 === 1
        ? seg
        : seg.replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/\{\{/gu, "&#123;&#123;"),
    )
    .join("");
}

/** A GFM table-cell-safe rendering of prose (escape pipes + Vue-unsafe chars; empty → em dash). */
export function cell(text: string | undefined): string {
  return text ? escProse(text).replace(/\|/gu, "\\|") : "—";
}

/** A code-span cell: collapse whitespace and escape pipes so it survives a GFM table row. */
function code(text: string | undefined): string {
  if (!text) return "—";
  return `\`${text.replace(/\s+/gu, " ").trim().replace(/\|/gu, "\\|")}\``;
}

/** Render a GFM table from a header row and body rows (already-formatted cells). */
function table(headers: string[], rows: string[][]): string[] {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => `| ${r.join(" | ")} |`),
    "",
  ];
}

/** ER-style cardinality tokens, shared with the flowchart (absent = required). */
const CARDINALITY_TOKEN: Record<NonNullable<StructureNode["cardinality"]>, string> = {
  optional: "0..1",
  many: "0..n",
  "one-or-more": "1..n",
};

/** Match a `slot` / `slot[name="x"]` structure node (a light-DOM content region → the default/named slot). */
const SLOT_NODE = /^slot(?:\[\s*name\s*=\s*["']?([\w-]+)["']?\s*\])?$/u;

/** The leading bare class of a compound selector, e.g. `.item.-selected` → `item`. */
const firstClass = (selector: string): string | undefined => selector.match(/\.([\w-]+)/u)?.[1];

/**
 * The display label for one structure node, mirroring the flowchart's classification in plain text: a
 * `slot` → ‹content› / ‹content: name›; a sibling component (resolved via `resolveComponent`, and not
 * the record's own class `self`) → its component name; anything else → its selector. A trailing `(…)`
 * carries the kind tag (`component`) and/or the cardinality (`0..1` / `0..n` / `1..n`; absent =
 * required).
 */
function structureLabel(
  node: StructureNode,
  self?: string,
  resolveComponent?: RenderEntryOptions["resolveComponent"],
): string {
  const slot = node.selector.match(SLOT_NODE);
  let base = node.selector;
  let kind: string | undefined;
  if (slot) {
    base = slot[1] ? `‹content: ${slot[1]}›` : "‹content›";
  } else {
    const primary = firstClass(node.selector);
    const component = primary && primary !== self ? resolveComponent?.(primary) : undefined;
    if (component) {
      base = component.name;
      kind = "component";
    }
  }
  const tags = [kind, node.cardinality ? CARDINALITY_TOKEN[node.cardinality] : undefined].filter(
    Boolean,
  );
  return tags.length ? `${base} (${tags.join(", ")})` : base;
}

/** Flatten a `@structure` tree into indented text lines (two spaces per depth level). */
function renderTree(
  nodes: StructureNode[],
  self?: string,
  resolveComponent?: RenderEntryOptions["resolveComponent"],
  depth = 0,
): string[] {
  const out: string[] = [];
  for (const node of nodes) {
    out.push(`${"  ".repeat(depth)}${structureLabel(node, self, resolveComponent)}`);
    out.push(...renderTree(node.children, self, resolveComponent, depth + 1));
  }
  return out;
}

/** The sibling components referenced anywhere in a structure tree, resolved + de-duped by name. */
function subcomponentsOf(
  nodes: StructureNode[],
  self: string,
  resolve: (className: string) => { name: string; href: string } | undefined,
): { name: string; href: string }[] {
  const byName = new Map<string, { name: string; href: string }>();
  const walk = (ns: StructureNode[]): void => {
    for (const node of ns) {
      for (const m of node.selector.matchAll(/\.([\w-]+)/gu)) {
        if (m[1] === self) continue;
        const c = resolve(m[1]);
        if (c) byName.set(c.name, c);
      }
      walk(node.children);
    }
  };
  walk(nodes);
  return [...byName.values()];
}

/** Render one record to a markdown page. */
export function renderEntry(entry: CssDocEntry, options: RenderEntryOptions = {}): string {
  const prefix = options.headingPrefix ? `${options.headingPrefix} ` : "";
  const lines: string[] = [`# ${prefix}${entry.name}`, ""];

  const stage = entry.releaseStage ? ` · \`${entry.releaseStage}\`` : "";
  lines.push(
    `\`${entry.className}\`${stage}${entry.summary ? ` — ${escProse(entry.summary)}` : ""}`,
    "",
  );

  if (entry.deprecated) {
    lines.push("> [!WARNING]", `> Deprecated — ${escProse(entry.deprecated)}`, "");
  }
  if (entry.remarks) lines.push(escProse(entry.remarks), "");

  const meta: string[] = [];
  if (entry.since) meta.push(`**Since:** ${escProse(entry.since)}`);
  if (entry.group) meta.push(`**Group:** ${escProse(entry.group)}`);
  const src = options.resolveSource?.(entry);
  if (src) meta.push(`**Source:** [${escProse(src.label ?? "source")}](${src.href})`);
  if (meta.length) lines.push(meta.join(" · "), "");

  // Each reorderable section builds its own fragment; they're emitted in `sectionOrder` below.
  const fragments = {} as Record<SectionKey, string[]>;
  for (const key of DEFAULT_SECTION_ORDER) fragments[key] = [];

  const spec = options.resolveDemo ? options.resolveDemo(entry) : entry.demo;
  if (spec) fragments.demo.push("## Demo", "", "```demo", spec, "```", "");

  if (entry.examples.length) {
    fragments.examples.push("## Examples", "");
    for (const ex of entry.examples) fragments.examples.push("```html", ex, "```", "");
  }

  const importSnippet = options.importSnippet?.(entry);
  if (entry.usage || importSnippet) {
    fragments.usage.push("## Usage", "");
    if (entry.usage) fragments.usage.push(escProse(entry.usage), "");
    if (importSnippet) fragments.usage.push("```css", importSnippet, "```", "");
  }

  if (entry.modifiers.length) {
    const rows = entry.modifiers.map((m) => {
      if (m.deprecated) {
        const via = m.deprecated.canonical
          ? `use \`.${m.deprecated.canonical}\`.`
          : (m.deprecated.note ?? "");
        const tail = m.description ? ` ${m.description}` : "";
        return [`\`.${m.name}\``, `_Deprecated_ — ${escProse(via + tail)}`.replace(/\|/gu, "\\|")];
      }
      return [`\`.${m.name}\``, cell(m.description)];
    });
    fragments.modifiers.push("## Modifiers", "", ...table(["Modifier", "Description"], rows));
  }

  if (entry.parts.length) {
    fragments.parts.push(
      "## Parts",
      "",
      ...table(
        ["Part", "Description"],
        entry.parts.map((p) => [`\`.${p.name}\``, cell(p.description)]),
      ),
    );
  }

  if (entry.shadowParts.length) {
    fragments.shadowParts.push(
      "## Shadow parts",
      "",
      ...table(
        ["Part", "Description"],
        entry.shadowParts.map((p) => [`\`::part(${p.name})\``, cell(p.description)]),
      ),
    );
  }

  if (entry.states.length) {
    fragments.states.push(
      "## States",
      "",
      ...table(
        ["State", "Description"],
        entry.states.map((s) => [
          `\`${s.kind === "custom" ? `:state(${s.name})` : s.kind === "pseudo-class" ? `:${s.name}` : `.${s.name}`}\``,
          cell(s.description),
        ]),
      ),
    );
  }

  if (entry.slots.length) {
    fragments.slots.push(
      "## Slots",
      "",
      ...table(
        ["Slot", "Description"],
        entry.slots.map((s) => [s.name ? `\`${s.name}\`` : "_(default)_", cell(s.description)]),
      ),
    );
  }

  if (entry.structure?.length) {
    fragments.structure.push("## Structure", "");
    if (entry.structureDescription) fragments.structure.push(entry.structureDescription, "");
    // Both views classify each node (root / part / slot / sibling component): `self` keeps the record's
    // own class from reading as a sibling, and `resolveComponent` resolves siblings to component names.
    const self = entry.className.replace(/^\./u, "");
    fragments.structure.push(
      "```text",
      ...renderTree(entry.structure, self, options.resolveComponent),
      "```",
      "",
    );
    const mermaid = toMermaid(entry.structure, {
      self,
      resolveComponent: options.resolveComponent,
    });
    if (mermaid) fragments.structure.push("```mermaid", mermaid, "```", "");

    // Composition is derived from the structure tree: sibling components referenced as children.
    if (options.resolveComponent) {
      const subs = subcomponentsOf(entry.structure, self, options.resolveComponent);
      if (subs.length) {
        fragments.subcomponents.push("## Subcomponents", "");
        for (const s of subs) fragments.subcomponents.push(`- [${escProse(s.name)}](${s.href})`);
        fragments.subcomponents.push("");
      }
    }
  }

  if (entry.cssPropertiesDeclared.length) {
    fragments.cssProperties.push(
      "## Custom properties",
      "",
      ...table(
        ["Property", "Type", "Default", "Description"],
        entry.cssPropertiesDeclared.map((p) => [
          `\`${p.name}\``,
          code(p.syntax),
          code(p.defaultValue),
          cell(p.description),
        ]),
      ),
    );
  }

  if (entry.functions.length) {
    fragments.functions.push(
      "## Functions",
      "",
      ...table(
        ["Function", "Parameters", "Returns", "Description"],
        entry.functions.map((f) => [
          `\`${f.name}\``,
          f.parameters.length ? f.parameters.map((p) => `\`${p}\``).join(", ") : "—",
          code(f.result),
          cell(f.description),
        ]),
      ),
    );
  }

  if (entry.animations.length) {
    fragments.animations.push(
      "## Animations",
      "",
      ...table(
        ["Animation", "Description"],
        entry.animations.map((a) => [`\`${a.name}\``, cell(a.description)]),
      ),
    );
  }

  if (entry.layers.length) {
    fragments.layers.push(
      "## Cascade layers",
      "",
      ...table(
        ["Layer", "Description"],
        entry.layers.map((l) => [`\`${l.name}\``, cell(l.description)]),
      ),
    );
  }

  if (entry.conditions.length) {
    fragments.conditions.push(
      "## Conditions",
      "",
      ...table(
        ["Type", "Query", "Description"],
        entry.conditions.map((c) => [
          c.type,
          code(c.containerName ? `${c.containerName} ${c.query}` : c.query),
          cell(c.description),
        ]),
      ),
    );
  }

  // A `@cssproperty`-declared property is the component's own knob — keep it out of "Tokens consumed".
  const declaredNames = new Set(entry.cssPropertiesDeclared.map((p) => p.name));
  const consumed = entry.cssPropertiesConsumed.filter((t) => !declaredNames.has(t.name));
  if (consumed.length) {
    fragments.tokensConsumed.push("## Tokens consumed", "");
    const hasDescriptions = consumed.some((t) => t.description);
    if (options.resolveToken) {
      const resolve = options.resolveToken;
      const headers = hasDescriptions
        ? ["Token", "Type", "Value", "Description"]
        : ["Token", "Type", "Value"];
      fragments.tokensConsumed.push(
        ...table(
          headers,
          consumed.map((t) => {
            const info = resolve(t.name);
            const row = [`\`${t.name}\``, code(info?.syntax), code(info?.value)];
            if (hasDescriptions) row.push(cell(t.description));
            return row;
          }),
        ),
      );
    } else {
      for (const t of consumed) {
        fragments.tokensConsumed.push(
          `- \`${t.name}\`${t.description ? ` — ${escProse(t.description)}` : ""}`,
        );
      }
      fragments.tokensConsumed.push("");
    }
  }

  if (entry.compat.length) {
    fragments.compat.push("## Browser support", "");
    for (const note of entry.compat) fragments.compat.push(`- ${escProse(note)}`);
    fragments.compat.push("");
  }

  if (entry.accessibility) {
    fragments.accessibility.push("## Accessibility", "", escProse(entry.accessibility), "");
  }

  if (entry.related.length) {
    const baseHref = options.baseHref ?? "./";
    fragments.related.push("## Related", "");
    for (const rel of entry.related) {
      const link = baseHref
        ? `[${escProse(rel.name)}](${baseHref}${rel.name}.md)`
        : `\`${rel.name}\``;
      fragments.related.push(
        `- ${link}${rel.description ? ` — ${escProse(rel.description)}` : ""}`,
      );
    }
    fragments.related.push("");
  }

  if (entry.see.length) {
    fragments.see.push("## See also", "");
    for (const ref of entry.see) fragments.see.push(`- ${escProse(ref)}`);
    fragments.see.push("");
  }

  const order = options.sectionOrder ?? DEFAULT_SECTION_ORDER;
  for (const key of order) lines.push(...(fragments[key] ?? []));

  return `${lines.join("\n")}\n`;
}

/** Render the index/overview page: records grouped by kind, each a table with its summary. */
export function renderIndex(
  entries: readonly CssDocEntry[],
  options: RenderIndexOptions = {},
): string {
  const baseHref = options.baseHref ?? "/";
  const lines = [`# ${options.title ?? "CSS API reference"}`, ""];
  if (options.intro) lines.push(escProse(options.intro), "");
  for (const group of KIND_GROUPS) {
    const inGroup = entries.filter((e) => e.kind === group.kind);
    if (!inGroup.length) continue;
    lines.push(
      `## ${group.label}`,
      "",
      ...table(
        ["Name", "Class", "Summary"],
        inGroup.map((e) => [
          `[${e.name}](${baseHref}${e.name}.md)`,
          `\`${e.className}\``,
          cell(e.summary),
        ]),
      ),
    );
  }
  return `${lines.join("\n")}\n`;
}
