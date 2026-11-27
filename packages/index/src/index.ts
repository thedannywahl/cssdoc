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
 * @module \@cssdoc/index
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
  type StructureVariant,
  DEFAULT_MODIFIER_CONVENTION,
  isCssDocComment,
  ModifierMatcher,
  parseCssDocs,
  parseDocComment,
  recordNameOf,
  resolveModifierConvention,
  splitModifierArg,
  splitPartArg,
} from "@cssdoc/core";
import {
  AT_SOURCE,
  COMMENT_LINE_PREFIX,
  CSSDOC_BASE_CLASS_REFERENCE,
  CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE,
  CSSDOC_CUSTOM_STATE_SELECTOR,
  CSSDOC_SCANNED_PSEUDO_SELECTOR,
  CSSDOC_SHADOW_PART_SELECTOR,
  DOT_CHAR,
  WORD_BOUNDARY_SOURCE,
  toRegExp,
} from "@cssdoc/regex";
import { regex as arkRegex } from "arkregex";
import { parse as parsePostcss, type ChildNode } from "postcss";
import valueParser from "postcss-value-parser";

export {
  resolveContainerMemberReference,
  resolveNamedMemberReference,
  resolveMediaMemberReference,
  resolveRecordReference,
  resolveScopeMemberReference,
  resolveSelectorMemberReference,
  resolveSupportsMemberReference,
} from "./reference.ts";
export { projectPrivateLinksInLookup, referenceVisibility } from "./projection.ts";
export { projectPublicModel } from "./public-model.ts";
export type { PublicModelOptions, PublicProseContext } from "./public-model.ts";
export type {
  ContainerMemberCandidate,
  ContainerMemberResolution,
  NamedMemberCandidate,
  NamedMemberOccurrence,
  NamedMemberResolution,
  MediaMemberCandidate,
  MediaMemberResolution,
  RecordReferenceResolution,
  ReferenceCandidate,
  ReferenceLookup,
  ReferenceLookupScope,
  ReferenceSource,
  ScopeMemberCandidate,
  ScopeMemberResolution,
  SelectorMemberCandidate,
  SelectorMemberOccurrence,
  SelectorMemberResolution,
  SupportsMemberCandidate,
  SupportsMemberResolution,
} from "./reference.ts";

/**
 * Every class reference in a selector (name captured, dot dropped). The leading `[A-Za-z_]` accepts any
 * case, so a PascalCase or namespaced/prefixed class (`.Button`, `.PFX-badge`) is picked up as a part —
 * `-`-led modifiers and digit-led idents are excluded. Shares the parser's class-name pattern.
 */
const CLASS_REF = toRegExp(CSSDOC_BASE_CLASS_REFERENCE);
const AUTHORED_MEMBER = arkRegex.as(String.raw`^${AT_SOURCE}(modifier|part)\s+([\s\S]*)$`, "u");
const CUSTOM_FUNCTION = arkRegex.as(`^(${CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE})`, "u");
const RESET_VALUE = arkRegex.as(
  `${WORD_BOUNDARY_SOURCE}(?:unset|initial|inherit|revert|revert-layer)${WORD_BOUNDARY_SOURCE}`,
  "u",
);

/** A 1-based line/column position (matching PostCSS). */
export interface Position {
  /** 1-based line number. */
  line: number;
  /** 1-based column number. */
  column: number;
}

/** A source range. */
export interface SourceSpan {
  /** Start position. */
  start: Position;
  /** End position. */
  end: Position;
}

/** A location: a source range, optionally in a named file. */
export interface Location {
  /** Source filename, when known. */
  file?: string;
  /** Range within the source. */
  span: SourceSpan;
}

/** A CSS `@scope` enclosing rules owned by one record. */
export interface ScopeOccurrence {
  /** Authored scope prelude, or an empty string when omitted. */
  prelude: string;
  /** Range of the CSS at-rule, when available. */
  span?: SourceSpan;
}

/** A CSS `@media` occurrence enclosing rules owned by one record. */
export interface MediaOccurrence {
  /** Authored media prelude. */
  prelude: string;
  /** Range of the CSS at-rule, when available. */
  span?: SourceSpan;
}

/** A CSS `@container` occurrence enclosing rules owned by one record. */
export interface ContainerOccurrence {
  /** Authored container prelude. */
  prelude: string;
  /** Range of the CSS at-rule, when available. */
  span?: SourceSpan;
}

