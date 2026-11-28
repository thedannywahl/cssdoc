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
import {
  generate,
  ident,
  parse,
  tokenTypes,
  tokenize,
  walk,
  type Condition,
  type Identifier,
  type StringNode,
} from "css-tree";

import type {
  ContainerOccurrence,
  CssDocIndex,
  MediaOccurrence,
  RecordInfo,
  ScopeOccurrence,
  SourceSpan,
  SupportsOccurrence,
} from "./index.ts";

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
  | {
      /** Exactly one record matches in a complete lookup scope. */
      status: "resolved";
      /** Matching record and its source provenance. */
      candidate: ReferenceCandidate;
    }
  | {
      /** No record matches in a complete lookup scope. */
      status: "missing";
    }
  | {
      /** Multiple records match in a complete lookup scope. */
      status: "ambiguous";
      /** Matching records retained without deduplication. */
      candidates: readonly ReferenceCandidate[];
    }
  | {
      /** The required scope or source provenance is incomplete. */
      status: "unavailable";
      /** Known record candidates; their uniqueness cannot be established. */
      candidates: readonly ReferenceCandidate[];
    };

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
    if (
      sourceKey !== undefined &&
      source.sourceKey !== undefined &&
      source.sourceKey !== sourceKey
    ) {
      continue;
    }
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
  | {
      /** Exactly one named-member occurrence matches. */
      status: "resolved";
      /** Matching named member and its owning record. */
      candidate: NamedMemberCandidate;
    }
  | {
      /** No record or named member matches in a complete lookup. */
      status: "missing";
    }
  | {
      /** Multiple records match before member lookup. */
      status: "ambiguous";
      /** Record identity caused the ambiguity. */
      stage: "record";
      /** Matching records retained without deduplication. */
      candidates: readonly ReferenceCandidate[];
    }
  | {
      /** Multiple named-member occurrences match in one record. */
      status: "ambiguous";
      /** Member occurrences caused the ambiguity. */
      stage: "member";
      /** Matching named-member occurrences retained without deduplication. */
      candidates: readonly NamedMemberCandidate[];
    }
  | {
      /** Required records or named-member occurrences are incomplete or unsupported. */
      status: "unavailable";
      /** Known records whose member lookup could not be completed. */
      candidates: readonly ReferenceCandidate[];
    }
  | {
      /** The authored subject is invalid for the requested named-member type. */
      status: "invalid-subject";
    };

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
  const { member } = reference;
  if (!member) return { status: "unavailable", candidates: [] };
  const { kind, subject } = member;
  const supported = ["csspart", "slot", "property", "token", "function", "keyframes", "layer"];
  if (!supported.includes(kind)) return { status: "unavailable", candidates: [] };
  const key = identifierKey(subject, kind === "layer", kind === "slot");
  if (key === undefined) return { status: "invalid-subject" };
  if (
    (kind === "property" || kind === "token" || kind === "function") &&
    (!key[0].startsWith("--") || key[0].length <= 2)
  ) {
    return { status: "invalid-subject" };
  }
  const resolution = resolveRecordReference(reference, lookup);
  if (resolution.status === "missing") return { status: "missing" };
  if (resolution.status === "ambiguous") {
    return { status: "ambiguous", stage: "record", candidates: resolution.candidates };
  }
  if (resolution.status === "unavailable") return resolution;
  if (
    !resolution.candidate.membersComplete ||
    resolution.candidate.namedMembersAvailable === false
  ) {
    return { status: "unavailable", candidates: [resolution.candidate] };
  }
  const record = resolution.candidate;
  const { entry } = record.record;
  const members: ReadonlyArray<{ member: NamedMemberCandidate["member"]; span?: SourceSpan }> =
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
    if (JSON.stringify(candidateKey) === JSON.stringify(key)) {
      candidates.push({
        record,
        kind,
        member: occurrence.member,
        ...(occurrence.span ? { span: occurrence.span } : {}),
      });
    }
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
  | {
      /** Exactly one selector-backed occurrence matches. */
      status: "resolved";
      /** Matching selector occurrence and its owning record. */
      candidate: SelectorMemberCandidate;
    }
  | {
      /** No record or selector occurrence matches in a complete lookup. */
      status: "missing";
    }
  | {
      /** Multiple records match before member lookup. */
      status: "ambiguous";
      /** Record identity caused the ambiguity. */
      stage: "record";
      /** Matching records retained without deduplication. */
      candidates: readonly ReferenceCandidate[];
    }
  | {
      /** Multiple selector-backed occurrences match in one record. */
      status: "ambiguous";
      /** Member occurrences caused the ambiguity. */
      stage: "member";
      /** Matching selector occurrences retained without deduplication. */
      candidates: readonly SelectorMemberCandidate[];
    }
  | {
      /** Required records, selector occurrences, or selector syntax are unavailable. */
      status: "unavailable";
      /** Known records whose member lookup could not be completed. */
      candidates: readonly ReferenceCandidate[];
    }
  | {
      /** The authored subject is not a valid selector for the requested member type. */
      status: "invalid-subject";
    };

