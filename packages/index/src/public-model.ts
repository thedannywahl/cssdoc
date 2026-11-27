import {
  projectPublicEntry,
  selectExampleIndices,
  type CssDocConfiguration,
  type CssDocEntry,
  type CssModifier,
  type CssPart,
  type StructureNode,
  type StructureVariant,
} from "@cssdoc/core";
import { projectPrivateLinks } from "@cssdoc/core/prose";

import { referenceVisibility } from "./projection.ts";
import type { ReferenceLookup } from "./reference.ts";

/** Source context for a prose field being projected. */
export interface PublicProseContext {
  /** Original, unprojected record. */
  entry: CssDocEntry;
  /** Field path within the record. */
  path: string;
}

/** Options for projecting a public model. */
export interface PublicModelOptions {
  /** Resolve each field in the lookup belonging to its original source. */
  lookupFor: (context: PublicProseContext) => ReferenceLookup;
  /** Configuration used to recognize inline tags. */
  configuration?: CssDocConfiguration;
  /** Retain internal records, while still removing their private content. */
  includeInternal?: boolean;
  /**
   * Encode a literal private-link label for a specific renderer. Omit to retain plain model text.
   */
  literalText?: (text: string, mode: "plain" | "markdown", path: string) => string;
}

/**
 * Project private content and private-target links without modifying the input model.
 *
 * A caller must supply complete lookups for the original source of every prose field.
 * Unavailable references stop projection rather than publishing an unresolved target.
 * The returned strings contain literal labels as plain text; they must not be interpreted as
 * Markdown without separately preserving and escaping literal fragments.
 *
 * @param entries - Original records, including private reference targets.
 * @param options - Source lookups and optional rendering of literal labels.
 * @returns Public records with private content and target identities removed.
 * @throws If a referenced target's visibility can't be established.
 */
