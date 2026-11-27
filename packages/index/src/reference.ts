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
import { ident, parse, tokenTypes, tokenize } from "css-tree";
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

/** One indexed source and its explicitly assigned portable source key, when available. */
export interface ReferenceSource {
  /** Index whose records are candidates in this source. */
  index: CssDocIndex;
  /** Project-relative or explicitly assigned virtual key; never inferred from an absolute path. */
  sourceKey?: string;
  /** Whether member occurrences are complete, either in the model or the occurrence map. */
  membersComplete?: boolean;
  /**
   * Occurrences for records whose model has collapsed duplicates. When provided, a record missing
   * from this map has unavailable members; use an empty list if it has no named surfaces.
   */
  namedMemberOccurrences?: ReadonlyMap<RecordInfo, readonly NamedMemberOccurrence[]>;
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
  /** Whether this source retains all member occurrences. */
  membersComplete?: boolean;
  /** Named occurrences supplied for this particular record, before deduplication. */
  namedMemberOccurrences?: readonly NamedMemberOccurrence[];
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
          : {
              membersComplete:
                source.membersComplete &&
                (!source.namedMemberOccurrences || source.namedMemberOccurrences.has(record)),
            }),
        ...(source.namedMemberOccurrences?.has(record)
          ? { namedMemberOccurrences: source.namedMemberOccurrences.get(record)! }
          : {}),
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
  if (empty && !input.trim()) return [];
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
  if (!resolution.candidate.membersComplete)
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