type SelectorKey =
  | { status: "valid"; key: string }
  | { status: "invalid" }
  | { status: "unsupported" };

const ASCII_UPPER = /[A-Z]/gu;
const asciiLower = (text: string): string =>
  text.replaceAll(ASCII_UPPER, (char) => char.toLowerCase());

function selectorKey(input: string, kind: SelectorMemberOccurrence["kind"]): SelectorKey {
  try {
    const ast = parse(input, {
      context: "selector",
      onParseError(error) {
        throw error;
      },
    });
    if (ast.type !== "Selector" || ast.children.size === 0) return { status: "invalid" };
    const { first } = ast.children;
    if (
      kind === "pseudo-element" &&
      (ast.children.size !== 1 || first?.type !== "PseudoElementSelector" || first.children)
    ) {
      return { status: "invalid" };
    }
    if (
      kind === "state" &&
      (ast.children.size !== 1 ||
        (first?.type !== "ClassSelector" &&
          first?.type !== "AttributeSelector" &&
          first?.type !== "PseudoClassSelector"))
    ) {
      return { status: "invalid" };
    }

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
          if (value) {
            raw.value = ident.encode(value[0]);
            normalizedRaw.add(raw);
          } else {
            invalid = true;
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
        if (node.value?.type === "Identifier") {
          node.value = { type: "String", value: ident.decode(node.value.name) };
        }
        if (node.flags) node.flags = asciiLower(node.flags);
        if (node.flags === "i" && node.value?.type === "String") {
          node.value.value = asciiLower(node.value.value);
        }
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
  const { member } = reference;
  if (
    !member ||
    (member.kind !== "modifier" &&
      member.kind !== "part" &&
      member.kind !== "wrapper" &&
      member.kind !== "state" &&
      member.kind !== "pseudo-element")
  ) {
    return { status: "unavailable", candidates: [] };
  }
  const key = selectorKey(member.subject, member.kind);
  if (key.status === "invalid") return { status: "invalid-subject" };
  if (key.status === "unsupported") return { status: "unavailable", candidates: [] };
  const resolution = resolveRecordReference(reference, lookup);
  if (resolution.status === "missing") return { status: "missing" };
  if (resolution.status === "ambiguous") {
    return { status: "ambiguous", stage: "record", candidates: resolution.candidates };
  }
  if (resolution.status === "unavailable") return resolution;
  const record = resolution.candidate;
  if (!record.selectorMembersComplete || !record.selectorMemberOccurrences) {
    return { status: "unavailable", candidates: [record] };
  }
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

/** One CSS `@scope` occurrence and its owning record. */
export interface ScopeMemberCandidate {
  /** Owning record and its source provenance. */
  record: ReferenceCandidate;
  /** Source occurrence of the CSS scope. */
  occurrence: ScopeOccurrence;
}

/** Resolution of a CSS scope member reference. */
export type ScopeMemberResolution =
  | {
      /** Exactly one CSS scope occurrence matches. */
      status: "resolved";
      /** Matching scope occurrence and its owning record. */
      candidate: ScopeMemberCandidate;
    }
  | {
      /** No record or scope occurrence matches in a complete lookup. */
      status: "missing";
    }
  | {
      /** Multiple records match before member lookup. */
      status: "ambiguous";
      /** Record identity caused the ambiguity. */
      stage: "record";
      /** Matching records retained without deduplication. */
      candidates: readonly ReferenceCandidate[];
    }
  | {
      /** Multiple scope occurrences match in one record. */
      status: "ambiguous";
      /** Member occurrences caused the ambiguity. */
      stage: "member";
      /** Matching scope occurrences retained without deduplication. */
      candidates: readonly ScopeMemberCandidate[];
    }
  | {
      /** Required records, scope occurrences, or scope syntax are unavailable. */
      status: "unavailable";
      /** Known records whose member lookup could not be completed. */
      candidates: readonly ReferenceCandidate[];
    }
  | {
      /** The authored subject is not a valid CSS scope prelude. */
      status: "invalid-subject";
    };

function scopeKey(input: string): SelectorKey {
  try {
    const ast = parse(input, {
      context: "atrulePrelude",
      atrule: "scope",
      onParseError(error) {
        throw error;
      },
    });
    if (ast.type !== "AtrulePrelude" || ast.children.size !== 1) return { status: "invalid" };
    const scope = ast.children.first;
    if (scope?.type !== "Scope") return { status: "unsupported" };
    const components: Array<string[] | null> = [];
    for (const list of [scope.root, scope.limit]) {
      if (!list) {
        components.push(null);
        continue;
      }
      if (list.type !== "SelectorList") return { status: "unsupported" };
      const selectors: string[] = [];
      for (const selector of list.children) {
        if (selector.type !== "Selector") return { status: "unsupported" };
        const key = selectorKey(generate(selector), "part");
        if (key.status !== "valid") return key;
        selectors.push(key.key);
      }
      components.push(selectors);
    }
    return { status: "valid", key: JSON.stringify(components) };
  } catch (error) {
    if (error instanceof SyntaxError) return { status: "invalid" };
    throw error;
  }
}

/**
 * Resolve a CSS scope using occurrences collected from the record's owned rules.
 *
 * A model-only index has no scope occurrence data and returns unavailable.
 *
 * @param reference - A parsed reference with a `scope(...)` member.
 * @param lookup - Explicit source provenance and scope completeness.
 * @returns A resolved scope, missing or ambiguous candidates, an invalid subject, or unavailable.
 */
export function resolveScopeMemberReference(
  reference: CssDocReference,
  lookup: ReferenceLookup,
): ScopeMemberResolution {
  if (reference.member?.kind !== "scope") return { status: "unavailable", candidates: [] };
  const key = scopeKey(reference.member.subject);
  if (key.status === "invalid") return { status: "invalid-subject" };
  if (key.status === "unsupported") return { status: "unavailable", candidates: [] };
  const resolution = resolveRecordReference(reference, lookup);
  if (resolution.status === "missing") return { status: "missing" };
  if (resolution.status === "ambiguous") {
    return { status: "ambiguous", stage: "record", candidates: resolution.candidates };
  }
  if (resolution.status === "unavailable") return resolution;
  const record = resolution.candidate;
  const occurrences = record.record.scopeOccurrences;
  if (!occurrences) return { status: "unavailable", candidates: [record] };
  const candidates: ScopeMemberCandidate[] = [];
  for (const occurrence of occurrences) {
    const candidateKey = scopeKey(occurrence.prelude);
    if (candidateKey.status !== "valid") return { status: "unavailable", candidates: [record] };
    if (candidateKey.key === key.key) candidates.push({ record, occurrence });
  }
  if (candidates.length === 0) return { status: "missing" };
  if (candidates.length > 1) return { status: "ambiguous", stage: "member", candidates };
  return { status: "resolved", candidate: candidates[0] };
}

/** One CSS `@media` occurrence and its owning record. */
export interface MediaMemberCandidate {
  /** Owning record and its source provenance. */
  record: ReferenceCandidate;
  /** Source occurrence of the CSS media rule. */
  occurrence: MediaOccurrence;
}

/** Resolution of a CSS media member reference. */
export type MediaMemberResolution =
  | {
      /** Exactly one CSS media occurrence matches. */
      status: "resolved";
      /** Matching media occurrence and its owning record. */
      candidate: MediaMemberCandidate;
    }
  | {
      /** No record or media occurrence matches in a complete lookup. */
      status: "missing";
    }
  | {
      /** Multiple records match before member lookup. */
      status: "ambiguous";
      /** Record identity caused the ambiguity. */
      stage: "record";
      /** Matching records retained without deduplication. */
      candidates: readonly ReferenceCandidate[];
    }
  | {
      /** Multiple media occurrences match in one record. */
      status: "ambiguous";
      /** Member occurrences caused the ambiguity. */
      stage: "member";
      /** Matching media occurrences retained without deduplication. */
      candidates: readonly MediaMemberCandidate[];
    }
  | {
      /** Required records, media occurrences, or media syntax are unavailable. */
      status: "unavailable";
      /** Known records whose member lookup could not be completed. */
      candidates: readonly ReferenceCandidate[];
    }
  | {
      /** The authored subject is not a valid CSS media prelude. */
      status: "invalid-subject";
    };

/** One CSS `@container` occurrence and its owning record. */
export interface ContainerMemberCandidate {
  /** Owning record and its source provenance. */
  record: ReferenceCandidate;
  /** Source occurrence of the CSS container rule. */
  occurrence: ContainerOccurrence;
}

/** Resolution of a CSS container member reference. */
export type ContainerMemberResolution =
  | {
      /** Exactly one CSS container occurrence matches. */
      status: "resolved";
      /** Matching container occurrence and its owning record. */
      candidate: ContainerMemberCandidate;
    }
  | {
      /** No record or container occurrence matches in a complete lookup. */
      status: "missing";
    }
  | {
      /** Multiple records match before member lookup. */
      status: "ambiguous";
      /** Record identity caused the ambiguity. */
      stage: "record";
      /** Matching records retained without deduplication. */
      candidates: readonly ReferenceCandidate[];
    }
  | {
      /** Multiple container occurrences match in one record. */
      status: "ambiguous";
      /** Member occurrences caused the ambiguity. */
      stage: "member";
      /** Matching container occurrences retained without deduplication. */
      candidates: readonly ContainerMemberCandidate[];
    }
  | {
      /** Required records, container occurrences, or container syntax are unavailable. */
      status: "unavailable";
      /** Known records whose member lookup could not be completed. */
      candidates: readonly ReferenceCandidate[];
    }
  | {
      /** The authored subject is not a valid CSS container prelude. */
      status: "invalid-subject";
    };

/** One CSS `@supports` occurrence and its owning record. */
export interface SupportsMemberCandidate {
  /** Owning record and its source provenance. */
  record: ReferenceCandidate;
  /** Source occurrence of the CSS supports rule. */
  occurrence: SupportsOccurrence;
}

/** Resolution of a CSS supports member reference. */
export type SupportsMemberResolution =
  | {
      /** Exactly one CSS supports occurrence matches. */
      status: "resolved";
      /** Matching supports occurrence and its owning record. */
      candidate: SupportsMemberCandidate;
    }
  | {
      /** No record or supports occurrence matches in a complete lookup. */
      status: "missing";
    }
  | {
      /** Multiple records match before member lookup. */
      status: "ambiguous";
      /** Record identity caused the ambiguity. */
      stage: "record";
      /** Matching records retained without deduplication. */
      candidates: readonly ReferenceCandidate[];
    }
  | {
      /** Multiple supports occurrences match in one record. */
      status: "ambiguous";
      /** Member occurrences caused the ambiguity. */
      stage: "member";
      /** Matching supports occurrences retained without deduplication. */
      candidates: readonly SupportsMemberCandidate[];
    }
  | {
      /** Required records, supports occurrences, or supports syntax are unavailable. */
      status: "unavailable";
      /** Known records whose member lookup could not be completed. */
      candidates: readonly ReferenceCandidate[];
    }
  | {
      /** The authored subject is not a valid CSS supports prelude. */
      status: "invalid-subject";
    };

function canonicalCssNumber(text: string): string | undefined {
  const negative = text.startsWith("-");
  const unsigned = text.startsWith("-") || text.startsWith("+") ? text.slice(1) : text;
  const exponentAt = unsigned.toLowerCase().indexOf("e");
  const mantissa = exponentAt === -1 ? unsigned : unsigned.slice(0, exponentAt);
  const rawExponent = exponentAt === -1 ? "0" : unsigned.slice(exponentAt + 1);
  if (rawExponent.length > 1000) return undefined;
  const dot = mantissa.indexOf(".");
  const fractionLength = dot === -1 ? 0 : mantissa.length - dot - 1;
  const digits = dot === -1 ? mantissa : mantissa.slice(0, dot) + mantissa.slice(dot + 1);
  let start = 0;
  while (start < digits.length && digits[start] === "0") start++;
  if (start === digits.length) return "0";
  let end = digits.length;
  while (digits[end - 1] === "0") end--;
  const exponent = BigInt(rawExponent) - BigInt(fractionLength) + BigInt(digits.length - end);
  return `${negative ? "-" : ""}${digits.slice(start, end)}e${exponent}`;
}

function numberTokenType(text: string): "integer" | "number" {
  return text.includes(".") || text.toLowerCase().includes("e") ? "number" : "integer";
}

function validQueryCondition(condition: Condition): boolean {
  const children = condition.children.toArray();
  const operator = (index: number): string | undefined => {
    const node = children[index];
    return node?.type === "Identifier" ? asciiLower(ident.decode(node.name)) : undefined;
  };
  if (operator(0) === "not") return children.length === 2 && operator(1) === undefined;
  if (children.length === 0 || children.length % 2 === 0) return false;
  let connector: string | undefined;
  for (let i = 0; i < children.length; i++) {
    const value = operator(i);
    if (i % 2 === 0) {
      if (value !== undefined) return false;
    } else {
      if (value !== "and" && value !== "or") return false;
      if (connector && connector !== value) return false;
      connector = value;
    }
  }
  return true;
}

function classifyQueryCondition(
  condition: Condition,
  nestedConditions: Set<Condition>,
): "valid" | "invalid" | "unsupported" {
  for (const child of condition.children) {
    if (child.type === "Condition") nestedConditions.add(child);
  }
  if (validQueryCondition(condition)) return "valid";
  if (nestedConditions.has(condition) && condition.children.first?.type === "Identifier") {
    return "unsupported";
  }
  return "invalid";
}

function hasNestedQuery(input: string): boolean {
  let depth = 0;
  let nested = false;
  tokenize(input, (type) => {
    if (type === tokenTypes.LeftParenthesis || type === tokenTypes.Function) {
      depth++;
      if (depth > 1) nested = true;
    } else if (type === tokenTypes.RightParenthesis) {
      depth--;
    }
  });
  return nested;
}

function mayBeGeneralEnclosed(input: string): boolean {
  let afterOpening = false;
  let possible = false;
  tokenize(input, (type) => {
    if (type === tokenTypes.Comment || type === tokenTypes.WhiteSpace) return;
    if (type === tokenTypes.Function || (afterOpening && type === tokenTypes.Ident)) {
      possible = true;
    }
    afterOpening = type === tokenTypes.LeftParenthesis;
  });
  return possible;
}

type SupportsKey =
  | { status: "valid"; key: string; caseFoldedKey: string }
  | { status: "invalid" }
  | { status: "unsupported" };

function supportsKey(input: string): SupportsKey {
  try {
    // Nested conditions use css-tree's recovery path; validate the resulting nodes below.
    const ast = parse(input, {
      context: "atrulePrelude",
      atrule: "supports",
    });
    if (ast.type !== "AtrulePrelude" || ast.children.size !== 1) return { status: "invalid" };
    const condition = ast.children.first;
    if (condition?.type !== "Condition") return { status: "unsupported" };

    let invalid = false;
    let unsupported = false;
    const valueIdentifiers: Identifier[] = [];
    const valueStrings: StringNode[] = [];
    const numberTypes: string[] = [];
    const operators = new Set<Identifier>();
    const nestedConditions = new Set<Condition>();
    walk(ast, (node) => {
      switch (node.type) {
        case "Condition": {
          const status = classifyQueryCondition(node, nestedConditions);
          if (status === "invalid") invalid = true;
          else if (status === "unsupported") unsupported = true;
          for (const child of node.children) {
            if (child.type === "Identifier") operators.add(child);
          }
          break;
        }
        case "FeatureFunction": {
          if (
            asciiLower(ident.decode(node.feature)) !== "selector" ||
            node.value.type !== "Selector"
          ) {
            unsupported = true;
            return walk.skip;
          }
          const selector = selectorKey(generate(node.value), "part");
          if (selector.status !== "valid") {
            unsupported = true;
            return walk.skip;
          }
          const normalized = parse(selector.key, { context: "selector" });
          if (normalized.type !== "Selector") {
            unsupported = true;
            return walk.skip;
          }
          node.feature = "selector";
          node.value = normalized;
          return walk.skip;
        }
        case "GeneralEnclosed":
          if (mayBeGeneralEnclosed(generate(node))) unsupported = true;
          else invalid = true;
          return walk.skip;
        case "Declaration": {
          const property = ident.decode(node.property);
          if (property.startsWith("--")) unsupported = true;
          node.property = ident.encode(asciiLower(property));
          break;
        }
        case "Identifier":
          node.name = ident.encode(ident.decode(node.name));
          if (operators.has(node)) node.name = ident.encode(asciiLower(ident.decode(node.name)));
          else valueIdentifiers.push(node);
          break;
        case "String":
          valueStrings.push(node);
          break;
        case "Dimension":
        case "Number":
        case "Percentage": {
          if (node.type === "Dimension") {
            node.unit = ident.encode(asciiLower(ident.decode(node.unit)));
          }
          if (node.type === "Number") numberTypes.push(numberTokenType(node.value));
          const value = canonicalCssNumber(node.value);
          if (value === undefined) unsupported = true;
          else node.value = value;
          break;
        }
        case "AtrulePrelude":
        case "SupportsDeclaration":
        case "Value":
        case "Operator":
          break;
        default:
          unsupported = true;
      }
      return undefined;
    });
    if (invalid) return { status: "invalid" };
    if (unsupported) return { status: "unsupported" };
    const key = JSON.stringify([generate(ast), numberTypes]);
    for (const node of valueIdentifiers) {
      node.name = ident.encode(asciiLower(ident.decode(node.name)));
    }
    for (const node of valueStrings) node.value = asciiLower(node.value);
    return { status: "valid", key, caseFoldedKey: generate(ast) };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        status: hasNestedQuery(input) || mayBeGeneralEnclosed(input) ? "unsupported" : "invalid",
      };
    }
    throw error;
  }
}

type QueryKey =
  | { status: "valid"; key: string; numericKey: string; opaque: boolean }
  | { status: "invalid" }
  | { status: "unsupported" };

function queryKey(input: string, kind: "media" | "container"): QueryKey {
  try {
    // Nested conditions use css-tree's recovery path; validate the resulting nodes below.
    const ast = parse(input, {
      context: "atrulePrelude",
      atrule: kind,
    });
    if (ast.type !== "AtrulePrelude") return { status: "invalid" };
    let containerName: object | undefined;
    if (kind === "media") {
      if (ast.children.size !== 1) return { status: "invalid" };
      const list = ast.children.first;
      if (list?.type !== "MediaQueryList" || list.children.size === 0) return { status: "invalid" };
    } else {
      const children = ast.children.toArray();
      if (children.length === 2 && children[0].type === "Identifier") {
        containerName = children[0];
        const name = asciiLower(ident.decode(children[0].name));
        if (
          [
            "none",
            "and",
            "or",
            "not",
            "default",
            "initial",
            "inherit",
            "unset",
            "revert",
            "revert-layer",
          ].includes(name)
        ) {
          return { status: "invalid" };
        }
      } else if (children.length !== 1) return { status: "invalid" };
      if (children.at(-1)!.type !== "Condition") return { status: "unsupported" };
    }

    let unsupported = false;
    let invalid = false;
    let opaque = false;
    const numberTypes: string[] = [];
    const nestedConditions = new Set<Condition>();
    const keyword = (name: string): string => {
      const decoded = ident.decode(name);
      if (decoded.startsWith("--")) unsupported = true;
      return ident.encode(asciiLower(decoded));
    };
    walk(ast, (node) => {
      switch (node.type) {
        case "GeneralEnclosed":
          if (mayBeGeneralEnclosed(generate(node))) unsupported = true;
          else invalid = true;
          return walk.skip;
        case "FeatureFunction":
          if (
            kind !== "container" ||
            asciiLower(ident.decode(node.feature)) !== "style" ||
            node.value.type !== "Declaration"
          ) {
            unsupported = true;
            return walk.skip;
          }
          node.feature = "style";
          node.value.property = ident.encode(
            ident.decode(node.value.property).startsWith("--")
              ? ident.decode(node.value.property)
              : asciiLower(ident.decode(node.value.property)),
          );
          opaque = true;
          return walk.skip;
        case "MediaQuery":
          if (
            node.mediaType &&
            node.condition?.type === "Condition" &&
            node.condition.children.some(
              (child) =>
                child.type === "Identifier" && asciiLower(ident.decode(child.name)) === "or",
            )
          ) {
            invalid = true;
          }
          if (node.mediaType) node.mediaType = keyword(node.mediaType);
          if (node.modifier) node.modifier = asciiLower(node.modifier);
          break;
        case "Feature":
          node.name = keyword(node.name);
          break;
        case "Identifier":
          node.name =
            node === containerName ? ident.encode(ident.decode(node.name)) : keyword(node.name);
          break;
        case "Dimension":
        case "Number":
          {
            if (node.type === "Dimension") node.unit = keyword(node.unit);
            if (node.type === "Number") numberTypes.push(numberTokenType(node.value));
            const value = canonicalCssNumber(node.value);
            if (value === undefined) unsupported = true;
            else node.value = value;
          }
          break;
        case "AtrulePrelude":
        case "MediaQueryList":
          break;
        case "Condition":
          {
            const status = classifyQueryCondition(node, nestedConditions);
            if (status === "invalid") invalid = true;
            else if (status === "unsupported") unsupported = true;
          }
          break;
        case "FeatureRange":
        case "Ratio":
          break;
        default:
          unsupported = true;
      }
      return undefined;
    });
    if (invalid) return { status: "invalid" };
    if (unsupported) return { status: "unsupported" };
    const numericKey = generate(ast);
    return { status: "valid", key: JSON.stringify([numericKey, numberTypes]), numericKey, opaque };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        status: hasNestedQuery(input) || mayBeGeneralEnclosed(input) ? "unsupported" : "invalid",
      };
    }
    throw error;
  }
}

