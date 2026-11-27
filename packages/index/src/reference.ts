import type { CssDocReference } from "@cssdoc/core";
import type { CssDocIndex, RecordInfo } from "./index.ts";

/** One indexed source and its explicitly assigned portable source key, when available. */
export interface ReferenceSource {
  /** Index whose records are candidates in this source. */
  index: CssDocIndex;
  /** Project-relative or explicitly assigned virtual key; never inferred from an absolute path. */
  sourceKey?: string;
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
  for (const source of scope.sources) {
    if (sourceKey !== undefined && source.sourceKey !== sourceKey) continue;
    for (const record of source.index.records) {
      if (record.entry.name !== reference.name) continue;
      if (reference.kind !== undefined && record.entry.kind !== reference.kind) continue;
      candidates.push({
        record,
        ...(source.sourceKey === undefined ? {} : { sourceKey: source.sourceKey }),
        ...(providerId === undefined ? {} : { providerId }),
      });
    }
  }
  if (!scope.complete) return { status: "unavailable", candidates };
  if (candidates.length === 0) return { status: "missing" };
  if (candidates.length > 1) return { status: "ambiguous", candidates };
  return { status: "resolved", candidate: candidates[0] };
}
