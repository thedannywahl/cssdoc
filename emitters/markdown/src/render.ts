/**
 * Pure markdown rendering of the `@cssdoc/core` model — no filesystem. {@link renderEntry} renders one
 * record, {@link renderIndex} the overview. The output targets `typedoc-plugin-markdown` /
 * `typedoc-vitepress-theme` conventions (GFM tables, Mermaid and demo code fences, VitePress-safe
 * prose escaping), so CSS pages theme identically to a TypeDoc site.
 *
 * @module
 */
import type {
  CssDocEntry,
  CssReleaseStage,
  CssRecordKind,
  ExampleFilter,
  StructureNode,
} from "@cssdoc/core";
import {
  cardinalityToken,
  literalMarkdownText,
  selectExampleIndices,
  toMermaid,
  toMermaidVariants,
} from "@cssdoc/core";
import {
  indexFromEntries,
  projectPublicModel,
  type PublicProseContext,
  type ReferenceLookup,
} from "@cssdoc/index";
import {
  AT_SOURCE,
  BACKTICK_CHAR,
  BRACE_OPEN_SOURCE,
  BRACE_CLOSE_SOURCE,
  CSS_CLASS_REFERENCE,
  CSSDOC_CARDINALITY_KEYWORDS,
  CSSDOC_SHORTHAND_STRUCTURE_REFERENCE_SOURCE,
  CSSDOC_STRUCTURE_SLOT_SOURCE,
  CSSDOC_TYPED_STRUCTURE_REFERENCE_SOURCE,
  DOT_CHAR,
  LESS_THAN_CHAR,
  MARKDOWN_BACKTICK_FENCE_LINE_PREFIX,
  MARKDOWN_ORDERED_LIST_MARKER_SOURCE,
  MARKDOWN_UNORDERED_LIST_MARKER_SOURCE,
  PIPE_CHAR,
  STRUCTURE_RECORD_KIND_SOURCE,
  WHITESPACE_RUN,
  WORD_BOUNDARY_SOURCE,
  toRegExp,
} from "@cssdoc/regex";
import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";

import {
  plainProse,
  safeMarkdownBlock,
  safeMarkdownProse,
  sanitizeMarkdownLinks,
} from "./prose.ts";

const WHITESPACE = toRegExp(WHITESPACE_RUN);

