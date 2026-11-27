import type { CssDocConfiguration, CssDocReference } from "@cssdoc/core";
import { projectPrivateLinks, type PublicProseProjection } from "@cssdoc/core/prose";
import {
  resolveNamedMemberReference,
  resolveRecordReference,
  resolveScopeMemberReference,
  resolveSelectorMemberReference,
  type ReferenceLookup,
} from "./reference.ts";

/**
 * Determine a reference's visibility using its complete source and provider lookup context.
 *
 * Missing, ambiguous, unsupported, or incomplete targets are unavailable, not public.
 *
 * @param reference - The authored structured reference.
 * @param lookup - The original prose's source and provider lookup context.
 * @returns The resolved visibility or unavailable if the target cannot be established.
 */
export function referenceVisibility(
  reference: CssDocReference,
  lookup: ReferenceLookup,
): "public" | "private" | "unavailable" {
  const member = reference.member;
  if (!member) {
    const result = resolveRecordReference(reference, lookup);
    if (result.status !== "resolved") return "unavailable";
    return result.candidate.record.entry.visibility === "internal" ? "private" : "public";
  }
  const result =
    member.kind === "scope"
      ? resolveScopeMemberReference(reference, lookup)
      : member.kind === "modifier" ||
          member.kind === "part" ||
          member.kind === "wrapper" ||
          member.kind === "state" ||
          member.kind === "pseudo-element"
        ? resolveSelectorMemberReference(reference, lookup)
        : resolveNamedMemberReference(reference, lookup);
  if (result.status !== "resolved") return "unavailable";
  return result.candidate.record.record.entry.visibility === "internal" ? "private" : "public";
}

/**
 * Project private-target links in prose using the source's reference lookup.
 *
 * Callers must handle the returned unavailable flag before publishing the result. Inherited prose
 * must use its original source's lookup, not the inheriting record's lookup.
 *
 * @param text - Authored prose.
 * @param mode - Effective prose mode.
 * @param lookup - The original prose's source and provider lookup context.
 * @param configuration - Active inline-tag vocabulary.
 * @returns Public prose fragments and lookup availability.
 */
export function projectPrivateLinksInLookup(
  text: string,
  mode: "plain" | "markdown",
  lookup: ReferenceLookup,
  configuration?: CssDocConfiguration,
): PublicProseProjection {
  return projectPrivateLinks(
    text,
    mode,
    (reference) => referenceVisibility(reference, lookup),
    configuration,
  );
}
