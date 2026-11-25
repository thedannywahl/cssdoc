import type { CssDocEntry } from "./model.ts";

/** Label selection for examples, including whether to keep unlabeled examples. */
export interface ExampleFilter {
  /** An example matches if it has any of these labels. */
  labels: readonly string[];
  /** Keep examples without labels. Defaults to true. */
  includeUnlabeled?: boolean;
}

/** Select example bodies without modifying the record or its label metadata. */
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
