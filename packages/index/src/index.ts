/**
 * `@cssdoc/index` — a queryable semantic index over the `@cssdoc/core` model, plus the two
 * cross-cutting concerns every downstream tool shares: a host-agnostic usage abstraction (so
 * HTML, JSX, template literals, and CSS selectors all feed the same providers) and optional source
 * spans (so diagnostics, hover ranges, and go-to-definition can point back into the CSS).
 *
 * `@cssdoc/core` stays position-free; the spans are built here, in a dedicated PostCSS pass, and
 * carried alongside the model. Build with {@link createIndex} (from CSS, with spans) or
 * {@link indexFromEntries} (from a model snapshot, without spans).
 *
 * @module @cssdoc/index
 */
import {
  type CssAnimation,
  type CssCondition,
  type CssDocConfiguration,
  type CssDocEntry,
  type CssFunction,
  type CssModifier,
  type CssPart,
  type CssPropertyDeclared,
  type CssState,
  type ModifierConventionInput,
  type StructureNode,
  DEFAULT_MODIFIER_CONVENTION,
  ModifierMatcher,
  parseCssDocs,
  parseDocComment,
  recordNameOf,
  resolveModifierConvention,
} from "@cssdoc/core";
import postcss, { type ChildNode } from "postcss";
import valueParser from "postcss-value-parser";

/** A 1-based line/column position (matching PostCSS). */
export interface Position {
  line: number;
  column: number;
}

/** A source range. */
export interface SourceSpan {
  start: Position;
  end: Position;
}

/** A location: a source range, optionally in a named file. */
export interface Location {
  file?: string;
  span: SourceSpan;
}

/**
 * A member usage on one element: the classes on the element, the specific `token` under inspection,
 * and the resolved `base` component class (when one of the tokens names a documented component).
 * `token` is normally a class token, but for attribute conventions (CUBE) it may be an attribute
 * expression like `data-variant="ghost"`. Producers for HTML, JSX, and CSS selectors all emit this
 * shape.
 */
export interface ClassUsage {
  /** The base component class among the tokens, if any (e.g. `.button` → `button`). */
  base?: string;
  /** Every class token on the element. */
  tokens: string[];
  /** The specific token/expression this usage is about (a modifier candidate). */
  token: string;
  /** Where the token sits in the host document. */
  loc?: SourceSpan;
}

/** A `var(--name)` custom-property reference. */
export interface PropertyUsage {
  name: string;
  /** The fallback in `var(--name, fallback)`, when present. */
  fallback?: string;
  loc?: SourceSpan;
}

/** A custom-property assignment: `--name: value`. */
export interface PropertyAssignment {
  name: string;
  value: string;
  loc?: SourceSpan;
}

/** The value sites a stylesheet contains: custom-property assignments and `var(--…)` references. */
export interface CssValueSites {
  assignments: PropertyAssignment[];
  usages: PropertyUsage[];
}

/** The kinds of record member a span can be keyed to. */
export type MemberKind =
  | "record"
  | "modifier"
  | "part"
  | "shadow-part"
  | "property"
  | "function"
  | "animation"
  | "layer"
  | "state"
  | "condition";

/** Build a stable span key for a member. */
export function memberKey(kind: MemberKind, id = ""): string {
  return id ? `${kind}:${id}` : kind;
}

/** One record in the index: its model entry plus source spans and the facts drift checks need. */
export interface RecordInfo {
  entry: CssDocEntry;
  /** The record's definition span (its base-class rule, else its doc comment). */
  span?: SourceSpan;
  /** Spans keyed by {@link memberKey}, e.g. `modifier:-color-secondary`, `property:--value`. */
  memberSpans: Map<string, SourceSpan>;
  /** Modifier names authored via `@modifier` (used for drift detection). */
  authoredModifiers: Set<string>;
  /** Part names authored via `@part` (used for drift detection). */
  authoredParts: Set<string>;
  /** Shadow-part names authored via `@csspart` (used for drift detection). */
  authoredShadowParts: Set<string>;
  /** The concatenated selector text of the record's rules (used for drift detection). */
  selectorText: string;
}

/** A serializable snapshot of the index (the model plus its file), for tools that consume JSON. */
export interface CssDocManifest {
  version: 1;
  file?: string;
  entries: CssDocEntry[];
}

const stripDot = (name: string): string => name.replace(/^\./u, "");

const spanOf = (node: ChildNode): SourceSpan | undefined => {
  const { source } = node;
  if (!source?.start) return undefined;
  const end = source.end ?? source.start;
  return {
    start: { line: source.start.line, column: source.start.column },
    end: { line: end.line, column: end.column },
  };
};

