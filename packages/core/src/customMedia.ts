import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import type { CssDocEntry, CssRecordKind, StructureNode } from "./model.ts";
import {
  STRUCTURE_RECORD_KIND_SOURCE,
  TYPED_STRUCTURE_MEDIA_SOURCE,
  UNTYPED_STRUCTURE_MEDIA_SOURCE,
} from "@cssdoc/regex";

const TYPED_STRUCTURE_MEDIA: Regex = arkRegex.as(`^${TYPED_STRUCTURE_MEDIA_SOURCE}$`, "u");
const UNTYPED_STRUCTURE_MEDIA: Regex = arkRegex.as(`^${UNTYPED_STRUCTURE_MEDIA_SOURCE}$`, "u");
const STRUCTURE_RECORD_KIND: Regex = arkRegex.as(`^${STRUCTURE_RECORD_KIND_SOURCE}$`, "u");

function canonicalRecordKind(kind: string): CssRecordKind | undefined {
  if (kind === "name") return "component";
  if (kind === "component" || kind === "utility" || kind === "declaration") {
    return kind;
  }
  return undefined;
}

/** One `@structure` selector that references a custom-media profile. */
export interface StructureCustomMediaRef {
  /** The source record that contains the `@structure` node. */
  sourceRecord: string;
  /** The source record kind. */
  sourceKind: CssRecordKind;
  /** The raw selector, e.g. `@component nav (--top-nav)`. */
  selector: string;
  /** The referenced record name, e.g. `nav`. */
  record: string;
  /** The referenced record kind when authored in typed form. */
  recordKind?: CssRecordKind;
  /** The custom-media profile token, e.g. `--top-nav`. */
  profile: string;
}

/** Options for {@link buildCustomMediaDeclarations}. */
export interface BuildCustomMediaOptions {
  /**
   * Resolve each profile's declaration value. Defaults to `true`.
   *
   * Return a media query list string (for example `(width >= 64rem)`), `true`, or `false`.
   */
  resolveValue?: (
    profile: string,
    refs: readonly StructureCustomMediaRef[],
  ) => string | boolean | undefined;
  /**
   * Sort declarations by profile name (default `true`) for stable output.
   */
  sort?: boolean;
}

function parseStructureCustomMediaSelector(selector: string): {
  record: string;
  recordKind?: CssRecordKind;
  profile: string;
} | null {
  const typed = selector.match(TYPED_STRUCTURE_MEDIA);
  if (typed) {
    const recordKind = canonicalRecordKind(typed[1]);
    if (!recordKind) return null;
    return {
      record: typed[2],
      recordKind,
      profile: typed[3],
    };
  }
  const untyped = selector.match(UNTYPED_STRUCTURE_MEDIA);
  if (!untyped) return null;
  // Guard malformed `@component (--x)` and peers from being treated as untyped record names.
  if (STRUCTURE_RECORD_KIND.test(untyped[1])) return null;
  return { record: untyped[1], profile: untyped[2] };
}

/**
 * Extract custom-media profile references from structure trees, including nested nodes and variants.
 *
 * @param entries - Records whose structure trees to inspect.
 * @returns References in traversal order, including repeated references to the same profile.
 */
export function structureCustomMediaRefs(
  entries: readonly CssDocEntry[],
): StructureCustomMediaRef[] {
  const out: StructureCustomMediaRef[] = [];
  const visit = (source: CssDocEntry, nodes: readonly StructureNode[]): void => {
    for (const node of nodes) {
      const parsed = parseStructureCustomMediaSelector(node.selector);
      if (parsed) {
        out.push({
          sourceRecord: source.name,
          sourceKind: source.kind,
          selector: node.selector,
          record: parsed.record,
          recordKind: parsed.recordKind,
          profile: parsed.profile,
        });
      }
      if (node.children.length) visit(source, node.children);
      for (const variant of node.variants ?? []) visit(source, variant.nodes);
    }
  };
  for (const entry of entries) {
    if (!entry.structure?.length) continue;
    visit(entry, entry.structure);
  }
  return out;
}

/**
 * Compile profile references found in `@structure` into CSS `@custom-media` declarations.
 *
 * Profiles default to `true` so the declaration is valid CSS immediately:
 *
 * `@custom-media --top-nav true;`
 *
 * The resolver receives all references to each profile. An empty or whitespace-only string omits that
 * profile; an `undefined` result uses `true`. Declarations are sorted by profile by default.
 *
 * @param entries - Records whose structure trees contain profile references.
 * @param options - Profile value resolution and declaration ordering.
 * @returns CSS declarations with a trailing newline, or an empty string when none are emitted.
 */
export function buildCustomMediaDeclarations(
  entries: readonly CssDocEntry[],
  options: BuildCustomMediaOptions = {},
): string {
  const refs = structureCustomMediaRefs(entries);
  if (refs.length === 0) return "";
  const byProfile = new Map<string, StructureCustomMediaRef[]>();
  for (const ref of refs) {
    const list = byProfile.get(ref.profile) ?? [];
    list.push(ref);
    byProfile.set(ref.profile, list);
  }

  const names =
    (options.sort ?? true)
      ? [...byProfile.keys()].toSorted((a, b) => a.localeCompare(b))
      : [...byProfile.keys()];
  const lines: string[] = [];
  for (const profile of names) {
    const value = options.resolveValue?.(profile, byProfile.get(profile) ?? []) ?? true;
    if (typeof value === "string") {
      const query = value.trim();
      if (!query) continue;
      lines.push(`@custom-media ${profile} ${query};`);
    } else {
      lines.push(`@custom-media ${profile} ${value ? "true" : "false"};`);
    }
  }
  return lines.length ? `${lines.join("\n")}\n` : "";
}