function fencedBlock(language: string, text: string): string[] {
  let longest = 2;
  let run = 0;
  for (const char of text) {
    run = char === BACKTICK_CHAR ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  const fence = BACKTICK_CHAR.repeat(longest + 1);
  return [`${fence}${language}`, text, fence];
}

/**
 * Resolve a consumed custom property to its type/value for the "Tokens consumed" table. Supplied by the
 * caller; when absent, tokens are listed
 * without type/value columns.
 */
export type ResolveToken = (name: string) =>
  | {
      /** Token syntax, when known. */
      syntax?: string;
      /** Token value, when known. */
      value?: string;
    }
  | undefined;

/** Resolve a record to a source link (file/line), for the "Source" line. Supplied by the caller. */
export type ResolveSource = (entry: CssDocEntry) =>
  | {
      /** Link to the source. */
      href: string;
      /** Link text; defaults to `source`. */
      label?: string;
    }
  | undefined;

/**
 * The reorderable `##` sections of a record page, in default render order. The page header (title,
 * base-class line, deprecation warning, remarks, and the Since/Group/Source meta line) is fixed above
 * these. Pass {@link RenderEntryOptions.sectionOrder} to reorder or drop sections.
 */
export type SectionKey =
  | "demo"
  | "examples"
  | "usage"
  | "annotations"
  | "modifiers"
  | "parts"
  | "shadowParts"
  | "pseudoElements"
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
  "annotations",
  "modifiers",
  "parts",
  "shadowParts",
  "pseudoElements",
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
  /** Include private authoring content without public projection. */
  includePrivate?: boolean;
  /** Resolve private-link and annotation visibility in the original prose source. */
  lookupFor?: (context: PublicProseContext) => ReferenceLookup;
  /** Select rendered examples. Omit or pass null to show all examples. */
  exampleFilter?: ExampleFilter | null;
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
  resolveComponent?: (className: string) =>
    | {
        /** Component record name. */
        name: string;
        /** URL of the component's page. */
        href: string;
      }
    | undefined;
  /**
   * Sibling records that declared `@memberOf` naming this record as their parent — the inverse
   * direction of `@structure` containment. Supplied by `buildCssApi` from the full set of records;
   * merged into the "Subcomponents" section alongside structurally-nested children.
   */
  members?: readonly {
    /** Member record name. */
    name: string;
    /** URL of the member's page. */
    href: string;
  }[];
  /** Reorder (or drop) the `##` sections; defaults to {@link DEFAULT_SECTION_ORDER}. */
  sectionOrder?: readonly SectionKey[];
  /**
   * Emit the `## Annotations` section. Annotations are internal guidance (like `@privateRemarks`);
   * defaults to `false` so public emitters omit them by default.
   */
  includeAnnotations?: boolean;
  /**
   * Emit object-model decorators (`@sealed`, `@frozen`, `@preventExtensions`, `@readonly`) on the
   * record meta line. Defaults to `false` so public emitters omit them by default.
   */
  includeDecorators?: boolean;
  /** Heading prefix for the page title (defaults to no prefix, i.e. just the record name). */
  headingPrefix?: string;
  /**
   * Which representation(s) the `## Structure` section emits: the text tree, the Mermaid flowchart,
   * or both. Defaults to `"both"`.
   */
  structureView?: "text" | "diagram" | "both";
  /**
   * How alternative DOM shapes (from top-level `@variant` blocks in `@structure`) render, when present:
   * `"diagram"` emits one combined flowchart with a labelled subgraph per variant; `"sections"` emits a
   * `### Variant: <name>` subsection per variant, each with its own text tree/diagram per
   * {@link structureView}. Defaults to `"diagram"`. Ignored when no `@variant` was authored.
   */
  structureVariantView?: "diagram" | "sections";
  /**
   * Optional CSS classes for HTML-preserving renderers (e.g. VitePress). Each key is opt-in; omit for
   * pure markdown. Values are used verbatim as the `class` attribute (multiple space-separated tokens
   * allowed). Renderers that strip unknown attributes (e.g. GitHub) drop the class but keep the text.
   */
  classNames?: {
    /**
     * Wrap deprecation output — the record-level `> [!WARNING]` banner and deprecated modifier-table
     * cells — in `<span class="…">`, e.g. `"-vendor-pill -color-warning"`.
     */
    deprecated?: string;
    /**
     * Per-stage classes for the release-stage marker on the header line (the HTML emitter's `badge`
     * analog). Only the current record's stage is applied; omit a stage for pure markdown there.
     */
    stage?: Partial<Record<CssReleaseStage, string>>;
    /** Wrap the "Interaction" marker on a JS-only (`@interaction`-flagged) modifier row. */
    interaction?: string;
    /** Wrap the "Alias" marker on a modifier row carrying an `@alias` mapping. */
    alias?: string;
    /** Wrap the "Affects" marker on a modifier row carrying an `@affects` descendant note. */
    affects?: string;
  };
}

/** Options controlling how the index renders. */
export interface RenderIndexOptions {
  /** Include private authoring content without public projection. */
  includePrivate?: boolean;
  /** Resolve private-link visibility in the original prose source. */
  lookupFor?: (context: PublicProseContext) => ReferenceLookup;
  /** The index H1 (defaults to `"CSS API reference"`). */
  title?: string;
  /** An intro paragraph under the H1. */
  intro?: string;
  /** Link prefix for page links (defaults to `"/"`; e.g. `"/api/css/"`). */
  baseHref?: string;
  /**
   * Explicit group order for the sidebar and index. Listed labels come first, in this order; any
   * unlisted group follows in the default order ({@link KIND_GROUPS} kinds, then custom `@group` groups
   * in first-appearance order). Omitted → the default order. See {@link groupEntries}.
   */
  groups?: readonly string[];
  /** Include records marked `@visibility internal`; defaults to false. */
  includeInternal?: boolean;
}

/** Sidebar/index groups, in display order. Only kinds with records appear. */
export const KIND_GROUPS: readonly {
  /** Record kind assigned to this group. */
  kind: CssRecordKind;
  /** Group label shown in the index and sidebar. */
  label: string;
}[] = [
  { kind: "component", label: "Components" },
  { kind: "utility", label: "Utilities" },
  { kind: "declaration", label: "Declarations" },
];

/** One sidebar/index group: a display label and the records under it (name-sorted, from `entries`). */
export interface EntryGroup {
  /** Group label shown in the index and sidebar. */
  label: string;
  /** Records in this group, sorted by name. */
  entries: CssDocEntry[];
}

/**
 * Bucket records into display groups for the sidebar and index. A record with `@group Foo` joins a group
 * labelled `Foo`; a record without one falls back to its {@link KIND_GROUPS} kind label. Order: any
 * `groups` labels first (in that order), then the kind groups in {@link KIND_GROUPS} order, then any
 * remaining custom groups in first-appearance order. Empty groups are dropped. A custom `@group` value
 * equal to a kind label merges into that kind group.
 *
 * Records are name-sorted internally, so the result is deterministic regardless of input order — both
 * within each group and across the first-appearance custom groups. (`buildCssApi` already name-sorts;
 * this keeps direct callers of {@link buildSidebar}/{@link renderIndex} consistent with it.)
 *
 * @param entries - The records to group.
 * @param groups - Optional explicit label order; see {@link RenderIndexOptions.groups}.
 * @returns The non-empty groups, in display order.
 */