/**
 * Follow the `var()` references in `value` through `values` to a terminal literal — the resolution a
 * browser's dev tools show. Uses a `var(--x, fallback)` fallback when `--x` is undefined, and leaves a
 * reference in place on an unknown property or a cycle (so the output degrades to the furthest it could
 * reach rather than looping).
 */
function resolveValue(
  value: string,
  values: ReadonlyMap<string, string>,
  seen: Set<string>,
): string {
  if (!value.includes("var(")) return value;
  const parsed = valueParser(value);
  parsed.walk((node) => {
    if (node.type !== "function" || node.value !== "var") return undefined;
    const ref = node.nodes.find((n) => n.type === "word")?.value;
    if (!ref?.startsWith("--")) return false;
    const comma = node.nodes.findIndex((n) => n.type === "div" && n.value === ",");
    const fallback =
      comma >= 0 ? valueParser.stringify(node.nodes.slice(comma + 1)).trim() : undefined;
    const declared = seen.has(ref) ? undefined : values.get(ref);
    const replacement =
      declared !== undefined
        ? resolveValue(declared, values, new Set([...seen, ref]))
        : fallback !== undefined
          ? resolveValue(fallback, values, seen)
          : undefined;
    if (replacement !== undefined) {
      (node as unknown as { type: string; value: string; nodes: [] }).type = "word";
      node.value = replacement;
      (node as unknown as { nodes: [] }).nodes = [];
    }
    return false; // never descend into a var()'s own arguments
  });
  return valueParser.stringify(parsed.nodes);
}

/** A queryable view over the parsed records. */
export class CssDocIndex {
  readonly file?: string;
  readonly records: readonly RecordInfo[];
  /** The modifier matcher for this index's convention — how members are matched and rendered. */
  readonly matcher: ModifierMatcher;
  /** Every custom property's effective value (`--x: value` declarations and `@property` initial-values). */
  readonly customPropertyValues: ReadonlyMap<string, string>;
  private readonly byName = new Map<string, RecordInfo>();
  private readonly byClass = new Map<string, RecordInfo>();

  constructor(
    records: RecordInfo[],
    file?: string,
    matcher?: ModifierMatcher,
    customPropertyValues: ReadonlyMap<string, string> = new Map(),
  ) {
    this.records = records;
    this.file = file;
    this.matcher = matcher ?? new ModifierMatcher(DEFAULT_MODIFIER_CONVENTION);
    this.customPropertyValues = customPropertyValues;
    for (const record of records) {
      this.byName.set(record.entry.name, record);
      this.byClass.set(stripDot(record.entry.className), record);
    }
  }

  /**
   * A custom property's declared value and its fully resolved value — following `var()` references
   * through the index to a terminal literal, the way browser dev tools do. `resolved` is omitted when
   * nothing was followed (no `var()`, or the chain couldn't be resolved further).
   */
  resolveCustomProperty(name: string): { declared?: string; resolved?: string } {
    const declared = this.customPropertyValues.get(name);
    if (declared === undefined) return {};
    const resolved = resolveValue(declared, this.customPropertyValues, new Set([name]));
    return { declared, resolved: resolved === declared ? undefined : resolved };
  }

  /** Every documented record's model entry. */
  get entries(): CssDocEntry[] {
    return this.records.map((r) => r.entry);
  }

  /** The record whose base class matches `className` (with or without a leading dot). */
  componentForClass(className: string): CssDocEntry | undefined {
    return this.byClass.get(stripDot(className))?.entry;
  }

  /** The full {@link RecordInfo} for a record name. */
  recordInfo(name: string): RecordInfo | undefined {
    return this.byName.get(name);
  }

  modifiersFor(name: string): CssModifier[] {
    return this.byName.get(name)?.entry.modifiers ?? [];
  }

  partsFor(name: string): CssPart[] {
    return this.byName.get(name)?.entry.parts ?? [];
  }

  shadowPartsFor(name: string): CssPart[] {
    return this.byName.get(name)?.entry.shadowParts ?? [];
  }

  customPropertiesFor(name: string): CssPropertyDeclared[] {
    return this.byName.get(name)?.entry.cssPropertiesDeclared ?? [];
  }

  functionsFor(name: string): CssFunction[] {
    return this.byName.get(name)?.entry.functions ?? [];
  }

  statesFor(name: string): CssState[] {
    return this.byName.get(name)?.entry.states ?? [];
  }

  conditionsFor(name: string): CssCondition[] {
    return this.byName.get(name)?.entry.conditions ?? [];
  }

  animationsFor(name: string): CssAnimation[] {
    return this.byName.get(name)?.entry.animations ?? [];
  }

  structureFor(name: string): StructureNode[] | undefined {
    return this.byName.get(name)?.entry.structure;
  }