export function projectPublicModel(
  entries: readonly CssDocEntry[],
  options: PublicModelOptions,
): CssDocEntry[] {
  return entries
    .filter((entry) => options.includeInternal || entry.visibility !== "internal")
    .map((original) => {
      const entry = projectPublicEntry(original);
      const exampleIndices = selectExampleIndices(original);
      const keptExamples = new Set(exampleIndices);
      const proseIndices =
        original.prose?.flatMap((body, index) =>
          !body.private && (body.exampleIndex === undefined || keptExamples.has(body.exampleIndex))
            ? [index]
            : [],
        ) ?? [];
      const project = (
        text: string | undefined,
        path: string,
        explicitMode?: "plain" | "markdown",
        sourcePath = path,
      ): string | undefined => {
        if (text === undefined) return undefined;
        const bodies = original.prose?.filter((body) => body.text === text) ?? [];
        const modes = explicitMode ? [explicitMode] : [...new Set(bodies.map((body) => body.mode))];
        if (modes.length === 0) modes.push("markdown");
        const results = modes.map((mode) =>
          projectPrivateLinks(
            text,
            mode,
            (reference) =>
              referenceVisibility(
                reference,
                options.lookupFor({ entry: original, path: sourcePath }),
              ),
            options.configuration,
          ),
        );
        if (results.some((result) => result.unavailable))
          throw new Error(`Cannot establish reference visibility in ${original.name} at ${path}`);
        const first = results[0];
        if (
          results.some(
            (result) => JSON.stringify(result.fragments) !== JSON.stringify(first.fragments),
          )
        )
          throw new Error(`Cannot establish prose mode in ${original.name} at ${path}`);
        return first.fragments
          .map((fragment) =>
            fragment.kind === "literal"
              ? (options.literalText?.(fragment.text, modes[0], path) ?? fragment.text)
              : fragment.text,
          )
          .join("");
      };
      const described = <T extends { description?: string }>(item: T, path: string): T => ({
        ...item,
        description: project(item.description, `${path}.description`),
      });
      const modifier = (item: CssModifier, path: string): CssModifier => ({
        ...described(item, path),
        ...(item.deprecated
          ? {
              deprecated: {
                ...item.deprecated,
                note: project(item.deprecated.note, `${path}.deprecated.note`),
              },
            }
          : {}),
        ...(item.alias
          ? { alias: { ...item.alias, note: project(item.alias.note, `${path}.alias.note`) } }
          : {}),
        ...(item.affects
          ? { affects: item.affects.map((affect, i) => described(affect, `${path}.affects[${i}]`)) }
          : {}),
      });
      const part = (item: CssPart, path: string): CssPart => ({
        ...described(item, path),
        ...(item.modifiers
          ? {
              modifiers: item.modifiers.map((childModifier, i) =>
                modifier(childModifier, `${path}.modifiers[${i}]`),
              ),
            }
          : {}),
      });
      const variant = (item: StructureVariant, path: string): StructureVariant => ({
        ...item,
        nodes: item.nodes.map((node, i) => structure(node, `${path}.nodes[${i}]`)),
      });
      const structure = (item: StructureNode, path: string): StructureNode => ({
        ...described(item, path),
        children: item.children.map((child, i) => structure(child, `${path}.children[${i}]`)),
        ...(item.variants
          ? {
              variants: item.variants.map((childVariant, i) =>
                variant(childVariant, `${path}.variants[${i}]`),
              ),
            }
          : {}),
      });
      const privateAnnotationIds = new Set(
        entry.annotations
          .filter((annotation) => annotation.private)
          .map((annotation) => String(annotation.ref)),
      );
      const annotations = entry.annotations.filter((annotation) => !annotation.private);
      const refs = entry.refs.filter((ref) => {
        if (typeof ref === "object") {
          if (ref.private) return false;
          if (privateAnnotationIds.has(String(ref.ref))) return false;
        } else if (privateAnnotationIds.has(String(ref))) return false;
        return true;
      });
      return {
        ...entry,
        summary: project(entry.summary, "summary"),
        remarks: project(entry.remarks, "remarks"),
        usage: project(entry.usage, "usage"),
        accessibility: project(entry.accessibility, "accessibility"),
        deprecated: project(entry.deprecated, "deprecated"),
        structureDescription: project(entry.structureDescription, "structureDescription"),
        modifiers: entry.modifiers.map((item, i) => modifier(item, `modifiers[${i}]`)),
        parts: entry.parts.map((item, i) => part(item, `parts[${i}]`)),
        shadowParts: entry.shadowParts.map((item, i) => part(item, `shadowParts[${i}]`)),
        pseudoElements: entry.pseudoElements.map((item, i) =>
          described(item, `pseudoElements[${i}]`),
        ),
        states: entry.states.map((item, i) => described(item, `states[${i}]`)),
        slots: entry.slots.map((item, i) => described(item, `slots[${i}]`)),
        cssPropertiesConsumed: entry.cssPropertiesConsumed.map((item, i) =>
          described(item, `cssPropertiesConsumed[${i}]`),
        ),
        cssPropertiesDeclared: entry.cssPropertiesDeclared.map((item, i) =>
          described(item, `cssPropertiesDeclared[${i}]`),
        ),
        functions: entry.functions.map((item, i) => described(item, `functions[${i}]`)),
        animations: entry.animations.map((item, i) => described(item, `animations[${i}]`)),
        layers: entry.layers.map((item, i) => described(item, `layers[${i}]`)),
        conditions: entry.conditions.map((item, i) => described(item, `conditions[${i}]`)),
        related: entry.related.map((item, i) => described(item, `related[${i}]`)),
        annotations: annotations.map((item, i) => ({
          ...item,
          text: project(item.text, `annotations[${i}].text`)!,
        })),
        refs,
        see: entry.see.map((text, i) => project(text, `see[${i}]`)!),
        compat: entry.compat.map((text, i) => project(text, `compat[${i}]`)!),
        examples: entry.examples.map((text, i) => {
          const originalIndex = exampleIndices[i];
          const body = original.prose?.find(
            (candidate) => candidate.exampleIndex === originalIndex,
          );
          return body
            ? project(text, `examples[${i}]`, body.mode, `examples[${originalIndex}]`)!
            : project(text, `examples[${i}]`, "markdown", `examples[${originalIndex}]`)!;
        }),
        ...(entry.prose
          ? {
              prose: entry.prose.map((body, i) => ({
                ...body,
                header: project(
                  body.header,
                  `prose[${i}].header`,
                  "plain",
                  `prose[${proseIndices[i]}].header`,
                )!,
                text: project(
                  body.text,
                  `prose[${i}].text`,
                  body.mode,
                  `prose[${proseIndices[i]}].text`,
                )!,
              })),
            }
          : {}),
        ...(entry.structure
          ? { structure: entry.structure.map((item, i) => structure(item, `structure[${i}]`)) }
          : {}),
        ...(entry.structureVariants
          ? {
              structureVariants: entry.structureVariants.map((item, i) =>
                variant(item, `structureVariants[${i}]`),
              ),
            }
          : {}),
        ...(entry.customBlocks
          ? {
              customBlocks: Object.fromEntries(
                Object.entries(entry.customBlocks).map(([tag, blocks]) => [
                  tag,
                  blocks.map((text, i) => project(text, `customBlocks.${tag}[${i}]`)!),
                ]),
              ),
            }
          : {}),
      };
    });
}
