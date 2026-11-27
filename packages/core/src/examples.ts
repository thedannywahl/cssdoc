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
 * unless `includeUnlabeled` is `false`. Private examples are always excluded.
 *
 * @param entry - A record's examples and optional labels keyed by example index.
 * @param filter - Labels to include and whether to retain unlabeled examples.
 * @returns The selected example bodies in their original order.
 */
export function selectExamples(
  entry: Pick<CssDocEntry, "examples" | "exampleLabels" | "privateExamples">,
  filter?: ExampleFilter | null,
): readonly string[] {
  if (!filter && !entry.privateExamples?.length) return entry.examples;
  const allowed = new Set(filter?.labels);
  const privateExamples = new Set(entry.privateExamples);
  return entry.examples.filter((_, index) => {
    if (privateExamples.has(index)) return false;
    if (!filter) return true;
    const labels = entry.exampleLabels?.[index];
    return labels?.length
      ? labels.some((label) => allowed.has(label))
      : (filter.includeUnlabeled ?? true);
  });
}

/**
 * Remove private examples and reindex the remaining labels for public serialization.
 *
 * @param entry - A parsed record, including any private examples.
 * @returns A public projection without private example content or metadata.
 */
export function projectPublicExamples(entry: CssDocEntry): CssDocEntry {
  if (!entry.privateExamples?.length && !entry.prose?.some((body) => body.private)) return entry;
  const excluded = new Set(entry.privateExamples);
  const examples: string[] = [];
  const labels: Record<number, readonly string[]> = {};
  const indices = new Map<number, number>();
  for (const [index, example] of entry.examples.entries()) {
    if (excluded.has(index)) continue;
    indices.set(index, examples.length);
    const exampleLabels = entry.exampleLabels?.[index];
    if (exampleLabels) labels[examples.length] = exampleLabels;
    examples.push(example);
  }
  const prose = entry.prose
    ?.filter(
      (body) =>
        !body.private && (body.exampleIndex === undefined || indices.has(body.exampleIndex)),
    )
    .map((body) =>
      body.exampleIndex === undefined
        ? body
        : { ...body, exampleIndex: indices.get(body.exampleIndex)! },
    );
  const {
    privateExamples: _privateExamples,
    exampleLabels: _exampleLabels,
    prose: _prose,
    ...rest
  } = entry;
  return {
    ...rest,
    examples,
    ...(Object.keys(labels).length ? { exampleLabels: labels } : {}),
    ...(prose?.length ? { prose } : {}),
  };
}
