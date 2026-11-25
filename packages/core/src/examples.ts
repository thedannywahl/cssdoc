import type { CssDocEntry } from "./model.ts";

/** Label selection for examples, including whether to keep unlabeled examples. */
export interface ExampleFilter {
  /** An example matches if it has any of these labels. */
  labels: readonly string[];
  /** Keep examples without labels. Defaults to true. */
  includeUnlabeled?: boolean;
}

/**
 * Select example bodies without modifying the record or its label metadata.
 *
 * A labeled example matches when any of its labels is in the filter. Unlabeled examples are kept
 * unless `includeUnlabeled` is `false`. Without a filter, the original examples array is returned.
 *
 * @param entry - A record's examples and optional labels keyed by example index.
 * @param filter - Labels to include and whether to retain unlabeled examples.
 * @returns The selected example bodies in their original order.
 */
export function selectExamples(
  entry: Pick<CssDocEntry, "examples" | "exampleLabels">,
  filter?: ExampleFilter | null,
): readonly string[] {
  if (!filter) return entry.examples;
  const allowed = new Set(filter.labels);
  return entry.examples.filter((_, index) => {
    const labels = entry.exampleLabels?.[index];
    return labels?.length
      ? labels.some((label) => allowed.has(label))
      : (filter.includeUnlabeled ?? true);
  });
}