/** A CSS `@supports` occurrence enclosing rules owned by one record. */
export interface SupportsOccurrence {
  /** Authored supports prelude. */
  prelude: string;
  /** Range of the CSS at-rule, when available. */
  span?: SourceSpan;
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
  /** The host element tag name for this usage site (lowercase), when known. */
  elementName?: string;
  /** Where the token sits in the host document. */
  loc?: SourceSpan;
}

/** A `var(--name)` custom-property reference. */
export interface PropertyUsage {
  /** Referenced custom-property name, including `--`. */
  name: string;
  /** The fallback in `var(--name, fallback)`, when present. */
  fallback?: string;
  /** Source range of the reference, when known. */
  loc?: SourceSpan;
}

/** A custom-property assignment: `--name: value`. */
export interface PropertyAssignment {
  /** Assigned custom-property name, including `--`. */
  name: string;
  /** Authored declaration value. */
  value: string;
  /** Source range of the declaration, when known. */
  loc?: SourceSpan;
}

/** The value sites a stylesheet contains: custom-property assignments and `var(--…)` references. */
export interface CssValueSites {
  /** Custom-property declarations found in the source. */
  assignments: PropertyAssignment[];
  /** Custom-property references found in declaration values. */
  usages: PropertyUsage[];
}

/** The kinds of record member a span can be keyed to. */
export type MemberKind =
  | "record"
  | "modifier"
  | "part"
  | "shadow-part"
  | "pseudo-element"
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
  /** Parsed model record. */
  entry: CssDocEntry;
  /** The record's definition span (its base-class rule, else its doc comment). */
  span?: SourceSpan;
  /** The doc comment span (for diagnostics and directives). */
  docCommentSpan?: SourceSpan;
  /** The rule span (for definitions). */
  ruleSpan?: SourceSpan;
  /** Spans keyed by {@link memberKey}, e.g. `modifier:-color-secondary`, `property:--value`. */
  memberSpans: Map<string, SourceSpan>;
  /** CSS scope occurrences; absent when the index was built without source CSS. */
  scopeOccurrences?: readonly ScopeOccurrence[];
  /** CSS media occurrences; absent when the source can't be analyzed as plain CSS. */
  mediaOccurrences?: readonly MediaOccurrence[];
  /** CSS container occurrences; absent when the source can't be analyzed as plain CSS. */
  containerOccurrences?: readonly ContainerOccurrence[];
  /** CSS supports occurrences; absent when the source can't be analyzed as plain CSS. */
  supportsOccurrences?: readonly SupportsOccurrence[];
  /** Modifier names authored via `@modifier` (used for drift detection). */
  authoredModifiers: Set<string>;
  /**
   * Parts authored via `@part`, keyed by derived name → original CSS selector.
   * Class parts store `.${name}`; attribute/ID/:host parts store their full selector.
   */
  authoredParts: Map<string, string>;
  /** Shadow-part names authored via `@csspart` (used for drift detection). */
  authoredShadowParts: Set<string>;
  /** The single-line span of each `@modifier` tag's own line in the doc comment, keyed by name. */
  authoredModifierLines: Map<string, SourceSpan>;
  /** The single-line span of each `@part` tag's own line in the doc comment, keyed by name. */
  authoredPartLines: Map<string, SourceSpan>;
  /** The concatenated selector text of the record's rules (used for drift detection). */
  selectorText: string;
  /** Distinct values seen for each property declared inside this record's rules. */
  propertyValues: Map<string, Set<string>>;
  /** Declarations that include reset-like keywords (`unset`/`initial`/`inherit`/`revert`). */
  resetValueUsages: {
    /** Name of the declaration's property. */
    property: string;
    /** Authored declaration value. */
    value: string;
    /** Declaration range, when known. */
    span?: SourceSpan;
  }[];
}

/** A serializable snapshot of the index (the model plus its file), for tools that consume JSON. */
export interface CssDocManifest {
  /** Manifest format version. */
  version: 1;
  /** Source filename, when supplied. */
  file?: string;
  /** Model records in index order. */
  entries: CssDocEntry[];
}

