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
import { dirname } from "node:path";
import { CssDocConfigFile, resolveProviders } from "@cssdoc/config";
import type { ModifierConventionInput } from "@cssdoc/core";
import { type NamingRules, type RuleName, type RuleSeverity, lintCssDocs } from "@cssdoc/lint-core";
import stylelint, { type Rule } from "stylelint";

const { createPlugin, utils } = stylelint;

/** Cache loaded `cssdoc.json` per start folder — the same file is reused across every linted stylesheet. */
const configCache = new Map<string, CssDocConfigFile>();
const loadConfig = (folder: string): CssDocConfigFile => {
  let cached = configCache.get(folder);
  if (!cached) {
    cached = CssDocConfigFile.loadForFolder(folder);
    configCache.set(folder, cached);
  }
  return cached;
};

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
        // stylelint validates array options per element, so this must test the item type, not array-ness.
        structureIgnore: [(value) => typeof value === "string"],
      },
      optional: true,
    },
  );
  if (!valid || !primary) return;

  // Load the nearest `cssdoc.json` (from the linted file's folder) as the config base; inline secondary
  // options override it. `toConfiguration()` carries custom tags to the parser too.
  const file = root.source?.input?.file;
  const configFile = loadConfig(file ? dirname(file) : process.cwd());

  // A custom syntax (postcss-html, postcss-styled-syntax, postcss-lit) hands the rule one clean-CSS
  // Root per embedded block, so `root.toString()` is the extracted stylesheet — doc comments inside a
  // `<style>` block or a template are preserved and linted. (A comment authored *above* a
  // `const X = styled…` lives in code the custom syntax discards; use @cssdoc/embedded for that.)
  const css = root.toString();
  const violations = lintCssDocs(css, {
    configuration: configFile.toConfiguration(),
    rules: {
      ...configFile.ruleSeverities,
      ...secondaryOptions?.rules,
    } as SecondaryOptions["rules"],
    modifierConvention: secondaryOptions?.modifierConvention ?? configFile.modifierConvention,
    naming: { ...configFile.naming, ...secondaryOptions?.naming } as NamingRules,
    structureIgnore: secondaryOptions?.structureIgnore ?? configFile.structureIgnore,
    providerEntries: resolveProviders(configFile).entries,
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