  /** Whether `modifier` (a class token or attribute expression) is a documented modifier of `base` —
   * an exact match, or an instance of a documented `*` family (`-icon-arrow` → `-icon-*`). */
  isModifier(base: string, modifier: string): boolean {
    const wanted = this.matcher.normalizeMember(modifier);
    return (
      this.byClass
        .get(stripDot(base))
        ?.entry.modifiers.some((m) => this.matcher.matchesModifier(m.name, wanted)) ?? false
    );
  }

  /** The deprecation of a modifier on `base`, if it is deprecated (including via a `*` family). */
  deprecationOf(base: string, modifier: string): { canonical?: string; note?: string } | undefined {
    const wanted = this.matcher.normalizeMember(modifier);
    return this.byClass
      .get(stripDot(base))
      ?.entry.modifiers.find((m) => this.matcher.matchesModifier(m.name, wanted))?.deprecated;
  }

  /** Every declared custom property, paired with the record that declares it (for `var(...)` completion). */
  allCustomProperties(): { property: CssPropertyDeclared; record: string }[] {
    return this.records.flatMap((r) =>
      r.entry.cssPropertiesDeclared.map((property) => ({ property, record: r.entry.name })),
    );
  }

  /** Every custom function, paired with its record. */
  allFunctions(): { fn: CssFunction; record: string }[] {
    return this.records.flatMap((r) =>
      r.entry.functions.map((fn) => ({ fn, record: r.entry.name })),
    );
  }

  /** The definition location of a record member (or the record itself), if a span is known. */
  location(name: string, key = "record"): Location | undefined {
    const record = this.byName.get(name);
    if (!record) return undefined;
    const span = key === "record" ? record.span : record.memberSpans.get(key);
    return span ? { file: this.file, span } : undefined;
  }

  /** A stable, serializable snapshot. */
  toManifest(): CssDocManifest {
    return { version: 1, file: this.file, entries: this.entries };
  }
}

/** Build an index from a model snapshot (no source spans). */
export function indexFromEntries(entries: CssDocEntry[], file?: string): CssDocIndex {
  const records: RecordInfo[] = entries.map((entry) => ({
    entry,
    memberSpans: new Map(),
    authoredModifiers: new Set(),
    authoredParts: new Set(),
    authoredShadowParts: new Set(),
    selectorText: "",
  }));
  return new CssDocIndex(records, file);
}

interface Build {
  entry: CssDocEntry;
  span?: SourceSpan;
  memberSpans: Map<string, SourceSpan>;
  authoredModifiers: Set<string>;
  authoredParts: Set<string>;
  authoredShadowParts: Set<string>;
  selectorText: string;
}

/** Scan a record's nodes for member spans, recording each member's first occurrence. */
function scanNodes(nodes: ChildNode[], build: Build, base: string, matcher: ModifierMatcher): void {
  const baseNoDot = stripDot(base);
  const set = (key: string, node: ChildNode): void => {
    const span = spanOf(node);
    if (span && !build.memberSpans.has(key)) build.memberSpans.set(key, span);
  };

  for (const node of nodes) {
    if (node.type === "rule") {
      build.selectorText += ` ${node.selector}`;
      if (`.${stripDot(node.selector.trim())}` === base && !build.span) build.span = spanOf(node);
      for (const selector of node.selector.split(",")) {
        for (const s of selector.matchAll(/:state\(\s*([\w-]+)\s*\)/gu)) {
          set(memberKey("state", s[1]), node);
        }
        for (const ps of matcher.pseudoStatesIn(selector)) {
          set(memberKey("state", ps.name), node);
        }
        for (const sp of selector.matchAll(/::part\(\s*([\w-]+)\s*\)/gu)) {
          set(memberKey("shadow-part", sp[1]), node);
        }
        const bare = selector.replace(/::?[\w-]+(\([^)]*\))?/gu, "");
        const modNames = new Set<string>();
        for (const mod of matcher.modifiersIn(bare, baseNoDot)) {
          modNames.add(mod.name);
          set(memberKey("modifier", mod.name), node);
        }
        for (const el of matcher.elementsIn(bare, baseNoDot)) {
          set(memberKey("part", el.name), node);
          for (const m of el.modifiers) set(memberKey("modifier", m.name), node);
        }
        for (const st of matcher.statesIn(bare, baseNoDot)) {
          set(memberKey("state", st.name), node);
        }
        for (const p of bare.matchAll(/\.([a-z][\w-]*)/gu)) {
          if (modNames.has(p[1])) continue; // a modifier, not a part
          set(memberKey("part", p[1]), node);
        }
      }
    } else if (node.type === "atrule") {
      if (node.name === "property") set(memberKey("property", node.params.trim()), node);
      else if (node.name === "function") {
        const fn = node.params.trim().match(/^(--[\w-]+)/u);
        if (fn) set(memberKey("function", fn[1]), node);
      } else if (node.name === "keyframes") set(memberKey("animation", node.params.trim()), node);
      else if (node.name === "layer") {
        for (const raw of node.params.split(",")) {
          const layer = raw.trim();
          if (layer) set(memberKey("layer", layer), node);
        }
      } else if (node.name === "container" || node.name === "supports" || node.name === "media") {
        set(memberKey("condition", `${node.name}:${node.params.trim()}`), node);
      }
      if (node.nodes) scanNodes(node.nodes, build, base, matcher);
    }
  }
}