/**
 * Resolve a CSS media query from source-preserved occurrences.
 *
 * Unsupported prelude forms return unavailable rather than a potentially incorrect missing or
 * unique result. CSS numbers are compared without losing decimal precision.
 *
 * @param reference - A parsed reference with a `media(...)` member.
 * @param lookup - Explicit source provenance and scope completeness.
 * @returns A resolved media rule, missing or ambiguous candidates, an invalid subject, or unavailable.
 */
export function resolveMediaMemberReference(
  reference: CssDocReference,
  lookup: ReferenceLookup,
): MediaMemberResolution {
  if (reference.member?.kind !== "media") return { status: "unavailable", candidates: [] };
  const key = queryKey(reference.member.subject, "media");
  if (key.status === "invalid") return { status: "invalid-subject" };
  if (key.status === "unsupported") return { status: "unavailable", candidates: [] };
  const resolution = resolveRecordReference(reference, lookup);
  if (resolution.status === "missing") return { status: "missing" };
  if (resolution.status === "ambiguous") {
    return { status: "ambiguous", stage: "record", candidates: resolution.candidates };
  }
  if (resolution.status === "unavailable") return resolution;
  const record = resolution.candidate;
  const occurrences = record.record.mediaOccurrences;
  if (!occurrences) return { status: "unavailable", candidates: [record] };
  const candidates: MediaMemberCandidate[] = [];
  for (const occurrence of occurrences) {
    const candidateKey = queryKey(occurrence.prelude, "media");
    if (candidateKey.status !== "valid") return { status: "unavailable", candidates: [record] };
    if (candidateKey.key === key.key) candidates.push({ record, occurrence });
    else if (candidateKey.numericKey === key.numericKey) {
      return { status: "unavailable", candidates: [record] };
    }
  }
  if (candidates.length === 0) return { status: "missing" };
  if (candidates.length > 1) return { status: "ambiguous", stage: "member", candidates };
  return { status: "resolved", candidate: candidates[0] };
}

