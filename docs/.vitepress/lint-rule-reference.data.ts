import { MarkdownExit } from "markdown-exit";
import { DEFAULT_RULE_SEVERITIES } from "../../packages/providers/src/types.ts";
import type { RuleId, RuleSeverities } from "../../packages/providers/src/types.ts";

const sections = {
  "doc-comments": {
    title: "Doc comments",
    description:
      "These rules check whether records and CSS members have the information readers need, including summaries, modifier descriptions, replacement notes, and annotation references.",
  },
  "selectors-and-class-usage": {
    title: "Selectors and class usage",
    description:
      "These rules compare selectors with their documentation and check how classes are used. Naming conventions and allowed HTML elements apply when you configure or document them.",
  },
  "structure-and-record-relationships": {
    title: "Structure and record relationships",
    description:
      "These rules check record IDs and references between records, including structure trees, family membership, and modifier effects on other components.",
  },
  "properties-and-values": {
    title: "Properties and values",
    description:
      "These rules check custom property references and values against registered syntax. They also check value changes in records marked read-only, sealed, or frozen.",
  },
  directives: {
    title: "Directives",
    description:
      "This rule reports an expectation that matched no diagnostic. Use these directives to manage exceptions close to the CSS they apply to.",
  },
};

type LintRuleGroupId = keyof typeof sections;

const descriptions: Record<RuleId, [group: LintRuleGroupId, description: string]> = {
  "affects-unknown-component": [
    "structure-and-record-relationships",
    "An `@affects` target names a component that cannot be resolved.",
  ],
  "alias-requires-canonical": [
    "doc-comments",
    "An `@alias` modifier has no canonical target, such as a `{@link}` reference.",
  ],
  "component-name-case": [
    "selectors-and-class-usage",
    "Component class names must match the configured naming convention.",
  ],
  "conflicting-global-modifier": [
    "selectors-and-class-usage",
    "Component modifiers conflicting with global modifier definitions must be resolved.",
  ],
  "cssdoc-directive": [
    "directives",
    "A `cssdoc-expect-error` directive matched no diagnostic on the next line.",
  ],
  "deprecated-modifier": ["selectors-and-class-usage", "A consumer uses a deprecated modifier."],
  "deprecated-requires-canonical": [
    "doc-comments",
    "A deprecated modifier has neither a canonical replacement via `{@link}` nor a note.",
  ],
  "disallowed-element": [
    "selectors-and-class-usage",
    "A component is applied to an HTML element outside its `@element` allow-list.",
  ],
  "duplicate-record-id": [
    "structure-and-record-relationships",
    "Record identifier is duplicated within the same kind in this scope.",
  ],
  "duplicate-record-id-cross-kind": [
    "structure-and-record-relationships",
    "Records of different kinds share an ID.",
  ],
  "invalid-default-value": [
    "properties-and-values",
    "Custom property default value doesn't match declared syntax.",
  ],
  "invalid-fallback-value": [
    "properties-and-values",
    "A `var()` fallback doesn't match the custom property's declared syntax.",
  ],
  "invalid-property-value": [
    "properties-and-values",
    "Custom property value doesn't match declared syntax.",
  ],
  "member-of-unknown-component": [
    "structure-and-record-relationships",
    "A record's `@memberOf` parent cannot be resolved.",
  ],
  "members-unknown-component": [
    "structure-and-record-relationships",
    "A parent names an unknown record in `@member` or `@members`.",
  ],
  "missing-summary": ["doc-comments", "A record lacks a `@summary` description."],
  "name-not-in-css": [
    "selectors-and-class-usage",
    "Documented modifier or part name is not found in any CSS selector.",
  ],
  "part-name-case": [
    "selectors-and-class-usage",
    "Part name must match the configured naming convention.",
  ],
  "private-member-orphaned": [
    "structure-and-record-relationships",
    "A private member is missing a matching relationship or a reference in its parent's structure.",
  ],
  "readonly-redefinition": [
    "properties-and-values",
    "A `@readonly` or `@frozen` record redefines a property with incompatible values.",
  ],
  "sealed-reset-value": [
    "properties-and-values",
    "A `@sealed` or `@frozen` record uses a disallowed reset keyword.",
  ],
  "structure-ambiguous-record": [
    "structure-and-record-relationships",
    "An untyped `@structure` reference matches records of more than one kind.",
  ],
  "structure-unknown-record": [
    "structure-and-record-relationships",
    "`@structure` references a missing record or a record of a different kind.",
  ],
  "structure-unknown-selector": [
    "structure-and-record-relationships",
    "`@structure` references a selector that isn't the component class or a documented member.",
  ],
  "undocumented-css-part": [
    "doc-comments",
    "A `::part()` selector lacks a corresponding `@csspart` description.",
  ],
  "undocumented-modifier": [
    "doc-comments",
    "A modifier selector lacks a corresponding `@modifier` description.",
  ],
  "undocumented-part": [
    "doc-comments",
    "A part selector lacks a corresponding `@part` description.",
  ],
  "unknown-annotation-ref": [
    "doc-comments",
    "`@ref` doesn't match an `@annotations` entry in the record.",
  ],
  "unknown-custom-property": [
    "properties-and-values",
    "Usage references a custom property that isn't documented.",
  ],
  "unknown-modifier": [
    "selectors-and-class-usage",
    "Applied or referenced modifier isn't documented for the component.",
  ],
  "unknown-part": [
    "selectors-and-class-usage",
    "Applied or referenced part isn't documented for the component.",
  ],
  "unknown-state": [
    "selectors-and-class-usage",
    "Applied or referenced pseudo-class state isn't documented for the component.",
  ],
};

/** A diagnostic and its default severity, listed on the lint reference page. */
export interface LintRuleReferenceRow {
  name: RuleId;
  severity: RuleSeverities[RuleId];
  descriptionHtml: string;
}

/** Rules that check the same part of a stylesheet or its usage. */
export interface LintRuleReferenceGroup {
  id: LintRuleGroupId;
  title: string;
  description: string;
  rules: LintRuleReferenceRow[];
}

/** Data supplied to the reference page by VitePress. */
declare const data: LintRuleReferenceGroup[];
export { data };

/** Group the rules for the reference page and read their defaults from the providers. */
const loader = {
  watch: "../packages/providers/src/types.ts",
  load(): LintRuleReferenceGroup[] {
    const markdown = new MarkdownExit({ html: false });
    const rules = (Object.keys(DEFAULT_RULE_SEVERITIES) as RuleId[]).sort();
    return (Object.keys(sections) as LintRuleGroupId[]).map((id) => ({
      id,
      ...sections[id],
      rules: rules
        .filter((name) => descriptions[name][0] === id)
        .map((name) => ({
          name,
          severity: DEFAULT_RULE_SEVERITIES[name],
          descriptionHtml: markdown.renderInline(descriptions[name][1]),
        })),
    }));
  },
};

export default loader;
