/**
 * `@cssdoc/stylelint-plugin` — a Stylelint plugin exposing `cssdoc/valid-doc-comments`, which runs the
 * shared `@cssdoc/lint-core` rules over the stylesheet and reports each violation. Add the plugin and
 * enable the rule:
 *
 * @example
 * ```js
 * // stylelint.config.js
 * export default {
 *   plugins: ["@cssdoc/stylelint-plugin"],
 *   rules: { "cssdoc/valid-doc-comments": true },
 * };
 * ```
 *
 * @module @cssdoc/stylelint-plugin
 */
import type { ModifierConventionInput } from "@cssdoc/core";
import { type NamingRules, type RuleName, type RuleSeverity, lintCssDocs } from "@cssdoc/lint-core";
import stylelint, { type Rule } from "stylelint";

const { createPlugin, utils } = stylelint;

/** The rule name; enable it as `"cssdoc/valid-doc-comments": true` (optionally with rule toggles). */
export const ruleName = "cssdoc/valid-doc-comments";

export const messages = utils.ruleMessages(ruleName, {
  violation: (message: string) => message,
});

export const meta = { url: "https://cssdoc.dev" };

/**
 * Secondary options: per-rule severity (`off`/`warn`/`error`, or a boolean) and the modifier
 * convention, e.g. `{ rules: { "missing-summary": "off" }, modifierConvention: "rscss" }`.
 */
interface SecondaryOptions {
  rules?: Partial<Record<RuleName, RuleSeverity | boolean>>;
  modifierConvention?: ModifierConventionInput;
  naming?: NamingRules;
  structureIgnore?: string[];
}

const rule: Rule<boolean, SecondaryOptions> = (primary, secondaryOptions) => (root, result) => {
  const valid = utils.validateOptions(
    result,
    ruleName,
    { actual: primary, possible: [true, false] },
    {
      actual: secondaryOptions,
      possible: {
        rules: [(value) => typeof value === "object"],
        modifierConvention: [(value) => typeof value === "string" || typeof value === "object"],
        naming: [(value) => typeof value === "object"],
        structureIgnore: [(value) => Array.isArray(value)],
      },
      optional: true,
    },
  );
  if (!valid || !primary) return;

  // A custom syntax (postcss-html, postcss-styled-syntax, postcss-lit) hands the rule one clean-CSS
  // Root per embedded block, so `root.toString()` is the extracted stylesheet — doc comments inside a
  // `<style>` block or a template are preserved and linted. (A comment authored *above* a
  // `const X = styled…` lives in code the custom syntax discards; use @cssdoc/embedded for that.)
  const css = root.toString();
  const violations = lintCssDocs(css, {
    rules: secondaryOptions?.rules,
    modifierConvention: secondaryOptions?.modifierConvention,
    naming: secondaryOptions?.naming,
    structureIgnore: secondaryOptions?.structureIgnore,
  });
  for (const violation of violations) {
    utils.report({
      result,
      ruleName,
      message: messages.violation(
        `[${violation.rule}] (line ${violation.line}) ${violation.message}`,
      ),
      node: root,
    });
  }
};

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

/** A ready-to-spread config that enables the rule. */
export const configs = {
  recommended: {
    plugins: ["@cssdoc/stylelint-plugin"],
    rules: { [ruleName]: true },
  },
};

export default createPlugin(ruleName, rule);
