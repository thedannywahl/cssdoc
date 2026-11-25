/**
 * `@cssdoc/providers` — the host-agnostic language-service core. It exposes diagnostics (author-side
 * hygiene and consumer-side usage), completions, hover, and definitions over a `@cssdoc/index`, built
 * from modular aspect modules. Every adapter — the Stylelint and ESLint plugins, and the language
 * server — is a thin translation of these into its host's API.
 *
 * @module \@cssdoc/providers
 */
import type { ExampleFilter } from "@cssdoc/core";
import type {
  ClassUsage,
  CssDocIndex,
  Location,
  PropertyAssignment,
  PropertyUsage,
} from "@cssdoc/index";
import {
  cssPart,
  customProperty,
  elementUsage,
  func,
  modifier,
  part,
  partUsage,
  record,
  stateUsage,
} from "./aspects.ts";
import {
  DEFAULT_RULE_SEVERITIES,
  type Completion,
  type Diagnostic,
  type Hover,
  type HoverDetail,
  type HoverSectionOrder,
  type HoverSections,
  type ResolvedNaming,
  type RuleId,
  type RuleOptions,
  type RuleSeverities,
  type UsageOptions,
} from "./types.ts";

export * from "./types.ts";
export * from "./syntax.ts";
export { linkSyntax, mdnUrlForType } from "./mdn.ts";
export { applyDirectives, parseDirectives } from "./directives.ts";
export {
  cssPart,
  customProperty,
  elementUsage,
  func,
  modifier,
  part,
  partUsage,
  record,
  selectorDefines,
  stateUsage,
} from "./aspects.ts";

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
  "css-part",
  "custom-property",
  "structure",
  "function",
  "state",
  "condition",
] as const;

/**
 * Check the indexed model for author-side hygiene issues, including missing summaries, undocumented
 * members, drift, and invalid defaults. Rules set to `off` are omitted; the remaining diagnostics
 * carry the configured severity.
 *
 * @param index - The records to check.
 * @param severities - Resolved rule severities; defaults to {@link DEFAULT_RULE_SEVERITIES}.
 * @param naming - Optional resolved naming conventions for records and parts.
 * @param structureIgnore - Class names or glob patterns exempt from structure selector checks.
 * @param siblingIndex - Project-wide records used for sibling references; defaults to `index`.
 * @param ruleOptions - Additional rule-specific options.
 * @returns Diagnostics for the indexed records.
 */
export function lintModel(
  index: CssDocIndex,
  severities: RuleSeverities = DEFAULT_RULE_SEVERITIES,
  naming?: ResolvedNaming,
  structureIgnore?: readonly string[],
  // The project-wide index, when linting one file of a multi-file set: lets `@structure` reference a
  // sibling component defined elsewhere. Defaults (in `record.model`) to `index` — single-sheet linting.
  siblingIndex?: CssDocIndex,
  ruleOptions?: RuleOptions,
): Diagnostic[] {
  return applySeverities(
    [
      ...record.model(index, naming, structureIgnore, siblingIndex, ruleOptions),
      ...modifier.model(index),
      ...part.model(index, naming),
      ...cssPart.model(index),
      ...customProperty.model(index),
    ],
    severities,
  );
}

/**
 * Check custom-property assignments against the syntax of registered properties.
 *
 * @param assignments - Assignment sites to check.
 * @param index - The index containing property registrations.
 * @param severities - Resolved rule severities; defaults to {@link DEFAULT_RULE_SEVERITIES}.
 * @returns Enabled diagnostics with their resolved severity.
 */
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

/**
 * Consumer-side diagnostics for class-attribute usage: unknown/deprecated modifiers, plus unknown
 * state classes (`statePrefixes`) and unknown BEM element classes, routed by the token's kind.
 *
 * @param usages - Class or attribute usage sites to check.
 * @param index - The index used to resolve components and their members.
 * @param severities - Resolved rule severities; defaults to {@link DEFAULT_RULE_SEVERITIES}.
 * @returns Enabled diagnostics with their resolved severity.
 */
export function checkClassUsage(
  usages: readonly ClassUsage[],
  index: CssDocIndex,
  severities: RuleSeverities = DEFAULT_RULE_SEVERITIES,
): Diagnostic[] {
  return applySeverities(
    usages.flatMap((usage) => {
      const elementDiags = elementUsage(usage, index);
      const kind = usage.base ? index.matcher.usageKind(usage.token, usage.base) : undefined;
      if (kind === "state") return [...elementDiags, ...stateUsage(usage, index)];
      if (kind === "element") return [...elementDiags, ...partUsage(usage, index)];
      return [...elementDiags, ...modifier.classUsage(usage, index)]; // modifier (self-guards for anything else)
    }),
    severities,
  );
}

/**
 * Check `var(--…)` references and their fallback values. Unknown-property checks are opt-in through
 * {@link UsageOptions}; fallback validation also uses the property's registered syntax when available.
 *
 * @param usages - Custom-property reference sites to check.
 * @param index - The index containing property registrations.
 * @param options - Consumer usage options, including the prefix for unknown-property checks.
 * @param severities - Resolved rule severities; defaults to {@link DEFAULT_RULE_SEVERITIES}.
 * @returns Enabled diagnostics with their resolved severity.
 */
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

/** Hover for a class token: the modifier's docs, else the component's card (at the given detail). */
export function hoverForClass(
  base: string,
  token: string,
  index: CssDocIndex,
  detail: HoverDetail = "full",
  sections?: HoverSections,
  sectionOrder?: HoverSectionOrder,
  exampleFilter?: ExampleFilter | null,
): Hover | undefined {
  return (
    modifier.hover(base, token, index) ??
    record.hover(base, index, detail, sections, sectionOrder, exampleFilter)
  );
}

/**
 * Hover for a `var(--…)` custom property. `valueIndex` (default `index`) supplies the value graph for
 * `var()` resolution — pass a project-wide index so a chain that runs through other sheets resolves.
 *
 * @param name - The custom-property name, including its `--` prefix.
 * @param index - The index containing the property documentation.
 * @param valueIndex - The index containing values to resolve; defaults to `index`.
 * @returns Hover content, or `undefined` if the property is neither documented nor in the value graph.
 */
export function hoverForCustomProperty(
  name: string,
  index: CssDocIndex,
  valueIndex: CssDocIndex = index,
): Hover | undefined {
  return customProperty.hover(name, index, valueIndex);
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
