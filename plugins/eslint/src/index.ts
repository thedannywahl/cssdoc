/**
 * `@cssdoc/eslint-plugin` — ESLint rules for CSS documentation.
 *
 * - `cssdoc/valid-doc-comments` (on the `@eslint/css` language) checks the stylesheet's own
 *   doc-comment hygiene via `@cssdoc/lint-core`.
 * - `cssdoc/valid-class-usage` (on JS/JSX and HTML) checks that the classes consumers apply — including
 *   chained modifiers like `class="btn -color-secondary"` — match the documented CSS surface, via
 *   `@cssdoc/providers`. Point it at your CSS with the `css` option. In JSX it reads dynamic bindings
 *   best-effort (string/template literals in `className={…}`, arrays, and quoted object keys), the same
 *   forms the editor checks.
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
 * @module @cssdoc/eslint-plugin
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { CssDocConfigFile, resolveProviders } from "@cssdoc/config";
import type { ModifierConventionInput } from "@cssdoc/core";
import { scanClassUsages } from "@cssdoc/embedded";
import { type NamingRules, type RuleName, lintCssDocs } from "@cssdoc/lint-core";
import { type CssDocIndex, createIndex } from "@cssdoc/index";
import { type RuleSeverity, checkClassUsage } from "@cssdoc/providers";
import css from "@eslint/css";

type Position = { line: number; column: number };

interface ReportDescriptor {
  node?: unknown;
  loc?: Position | { start: Position; end: Position };
  message: string;
}

interface RuleContext {
  options: readonly unknown[];
  cwd?: string;
  filename?: string;
  sourceCode: { text: string; getLocFromIndex(index: number): Position };
  report(descriptor: ReportDescriptor): void;
}

/** Cache loaded `cssdoc.json` per start folder — reused across every linted stylesheet. */
const docConfigCache = new Map<string, CssDocConfigFile>();
const loadDocConfig = (folder: string): CssDocConfigFile => {
  let cached = docConfigCache.get(folder);
  if (!cached) {
    cached = CssDocConfigFile.loadForFolder(folder);
    docConfigCache.set(folder, cached);
  }
  return cached;
};

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
  rules?: Partial<Record<RuleName, RuleSeverity | boolean>>;
  modifierConvention?: ModifierConventionInput;
  naming?: NamingRules;
  structureIgnore?: string[];
}

