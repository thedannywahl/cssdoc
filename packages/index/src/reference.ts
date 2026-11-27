import type {
  CssAnimation,
  CssDocReference,
  CssFunction,
  CssLayer,
  CssPart,
  CssPropertyDeclared,
  CssSlot,
  CssTokenConsumed,
  ReferenceMemberKind,
} from "@cssdoc/core";
import { ALPHA_UPPER_SOURCE } from "@cssdoc/regex";
import { regex as arkRegex } from "arkregex";
import { generate, ident, parse, tokenTypes, tokenize, walk } from "css-tree";
import type { CssDocIndex, RecordInfo, SourceSpan } from "./index.ts";

type NamedMemberByKind = {
  csspart: CssPart;
  slot: CssSlot;
  property: CssPropertyDeclared;
  token: CssTokenConsumed;
  function: CssFunction;
  keyframes: CssAnimation;
  layer: CssLayer;
};

/** One occurrence of a named surface, before model deduplication. */
export type NamedMemberOccurrence = {
  [K in keyof NamedMemberByKind]: {
    /** Typed surface represented by this occurrence. */
    kind: K;
    /** The surface at this occurrence. */
    member: NamedMemberByKind[K];
    /** Source range of the occurrence, when available. */
    span?: SourceSpan;
  };
}[keyof NamedMemberByKind];

/** A selector-backed surface before model deduplication or documentation aliasing. */
export interface SelectorMemberOccurrence {
  /** Typed surface represented by this occurrence. */
  kind: "modifier" | "part" | "wrapper" | "state" | "pseudo-element";
  /** Original CSS selector identifying the surface. */
  selector: string;
  /** Source range of the occurrence, when available. */
  span?: SourceSpan;
}

/** One indexed source and its explicitly assigned portable source key, when available. */
export interface ReferenceSource {
  /** Index whose records are candidates in this source. */
  index: CssDocIndex;
  /** Project-relative or explicitly assigned virtual key; never inferred from an absolute path. */
  sourceKey?: string;
  /** Whether named member occurrences are complete, either in the model or the occurrence map. */
  membersComplete?: boolean;
  /**
   * Occurrences for records whose model has collapsed duplicates. When provided, a record missing
   * from this map has unavailable members; use an empty list if it has no named surfaces.
   */
  namedMemberOccurrences?: ReadonlyMap<RecordInfo, readonly NamedMemberOccurrence[]>;
  /**
   * Selector occurrences, keyed by the source index's records. An absent record is unavailable,
   * not empty; provide an empty list for a complete record with no selector-backed surfaces.
   */
  selectorMemberOccurrences?: ReadonlyMap<RecordInfo, readonly SelectorMemberOccurrence[]>;
  /** Whether the selector occurrence map contains every relevant occurrence. Defaults to false. */
  selectorMembersComplete?: boolean;
}

/** A lookup scope and whether its candidate set is complete. */
export interface ReferenceLookupScope {
  /** Indexed sources available in this scope. */
  sources: readonly ReferenceSource[];
  /** False if loading or analysis left the candidate set incomplete. */
  complete: boolean;
}

/** Workspace and provider scopes used for reference resolution. */
export interface ReferenceLookup {
  /** Candidate set used by unqualified and local source-qualified references. */
  workspace: ReferenceLookupScope;
  /** Provider candidate sets keyed by the consumer-side provider ID. */
  providers?: ReadonlyMap<string, ReferenceLookupScope>;
}

/** A record candidate with its portable source provenance. */
export interface ReferenceCandidate {
  /** Indexed record, including its source spans where available. */
  record: RecordInfo;
  /** Source key explicitly supplied for its index. */
  sourceKey?: string;
  /** Provider ID for a provider-scoped lookup. */
  providerId?: string;
  /** Whether this source retains all named member occurrences. */
  membersComplete?: boolean;
  /** Named occurrences supplied for this particular record, before deduplication. */
  namedMemberOccurrences?: readonly NamedMemberOccurrence[];
  /** Whether a supplied named-occurrence map contains this record. */
  namedMembersAvailable?: boolean;
  /** Selector occurrences supplied for this particular record. */
  selectorMemberOccurrences?: readonly SelectorMemberOccurrence[];
  /** Whether the selector occurrences are complete. */
  selectorMembersComplete?: boolean;
}

/** Result of resolving the record portion of a reference. */
export type RecordReferenceResolution =
  | { status: "resolved"; candidate: ReferenceCandidate }
  | { status: "missing" }
  | { status: "ambiguous"; candidates: readonly ReferenceCandidate[] }
  | { status: "unavailable"; candidates: readonly ReferenceCandidate[] };

