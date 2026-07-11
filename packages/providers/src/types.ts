/**
 * The provider vocabulary — the host-neutral diagnostic, completion, and hover shapes every aspect
 * produces and every adapter (ESLint, Stylelint, the language server) translates into its own API.
 *
 * @module
 */
import type { SourceSpan } from "@cssdoc/index";

export type { Location, SourceSpan } from "@cssdoc/index";

/** Diagnostic severity. */
export type Severity = "error" | "warning";

/** A configurable per-rule severity — `off` suppresses the rule entirely. */
export type RuleSeverity = "off" | "warn" | "error";

/**
 * Every rule id an aspect can emit, author-side and consumer-side. A superset of `@cssdoc/lint-core`'s
 * author-side `RuleName` (which omits the consumer-side `unknown-modifier`/`deprecated-modifier` and
 * the opt-in `unknown-custom-property`).
 */
export type RuleId =
  | "missing-summary"
  | "undocumented-modifier"
  | "deprecated-requires-canonical"
  | "name-not-in-css"
  | "unknown-modifier"
  | "deprecated-modifier"
  | "unknown-state"
  | "unknown-part"
  | "undocumented-part"
  | "undocumented-css-part"
  | "component-name-case"
  | "part-name-case"
  | "structure-unknown-selector"
  | "invalid-default-value"
  | "invalid-property-value"
  | "invalid-fallback-value"
  | "unknown-custom-property"
  | "cssdoc-directive";

/** A resolved severity for every rule. */
export type RuleSeverities = Record<RuleId, RuleSeverity>;

/**
 * The default rule severities. `unknown-modifier` defaults to `warn` — safe under the BEM default's
 * strong `--` signal; lower it to `off` for weak-signal conventions (bare/OOCSS) where every chained
 * class is a candidate. `unknown-custom-property` stays `off` (it needs an opt-in `propertyPrefix`).
 */
export const DEFAULT_RULE_SEVERITIES: RuleSeverities = {
  "missing-summary": "warn",
  "undocumented-modifier": "warn",
  "deprecated-requires-canonical": "warn",
  "name-not-in-css": "warn",
  "unknown-modifier": "warn",
  "deprecated-modifier": "warn",
  "unknown-state": "warn",
  "unknown-part": "warn",
  "undocumented-part": "warn",
  "undocumented-css-part": "warn",
  // The name-case rules only fire when a `naming` convention is configured, so `warn` is safe.
  "component-name-case": "warn",
  "part-name-case": "warn",
  "structure-unknown-selector": "warn",
  "invalid-default-value": "warn",
  "invalid-property-value": "warn",
  "invalid-fallback-value": "warn",
  "unknown-custom-property": "off",
  // Fires when a `cssdoc-expect-error` directive matched no problem (like an unused ts-expect-error).
  "cssdoc-directive": "warn",
};

/**
 * Merge per-rule overrides over {@link DEFAULT_RULE_SEVERITIES}. A `boolean` override is accepted for
 * back-compat: `false` → `off`, `true` → the rule's default.
 */
export function resolveRuleSeverities(
  overrides?: Partial<Record<RuleId, RuleSeverity | boolean>>,
): RuleSeverities {
  const resolved = { ...DEFAULT_RULE_SEVERITIES };
  if (!overrides) return resolved;
  for (const [rule, value] of Object.entries(overrides) as [RuleId, RuleSeverity | boolean][]) {
    if (value === undefined) continue;
    if (typeof value === "boolean") resolved[rule] = value ? DEFAULT_RULE_SEVERITIES[rule] : "off";
    else resolved[rule] = value;
  }
  return resolved;
}

/** One diagnostic from an aspect. */
export interface Diagnostic {
  /** The aspect that produced it (e.g. `modifier`). */
  aspect: string;
  /** The rule name (e.g. `unknown-modifier`). */
  rule: string;
  /** A human-readable message. */
  message: string;
  /** The record it concerns, when applicable. */
  record?: string;
  /** The source span, when known (author-side comes from the index; usage-side from the usage). */
  span?: SourceSpan;
  /** Severity (defaults to `warning`). */
  severity: Severity;
}