const validDocComments: RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Enforce CSS doc-comment hygiene (@cssdoc/lint-core rules)." },
    schema: [
      {
        type: "object",
        properties: {
          rules: { type: "object" },
          modifierConvention: { type: ["string", "object"] },
          naming: { type: "object" },
          structureIgnore: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = (context.options[0] ?? {}) as DocCommentsOptions;
    // Load the nearest `cssdoc.json` (from the linted file's folder) as the config base; inline options
    // override it. `toConfiguration()` also carries custom tags to the parser.
    const configFile = loadDocConfig(dirname(context.filename ?? context.cwd ?? process.cwd()));
    return {
      StyleSheet(): void {
        const violations = lintCssDocs(context.sourceCode.text, {
          configuration: configFile.toConfiguration(),
          rules: { ...configFile.ruleSeverities, ...options.rules } as DocCommentsOptions["rules"],
          modifierConvention: options.modifierConvention ?? configFile.modifierConvention,
          naming: { ...configFile.naming, ...options.naming } as NamingRules,
          structureIgnore: options.structureIgnore ?? configFile.structureIgnore,
          providerEntries: resolveProviders(configFile).entries,
        });
        for (const violation of violations) {
          // A full span narrows the reported range to the offending rule/tag; without one, fall back
          // to the record's line (ESLint then highlights just that line's first token). PostCSS
          // columns are 1-based; ESLint's are 0-based.
          const loc = violation.span
            ? {
                start: { line: violation.span.start.line, column: violation.span.start.column - 1 },
                end: { line: violation.span.end.line, column: violation.span.end.column - 1 },
              }
            : { line: violation.line, column: 0 };
          context.report({
            loc,
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
  modifierConvention?: ModifierConventionInput;
}

/** Per-(css-set + convention) index cache, so the model is parsed once per lint run, not once per file. */
const indexCache = new Map<string, CssDocIndex>();

function indexFor(
  cssPaths: string[],
  cwd: string,
  modifierConvention?: ModifierConventionInput,
): CssDocIndex {
  const resolved = cssPaths.map((p) => resolve(cwd, p)).sort();
  const key = `${JSON.stringify(modifierConvention ?? null)}|${resolved.join("|")}`;
  let index = indexCache.get(key);
  if (!index) {
    const source = resolved.map((p) => readFileSync(p, "utf8")).join("\n");
    index = createIndex(source, { modifierConvention });
    indexCache.set(key, index);
  }
  return index;
}

interface ClassUsageLocation {
  start: number;
  end: number;
  message: string;
}

function classUsageDiagnosticsForSource(source: string, index: CssDocIndex): ClassUsageLocation[] {
  const out: ClassUsageLocation[] = [];
  for (const site of scanClassUsages(source)) {
    const names = site.tokens.map((t) => t.token);
    const baseToken = site.tokens.find((t) => index.componentForClass(t.token));
    if (!baseToken) continue;
    // One base usage per site unlocks element constraints (`@element`) on host tags.
    for (const d of checkClassUsage(
      [
        {
          base: baseToken.token,
          tokens: names,
          token: baseToken.token,
          elementName: site.elementName,
        },
      ],
      index,
    )) {
      out.push({ start: baseToken.start, end: baseToken.end, message: `[${d.rule}] ${d.message}` });
    }
    for (const tok of site.tokens) {
      if (index.matcher.usageKind(tok.token, baseToken.token) === undefined) continue;
      for (const d of checkClassUsage(
        [
          {
            base: baseToken.token,
            tokens: names,
            token: tok.token,
            elementName: site.elementName,
          },
        ],
        index,
      )) {
        out.push({ start: tok.start, end: tok.end, message: `[${d.rule}] ${d.message}` });
      }
    }
  }
  return out;
}

interface JsxAttribute {
  name?: { name?: string };
  value?: { type?: string; value?: unknown };
}

interface JsxOpeningElement {
  name?: { name?: string };
  attributes?: JsxAttribute[];
}

function jsxTagName(node: JsxOpeningElement): string | undefined {
  const raw = node.name?.name;
  return typeof raw === "string" ? raw.toLowerCase() : undefined;
}

/** The string literal value of a JSX attribute, if it is one. */
function jsxLiteral(attr: JsxAttribute): string | undefined {
  return attr.value?.type === "Literal" && typeof attr.value.value === "string"
    ? attr.value.value
    : undefined;
}

const validClassUsage: RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Check that applied CSS classes/modifiers match the documented surface." },
    schema: [
      {
        type: "object",
        properties: {
          css: { type: "array", items: { type: "string" } },
          modifierConvention: { type: ["string", "object"] },
        },
        required: ["css"],
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = (context.options[0] ?? {}) as ClassUsageOptions;
    if (!options.css?.length) return {} as Record<string, (node: never) => void>;
    const index = indexFor(options.css, context.cwd ?? process.cwd(), options.modifierConvention);
    const isAttribute = index.matcher.convention.structure === "attribute";

    // Attribute conventions (e.g. CUBE `data-variant="ghost"`): inspect JSX element attributes.
    if (isAttribute) {
      return {
        JSXOpeningElement(node: never): void {
          const attrs = (node as JsxOpeningElement).attributes ?? [];
          const elementName = jsxTagName(node as JsxOpeningElement);
          const tokens = attrs
            .filter((a) => a.name?.name === "class" || a.name?.name === "className")
            .flatMap((a) => (jsxLiteral(a) ?? "").split(/\s+/u).filter(Boolean));
          const base = tokens.find((t) => index.componentForClass(t));
          if (!base) return;
          // Base usage for `@element` host-tag constraints.
          for (const d of checkClassUsage([{ base, tokens, token: base, elementName }], index)) {
            context.report({ node, message: `[${d.rule}] ${d.message}` });
          }
          for (const a of attrs) {
            const name = a.name?.name;
            const value = jsxLiteral(a);
            if (!name || name === "class" || name === "className" || value === undefined) continue;
            const token = `${name}="${value}"`;
            if (!index.matcher.looksLikeUsage(token, base)) continue;
            for (const d of checkClassUsage([{ base, tokens, token, elementName }], index)) {
              context.report({ node: a.value ?? a, message: `[${d.rule}] ${d.message}` });
            }
          }
        },
      };
    }

    return {
      // JSX (class conventions): scan the whole source so both static `className="…"` and dynamic
      // bindings — `:class`, `class:name`, `className={\`…\`}`, arrays, quoted object keys — are read,
      // matching the language server (`scanClassUsages`). `Program` fires for JS/JSX, not HTML.
      Program(): void {
        const sc = context.sourceCode;
        for (const d of classUsageDiagnosticsForSource(sc.text, index)) {
          context.report({
            loc: { start: sc.getLocFromIndex(d.start), end: sc.getLocFromIndex(d.end) },
            message: d.message,
          });
        }
      },
      // HTML (@html-eslint): class usage scans run on the document source (static classes only), and
      // now include host tag context for `@element` checks.
      Document(): void {
        const sc = context.sourceCode;
        for (const d of classUsageDiagnosticsForSource(sc.text, index)) {
          context.report({
            loc: { start: sc.getLocFromIndex(d.start), end: sc.getLocFromIndex(d.end) },
            message: d.message,
          });
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
