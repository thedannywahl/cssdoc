/**
 * `@cssdoc/lint-core` — the author-side doc-comment-hygiene checks, as a thin façade over
 * `@cssdoc/providers`. It builds a `@cssdoc/index` from the CSS and maps the providers' author-side
 * (`lintModel`) diagnostics into a flat {@link Violation} list, which the Stylelint and ESLint adapters
 * translate into their host diagnostics. The rule logic itself lives in the aspect modules.
 *
 * @module @cssdoc/lint-core
 */
import type { CssDocConfiguration, ModifierConventionInput } from "@cssdoc/core";
import { createIndex, cssValueSites } from "@cssdoc/index";
import {
  checkPropertyAssignments,
  checkPropertyUsage,
  lintModel,
  resolveNaming,
  resolveRuleSeverities,
  type NamingRules,
  type RuleSeverity,
  type Severity,
} from "@cssdoc/providers";

export type {
  NamingRules,
  RuleId,
  RuleSeverities,
  RuleSeverity,
  Severity,
} from "@cssdoc/providers";

/** The rules this package surfaces (doc-comment hygiene plus registered-property value checks). */
export type RuleName =
  | "missing-summary"
  | "undocumented-modifier"
  | "undocumented-part"
  | "component-name-case"
  | "part-name-case"
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
  "component-name-case",
  "part-name-case",
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
  /** The resolved severity (`error` or `warning`). */
  severity: Severity;
}

/** Options for {@link lintCssDocs}. */
export interface LintOptions {
  /** The tag configuration to parse with (custom tags, etc.). */
  configuration?: CssDocConfiguration;
  /** The modifier convention (BEM by default; `rscss`, `bare`, or a custom object). */
  modifierConvention?: ModifierConventionInput;
  /**
   * Per-rule severity (`off`/`warn`/`error`). A `boolean` is accepted for back-compat (`false` → off,
   * `true` → the rule's default). All rules default to `warn`.
   */
  rules?: Partial<Record<RuleName, RuleSeverity | boolean>>;
  /** Name-case conventions to enforce (`component`/`part`); drives the `*-name-case` rules. */
  naming?: NamingRules;
  /** Class names exempt from the `structure-unknown-selector` rule (literal names or `*` globs). */
  structureIgnore?: readonly string[];
}

/**
 * Check a CSS string for doc-comment-hygiene problems.
 *
 * @param css - The CSS source.
 * @param options - {@link LintOptions}.
 * @returns The violations found.
 */
export function lintCssDocs(css: string, options: LintOptions = {}): Violation[] {
  const index = createIndex(css, {
    configuration: options.configuration,
    modifierConvention: options.modifierConvention,
  });
  const severities = resolveRuleSeverities(options.rules);
  const naming = resolveNaming(options.naming);
  const { assignments, usages } = cssValueSites(css);
  // The providers drop `off` rules and stamp the resolved severity — no separate filter here.
  const diagnostics = [
    ...lintModel(index, severities, naming, options.structureIgnore), // hygiene + invalid-default-value + name-case
    ...checkPropertyAssignments(assignments, index, severities), // invalid-property-value
    ...checkPropertyUsage(usages, index, {}, severities), // invalid-fallback-value (unknown-property opt-in, off here)
  ];
  return diagnostics.map((d) => ({
    rule: d.rule as RuleName,
    message: d.message,
    record: d.record ?? "",
    line: d.span?.start.line ?? 1,
    severity: d.severity,
  }));
}