export function groupEntries(
  entries: readonly CssDocEntry[],
  groups?: readonly string[],
): EntryGroup[] {
  const kindLabel = new Map(KIND_GROUPS.map((g) => [g.kind, g.label]));
  const byLabel = new Map<string, CssDocEntry[]>();
  for (const e of [...entries].toSorted((a, b) => a.name.localeCompare(b.name))) {
    // An empty `@group` (a bare tag) is treated as absent, matching the per-page meta line's truthy check.
    const label = e.group || kindLabel.get(e.kind) || e.kind;
    const bucket = byLabel.get(label);
    if (bucket) bucket.push(e);
    else byLabel.set(label, [e]);
  }
  const order: string[] = [];
  for (const label of groups ?? []) if (!order.includes(label)) order.push(label);
  for (const g of KIND_GROUPS) if (!order.includes(g.label)) order.push(g.label);
  for (const label of byLabel.keys()) if (!order.includes(label)) order.push(label);
  return order
    .filter((label) => byLabel.has(label))
    .map((label) => ({ label, entries: byLabel.get(label)! }));
}

const LIST_ITEM_PREFIX: Regex = arkRegex.as(
  `^(?:${MARKDOWN_UNORDERED_LIST_MARKER_SOURCE}|${MARKDOWN_ORDERED_LIST_MARKER_SOURCE}) `,
  "u",
);

/**
 * Escape prose for VitePress markdown (which compiles through Vue's SFC parser): a raw `<tag>` reads as
 * an HTML element and `{{ }}` as interpolation. Code stays literal, including in Vue templates.
 */
export function escProse(text: string): string {
  return safeMarkdownProse(text);
}

/** A GFM table-cell-safe rendering of prose (escape pipes + Vue-unsafe chars; empty → em dash). */
export function cell(text: string | undefined): string {
  return text ? escProse(text).replaceAll(PIPE_CHAR, String.raw`\|`) : "—";
}

/**
 * Normalize block-level prose for CommonMark: insert a blank line before any list marker (`- `, `* `,
 * `+ `, or `\d+. `) when the preceding non-empty line is not already a list item. Without this,
 * CommonMark treats the list items as paragraph continuation text.
 */
