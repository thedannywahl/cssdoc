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
import { type RuleName, lintCssDocs } from "@cssdoc/lint-core";
import stylelint, { type Rule } from "stylelint";

const { createPlugin, utils } = stylelint;

/** The rule name; enable it as `"cssdoc/valid-doc-comments": true` (optionally with rule toggles). */
export const ruleName = "cssdoc/valid-doc-comments";

export const messages = utils.ruleMessages(ruleName, {
  violation: (message: string) => message,
});

export const meta = { url: "https://cssdoc.dev" };

/** Secondary options: per-rule enable/disable, e.g. `{ rules: { "missing-summary": false } }`. */
interface SecondaryOptions {
  rules?: Partial<Record<RuleName, boolean>>;
}

const rule: Rule<boolean, SecondaryOptions> = (primary, secondaryOptions) => (root, result) => {
  const valid = utils.validateOptions(
    result,
    ruleName,
    { actual: primary, possible: [true, false] },
    {
      actual: secondaryOptions,
      possible: { rules: [(value) => typeof value === "object"] },
      optional: true,
    },
  );
  if (!valid || !primary) return;

  const css = root.toString();
  for (const violation of lintCssDocs(css, { rules: secondaryOptions?.rules })) {
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