const stripDot = (name: string): string => (name.startsWith(DOT_CHAR) ? name.slice(1) : name);

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
 * Scan a doc comment's raw text (PostCSS `Comment.text`, still `*`-line-prefixed) for `@modifier`/
 * `@part` tag-opening lines, deriving each one's name via the same grammar used to parse its
 * description. Uses the *raw* text (not `stripCommentFraming`'s trimmed output) so line index `i`
 * stays aligned 1:1 with `startLine + i` — trimming can drop leading blank lines and shift the offset.
 */
function scanAuthoredTagLines(
  text: string,
  startLine: number,
): { modifierLines: Map<string, SourceSpan>; partLines: Map<string, SourceSpan> } {
  const modifierLines = new Map<string, SourceSpan>();
  const partLines = new Map<string, SourceSpan>();
  const lines = text.split("\n");
  for (const [i, line] of lines.entries()) {
    const stripped = line.replace(COMMENT_LINE_PREFIX, "");
    const m = stripped.match(AUTHORED_MEMBER);
    if (!m) continue;
    const lineNumber = startLine + i;
    const span: SourceSpan = {
      start: { line: lineNumber, column: 1 },
      end: { line: lineNumber, column: line.length + 1 },
    };
    if (m[1] === "modifier") {
      const { name } = splitModifierArg(m[2]);
      if (!modifierLines.has(name)) modifierLines.set(name, span);
    } else {
      const { name } = splitPartArg(m[2]);
      if (!partLines.has(name)) partLines.set(name, span);
    }
  }
  return { modifierLines, partLines };
}

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
  parsed.walk((node, index, nodes) => {
    if (node.type !== "function" || node.value !== "var") return undefined;
    const ref = node.nodes.find((n) => n.type === "word")?.value;
    if (!ref?.startsWith("--")) return false;
    const comma = node.nodes.findIndex((n) => n.type === "div" && n.value === ",");
    const fallback =
      comma === -1 ? undefined : valueParser.stringify(node.nodes.slice(comma + 1)).trim();
    const declared = seen.has(ref) ? undefined : values.get(ref);
    const replacement =
      declared === undefined
        ? fallback === undefined
          ? undefined
          : resolveValue(fallback, values, seen)
        : resolveValue(declared, values, new Set([...seen, ref]));
    if (replacement !== undefined) {
      nodes[index] = {
        type: "word",
        value: replacement,
        sourceIndex: node.sourceIndex,
        sourceEndIndex: node.sourceEndIndex,
      };
    }
    return false; // never descend into a var()'s own arguments
  });
  return valueParser.stringify(parsed.nodes);
}

/**
 * A queryable view over parsed records and, when available, their source spans.
 *
 * Member-list methods return an empty array when the record is unknown. Structure methods return
 * `undefined` when the record or structure is absent. Name lookups use record names; class lookups
 * accept a base class with or without a leading dot.
 */
export class CssDocIndex {
  /** Source filename attached to returned locations, when supplied. */
  readonly file?: string;
  /** Indexed records in input order. */
  readonly records: readonly RecordInfo[];
  /** The modifier matcher for this index's convention — how members are matched and rendered. */
  readonly matcher: ModifierMatcher;
  /** Every custom property's effective value (`--x: value` declarations and `@property` initial-values). */
  readonly customPropertyValues: ReadonlyMap<string, string>;
  /** The precedence model when multiple records define the same modifier. */
  readonly globalPrecedence: "base" | "global";
  private readonly byName = new Map<string, RecordInfo>();
  private readonly byClass = new Map<string, RecordInfo>();

  constructor(
    records: RecordInfo[],
    file?: string,
    matcher?: ModifierMatcher,
    customPropertyValues: ReadonlyMap<string, string> = new Map(),
    globalPrecedence: "base" | "global" = "base",
  ) {
    this.records = records;
    this.file = file;
    this.matcher = matcher ?? new ModifierMatcher(DEFAULT_MODIFIER_CONVENTION);
    this.customPropertyValues = customPropertyValues;
    this.globalPrecedence = globalPrecedence;
    for (const record of records) {
      this.byName.set(record.entry.name, record);
      this.byClass.set(stripDot(record.entry.className), record);
    }
  }