export function normalizeProseMarkdown(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (LIST_ITEM_PREFIX.exec(line) !== null && out.length > 0) {
      const prev = out.at(-1)!;
      // Only insert a blank line when the previous non-empty line is not itself a list item.
      if (prev !== "" && LIST_ITEM_PREFIX.exec(prev) === null) out.push("");
    }
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Render a status marker as a styleable tag. When `cls` is a non-empty class (a
 * {@link RenderEntryOptions.classNames} hook), wrap just the `label` word in `<span class="cls">…</span>`
 * — a compact pill/tag — and leave any surrounding prose (the deprecation reason, etc.) outside it. When
 * no class is given, fall back to `fallback` (defaults to `label`) so the pure-markdown output is
 * unchanged. The span is built outside {@link escProse}, so it passes through while prose stays escaped.
 */
function tag(cls: string | undefined, label: string, fallback: string = label): string {
  return cls ? `<span class="${cls}">${label}</span>` : fallback;
}

/** A code-span cell: collapse whitespace and escape pipes so it survives a GFM table row. */
function code(text: string | undefined): string {
  if (!text) return "—";
  return `\`${text
    .replace(WHITESPACE, " ")
    .trim()
    .replaceAll(PIPE_CHAR, String.raw`\|`)}\``;
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

/** Match a `slot` / `slot[name="x"]` structure node (a light-DOM content region → the default/named slot). */
const SLOT_NODE: Regex = arkRegex.as(`^${CSSDOC_STRUCTURE_SLOT_SOURCE}$`, "u");
const CLASS_REFERENCE = toRegExp(CSS_CLASS_REFERENCE);
const ALIAS_PREFIX: Regex = arkRegex.as(
  String.raw`^${AT_SOURCE}alias${WORD_BOUNDARY_SOURCE}\s*`,
  "u",
);
const INLINE_LINK: Regex = arkRegex.as(
  String.raw`${BRACE_OPEN_SOURCE}${AT_SOURCE}link\s+([^${BRACE_CLOSE_SOURCE}]+)${BRACE_CLOSE_SOURCE}`,
  "u",
);

/** Every bare class in a selector, e.g. a comma-separated alternation list `.a, .b` → `["a", "b"]`. */
const allClasses = (selector: string): string[] =>
  [...selector.matchAll(CLASS_REFERENCE)].map((m) => m[1]);

const STRUCTURE_REF_KIND: Regex = arkRegex.as(`^${STRUCTURE_RECORD_KIND_SOURCE}$`, "u");
const parseStructureRecordRef = (
  selector: string,
): { kind?: string; name: string; profile?: string; private?: boolean } | undefined => {
  if (!selector.startsWith("@")) return undefined;
  const raw = selector.slice(1).trim();
  if (!raw) return undefined;

  const TYPED: Regex = arkRegex.as(`^${CSSDOC_TYPED_STRUCTURE_REFERENCE_SOURCE}$`, "u");
  const typed = raw.match(TYPED);
  if (typed) {
    return {
      kind: typed[1] === "name" ? "component" : typed[1],
      name: typed[2],
      profile: typed[3],
      private: Boolean(typed[4]),
    };
  }

  const SHORTHAND: Regex = arkRegex.as(`^${CSSDOC_SHORTHAND_STRUCTURE_REFERENCE_SOURCE}$`, "u");
  const shorthand = raw.match(SHORTHAND);
  if (!shorthand) return undefined;
  if (STRUCTURE_REF_KIND.test(shorthand[1])) return undefined;
  return { name: shorthand[1], profile: shorthand[2], private: Boolean(shorthand[3]) };
};

const normalizedStructureRefSelector = (ref: {
  kind?: string;
  name: string;
  private?: boolean;
}): string => {
  if (ref.kind) return `@${ref.kind} ${ref.name}${ref.private ? " private" : ""}`;
  return `@${ref.name}${ref.private ? " private" : ""}`;
};

function normalizeStructureRefCardinality(nodes: readonly StructureNode[]): StructureNode[] {
  return nodes.map((node) => {
    const children = normalizeStructureRefCardinality(node.children);
    const variants = node.variants?.map((variant) => ({
      ...variant,
      nodes: normalizeStructureRefCardinality(variant.nodes),
    }));
    const ref = parseStructureRecordRef(node.selector);
    if (ref && (!ref.kind || ref.kind === "component") && !node.cardinality) {
      const card = ref.profile ? CSSDOC_CARDINALITY_KEYWORDS[ref.profile] : undefined;
      if (card) {
        return {
          ...node,
          selector: normalizedStructureRefSelector(ref),
          cardinality: card,
          children,
          ...(variants ? { variants } : {}),
        };
      }
    }
    return { ...node, children, ...(variants ? { variants } : {}) };
  });
}

/** Strip a leading `.` or `#` so a co-located selector can be passed to a component resolver. */
const colocNormalize = (sel: string): string =>
  sel.startsWith(".") || sel.startsWith("#") ? sel.slice(1) : sel;

/**
 * The display label for one structure node, mirroring the flowchart's classification in plain text: a
 * `slot` → ‹content› / ‹content: name›; a sibling component (resolved via `resolveComponent`, and not
 * the record's own class `self`) → its component name; anything else → its selector. A trailing `(…)`
 * carries the kind tag (`component`) and/or the cardinality (`0..1` / `0..n` / `1..n`; absent =
 * required).
 *
 * A comma-separated selector list (`.col-header, .row-header`) reads as alternation — "one of these" —
 * so every resolved sibling component is joined with ` | `, not just the first.
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
    const ref = parseStructureRecordRef(node.selector);
    if (ref && (!ref.kind || ref.kind === "component")) {
      const resolvedRef = resolveComponent?.(ref.name);
      const target = resolvedRef?.name ?? ref.name;
      base = ref.profile ? `${target}:${ref.profile}` : target;
      kind = "component";
    } else {
      const resolved = allClasses(node.selector)
        .filter((c) => c !== self)
        .map((c) => resolveComponent?.(c))
        .filter((c): c is NonNullable<typeof c> => Boolean(c));
      if (resolved.length > 0) {
        base = resolved.map((c) => c.name).join(" | ");
        kind = "component";
      }
    }
  }
  if (node.colocated) {
    const colocComponent = resolveComponent?.(colocNormalize(node.colocated));
    const colocName = colocComponent?.name ?? node.colocated;
    base = `${base} + ${colocName}`;
    kind = "component";
  }
  const tags = [kind, node.cardinality ? cardinalityToken(node.cardinality) : undefined].filter(
    Boolean,
  );
  const label = tags.length > 0 ? `${base} (${tags.join(", ")})` : base;
  return node.description ? `${label} — ${node.description}` : label;
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
    if (node.scope !== undefined) {
      // @scope boundary: emit a labelled header at the current depth, then recurse into its children.
      out.push(
        `${"  ".repeat(depth)}@scope ${node.scope}`,
        ...renderTree(node.children, self, resolveComponent, depth + 1),
      );
      continue;
    }
    if (node.variants !== undefined) {
      // A nested `@variant` group: this position is exactly one of these alternatives.
      out.push(`${"  ".repeat(depth)}(choose one)`);
      node.variants.forEach((variant, i) => {
        out.push(
          `${"  ".repeat(depth + 1)}${variant.name ?? `Variant ${i + 1}`}`,
          ...renderTree(variant.nodes, self, resolveComponent, depth + 2),
        );
      });
      continue;
    }
    out.push(
      `${"  ".repeat(depth)}${structureLabel(node, self, resolveComponent)}`,
      ...renderTree(node.children, self, resolveComponent, depth + 1),
    );
  }
  return out;
}

/** The sibling components referenced anywhere across one or more structure trees, resolved + de-duped by name. */
function subcomponentsOf(
  groups: readonly StructureNode[][],
  self: string,
  resolve: (className: string) => { name: string; href: string } | undefined,
): { name: string; href: string }[] {
  const byName = new Map<string, { name: string; href: string }>();
  const walk = (ns: StructureNode[]): void => {
    for (const node of ns) {
      const ref = parseStructureRecordRef(node.selector);
      if (ref && (!ref.kind || ref.kind === "component")) {
        const c = resolve(ref.name);
        if (c) byName.set(c.name, c);
      }
      for (const m of node.selector.matchAll(CLASS_REFERENCE)) {
        if (m[1] === self) continue;
        const c = resolve(m[1]);
        if (c) byName.set(c.name, c);
      }
      if (node.colocated) {
        const c = resolve(colocNormalize(node.colocated));
        if (c) byName.set(c.name, c);
      }
      walk(node.children);
      for (const variant of node.variants ?? []) walk(variant.nodes);
    }
  };
  for (const nodes of groups) walk(nodes);
  return [...byName.values()];
}

/** Render one record to a markdown page. */
export function renderEntry(sourceEntry: CssDocEntry, options: RenderEntryOptions = {}): string {
  let entry = sourceEntry;
  if (!options.includePrivate) {
    const index = indexFromEntries([entry]);
    const [publicEntry] = projectPublicModel([entry], {
      includeInternal: entry.visibility === "internal",
      lookupFor:
        options.lookupFor ?? (() => ({ workspace: { complete: true, sources: [{ index }] } })),
      literalText: (text) => literalMarkdownText(text),
    });
    entry = publicEntry;
  }
  const annotations = entry.annotations ?? [];
  const refs = entry.refs ?? [];
  const prefix = options.headingPrefix ? `${options.headingPrefix} ` : "";
  const lines: string[] = [`# ${prefix}${entry.name}`, ""];

  const stage = entry.releaseStage
    ? ` · ${tag(options.classNames?.stage?.[entry.releaseStage], entry.releaseStage, `\`${entry.releaseStage}\``)}`
    : "";
  const visibility = entry.visibility === "internal" ? " · `internal`" : "";
  lines.push(
    `\`${entry.className}\`${stage}${visibility}${entry.summary ? ` — ${escProse(entry.summary)}` : ""}`,
    "",
  );

  if (entry.deprecated) {
    lines.push(
      "> [!WARNING]",
      `> ${tag(options.classNames?.deprecated, "Deprecated")} — ${escProse(entry.deprecated)}`,
      "",
    );
  }
  if (entry.memberOf?.private) {
    const parent = options.resolveComponent?.(entry.memberOf.component);
    const parentLabel = parent
      ? `[${escProse(parent.name)}](${parent.href})`
      : `\`${entry.memberOf.component}\``;
    lines.push("> [!NOTE]", `> Only used within ${parentLabel}.`, "");
  }
  if (entry.remarks) {
    const prose = entry.prose?.find((body) => body.field === "remarks");
    lines.push(
      prose?.mode === "plain"
        ? plainProse(entry.remarks)
        : safeMarkdownBlock(prose ? entry.remarks : normalizeProseMarkdown(entry.remarks)),
      "",
    );
  }

  const meta: string[] = [];
  if (entry.since) meta.push(`**Since:** ${escProse(entry.since)}`);
  if (entry.group) meta.push(`**Group:** ${escProse(entry.group)}`);
  if (options.includeDecorators && entry.decorators?.length) {
    meta.push(`**Decorators:** ${entry.decorators.map((d) => `\`@${d}\``).join(" ")}`);
  }
  const src = options.resolveSource?.(entry);
  if (src) meta.push(`**Source:** [${escProse(src.label ?? "source")}](${src.href})`);
  if (meta.length > 0) lines.push(meta.join(" · "), "");

  // Each reorderable section builds its own fragment; they're emitted in `sectionOrder` below.
  const fragments = {} as Record<SectionKey, string[]>;
  for (const key of DEFAULT_SECTION_ORDER) fragments[key] = [];

  const spec = options.resolveDemo ? options.resolveDemo(entry) : entry.demo;
  if (spec) fragments.demo.push("## Demo", "", ...fencedBlock("demo", spec), "");

  const examples = selectExampleIndices(entry, options.exampleFilter);
  if (examples.length > 0) {
    fragments.examples.push("## Examples", "");
    for (const index of examples) {
      const raw = entry.examples[index];
      const prose = entry.prose?.find((body) => body.exampleIndex === index);
      if (prose) {
        fragments.examples.push(
          prose.mode === "plain" ? plainProse(raw) : safeMarkdownBlock(raw),
          "",
        );
        continue;
      }
      const ex = raw.trim();
      // An example that already carries a fenced block is Markdown (prose + code) — emit it verbatim.
      // Only bare, fence-less code gets auto-fenced (sniffing markup vs CSS).
      if (MARKDOWN_BACKTICK_FENCE_LINE_PREFIX.exec(ex) === null) {
        fragments.examples.push(
          ...fencedBlock(ex.includes(LESS_THAN_CHAR) ? "html" : "css", ex),
          "",
        );
      } else {
        fragments.examples.push(safeMarkdownBlock(ex), "");
      }
    }
  }

  const importSnippet = options.importSnippet?.(entry);
  if (entry.usage || importSnippet) {
    fragments.usage.push("## Usage", "");
    if (entry.usage) {
      const prose = entry.prose?.find((body) => body.field === "usage");
      fragments.usage.push(
        prose?.mode === "plain"
          ? plainProse(entry.usage)
          : safeMarkdownBlock(prose ? entry.usage : normalizeProseMarkdown(entry.usage)),
        "",
      );
    }
    if (importSnippet) fragments.usage.push(...fencedBlock("css", importSnippet), "");
  }

  if ((annotations.length > 0 || refs.length > 0) && options.includeAnnotations) {
    fragments.annotations.push("## Annotations", "");
    if (annotations.length > 0) {
      fragments.annotations.push(
        ...table(
          ["Ref", "Annotation"],
          annotations.map((a) => [`\`${a.ref}\``, cell(a.text.replaceAll("\n", "<br>"))]),
        ),
      );
    }
    if (refs.length > 0) {
      fragments.annotations.push(
        `**Refs:** ${refs.map((r) => `\`${typeof r === "object" ? r.ref : r}\``).join(", ")}`,
        "",
      );
    }
  }

  if (entry.modifiers.length > 0) {
    const rows = entry.modifiers.map((m) => {
      const aliasFromDescription: { canonical?: string; note?: string } | undefined =
        !m.alias && m.description?.match(ALIAS_PREFIX)
          ? { note: m.description.replace(ALIAS_PREFIX, "").trim() }
          : undefined;
      const alias = m.alias ?? aliasFromDescription;
      if (m.deprecated || alias) {
        const notes: string[] = [];
        if (m.deprecated) {
          const via = m.deprecated.canonical
            ? `use \`.${m.deprecated.canonical}\`.`
            : (m.deprecated.note ?? "");
          const marker = tag(options.classNames?.deprecated, "Deprecated", "_Deprecated_");
          notes.push(`${marker} — ${escProse(via)}`);
        }
        if (alias) {
          const link = alias.note?.match(INLINE_LINK)?.[1];
          const canonicalLink =
            alias.canonical || (link?.startsWith(DOT_CHAR) ? link.slice(1) : link);
          const via = canonicalLink
            ? `maps to \`.${canonicalLink}\`.`
            : (alias.note?.replace(INLINE_LINK, "").trim() ?? "");
          const marker = tag(options.classNames?.alias, "Alias", "_Alias_");
          notes.push(`${marker} — ${escProse(via)}`);
        }
        if (m.description && !aliasFromDescription) notes.push(escProse(m.description));
        return [`\`.${m.name}\``, notes.join(" ").replaceAll(PIPE_CHAR, String.raw`\|`)];
      }
      if (m.interaction) {
        const marker = tag(options.classNames?.interaction, "Interaction", "_Interaction_");
        const cellText = m.description ? `${marker} — ${escProse(m.description)}` : marker;
        return [`\`.${m.name}\``, cellText.replaceAll(PIPE_CHAR, String.raw`\|`)];
      }
      if (m.affects?.length) {
        const marker = tag(options.classNames?.affects, "Affects", "_Affects_");
        const notes = m.affects.map((a) => {
          const resolved = options.resolveComponent?.(a.component);
          const target = resolved
            ? `[${escProse(resolved.name)}](${resolved.href}).${a.target}`
            : `\`${a.component}.${a.target}\``;
          return a.description ? `${target} — ${escProse(a.description)}` : target;
        });
        const cellText = `${marker}: ${notes.join("; ")}`;
        return [`\`.${m.name}\``, cellText.replaceAll(PIPE_CHAR, String.raw`\|`)];
      }
      return [`\`.${m.name}\``, cell(m.description)];
    });
    fragments.modifiers.push("## Modifiers", "", ...table(["Modifier", "Description"], rows));
  }

  if (entry.parts.length > 0) {
    fragments.parts.push(
      "## Parts",
      "",
      ...table(
        ["Part", "Description"],
        entry.parts.map((p) => [`\`.${p.name}\``, cell(p.description)]),
      ),
    );
  }

  if (entry.shadowParts.length > 0) {
    fragments.shadowParts.push(
      "## Shadow parts",
      "",
      ...table(
        ["Part", "Description"],
        entry.shadowParts.map((p) => [`\`::part(${p.name})\``, cell(p.description)]),
      ),
    );
  }

  if (entry.pseudoElements.length > 0) {
    fragments.pseudoElements.push(
      "## Pseudo-elements",
      "",
      ...table(
        ["Pseudo-element", "Description"],
        entry.pseudoElements.map((p) => [`\`::${p.name}\``, cell(p.description)]),
      ),
    );
  }

  if (entry.states.length > 0) {
    fragments.states.push(
      "## States",
      "",
      ...table(
        ["State", "Description"],
        entry.states.map((s) => [
          `\`${
            s.kind === "custom"
              ? `:state(${s.name})`
              : s.kind === "pseudo-class"
                ? `:${s.name}`
                : s.kind === "attribute"
                  ? (s.selector ?? `[${s.name}]`)
                  : `.${s.name}`
          }\``,
          cell(s.description),
        ]),
      ),
    );
  }

  if (entry.slots.length > 0) {
    fragments.slots.push(
      "## Slots",
      "",
      ...table(
        ["Slot", "Description"],
        entry.slots.map((s) => [s.name ? `\`${s.name}\`` : "_(default)_", cell(s.description)]),
      ),
    );
  }

  const structuralSubs: { name: string; href: string }[] = [];
  if (entry.structure?.length || entry.structureVariants?.length) {
    fragments.structure.push("## Structure", "");
    if (entry.structureDescription) {
      fragments.structure.push(safeMarkdownBlock(entry.structureDescription), "");
    }
    // Both views classify each node (root / part / slot / sibling component): `self` keeps the record's
    // own class from reading as a sibling, and `resolveComponent` resolves siblings to component names.
    const self = entry.className.startsWith(DOT_CHAR) ? entry.className.slice(1) : entry.className;
    const view = options.structureView ?? "both";
    const variants = entry.structureVariants?.map((variant) => ({
      ...variant,
      nodes: normalizeStructureRefCardinality(variant.nodes),
    }));
    const normalizedStructure = normalizeStructureRefCardinality(entry.structure ?? []);

    if (variants?.length && (options.structureVariantView ?? "diagram") === "sections") {
      // One `### Variant: <name>` subsection per variant, each rendered like a standalone structure.
      variants.forEach((variant, i) => {
        fragments.structure.push(`### Variant: ${variant.name ?? `Variant ${i + 1}`}`, "");
        if (view !== "diagram") {
          fragments.structure.push(
            ...fencedBlock(
              "text",
              renderTree(variant.nodes, self, options.resolveComponent).join("\n"),
            ),
            "",
          );
        }
        if (view !== "text") {
          const mermaid = toMermaid(variant.nodes, {
            self,
            resolveComponent: options.resolveComponent,
          });
          if (mermaid) fragments.structure.push(...fencedBlock("mermaid", mermaid), "");
        }
      });
    } else if (variants?.length) {
      // Default: one combined diagram, a labelled subgraph per variant ("pick one of these").
      if (view !== "diagram") {
        variants.forEach((variant, i) => {
          fragments.structure.push(
            `\`// Variant: ${variant.name ?? `Variant ${i + 1}`}\``,
            "",
            ...fencedBlock(
              "text",
              renderTree(variant.nodes, self, options.resolveComponent).join("\n"),
            ),
            "",
          );
        });
      }
      if (view !== "text") {
        const mermaid = toMermaidVariants(variants, {
          self,
          resolveComponent: options.resolveComponent,
        });
        if (mermaid) fragments.structure.push(...fencedBlock("mermaid", mermaid), "");
      }
    } else {
      if (view !== "diagram") {
        fragments.structure.push(
          ...fencedBlock(
            "text",
            renderTree(normalizedStructure, self, options.resolveComponent).join("\n"),
          ),
          "",
        );
      }
      if (view !== "text") {
        const mermaid = toMermaid(normalizedStructure, {
          self,
          resolveComponent: options.resolveComponent,
        });
        if (mermaid) fragments.structure.push(...fencedBlock("mermaid", mermaid), "");
      }
    }

    // Composition is derived from the structure tree(s): sibling components referenced as children.
    if (options.resolveComponent) {
      const groups = variants?.length ? variants.map((v) => v.nodes) : [normalizedStructure];
      structuralSubs.push(...subcomponentsOf(groups, self, options.resolveComponent));
    }
  }

  // Subcomponents come from two directions: structurally nested/co-located children (above, when this
  // record has a `@structure`), and sibling records that declared `@memberOf` naming this one as their
  // parent (below) — a member doesn't need to be nested in this record's own `@structure` tree.
  const membersByName = new Map(structuralSubs.map((s) => [s.name, s]));
  for (const m of options.members ?? []) membersByName.set(m.name, m);
  if (membersByName.size > 0) {
    fragments.subcomponents.push("## Subcomponents", "");
    for (const s of [...membersByName.values()].toSorted((a, b) => a.name.localeCompare(b.name))) {
      fragments.subcomponents.push(`- [${escProse(s.name)}](${s.href})`);
    }
    fragments.subcomponents.push("");
  }

  if (entry.cssPropertiesDeclared.length > 0) {
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

  if (entry.functions.length > 0) {
    fragments.functions.push(
      "## Functions",
      "",
      ...table(
        ["Function", "Parameters", "Returns", "Description"],
        entry.functions.map((f) => [
          `\`${f.name}\``,
          f.parameters.length > 0 ? f.parameters.map((p) => `\`${p}\``).join(", ") : "—",
          code(f.result),
          cell(f.description),
        ]),
      ),
    );
  }

  if (entry.animations.length > 0) {
    fragments.animations.push(
      "## Animations",
      "",
      ...table(
        ["Animation", "Description"],
        entry.animations.map((a) => [`\`${a.name}\``, cell(a.description)]),
      ),
    );
  }

  if (entry.layers.length > 0) {
    fragments.layers.push(
      "## Cascade layers",
      "",
      ...table(
        ["Layer", "Description"],
        entry.layers.map((l) => [`\`${l.name}\``, cell(l.description)]),
      ),
    );
  }

  if (entry.conditions.length > 0) {
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
  if (consumed.length > 0) {
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

  if (entry.compat.length > 0) {
    fragments.compat.push("## Browser support", "");
    for (const note of entry.compat) fragments.compat.push(`- ${escProse(note)}`);
    fragments.compat.push("");
  }

  if (entry.accessibility) {
    fragments.accessibility.push(
      "## Accessibility",
      "",
      safeMarkdownBlock(normalizeProseMarkdown(entry.accessibility)),
      "",
    );
  }

  if (entry.related.length > 0) {
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

  if (entry.see.length > 0) {
    fragments.see.push("## See also", "");
    for (const ref of entry.see) fragments.see.push(`- ${escProse(ref)}`);
    fragments.see.push("");
  }

  const order = options.sectionOrder ?? DEFAULT_SECTION_ORDER;
  for (const key of order) lines.push(...(fragments[key] ?? []));

  return sanitizeMarkdownLinks(`${lines.join("\n")}\n`);
}

/**
 * Render the index/overview page: records grouped by `@group` (or their kind), each a table with its
 * summary. See {@link groupEntries} for the grouping and order.
 */
export function renderIndex(
  entries: readonly CssDocEntry[],
  options: RenderIndexOptions = {},
): string {
  const projected = options.includePrivate
    ? entries
    : (() => {
        const index = indexFromEntries([...entries]);
        return projectPublicModel(entries, {
          includeInternal: options.includeInternal,
          lookupFor:
            options.lookupFor ?? (() => ({ workspace: { complete: true, sources: [{ index }] } })),
          literalText: (text) => literalMarkdownText(text),
        });
      })();
  const baseHref = options.baseHref ?? "/";
  const visibleEntries = options.includeInternal
    ? projected
    : projected.filter((entry) => entry.visibility !== "internal");
  const lines = [`# ${options.title ?? "CSS API reference"}`, ""];
  if (options.intro) lines.push(safeMarkdownBlock(options.intro), "");
  for (const group of groupEntries(visibleEntries, options.groups)) {
    lines.push(
      `## ${group.label}`,
      "",
      ...table(
        ["Name", "Class", "Summary"],
        group.entries.map((e) => [
          `[${e.name}](${baseHref}${e.name}.md)`,
          `\`${e.className}\``,
          cell(e.summary),
        ]),
      ),
    );
  }
  return sanitizeMarkdownLinks(`${lines.join("\n")}\n`);
}