/**
 * Resolve a reference's record identity without discarding duplicates.
 *
 * This resolves only the record portion; callers must separately resolve any typed member. An
 * incomplete or absent required scope is unavailable even when its known candidates appear unique.
 * A source-qualified lookup is also unavailable when a matching record lacks a source key.
 *
 * @param reference - Parsed record reference.
 * @param lookup - Explicit source provenance and scope completeness.
 * @returns A unique record, missing or ambiguous candidates, or an unavailable scope.
 */
export function resolveRecordReference(
  reference: CssDocReference,
  lookup: ReferenceLookup,
): RecordReferenceResolution {
  const providerId = reference.scope.kind === "provider" ? reference.scope.providerId : undefined;
  const scope = providerId === undefined ? lookup.workspace : lookup.providers?.get(providerId);
  if (!scope) return { status: "unavailable", candidates: [] };
  const sourceKey = reference.scope.kind === "workspace" ? undefined : reference.scope.sourceKey;
  const candidates: ReferenceCandidate[] = [];
  let unknownSource = false;
  for (const source of scope.sources) {
    if (sourceKey !== undefined && source.sourceKey !== undefined && source.sourceKey !== sourceKey)
      continue;
    for (const record of source.index.records) {
      if (record.entry.name !== reference.name) continue;
      if (reference.kind !== undefined && record.entry.kind !== reference.kind) continue;
      if (sourceKey !== undefined && source.sourceKey === undefined) unknownSource = true;
      candidates.push({
        record,
        ...(source.sourceKey === undefined ? {} : { sourceKey: source.sourceKey }),
        ...(providerId === undefined ? {} : { providerId }),
        ...(source.membersComplete === undefined
          ? {}
          : { membersComplete: source.membersComplete }),
        ...(source.namedMemberOccurrences
          ? { namedMembersAvailable: source.namedMemberOccurrences.has(record) }
          : {}),
        ...(source.namedMemberOccurrences?.has(record)
          ? { namedMemberOccurrences: source.namedMemberOccurrences.get(record)! }
          : {}),
        ...(source.selectorMemberOccurrences?.has(record)
          ? { selectorMemberOccurrences: source.selectorMemberOccurrences.get(record)! }
          : {}),
        ...(source.selectorMembersComplete === undefined
          ? {}
          : { selectorMembersComplete: source.selectorMembersComplete }),
      });
    }
  }
  if (!scope.complete || unknownSource) return { status: "unavailable", candidates };
  if (candidates.length === 0) return { status: "missing" };
  if (candidates.length > 1) return { status: "ambiguous", candidates };
  return { status: "resolved", candidate: candidates[0] };
}

/** One named member and the record that owns it. */
export interface NamedMemberCandidate {
  /** Owning record and its source provenance. */
  record: ReferenceCandidate;
  /** Member type from the authored reference. */
  kind: ReferenceMemberKind;
  /** The matching modeled surface. */
  member:
    | CssPart
    | CssSlot
    | CssPropertyDeclared
    | CssTokenConsumed
    | CssFunction
    | CssAnimation
    | CssLayer;
  /** Source range of this occurrence, when supplied. */
  span?: SourceSpan;
}

/** Resolution of the named-member forms supported by {@link resolveNamedMemberReference}. */
export type NamedMemberResolution =
  | { status: "resolved"; candidate: NamedMemberCandidate }
  | { status: "missing" }
  | { status: "ambiguous"; stage: "record"; candidates: readonly ReferenceCandidate[] }
  | { status: "ambiguous"; stage: "member"; candidates: readonly NamedMemberCandidate[] }
  | { status: "unavailable"; candidates: readonly ReferenceCandidate[] }
  | { status: "invalid-subject" };