/**
 * Build an index from CSS, with source spans. Parses the model via `@cssdoc/core`, then makes a second
 * PostCSS pass to locate each record and member.
 *
 * @param css - The CSS source.
 * @param options - `file` (attached to locations) and `configuration` (custom tags).
 * @returns The index.
 */
export function createIndex(
  css: string,
  options: {
    file?: string;
    configuration?: CssDocConfiguration;
    modifierConvention?: ModifierConventionInput;
    /** The PostCSS parser (inject a dialect parser for `.scss`/`.less`; default `postcss.parse`). */
    parse?: (css: string) => ReturnType<typeof postcss.parse>;
  } = {},
): CssDocIndex {
  const matcher = new ModifierMatcher(
    resolveModifierConvention(
      options.modifierConvention ?? options.configuration?.modifierConvention,
    ),
  );
  const entries = parseCssDocs(css, {
    configuration: options.configuration,
    modifierConvention: options.modifierConvention,
    parse: options.parse,
  });
  const byName = new Map(entries.map((e) => [e.name, e]));
  const builds = new Map<string, Build>();

  const root = (options.parse ?? postcss.parse)(css);
  let current: Build | undefined;
  for (const node of root.nodes) {
    if (node.type === "comment") {
      const name = recordNameOf(node.text, options.configuration);
      const entry = name ? byName.get(name) : undefined;
      if (name && entry) {
        const doc = parseDocComment(node.text, options.configuration);
        current = {
          entry,
          span: spanOf(node),
          memberSpans: new Map(),
          authoredModifiers: new Set(doc.modifiers.keys()),
          authoredParts: new Set(doc.parts.keys()),
          authoredShadowParts: new Set(doc.cssParts.keys()),
          selectorText: "",
        };
        builds.set(name, current);
        continue;
      }
    }
    if (current) scanNodes([node], current, current.entry.className, matcher);
  }

  const records: RecordInfo[] = entries.map(
    (entry) =>
      builds.get(entry.name) ?? {
        entry,
        memberSpans: new Map(),
        authoredModifiers: new Set(),
        authoredParts: new Set(),
        authoredShadowParts: new Set(),
        selectorText: "",
      },
  );

  // The custom-property value graph, for dev-tools-style `var()` resolution: seed each `@property`'s
  // `initial-value`, then let plain `--x: value` declarations (the actual assignments) win.
  const customPropertyValues = new Map<string, string>();
  root.walkAtRules("property", (at) => {
    const name = at.params.trim();
    at.walkDecls("initial-value", (d) => {
      customPropertyValues.set(name, d.value);
    });
  });
  root.walkDecls((d) => {
    if (d.prop.startsWith("--")) customPropertyValues.set(d.prop, d.value);
  });

  return new CssDocIndex(records, options.file, matcher, customPropertyValues);
}

/**
 * Extract custom-property assignments (`--name: value`) and `var(--name, fallback)` references from
 * CSS. Parsing lives here — the CSS-parsing package — so the linters and the language server share one
 * extractor for the value-validation rules.
 *
 * @param css - The CSS source.
 * @returns The assignments and `var(…)` usages found.
 */
export function cssValueSites(
  css: string,
  options: { parse?: (css: string) => ReturnType<typeof postcss.parse> } = {},
): CssValueSites {
  const assignments: PropertyAssignment[] = [];
  const usages: PropertyUsage[] = [];
  const root = (options.parse ?? postcss.parse)(css);
  root.walkDecls((decl) => {
    const loc = spanOf(decl);
    if (decl.prop.startsWith("--")) {
      assignments.push({ name: decl.prop, value: decl.value, loc });
    }
    if (decl.value.includes("var(")) {
      valueParser(decl.value).walk((node) => {
        if (node.type !== "function" || node.value !== "var") return;
        const name = node.nodes.find((n) => n.type === "word")?.value;
        if (!name?.startsWith("--")) return;
        const comma = node.nodes.findIndex((n) => n.type === "div" && n.value === ",");
        const fallback =
          comma >= 0 ? valueParser.stringify(node.nodes.slice(comma + 1)).trim() : undefined;
        usages.push({ name, fallback: fallback || undefined, loc });
      });
    }
  });
  return { assignments, usages };
}
