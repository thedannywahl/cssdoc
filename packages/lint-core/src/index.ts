/**
 * `@cssdoc/lint-core` — the author-side doc-comment-hygiene checks, as a thin façade over
 * `@cssdoc/providers`. It builds a `@cssdoc/index` from the CSS and maps the providers' author-side
 * (`lintModel`) diagnostics into a flat {@link Violation} list, which the Stylelint and ESLint adapters
 * translate into their host diagnostics. The rule logic itself lives in the aspect modules.
 *
 * @module @cssdoc/lint-core
 */
import type { CssDocConfiguration } from "@cssdoc/core";
import { createIndex, cssValueSites } from "@cssdoc/index";
import { checkPropertyAssignments, checkPropertyUsage, lintModel } from "@cssdoc/providers";

/** The rules this package surfaces (doc-comment hygiene plus registered-property value checks). */
export type RuleName =
  | "missing-summary"
  | "undocumented-modifier"
  | "undocumented-part"
  | "deprecated-requires-canonical"
  | "name-not-in-css"
  | "invalid-default-value"
  | "invalid-property-value"
  | "invalid-fallback-value";

/** Every rule name, in a stable order. */
export const RULE_NAMES: readonly RuleName[] = [
  "missing-summary",
  "undocumented-modifier",
  "undocumented-part",
  "deprecated-requires-canonical",
  "name-not-in-css",
  "invalid-default-value",
  "invalid-property-value",
  "invalid-fallback-value",
];

/** One rule violation. */
export interface Violation {
  /** Which rule fired. */
  rule: RuleName;
  /** A human-readable message. */
  message: string;
  /** The record (component/utility/…) the violation is about. */
  record: string;
  /** The 1-based source line of the violation. */
  line: number;
}

/** Options for {@link lintCssDocs}. */
export interface LintOptions {
  /** The tag configuration to parse with (custom tags, etc.). */
  configuration?: CssDocConfiguration;
  /** Enable/disable individual rules (all enabled by default). */
  rules?: Partial<Record<RuleName, boolean>>;
}

/**
 * Check a CSS string for doc-comment-hygiene problems.
 *
 * @param css - The CSS source.
 * @param options - {@link LintOptions}.
 * @returns The violations found.
 */
export function lintCssDocs(css: string, options: LintOptions = {}): Violation[] {
  const index = createIndex(css, { configuration: options.configuration });
  const enabled = (rule: RuleName): boolean => options.rules?.[rule] !== false;
  const { assignments, usages } = cssValueSites(css);
  const diagnostics = [
    ...lintModel(index), // hygiene + invalid-default-value
    ...checkPropertyAssignments(assignments, index), // invalid-property-value
    ...checkPropertyUsage(usages, index), // invalid-fallback-value (unknown-property is opt-in, off here)
  ];
  return diagnostics
    .filter((d) => enabled(d.rule as RuleName))
    .map((d) => ({
      rule: d.rule as RuleName,
      message: d.message,
      record: d.record ?? "",
      line: d.span?.start.line ?? 1,
    }));
}