  /**
   * A custom property's declared value and its fully resolved value — following `var()` references
   * through the index to a terminal literal, the way browser dev tools do. `resolved` is omitted when
   * nothing was followed (no `var()`, or the chain couldn't be resolved further).
   *
   * @param name - Custom-property name, including `--`.
   * @returns The declared and, if different, resolved values; an empty object when unknown.
   */
  resolveCustomProperty(name: string): {
    /** Value stored for the property, if present. */
    declared?: string;
    /** Value after resolving references, if it differs from the declared value. */
    resolved?: string;
  } {
    const declared = this.customPropertyValues.get(name);
    if (declared === undefined) return {};
    const resolved = resolveValue(declared, this.customPropertyValues, new Set([name]));
    return { declared, resolved: resolved === declared ? undefined : resolved };
  }

  /** Every documented record's model entry. */
  get entries(): CssDocEntry[] {
    return this.records.map((r) => r.entry);
  }

  /**
   * Look up a record by its base class.
   *
   * @param className - Base class, with or without a leading dot.
   * @returns The matching record, or `undefined` if none exists.
   */
  componentForClass(className: string): CssDocEntry | undefined {
    return this.byClass.get(stripDot(className))?.entry;
  }

  /** The full {@link RecordInfo} for a record name. */
  recordInfo(name: string): RecordInfo | undefined {
    return this.byName.get(name);
  }

  /** The modifiers documented on the named record. */
  modifiersFor(name: string): CssModifier[] {
    return this.byName.get(name)?.entry.modifiers ?? [];
  }

  /** The selector-derived parts documented on the named record. */
  partsFor(name: string): CssPart[] {
    return this.byName.get(name)?.entry.parts ?? [];
  }

  /** The shadow parts documented on the named record. */
  shadowPartsFor(name: string): CssPart[] {
    return this.byName.get(name)?.entry.shadowParts ?? [];
  }

  /** The custom properties declared by the named record, not properties it consumes. */
  customPropertiesFor(name: string): CssPropertyDeclared[] {
    return this.byName.get(name)?.entry.cssPropertiesDeclared ?? [];
  }

  /** The custom functions documented on the named record. */
  functionsFor(name: string): CssFunction[] {
    return this.byName.get(name)?.entry.functions ?? [];
  }

  /** The states documented on the named record. */
  statesFor(name: string): CssState[] {
    return this.byName.get(name)?.entry.states ?? [];
  }

  /** The conditions documented on the named record. */
  conditionsFor(name: string): CssCondition[] {
    return this.byName.get(name)?.entry.conditions ?? [];
  }

  /** The animations documented on the named record. */
  animationsFor(name: string): CssAnimation[] {
    return this.byName.get(name)?.entry.animations ?? [];
  }

  /** The named record's structure tree, if present. */
  structureFor(name: string): StructureNode[] | undefined {
    return this.byName.get(name)?.entry.structure;
  }

  /** The named record's alternative structure trees, if present. */
  structureVariantsFor(name: string): StructureVariant[] | undefined {
    return this.byName.get(name)?.entry.structureVariants;
  }

  /** The documented modifier matching `wanted` on `base`, preferring the base's own definition or
   * the global one per `globalPrecedence` when both a base and a global record define it. */
  private matchedModifier(base: string, wanted: string): CssModifier | undefined {
    const baseModifier = this.byClass
      .get(stripDot(base))
      ?.entry.modifiers.find((m) => this.matcher.matchesModifier(m.name, wanted));
    let globalModifier: CssModifier | undefined;
    for (const record of this.records) {
      if (!record.entry.global) continue;
      globalModifier = record.entry.modifiers.find((m) =>
        this.matcher.matchesModifier(m.name, wanted),
      );
      if (globalModifier) break;
    }
    return this.globalPrecedence === "global"
      ? (globalModifier ?? baseModifier)
      : (baseModifier ?? globalModifier);
  }

  /**
   * Whether `modifier` (a class token or attribute expression) is a documented modifier of `base` —
   * an exact match, or an instance of a documented `*` family (`-icon-arrow` → `-icon-*`).
   * Checks both base-specific modifiers and global modifiers.
   *
   * @param base - Record base class, with or without a leading dot.
   * @param modifier - Modifier class token or attribute expression.
   * @returns Whether a matching base-specific or global modifier exists.
   */
  isModifier(base: string, modifier: string): boolean {
    return this.matchedModifier(base, this.matcher.normalizeMember(modifier)) !== undefined;
  }