/** What kind of thing a completion inserts. */
export type CompletionKind = "component" | "modifier" | "part" | "property" | "function" | "state";

/** One completion item. */
export interface Completion {
  /** The text to insert (e.g. `-color-secondary`, `--value`). */
  label: string;
  kind: CompletionKind;
  /** A short type/hint shown beside the label. */
  detail?: string;
  /** Markdown documentation. */
  documentation?: string;
  /** Whether the item is deprecated. */
  deprecated?: boolean;
}

/** Hover content (markdown). */
export interface Hover {
  contents: string;
}

/**
 * How much a component hover card shows. `compact` is the header, summary, deprecation, and a facet
 * count line; `full` expands every facet that has content into a labelled section; `custom` takes a
 * per-section {@link HoverSections} map. A shippable stand-in for VS Code's not-yet-stable
 * hover-verbosity control.
 */
export type HoverDetail = "compact" | "full" | "custom";

/**
 * Per-section visibility for the `custom` hover detail. `auto` shows the section only when it has
 * content (what `full` does for every section); `on` always shows it (empty sections render a
 * placeholder); `off` hides it. Keys are the card's section names — see {@link HOVER_SECTION_KEYS}.
 */
export type HoverSectionMode = "on" | "off" | "auto";
export type HoverSections = Record<string, HoverSectionMode>;

/** The card's section keys, in render order — the `custom` map is keyed by these. */
export const HOVER_SECTION_KEYS = [
  "summary",
  "deprecated",
  "remarks",
  "accessibility",
  "modifiers",
  "parts",
  "shadowParts",
  "states",
  "customProperties",
  "functions",
  "slots",
  "animations",
  "layers",
  "conditions",
  "see",
  "structure",
  "examples",
] as const;

/** Options that tune usage checks. */
export interface UsageOptions {
  /**
   * When set, a `var(--name)` whose name starts with this prefix but isn't a declared custom property
   * is flagged as unknown. Off by default, since consumed properties are often external tokens.
   */
  propertyPrefix?: string;
}

/**
 * A required name case: a built-in preset, or a custom regular-expression source string tested
 * against the class name. `(string & {})` keeps preset autocomplete while accepting any pattern.
 */
export type NameCase = "pascalCase" | "camelCase" | "lowercase" | (string & {});

/** Which class names a `naming` convention enforces. Absent members aren't checked. */
export interface NamingRules {
  /** The component base-class name (e.g. SUIT `Card` → `pascalCase`). */
  component?: NameCase;
  /** Sub-element part class names. */
  part?: NameCase;
}

/** The built-in name-case patterns, tested against a class name without its leading dot. */
export const NAME_CASE_PRESETS: Record<string, RegExp> = {
  pascalCase: /^[A-Z][A-Za-z0-9]*$/u,
  camelCase: /^[a-z][A-Za-z0-9]*$/u,
  // Lowercase letters, digits, and hyphens — the common CSS/kebab class shape.
  lowercase: /^[a-z][a-z0-9-]*$/u,
};

/** A {@link NamingRules} compiled to regexes (custom patterns compiled from their source). */
export interface ResolvedNaming {
  component?: RegExp;
  part?: RegExp;
}

/** Compile one {@link NameCase} to a regex: a preset, else the string as a custom pattern. */
function compileNameCase(spec: NameCase | undefined): RegExp | undefined {
  if (!spec) return undefined;
  if (spec in NAME_CASE_PRESETS) return NAME_CASE_PRESETS[spec];
  try {
    // Custom user pattern. Tested only against short class names; still the user's own config.
    return new RegExp(spec, "u");
  } catch {
    return undefined; // an invalid pattern disables the check rather than throwing
  }
}

/** Compile {@link NamingRules} to regexes once, for the record/part name-case checks. */
export function resolveNaming(naming?: NamingRules): ResolvedNaming {
  return { component: compileNameCase(naming?.component), part: compileNameCase(naming?.part) };
}
