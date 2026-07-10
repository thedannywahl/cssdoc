/**
 * `@cssdoc/providers` — the host-agnostic language-service core. It exposes diagnostics (author-side
 * hygiene and consumer-side usage), completions, hover, and definitions over a `@cssdoc/index`, built
 * from modular aspect modules. Every adapter — the Stylelint and ESLint plugins, and the language
 * server — is a thin translation of these into its host's API.
 *
 * @module @cssdoc/providers
 */
import type {
  ClassUsage,
  CssDocIndex,
  Location,
  PropertyAssignment,
  PropertyUsage,
} from "@cssdoc/index";
import { customProperty, func, modifier, part, record } from "./aspects.ts";
import {
  DEFAULT_RULE_SEVERITIES,
  type Completion,
  type Diagnostic,
  type Hover,
  type RuleId,
  type RuleSeverities,
  type UsageOptions,
} from "./types.ts";

export * from "./types.ts";
export * from "./syntax.ts";
export { customProperty, func, modifier, part, record } from "./aspects.ts";

/**
 * Apply resolved rule severities to a batch of diagnostics: drop `off` rules, and stamp the configured
 * severity onto the rest. This is the single place severity/enablement is decided — every host inherits
 * it. Aspects emit a placeholder `warning`; this overrides it.
 */
function applySeverities(diagnostics: Diagnostic[], severities: RuleSeverities): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const d of diagnostics) {
    const severity = severities[d.rule as RuleId] ?? "warn";
    if (severity === "off") continue;
    out.push({ ...d, severity: severity === "error" ? "error" : "warning" });
  }
  return out;
}

/** The aspect names covered, in a stable order (the extension point for future aspects). */
export const ASPECTS = [
  "record",
  "modifier",
  "part",
  "custom-property",
  "structure",
  "function",
  "state",
  "condition",
] as const;

/** Author-side hygiene diagnostics over the whole model (missing summaries, undocumented members, drift, invalid defaults). */
export function lintModel(
  index: CssDocIndex,
  severities: RuleSeverities = DEFAULT_RULE_SEVERITIES,
): Diagnostic[] {
  return applySeverities(
    [
      ...record.model(index),
      ...modifier.model(index),
      ...part.model(index),
      ...customProperty.model(index),
    ],
    severities,
  );
}

/** Consumer-side diagnostics for custom-property assignments (`--x: value` must match its `@property` syntax). */
export function checkPropertyAssignments(
  assignments: readonly PropertyAssignment[],
  index: CssDocIndex,
  severities: RuleSeverities = DEFAULT_RULE_SEVERITIES,
): Diagnostic[] {
  return applySeverities(
    assignments.flatMap((a) => customProperty.assignment(a, index)),
    severities,
  );
}

/** Consumer-side diagnostics for class-attribute usage (unknown or deprecated modifiers). */
export function checkClassUsage(
  usages: readonly ClassUsage[],
  index: CssDocIndex,
  severities: RuleSeverities = DEFAULT_RULE_SEVERITIES,
): Diagnostic[] {
  return applySeverities(
    usages.flatMap((usage) => modifier.classUsage(usage, index)),
    severities,
  );
}

/** Consumer-side diagnostics for `var(--…)` references (unknown custom properties; opt-in via prefix). */
export function checkPropertyUsage(
  usages: readonly PropertyUsage[],
  index: CssDocIndex,
  options: UsageOptions = {},
  severities: RuleSeverities = DEFAULT_RULE_SEVERITIES,
): Diagnostic[] {
  return applySeverities(
    usages.flatMap((usage) => customProperty.propertyUsage(usage, index, options)),
    severities,
  );
}

/** Completions for a class attribute: modifiers of `base` when given, else the component classes. */
export function completeClasses(base: string | undefined, index: CssDocIndex): Completion[] {
  return base ? modifier.completions(base, index) : record.completions(index);
}

/** Completions for `var(--…)`: the declared custom properties. */
export function completeCustomProperties(index: CssDocIndex): Completion[] {
  return customProperty.completions(index);
}

/** Completions for a value position: the custom functions. */
export function completeFunctions(index: CssDocIndex): Completion[] {
  return func.completions(index);
}

/** Hover for a class token: the modifier's docs, else the component's. */
export function hoverForClass(base: string, token: string, index: CssDocIndex): Hover | undefined {
  return modifier.hover(base, token, index) ?? record.hover(base, index);
}

/** Hover for a `var(--…)` custom property. */
export function hoverForCustomProperty(name: string, index: CssDocIndex): Hover | undefined {
  return customProperty.hover(name, index);
}

/** Hover for a custom function. */
export function hoverForFunction(name: string, index: CssDocIndex): Hover | undefined {
  return func.hover(name, index);
}

/** Definition of a class token: the modifier's rule, else the component's. */
export function definitionForClass(
  base: string,
  token: string,
  index: CssDocIndex,
): Location | undefined {
  return modifier.definition(base, token, index) ?? record.definition(base, index);
}

/** Definition of a custom property (its `@property` rule). */
export function definitionForCustomProperty(
  name: string,
  index: CssDocIndex,
): Location | undefined {
  return customProperty.definition(name, index);
}

/** Definition of a custom function (its `@function` rule). */
export function definitionForFunction(name: string, index: CssDocIndex): Location | undefined {
  return func.definition(name, index);
}
