import { PATTERN_DEFINITIONS } from "../../packages/regex/src/definitions.ts";

/** One serializable pattern row for the grammar reference. */
export interface PatternReferenceRow {
  name: string;
  description: string;
  source: string;
  flags: string;
  grammarRule?: string;
  grammarRelation?: "exact" | "fragment" | "related";
}

/** Patterns grouped by the grammar their metadata references. */
export interface PatternReferenceGroup {
  name: string;
  patterns: PatternReferenceRow[];
}

/** Data supplied to the reference page by VitePress. */
declare const data: PatternReferenceGroup[];
export { data };

/** Load the registry at build time for the pattern reference. */
const loader: { watch: string; load: () => PatternReferenceGroup[] } = {
  watch: "../packages/regex/src/**/*.ts",
  load(): PatternReferenceGroup[] {
    const groups: PatternReferenceGroup[] = [
      { name: "Cssdoc grammar", patterns: [] },
      { name: "CSS grammar", patterns: [] },
      { name: "Other patterns", patterns: [] },
    ];
    for (const pattern of Object.values(PATTERN_DEFINITIONS)) {
      const group =
        pattern.grammarSource === "cssdoc"
          ? groups[0]
          : pattern.grammarSource === "css"
            ? groups[1]
            : groups[2];
      group.patterns.push({
        name: pattern.name,
        description: pattern.description,
        source: pattern.source,
        flags: pattern.flags ?? "",
        grammarRule: pattern.grammarRule,
        grammarRelation: pattern.grammarRelation,
      });
    }
    for (const group of groups) group.patterns.sort((a, b) => a.name.localeCompare(b.name, "en"));
    return groups;
  },
};

export default loader;