  /**
   * Find deprecation information for a modifier, including a matching `*` family. Checks both
   * base-specific and global modifiers, applying {@link globalPrecedence} on conflicts.
   *
   * @param base - Record base class, with or without a leading dot.
   * @param modifier - Modifier class token or attribute expression.
   * @returns The selected modifier's deprecation information, or `undefined`.
   */
  deprecationOf(
    base: string,
    modifier: string,
  ):
    | {
        /** Replacement modifier, when known. */
        canonical?: string;
        /** Authored deprecation guidance, when supplied. */
        note?: string;
      }
    | undefined {
    return this.matchedModifier(base, this.matcher.normalizeMember(modifier))?.deprecated;
  }

  /**
   * Find a modifier's alias mapping. Checks both base-specific and global modifiers, applying
   * {@link globalPrecedence} on conflicts.
   *
   * @param base - Record base class, with or without a leading dot.
   * @param modifier - Modifier class token or attribute expression.
   * @returns The selected modifier's alias mapping, or `undefined`.
   */
  aliasOf(
    base: string,
    modifier: string,
  ):
    | {
        /** Canonical modifier, when known. */
        canonical?: string;
        /** Authored alias guidance, when supplied. */
        note?: string;
      }
    | undefined {
    return this.matchedModifier(base, this.matcher.normalizeMember(modifier))?.alias;
  }

  /** Every declared custom property, paired with the record that declares it (for `var(...)` completion). */
  allCustomProperties(): {
    /** Declared custom property. */
    property: CssPropertyDeclared;
    /** Name of the record declaring the property. */
    record: string;
  }[] {
    return this.records.flatMap((r) =>
      r.entry.cssPropertiesDeclared.map((property) => ({ property, record: r.entry.name })),
    );
  }

  /** Every custom function, paired with its record. */
  allFunctions(): {
    /** Documented custom function. */
    fn: CssFunction;
    /** Name of the record containing the function. */
    record: string;
  }[] {
    return this.records.flatMap((r) =>
      r.entry.functions.map((fn) => ({ fn, record: r.entry.name })),
    );
  }

  /**
   * Find a record or member's definition location. For records, the rule span takes precedence over
   * the record span.
   *
   * @param name - Record name.
   * @param key - Member key from {@link memberKey}, or `record` (the default) for the record itself.
   * @returns The location, or `undefined` if the record or span is unknown.
   */
  location(name: string, key = "record"): Location | undefined {
    const record = this.byName.get(name);
    if (!record) return undefined;
    let span: SourceSpan | undefined;
    if (key === "record") {
      // For definitions, prefer the rule span; fall back to the main span (which is the doc comment span)
      span = record.ruleSpan ?? record.span;
    } else {
      span = record.memberSpans.get(key);
    }
    return span ? { file: this.file, span } : undefined;
  }

  /** A stable, serializable snapshot. */
  toManifest(): CssDocManifest {
    return { version: 1, file: this.file, entries: this.entries };
  }
}

/**
 * Build an index from a model snapshot (no source spans). `matcher` defaults to BEM when omitted —
 * pass the governing scope's own `index.matcher` when merging in provider/sibling entries, so a
 * non-BEM project's modifier convention (rscss, attribute, …) still applies to the merged index.
 *
 * @param entries - Records to index in the given order.
 * @param file - Optional filename stored in the index and its manifest.
 * @param globalPrecedence - Whether a base or global modifier wins on conflict; defaults to `base`.
 * @param matcher - Modifier matcher for the governing scope; defaults to BEM.
 * @returns An index without source spans or collected custom-property values.
 */
export function indexFromEntries(
  entries: CssDocEntry[],
  file?: string,
  globalPrecedence: "base" | "global" = "base",
  matcher?: ModifierMatcher,
): CssDocIndex {
  const records: RecordInfo[] = entries.map((entry) => ({
    entry,
    memberSpans: new Map(),
    authoredModifiers: new Set(),
    authoredParts: new Map(),
    authoredShadowParts: new Set(),
    authoredModifierLines: new Map(),
    authoredPartLines: new Map(),
    selectorText: "",
    propertyValues: new Map(),
    resetValueUsages: [],
  }));
  return new CssDocIndex(records, file, matcher, new Map(), globalPrecedence);
}

