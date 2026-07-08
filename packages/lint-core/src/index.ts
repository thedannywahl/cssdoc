/**
 * `@cssdoc/lint-core` — the author-side doc-comment-hygiene checks, as a thin façade over
 * `@cssdoc/providers`. It builds a `@cssdoc/index` from the CSS and maps the providers' author-side
 * (`lintModel`) diagnostics into a flat {@link Violation} list, which the Stylelint and ESLint adapters
 * translate into their host diagnostics. The rule logic itself lives in the aspect modules.
 *
 * @module
 */
import type { CssDocConfiguration } from "@cssdoc/core";
import { createIndex } from "@cssdoc/index";
import { lintModel } from "@cssdoc/providers";

/** The author-side rules this package surfaces. */
export type RuleName =
  | "missing-summary"
  | "undocumented-modifier"
  | "undocumented-part"
  | "deprecated-requires-canonical"
  | "name-not-in-css";

/** Every rule name, in a stable order. */
export const RULE_NAMES: readonly RuleName[] = [
  "missing-summary",
  "undocumented-modifier",
  "undocumented-part",
  "deprecated-requires-canonical",
  "name-not-in-css",
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
  return lintModel(index)
    .filter((d) => enabled(d.rule as RuleName))
    .map((d) => ({
      rule: d.rule as RuleName,
      message: d.message,
      record: d.record ?? "",
      line: d.span?.start.line ?? 1,
    }));
}
