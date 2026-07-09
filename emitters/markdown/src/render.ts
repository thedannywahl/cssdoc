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
 * caller (e.g. pantoken resolves `--*` against its token IR); when absent, tokens are listed
 * without type/value columns.
 */
export type ResolveToken = (name: string) => { syntax?: string; value?: string } | undefined;

/** Options controlling how one entry renders. */
export interface RenderEntryOptions {
  /** Resolve a consumed token's type/value (adds Type + Value columns to "Tokens consumed"). */
  resolveToken?: ResolveToken;
  /** Choose the demo spec for an entry (defaults to `entry.demo`). */
  resolveDemo?: (entry: CssDocEntry) => string | undefined;
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

/** Flatten a `@structure` tree into indented text lines (two spaces per depth level). */
function renderTree(nodes: StructureNode[], depth = 0): string[] {
  const out: string[] = [];
  for (const node of nodes) {
    out.push(`${"  ".repeat(depth)}${node.selector}`);
    out.push(...renderTree(node.children, depth + 1));
  }
  return out;
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
  if (meta.length) lines.push(meta.join(" · "), "");

  const spec = options.resolveDemo ? options.resolveDemo(entry) : entry.demo;
  if (spec) lines.push("## Demo", "", "```demo", spec, "```", "");

  if (entry.examples.length) {
    lines.push("## Examples", "");
    for (const ex of entry.examples) lines.push("```html", ex, "```", "");
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
    lines.push("## Modifiers", "", ...table(["Modifier", "Description"], rows));
  }

  if (entry.parts.length) {
    lines.push(
      "## Parts",
      "",
      ...table(
        ["Part", "Description"],
        entry.parts.map((p) => [`\`.${p.name}\``, cell(p.description)]),
      ),
    );
  }

  if (entry.states.length) {
    lines.push(
      "## States",
      "",
      ...table(
        ["State", "Description"],
        entry.states.map((s) => [`\`${s.name}\``, cell(s.description)]),
      ),
    );
  }

  if (entry.slots.length) {
    lines.push(
      "## Slots",
      "",
      ...table(
        ["Slot", "Description"],
        entry.slots.map((s) => [s.name ? `\`${s.name}\`` : "_(default)_", cell(s.description)]),
      ),
    );
  }

  if (entry.structure?.length) {
    lines.push("## Structure", "", "```text", ...renderTree(entry.structure), "```", "");
    const mermaid = toMermaid(entry.structure);
    if (mermaid) lines.push("```mermaid", mermaid, "```", "");
  }

  if (entry.cssPropertiesDeclared.length) {
    lines.push(
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
    lines.push(
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
    lines.push(
      "## Animations",
      "",
      ...table(
        ["Animation", "Description"],
        entry.animations.map((a) => [`\`${a.name}\``, cell(a.description)]),
      ),
    );
  }

  if (entry.layers.length) {
    lines.push(
      "## Cascade layers",
      "",
      ...table(
        ["Layer", "Description"],
        entry.layers.map((l) => [`\`${l.name}\``, cell(l.description)]),
      ),
    );
  }

  if (entry.conditions.length) {
    lines.push(
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
  const consumed = entry.cssPropertiesConsumed.filter((name) => !declaredNames.has(name));
  if (consumed.length) {
    lines.push("## Tokens consumed", "");
    if (options.resolveToken) {
      const resolve = options.resolveToken;
      lines.push(
        ...table(
          ["Token", "Type", "Value"],
          consumed.map((name) => {
            const info = resolve(name);
            return [`\`${name}\``, code(info?.syntax), code(info?.value)];
          }),
        ),
      );
    } else {
      for (const name of consumed) lines.push(`- \`${name}\``);
      lines.push("");
    }
  }

  if (entry.accessibility) lines.push("## Accessibility", "", escProse(entry.accessibility), "");

  if (entry.see.length) {
    lines.push("## See also", "");
    for (const ref of entry.see) lines.push(`- ${escProse(ref)}`);
    lines.push("");
  }

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