interface Build {
  entry: CssDocEntry;
  span?: SourceSpan;
  docCommentSpan?: SourceSpan;
  ruleSpan?: SourceSpan;
  memberSpans: Map<string, SourceSpan>;
  scopeOccurrences: ScopeOccurrence[];
  mediaOccurrences: MediaOccurrence[];
  containerOccurrences: ContainerOccurrence[];
  supportsOccurrences: SupportsOccurrence[];
  authoredModifiers: Set<string>;
  authoredParts: Map<string, string>;
  authoredShadowParts: Set<string>;
  authoredModifierLines: Map<string, SourceSpan>;
  authoredPartLines: Map<string, SourceSpan>;
  selectorText: string;
  propertyValues: Map<string, Set<string>>;
  resetValueUsages: { property: string; value: string; span?: SourceSpan }[];
}

function containsStyleRule(nodes: readonly ChildNode[], inStyleRule: boolean): boolean {
  return nodes.some((node) => {
    if (node.type === "rule") return true;
    if (node.type === "decl") return inStyleRule;
    if (node.type !== "atrule" || !node.nodes) return false;
    const name = node.name.toLowerCase();
    return (
      name !== "keyframes" &&
      !name.endsWith("-keyframes") &&
      containsStyleRule(node.nodes, inStyleRule)
    );
  });
}