/**
 * Resolve a CSS container query from source-preserved occurrences.
 *
 * Unsupported prelude forms return unavailable rather than a potentially incorrect result.
 *
 * @param reference - A parsed reference with a `container(...)` member.
 * @param lookup - Explicit source provenance and lookup completeness.
 * @returns A resolved container rule, missing or ambiguous candidates, an invalid subject, or unavailable.
 */
export function resolveContainerMemberReference(
  reference: CssDocReference,
  lookup: ReferenceLookup,
): ContainerMemberResolution {
  if (reference.member?.kind !== "container") return { status: "unavailable", candidates: [] };
  const key = queryKey(reference.member.subject, "container");
  if (key.status === "invalid") return { status: "invalid-subject" };
  if (key.status === "unsupported") return { status: "unavailable", candidates: [] };
  const resolution = resolveRecordReference(reference, lookup);
  if (resolution.status === "missing") return { status: "missing" };
  if (resolution.status === "ambiguous") {
    return { status: "ambiguous", stage: "record", candidates: resolution.candidates };
  }
  if (resolution.status === "unavailable") return resolution;
  const record = resolution.candidate;
  const occurrences = record.record.containerOccurrences;
  if (!occurrences) return { status: "unavailable", candidates: [record] };
  const candidates: ContainerMemberCandidate[] = [];
  for (const occurrence of occurrences) {
    const candidateKey = queryKey(occurrence.prelude, "container");
    if (candidateKey.status !== "valid") return { status: "unavailable", candidates: [record] };
    if (candidateKey.key === key.key) candidates.push({ record, occurrence });
    else if (candidateKey.opaque || key.opaque || candidateKey.numericKey === key.numericKey) {
      return { status: "unavailable", candidates: [record] };
    }
  }
  if (candidates.length === 0) return { status: "missing" };
  if (candidates.length > 1) return { status: "ambiguous", stage: "member", candidates };
  return { status: "resolved", candidate: candidates[0] };
}

