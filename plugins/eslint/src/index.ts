/**
 * `@cssdoc/eslint-plugin` — ESLint rules for CSS documentation.
 *
 * - `cssdoc/valid-doc-comments` (on the `@eslint/css` language) checks the stylesheet's own
 *   doc-comment hygiene via `@cssdoc/lint-core`.
 * - `cssdoc/valid-class-usage` (on JS/JSX and HTML) checks that the classes consumers apply — including
 *   chained modifiers like `class="btn -color-secondary"` — match the documented CSS surface, via
 *   `@cssdoc/providers`. Point it at your CSS with the `css` option.
 *
 * @example
 * ```js
 * // eslint.config.js
 * import cssdoc from "@cssdoc/eslint-plugin";
 * import html from "@html-eslint/parser";
 *
 * export default [
 *   ...cssdoc.configs.recommended, // .css doc hygiene
 *   {
 *     files: ["**\/*.jsx", "**\/*.tsx"],
 *     languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
 *     plugins: { cssdoc },
 *     rules: { "cssdoc/valid-class-usage": ["warn", { css: ["dist/components.css"] }] },
 *   },
 *   {
 *     files: ["**\/*.html"],
 *     languageOptions: { parser: html },
 *     plugins: { cssdoc },
 *     rules: { "cssdoc/valid-class-usage": ["warn", { css: ["dist/components.css"] }] },
 *   },
 * ];
 * ```
 *
 * @module
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type RuleName, lintCssDocs } from "@cssdoc/lint-core";
import { type CssDocIndex, createIndex } from "@cssdoc/index";
import { checkClassUsage } from "@cssdoc/providers";
import css from "@eslint/css";

interface ReportDescriptor {
  node?: unknown;
  loc?: { line: number; column: number };
  message: string;
}

interface RuleContext {
  options: readonly unknown[];
  cwd?: string;
  sourceCode: { text: string };
  report(descriptor: ReportDescriptor): void;
}

interface RuleModule {
  meta: {
    type: "problem" | "suggestion";
    docs: { description: string };
    schema: unknown[];
  };
  create(context: RuleContext): Record<string, (node: never) => void>;
}

interface Plugin {
  meta: { name: string; version: string };
  rules: Record<string, RuleModule>;
  configs: Record<string, unknown[]>;
}

// ── cssdoc/valid-doc-comments (author-side, @eslint/css) ─────────────────────────────────────────

interface DocCommentsOptions {
  rules?: Partial<Record<RuleName, boolean>>;
}

const validDocComments: RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Enforce CSS doc-comment hygiene (@cssdoc/lint-core rules)." },
    schema: [
      { type: "object", properties: { rules: { type: "object" } }, additionalProperties: false },
    ],
  },
  create(context) {
    const options = (context.options[0] ?? {}) as DocCommentsOptions;
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

// ── cssdoc/valid-class-usage (consumer-side, JSX + HTML) ──────────────────────────────────────────

interface ClassUsageOptions {
  css?: string[];
}

/** Per-css-set index cache, so the model is parsed once per lint run rather than once per file. */
const indexCache = new Map<string, CssDocIndex>();

function indexFor(cssPaths: string[], cwd: string): CssDocIndex {
  const resolved = cssPaths.map((p) => resolve(cwd, p)).sort();
  const key = resolved.join("|");
  let index = indexCache.get(key);
  if (!index) {
    const source = resolved.map((p) => readFileSync(p, "utf8")).join("\n");
    index = createIndex(source);
    indexCache.set(key, index);
  }
  return index;
}

/** Diagnostics for one `class`/`className` value string. */
function checkClassValue(value: string, index: CssDocIndex): string[] {
  const tokens = value.split(/\s+/u).filter(Boolean);
  const base = tokens.find((t) => index.componentForClass(t));
  const usages = tokens.filter((t) => t.startsWith("-")).map((token) => ({ base, tokens, token }));
  return checkClassUsage(usages, index).map((d) => `[${d.rule}] ${d.message}`);
}

interface JsxAttribute {
  name?: { name?: string };
  value?: { type?: string; value?: unknown };
}

interface HtmlAttribute {
  key?: { value?: string };
  value?: { value?: string };
}

const validClassUsage: RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Check that applied CSS classes/modifiers match the documented surface." },
    schema: [
      {
        type: "object",
        properties: { css: { type: "array", items: { type: "string" } } },
        required: ["css"],
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = (context.options[0] ?? {}) as ClassUsageOptions;
    if (!options.css?.length) return {} as Record<string, (node: never) => void>;
    const index = indexFor(options.css, context.cwd ?? process.cwd());
    const report = (value: string, node: unknown): void => {
      for (const message of checkClassValue(value, index)) context.report({ node, message });
    };
    return {
      // JSX: className="…" / class="…" with a string literal.
      JSXAttribute(node: never): void {
        const attr = node as JsxAttribute;
        const name = attr.name?.name;
        if (
          (name === "className" || name === "class") &&
          attr.value?.type === "Literal" &&
          typeof attr.value.value === "string"
        ) {
          report(attr.value.value, attr.value);
        }
      },
      // HTML (@html-eslint): class="…".
      Attribute(node: never): void {
        const attr = node as HtmlAttribute;
        if (attr.key?.value === "class" && typeof attr.value?.value === "string") {
          report(attr.value.value, attr.value);
        }
      },
    };
  },
};

const plugin: Plugin = {
  meta: { name: "@cssdoc/eslint-plugin", version: "0.0.0" },
  rules: {
    "valid-doc-comments": validDocComments,
    "valid-class-usage": validClassUsage,
  },
  configs: {},
};

/** A flat-config array that lints `**\/*.css` with the CSS language and enables doc-comment hygiene. */
plugin.configs.recommended = [
  {
    files: ["**/*.css"],
    plugins: { css, cssdoc: plugin },
    language: "css/css",
    rules: { "cssdoc/valid-doc-comments": "warn" },
  },
];

export default plugin;