/** Scan a record's nodes for member spans, recording each member's first occurrence. */
function scanNodes(
  nodes: ChildNode[],
  build: Build,
  base: string,
  matcher: ModifierMatcher,
  inStyleRule = false,
): void {
  const customState = toRegExp(CSSDOC_CUSTOM_STATE_SELECTOR);
  const shadowPart = toRegExp(CSSDOC_SHADOW_PART_SELECTOR);
  const pseudo = toRegExp(CSSDOC_SCANNED_PSEUDO_SELECTOR);
  const baseNoDot = stripDot(base);
  const set = (key: string, node: ChildNode): void => {
    const span = spanOf(node);
    if (span && !build.memberSpans.has(key)) build.memberSpans.set(key, span);
  };

  for (const node of nodes) {
    if (node.type === "rule") {
      build.selectorText += ` ${node.selector}`;
      if (`.${stripDot(node.selector.trim())}` === base) {
        // Store the rule span separately for definitions; don't overwrite span which holds docCommentSpan
        build.ruleSpan ??= spanOf(node);
      }
      for (const selector of node.selector.split(",")) {
        for (const s of selector.matchAll(customState)) {
          set(memberKey("state", s[1]), node);
        }
        for (const ps of matcher.pseudoStatesIn(selector)) {
          set(memberKey("state", ps.name), node);
        }
        for (const sp of selector.matchAll(shadowPart)) {
          set(memberKey("shadow-part", sp[1]), node);
        }
        for (const pe of matcher.pseudoElementsIn(selector)) {
          set(memberKey("pseudo-element", pe.name), node);
        }
        const bare = selector.replace(pseudo, "");
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
        for (const p of bare.matchAll(CLASS_REF)) {
          if (modNames.has(p[1])) continue; // a modifier, not a part
          set(memberKey("part", p[1]), node);
        }
      }
      for (const child of node.nodes ?? []) {
        if (child.type !== "decl") continue;
        const property = child.prop.trim();
        const value = child.value.trim();
        const values = build.propertyValues.get(property) ?? new Set<string>();
        values.add(value);
        build.propertyValues.set(property, values);
        if (RESET_VALUE.test(value)) {
          build.resetValueUsages.push({ property, value, span: spanOf(child) });
        }
      }
      if (node.nodes) scanNodes(node.nodes, build, base, matcher, true);
    } else if (node.type === "atrule") {
      const name = node.name.toLowerCase();
      if (
        (name === "scope" || name === "media" || name === "container" || name === "supports") &&
        node.nodes &&
        containsStyleRule(node.nodes, inStyleRule)
      ) {
        const span = spanOf(node);
        const occurrence = { prelude: node.params, ...(span ? { span } : {}) };
        if (name === "scope") build.scopeOccurrences.push(occurrence);
        else if (name === "media") build.mediaOccurrences.push(occurrence);
        else if (name === "container") build.containerOccurrences.push(occurrence);
        else build.supportsOccurrences.push(occurrence);
      }
      if (node.name === "property") set(memberKey("property", node.params.trim()), node);
      else if (node.name === "function") {
        const fn = node.params.trim().match(CUSTOM_FUNCTION);
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
      if (node.nodes) scanNodes(node.nodes, build, base, matcher, inStyleRule);
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
    parse?: (css: string) => ReturnType<typeof parsePostcss>;
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
    fileName: options.file,
  });
  const entryQueues = new Map<string, CssDocEntry[]>();
  for (const entry of entries) {
    const queue = entryQueues.get(entry.name) ?? [];
    queue.push(entry);
    entryQueues.set(entry.name, queue);
  }
  const builds = new Map<CssDocEntry, Build>();

  const root = (options.parse ?? parsePostcss)(css);
  let current: Build | undefined;
  for (const node of root.nodes) {
    if (node.type === "comment" && isCssDocComment(node, css)) {
      const name = recordNameOf(node.toString(), options.configuration);
      const entry = name ? entryQueues.get(name)?.shift() : undefined;
      if (name && entry) {
        const doc = parseDocComment(node.toString(), options.configuration);
        const startLine = spanOf(node)?.start.line ?? 1;
        const { modifierLines, partLines } = scanAuthoredTagLines(node.text, startLine);
        const docSpan = spanOf(node);
        current = {
          entry,
          span: docSpan,
          docCommentSpan: docSpan,
          memberSpans: new Map(),
          scopeOccurrences: [],
          mediaOccurrences: [],
          containerOccurrences: [],
          supportsOccurrences: [],
          authoredModifiers: new Set(doc.modifiers.keys()),
          // name → selector: non-class parts use their explicit selector; class parts use ".${name}".
          authoredParts: new Map(
            [...doc.parts.keys()].map((n) => [n, doc.partSelectors.get(n) ?? `.${n}`]),
          ),
          authoredShadowParts: new Set(doc.cssParts.keys()),
          authoredModifierLines: modifierLines,
          authoredPartLines: partLines,
          selectorText: "",
          propertyValues: new Map(),
          resetValueUsages: [],
        };
        builds.set(entry, current);
        continue;
      }
    }
    if (current) scanNodes([node], current, current.entry.className, matcher);
  }

  const records: RecordInfo[] = entries.map((entry) => {
    const build = builds.get(entry);
    return {
      entry,
      span: build?.span,
      docCommentSpan: build?.docCommentSpan,
      ruleSpan: build?.ruleSpan,
      memberSpans: build?.memberSpans ?? new Map<string, SourceSpan>(),
      ...(build && !options.parse ? { scopeOccurrences: build.scopeOccurrences } : {}),
      ...(build && !options.parse ? { mediaOccurrences: build.mediaOccurrences } : {}),
      ...(build && !options.parse ? { containerOccurrences: build.containerOccurrences } : {}),
      ...(build && !options.parse ? { supportsOccurrences: build.supportsOccurrences } : {}),
      authoredModifiers: build?.authoredModifiers ?? new Set(),
      authoredParts: build?.authoredParts ?? new Map<string, string>(),
      authoredShadowParts: build?.authoredShadowParts ?? new Set(),
      authoredModifierLines: build?.authoredModifierLines ?? new Map<string, SourceSpan>(),
      authoredPartLines: build?.authoredPartLines ?? new Map<string, SourceSpan>(),
      selectorText: build?.selectorText ?? "",
      propertyValues: build?.propertyValues ?? new Map<string, Set<string>>(),
      resetValueUsages: build?.resetValueUsages ?? [],
    };
  });

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

  const globalPrecedence = options.configuration?.globalPrecedence ?? ("base" as const);

  return new CssDocIndex(records, options.file, matcher, customPropertyValues, globalPrecedence);
}

/**
 * Extract custom-property assignments (`--name: value`) and `var(--name, fallback)` references from
 * CSS. Parsing lives here — the CSS-parsing package — so the linters and the language server share one
 * extractor for the value-validation rules.
 *
 * @param css - The CSS source.
 * @param options - An optional CSS parser; defaults to PostCSS.
 * @returns The assignments and `var(…)` usages found.
 */
export function cssValueSites(
  css: string,
  options: { parse?: (css: string) => ReturnType<typeof parsePostcss> } = {},
): CssValueSites {
  const assignments: PropertyAssignment[] = [];
  const usages: PropertyUsage[] = [];
  const root = (options.parse ?? parsePostcss)(css);
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
          comma === -1 ? undefined : valueParser.stringify(node.nodes.slice(comma + 1)).trim();
        usages.push({ name, fallback: fallback || undefined, loc });
      });
    }
  });
  return { assignments, usages };
}