function identifierKey(input: string, layer: boolean, empty: boolean): string[] | undefined {
  if (empty) {
    let hasToken = false;
    tokenize(input, (type) => {
      if (type !== tokenTypes.Comment && type !== tokenTypes.WhiteSpace) hasToken = true;
    });
    if (!hasToken) return [];
  }
  try {
    const ast = parse(input, {
      context: layer ? "atrulePrelude" : "value",
      ...(layer ? { atrule: "layer" } : {}),
      onParseError(error) {
        throw error;
      },
    });
    if (layer) {
      if (ast.type !== "AtrulePrelude" || ast.children.size !== 1) return undefined;
      const list = ast.children.first;
      if (list?.type !== "LayerList" || list.children.size !== 1) return undefined;
    } else if (
      ast.type !== "Value" ||
      ast.children.size !== 1 ||
      ast.children.first?.type !== "Identifier"
    ) {
      return undefined;
    }
    const parts: string[] = [];
    let expectingName = true;
    let invalid = false;
    tokenize(input, (type, start, end) => {
      if (type === tokenTypes.Comment || type === tokenTypes.WhiteSpace) return;
      if (expectingName && type === tokenTypes.Ident) {
        parts.push(ident.decode(input.slice(start, end)));
        expectingName = false;
      } else if (!expectingName && layer && type === tokenTypes.Delim && input[start] === ".") {
        expectingName = true;
      } else {
        invalid = true;
      }
    });
    return !invalid && !expectingName ? parts : undefined;
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}

/**
 * Resolve a named typed member when its owning source retains all member occurrences.
 *
 * Selector and at-rule-prelude members aren't supported by this function. A source must establish
 * occurrence completeness, either in the model or in its supplied named-occurrence list.
 *
 * @param reference - A parsed reference with a typed member.
 * @param lookup - Explicit source provenance and completeness.
 * @returns A resolved member, missing or ambiguous candidates, an invalid subject, or unavailable.
 */
export function resolveNamedMemberReference(
  reference: CssDocReference,
  lookup: ReferenceLookup,
): NamedMemberResolution {
  const member = reference.member;
  if (!member) return { status: "unavailable", candidates: [] };
  const { kind, subject } = member;
  const supported = ["csspart", "slot", "property", "token", "function", "keyframes", "layer"];
  if (!supported.includes(kind)) return { status: "unavailable", candidates: [] };
  const key = identifierKey(subject, kind === "layer", kind === "slot");
  if (key === undefined) return { status: "invalid-subject" };
  if (
    (kind === "property" || kind === "token" || kind === "function") &&
    (!key[0].startsWith("--") || key[0].length <= 2)
  )
    return { status: "invalid-subject" };
  const resolution = resolveRecordReference(reference, lookup);
  if (resolution.status === "missing") return { status: "missing" };
  if (resolution.status === "ambiguous")
    return { status: "ambiguous", stage: "record", candidates: resolution.candidates };
  if (resolution.status === "unavailable") return resolution;
  if (!resolution.candidate.membersComplete || resolution.candidate.namedMembersAvailable === false)
    return { status: "unavailable", candidates: [resolution.candidate] };
  const record = resolution.candidate;
  const entry = record.record.entry;
  const members: readonly { member: NamedMemberCandidate["member"]; span?: SourceSpan }[] =
    record.namedMemberOccurrences
      ? record.namedMemberOccurrences.filter((occurrence) => occurrence.kind === kind)
      : (kind === "csspart"
          ? entry.shadowParts
          : kind === "slot"
            ? entry.slots
            : kind === "property"
              ? entry.cssPropertiesDeclared
              : kind === "token"
                ? entry.cssPropertiesConsumed
                : kind === "function"
                  ? entry.functions
                  : kind === "keyframes"
                    ? entry.animations
                    : entry.layers
        ).map((candidate) => ({ member: candidate }));
  const candidates: NamedMemberCandidate[] = [];
  for (const occurrence of members) {
    const candidateKey = identifierKey(occurrence.member.name, kind === "layer", kind === "slot");
    if (candidateKey === undefined) return { status: "unavailable", candidates: [record] };
    if (JSON.stringify(candidateKey) === JSON.stringify(key))
      candidates.push({
        record,
        kind,
        member: occurrence.member,
        ...(occurrence.span ? { span: occurrence.span } : {}),
      });
  }
  if (candidates.length === 0) return { status: "missing" };
  if (candidates.length > 1) return { status: "ambiguous", stage: "member", candidates };
  return { status: "resolved", candidate: candidates[0] };
}

/** One selector-backed occurrence and its owning record. */
export interface SelectorMemberCandidate {
  /** Owning record and its source provenance. */
  record: ReferenceCandidate;
  /** The original, occurrence-preserving selector surface. */
  occurrence: SelectorMemberOccurrence;
}

/** Resolution of a selector-backed member reference. */
export type SelectorMemberResolution =
  | { status: "resolved"; candidate: SelectorMemberCandidate }
  | { status: "missing" }
  | { status: "ambiguous"; stage: "record"; candidates: readonly ReferenceCandidate[] }
  | { status: "ambiguous"; stage: "member"; candidates: readonly SelectorMemberCandidate[] }
  | { status: "unavailable"; candidates: readonly ReferenceCandidate[] }
  | { status: "invalid-subject" };

type SelectorKey =
  | { status: "valid"; key: string }
  | { status: "invalid" }
  | { status: "unsupported" };

const ASCII_UPPER = arkRegex.as(ALPHA_UPPER_SOURCE, "gu");
const asciiLower = (text: string): string =>
  text.replace(ASCII_UPPER, (char) => char.toLowerCase());

function selectorKey(input: string, kind: SelectorMemberOccurrence["kind"]): SelectorKey {
  try {
    const ast = parse(input, {
      context: "selector",
      onParseError(error) {
        throw error;
      },
    });
    if (ast.type !== "Selector" || ast.children.size === 0) return { status: "invalid" };
    const first = ast.children.first;
    if (
      kind === "pseudo-element" &&
      (ast.children.size !== 1 || first?.type !== "PseudoElementSelector" || first.children)
    )
      return { status: "invalid" };
    if (
      kind === "state" &&
      (ast.children.size !== 1 ||
        (first?.type !== "ClassSelector" &&
          first?.type !== "AttributeSelector" &&
          first?.type !== "PseudoClassSelector"))
    )
      return { status: "invalid" };

    let unsupported = false;
    let invalid = false;
    const normalizedRaw = new Set<object>();
    walk(ast, (node) => {
      if (node.type === "PseudoClassSelector" && asciiLower(ident.decode(node.name)) === "state") {
        const raw = node.children?.first;
        if (node.children?.size !== 1 || raw?.type !== "Raw") {
          invalid = true;
        } else {
          const value = identifierKey(raw.value, false, false);
          if (!value) invalid = true;
          else {
            raw.value = ident.encode(value[0]);
            normalizedRaw.add(raw);
          }
        }
      }
      if (
        node.type === "ClassSelector" ||
        node.type === "IdSelector" ||
        node.type === "PseudoClassSelector" ||
        node.type === "PseudoElementSelector"
      ) {
        const name = ident.decode(node.name);
        node.name = ident.encode(
          node.type === "PseudoClassSelector" || node.type === "PseudoElementSelector"
            ? asciiLower(name)
            : name,
        );
      } else if (node.type === "Identifier") {
        if (node.name.includes("|")) unsupported = true;
        else node.name = ident.encode(ident.decode(node.name));
      } else if (node.type === "TypeSelector") {
        if (node.name.includes("\\") || node.name.includes("|")) unsupported = true;
      } else if (node.type === "AttributeSelector") {
        if (node.value?.type === "Identifier")
          node.value = { type: "String", value: ident.decode(node.value.name) };
        if (node.flags) node.flags = asciiLower(node.flags);
        if (node.flags === "i" && node.value?.type === "String")
          node.value.value = asciiLower(node.value.value);
      } else if (node.type === "Raw" && !normalizedRaw.has(node)) {
        unsupported = true;
      }
    });
    if (invalid) return { status: "invalid" };
    if (unsupported) return { status: "unsupported" };
    return { status: "valid", key: generate(ast) };
  } catch (error) {
    if (error instanceof SyntaxError) return { status: "invalid" };
    throw error;
  }
}

/**
 * Resolve a selector surface from explicit, complete occurrences rather than derived model names.
 *
 * Unsupported CSS parser forms and unavailable occurrences produce an unavailable result rather
 * than guessing whether a selector is absent or unique.
 *
 * @param reference - A parsed reference with a selector-backed typed member.
 * @param lookup - Explicit source provenance, completeness, and occurrence lists.
 * @returns A resolved surface, missing or ambiguous candidates, an invalid subject, or unavailable.
 */
export function resolveSelectorMemberReference(
  reference: CssDocReference,
  lookup: ReferenceLookup,
): SelectorMemberResolution {
  const member = reference.member;
  if (
    !member ||
    (member.kind !== "modifier" &&
      member.kind !== "part" &&
      member.kind !== "wrapper" &&
      member.kind !== "state" &&
      member.kind !== "pseudo-element")
  )
    return { status: "unavailable", candidates: [] };
  const key = selectorKey(member.subject, member.kind);
  if (key.status === "invalid") return { status: "invalid-subject" };
  if (key.status === "unsupported") return { status: "unavailable", candidates: [] };
  const resolution = resolveRecordReference(reference, lookup);
  if (resolution.status === "missing") return { status: "missing" };
  if (resolution.status === "ambiguous")
    return { status: "ambiguous", stage: "record", candidates: resolution.candidates };
  if (resolution.status === "unavailable") return resolution;
  const record = resolution.candidate;
  if (!record.selectorMembersComplete || !record.selectorMemberOccurrences)
    return { status: "unavailable", candidates: [record] };
  const candidates: SelectorMemberCandidate[] = [];
  for (const occurrence of record.selectorMemberOccurrences) {
    if (occurrence.kind !== member.kind) continue;
    const candidateKey = selectorKey(occurrence.selector, occurrence.kind);
    if (candidateKey.status !== "valid") return { status: "unavailable", candidates: [record] };
    if (candidateKey.key === key.key) candidates.push({ record, occurrence });
  }
  if (candidates.length === 0) return { status: "missing" };
  if (candidates.length > 1) return { status: "ambiguous", stage: "member", candidates };
  return { status: "resolved", candidate: candidates[0] };
}