/**
 * Resolve a CSS supports query from source-preserved occurrences.
 *
 * Values whose case sensitivity can't be established don't produce a definite match or absence.
 * Unsupported query forms make the lookup unavailable.
 *
 * @param reference - A parsed reference with a `supports(...)` member.
 * @param lookup - Explicit source provenance and lookup completeness.
 * @returns A resolved supports rule, missing or ambiguous candidates, an invalid subject, or unavailable.
 */
export function resolveSupportsMemberReference(
  reference: CssDocReference,
  lookup: ReferenceLookup,
): SupportsMemberResolution {
  if (reference.member?.kind !== "supports") return { status: "unavailable", candidates: [] };
  const key = supportsKey(reference.member.subject);
  if (key.status === "invalid") return { status: "invalid-subject" };
  if (key.status === "unsupported") return { status: "unavailable", candidates: [] };
  const resolution = resolveRecordReference(reference, lookup);
  if (resolution.status === "missing") return { status: "missing" };
  if (resolution.status === "ambiguous") {
    return { status: "ambiguous", stage: "record", candidates: resolution.candidates };
  }
  if (resolution.status === "unavailable") return resolution;
  const record = resolution.candidate;
  const occurrences = record.record.supportsOccurrences;
  if (!occurrences) return { status: "unavailable", candidates: [record] };
  const candidates: SupportsMemberCandidate[] = [];
  for (const occurrence of occurrences) {
    const candidateKey = supportsKey(occurrence.prelude);
    if (candidateKey.status !== "valid") return { status: "unavailable", candidates: [record] };
    if (candidateKey.key === key.key) candidates.push({ record, occurrence });
    else if (candidateKey.caseFoldedKey === key.caseFoldedKey) {
      return { status: "unavailable", candidates: [record] };
    }
  }
  if (candidates.length === 0) return { status: "missing" };
  if (candidates.length > 1) return { status: "ambiguous", stage: "member", candidates };
  return { status: "resolved", candidate: candidates[0] };
}
