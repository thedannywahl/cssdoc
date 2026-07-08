/**
 * `@cssdoc/eslint-plugin` — an ESLint plugin (built on the `@eslint/css` language) exposing
 * `cssdoc/valid-doc-comments`, which runs the shared `@cssdoc/lint-core` rules over a stylesheet and
 * reports each violation. Use the `recommended` flat config, or wire the rule yourself:
 *
 * @example
 * ```js
 * // eslint.config.js
 * import cssdoc from "@cssdoc/eslint-plugin";
 * export default [...cssdoc.configs.recommended];
 * ```
 *
 * @module
 */
import { type RuleName, lintCssDocs } from "@cssdoc/lint-core";
import css from "@eslint/css";

/** The subset of the ESLint CSS rule context this plugin needs. */
interface CssRuleContext {
  sourceCode: { text: string };
  report(descriptor: { loc: { line: number; column: number }; message: string }): void;
}

/** Secondary options: per-rule enable/disable. */
interface RuleOptions {
  rules?: Partial<Record<RuleName, boolean>>;
}

interface CssRuleModule {
  meta: {
    type: "problem";
    docs: { description: string };
    schema: unknown[];
  };
  create(context: CssRuleContext): Record<string, () => void>;
}

interface EslintCssPlugin {
  meta: { name: string; version: string };
  rules: Record<string, CssRuleModule>;
  configs: Record<string, unknown[]>;
}

const validDocComments: CssRuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Enforce CSS doc-comment hygiene (@cssdoc/lint-core rules)." },
    schema: [
      {
        type: "object",
        properties: { rules: { type: "object" } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = ((context as unknown as { options?: RuleOptions[] }).options?.[0] ??
      {}) as RuleOptions;
    // The @eslint/css AST root is a `StyleSheet`; lint the whole source once when we reach it.
    return {
      StyleSheet(): void {
        for (const violation of lintCssDocs(context.sourceCode.text, { rules: options.rules })) {
          context.report({
            loc: { line: violation.line, column: 0 },
            message: `[${violation.rule}] ${violation.message}`,
          });
        }
      },
    };
  },
};

const plugin: EslintCssPlugin = {
  meta: { name: "@cssdoc/eslint-plugin", version: "0.0.0" },
  rules: { "valid-doc-comments": validDocComments },
  configs: {},
};

/** A flat-config array that lints `**\/*.css` with the CSS language and enables the rule. */
plugin.configs.recommended = [
  {
    files: ["**/*.css"],
    plugins: { css, cssdoc: plugin },
    language: "css/css",
    rules: { "cssdoc/valid-doc-comments": "warn" },
  },
];

export default plugin;
