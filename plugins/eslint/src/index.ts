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
 * @module \@cssdoc/eslint-plugin
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { CssDocConfigFile, resolveProviders } from "@cssdoc/config";
import type { ModifierConventionInput } from "@cssdoc/core";
import { scanClassUsages } from "@cssdoc/embedded";
import { type CssDocIndex, createIndex } from "@cssdoc/index";
import { type NamingRules, type RuleName, lintCssDocs } from "@cssdoc/lint-core";
import { type RuleSeverity, checkClassUsage } from "@cssdoc/providers";
import { CSSDOC_CUSTOM_PROPERTY_TAG_NAME } from "@cssdoc/regex";
import css from "@eslint/css";
import type { JSSyntaxElement, Linter, Rule } from "eslint";

type Position = { line: number; column: number };
const DOC_COMMENT = /\/\*\*[\s\S]*?\*\//;
const CLASS_WHITESPACE = /\s+/u;
const DEFAULT_COMPONENT_NAME = /^[A-Z]/;
const COMPONENT_NAME_SEPARATOR = /[-:]|(?=[A-Z])/;
const PROPERTY_SYNTAX = /^@property\s+--[\w-]+\s*\{[\s\S]*?syntax:\s*"([^"]+)"[\s\S]*?\}/gm;
const COLOR_VALUE = /(#[0-9a-f]{3,8}|rgb|hsl|var)/i;
const LENGTH_VALUE = /^\d+(\.\d+)?(px|em|rem|%|vh|vw)$|var\(/;
const NUMBER_VALUE = /^\d+(\.\d+)?$|var\(/;

type ReportDescriptor = Rule.ReportDescriptor & { message: string };

interface RuleContext {
  options: readonly unknown[];
  cwd?: string;
  filename?: string;
  sourceCode: { text: string; getLocFromIndex: (index: number) => Position };
  report: (descriptor: ReportDescriptor) => void;
}

function isRuleContext(value: unknown): value is RuleContext {
  if (
    typeof value !== "object" ||
    value === null ||
    !("options" in value) ||
    !Array.isArray(value.options) ||
    !("report" in value) ||
    typeof value.report !== "function" ||
    !("sourceCode" in value) ||
    typeof value.sourceCode !== "object" ||
    value.sourceCode === null
  ) {
    return false;
  }
  return (
    "text" in value.sourceCode &&
    typeof value.sourceCode.text === "string" &&
    "getLocFromIndex" in value.sourceCode &&
    typeof value.sourceCode.getLocFromIndex === "function" &&
    (!("cwd" in value) || value.cwd === undefined || typeof value.cwd === "string") &&
    (!("filename" in value) || value.filename === undefined || typeof value.filename === "string")
  );
}

function ruleContext(value: unknown): RuleContext {
  if (!isRuleContext(value)) {
    throw new TypeError("cssdoc rules require a text source and report callback");
  }
  return value;
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
    schema: Extract<NonNullable<NonNullable<Rule.RuleModule["meta"]>["schema"]>, unknown[]>;
  };
  create: (context: unknown) => Record<string, (node: JSSyntaxElement) => void>;
}

// Functions have `name` metadata, so callable presets also satisfy ESLint's config shape.
interface ConfigFactory {
  (options?: { css?: string[] }): Linter.Config[];
  readonly name: string;
}

interface Plugin {
  meta: { name: string; version: string };
  rules: Record<string, RuleModule>;
  configs: Record<string, Linter.Config[] | ConfigFactory> & {
    recommended: Linter.Config[];
    strict: Linter.Config[];
    relaxed: Linter.Config[];
    classUsage: ConfigFactory;
    full: ConfigFactory;
  };
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
  create(rawContext) {
    const context = ruleContext(rawContext);
    const options = (context.options[0] ?? {}) as DocCommentsOptions;
    // Load the nearest `cssdoc.json` (from the linted file's folder) as the config base; inline options
    // override it. `toConfiguration()` also carries custom tags to the parser.
    const configFile = loadDocConfig(dirname(context.filename ?? context.cwd ?? process.cwd()));
    return {
      StyleSheet(): void {
        const violations = lintCssDocs(context.sourceCode.text, {
          configuration: configFile.toConfiguration(),
          rules: {
            ...(context.filename
              ? configFile.ruleSeveritiesForFile(context.filename)
              : configFile.ruleSeverities),
            ...options.rules,
          },
          ruleOptions: configFile.ruleOptions,
          modifierConvention: options.modifierConvention ?? configFile.modifierConvention,
          naming: { ...configFile.naming, ...options.naming },
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
  const resolved = cssPaths.map((p) => resolve(cwd, p)).toSorted();
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

interface JsxAttribute extends JSSyntaxElement {
  name?: { name?: string };
  value?: JSSyntaxElement & { value?: unknown };
}

interface JsxOpeningElement extends JSSyntaxElement {
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
  create(rawContext): Record<string, (node: JSSyntaxElement) => void> {
    const context = ruleContext(rawContext);
    const options = (context.options[0] ?? {}) as ClassUsageOptions;
    if (!options.css?.length) return {};
    const index = indexFor(options.css, context.cwd ?? process.cwd(), options.modifierConvention);
    const isAttribute = index.matcher.convention.structure === "attribute";

    // Attribute conventions (e.g. CUBE `data-variant="ghost"`): inspect JSX element attributes.
    if (isAttribute) {
      return {
        JSXOpeningElement(node: JsxOpeningElement): void {
          const attrs = node.attributes ?? [];
          const elementName = jsxTagName(node);
          const tokens = attrs
            .filter((a) => a.name?.name === "class" || a.name?.name === "className")
            .flatMap((a) => (jsxLiteral(a) ?? "").split(CLASS_WHITESPACE).filter(Boolean));
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

// ── cssdoc/require-component-docs (author-side, @eslint/css) ──────────────────────────────────────

/**
 * Detects CSS rules that look like components (match naming conventions) but lack documentation.
 * Helps ensure all major components have at least a `@component` doc comment.
 */
const requireComponentDocs: RuleModule = {
  meta: {
    type: "suggestion",
    docs: { description: "Require @component documentation for component-like selectors." },
    schema: [
      {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: `RegExp pattern for component names (default: ${DEFAULT_COMPONENT_NAME.source})`,
          },
          skipUtilities: {
            type: "boolean",
            description: "Skip rules marked with @utility (default: true)",
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(rawContext) {
    const context = ruleContext(rawContext);
    const options = (context.options[0] ?? {}) as { pattern?: string; skipUtilities?: boolean };
    const pattern =
      options.pattern === null || options.pattern === undefined
        ? DEFAULT_COMPONENT_NAME
        : new RegExp(options.pattern);
    const skipUtilities = options.skipUtilities !== false;

    return {
      Rule(node: JSSyntaxElement): void {
        const selectorNode = "selector" in node ? node.selector : undefined;
        const selector =
          typeof selectorNode === "object" &&
          selectorNode !== null &&
          "value" in selectorNode &&
          typeof selectorNode.value === "string"
            ? selectorNode.value
            : undefined;
        if (!selector || !selector.startsWith(".")) return;

        const baseName = selector.slice(1).split(COMPONENT_NAME_SEPARATOR)[0] ?? "";
        if (!pattern.test(baseName)) return;

        // Check if this rule or its peers have docs
        const raws = "raws" in node ? node.raws : undefined;
        const docComment =
          typeof raws === "object" &&
          raws !== null &&
          "between" in raws &&
          typeof raws.between === "string"
            ? raws.between
            : "";
        const hasDoc = DOC_COMMENT.exec(docComment) !== null;
        if (hasDoc) return;

        // Check if marked as utility (skip if skipUtilities enabled)
        if (skipUtilities && docComment.includes("@utility")) return;

        context.report({
          node,
          message: `Component \`.${baseName}\` should have a @component doc comment.`,
        });
      },
    };
  },
};

// ── cssdoc/valid-custom-properties (author-side, @eslint/css) ────────────────────────────────────

/**
 * Validates custom property usage against documented syntax and constraints.
 * Ensures CSS custom properties follow declared @property or @cssproperty specifications.
 */
const validCustomProperties: RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Validate custom property usage against documented syntax." },
    schema: [],
  },
  create(rawContext) {
    const context = ruleContext(rawContext);
    // Load doc configuration to infer defaults for custom properties
    loadDocConfig(dirname(context.filename ?? process.cwd()));

    return {
      Declaration(node: JSSyntaxElement): void {
        const propName =
          "property" in node && typeof node.property === "string" ? node.property : undefined;
        if (!propName?.startsWith("--")) return;

        // Check @property syntax validation
        const propertyDefs = new Map<string, string>();
        for (const match of context.sourceCode.text.matchAll(PROPERTY_SYNTAX)) {
          const name = match[0].match(CSSDOC_CUSTOM_PROPERTY_TAG_NAME)?.[0];
          if (name) propertyDefs.set(name, match[1]);
        }

        const syntax = propertyDefs.get(propName);
        if (!syntax) return; // No declared syntax, can't validate

        // Basic syntax validation examples
        const value = "value" in node && typeof node.value === "string" ? node.value : "";
        const isColor = syntax === "<color>";
        const isLength = syntax === "<length>";
        const isNumber = syntax === "<number>";

        if (isColor && value && COLOR_VALUE.exec(value) === null) {
          context.report({
            node,
            message: `Custom property ${propName} requires a color value (syntax: <color>), got: ${value}`,
          });
        }

        if (isLength && value && LENGTH_VALUE.exec(value) === null) {
          context.report({
            node,
            message: `Custom property ${propName} requires a length value (syntax: <length>), got: ${value}`,
          });
        }

        if (isNumber && value && NUMBER_VALUE.exec(value) === null) {
          context.report({
            node,
            message: `Custom property ${propName} requires a numeric value (syntax: <number>), got: ${value}`,
          });
        }
      },
    };
  },
};

/** ESLint plugin exposing cssdoc rules and reusable configurations. */
const plugin: Plugin = {
  meta: { name: "@cssdoc/eslint-plugin", version: "0.0.0" },
  rules: {
    "valid-doc-comments": validDocComments,
    "valid-class-usage": validClassUsage,
    "require-component-docs": requireComponentDocs,
    "valid-custom-properties": validCustomProperties,
  },
  configs: {
    recommended: [],
    strict: [],
    relaxed: [],
    classUsage,
    full,
  },
};

const cssRecommendedRules = css.configs.recommended.rules;

/** A flat-config array that lints `**\/*.css` with the CSS language and enables doc-comment hygiene. */
plugin.configs.recommended = [
  {
    files: ["**/*.css"],
    plugins: { css, cssdoc: plugin },
    language: "css/css",
    rules: {
      "cssdoc/valid-doc-comments": "warn",
      // Extend @eslint/css recommended rules
      ...cssRecommendedRules,
    },
  },
];

/**
 * Strict config: recommended rules + doc-comment author hygiene at error level.
 * Use for projects with strict documentation standards.
 */
plugin.configs.strict = [
  {
    files: ["**/*.css"],
    plugins: { css, cssdoc: plugin },
    language: "css/css",
    rules: {
      "cssdoc/valid-doc-comments": [
        "error",
        {
          rules: {
            "unknown-modifier": "error",
            "unknown-part": "error",
            "unknown-pseudo": "error",
            "unknown-state": "error",
            "unknown-function": "error",
            "unknown-layer": "error",
            "unknown-animation": "error",
          },
        },
      ],
      // Extend @eslint/css recommended rules
      ...cssRecommendedRules,
    },
  },
];

/**
 * Relaxed config: basic doc-comment validation without enforcing all named-entity existence.
 * Use for projects with lenient documentation standards or early-stage development.
 */
plugin.configs.relaxed = [
  {
    files: ["**/*.css"],
    plugins: { css, cssdoc: plugin },
    language: "css/css",
    rules: {
      "cssdoc/valid-doc-comments": [
        "warn",
        {
          rules: {
            "unknown-modifier": "off",
            "unknown-part": "off",
            "unknown-pseudo": "off",
            "unknown-state": "off",
            "unknown-function": "off",
            "unknown-layer": "off",
            "unknown-animation": "off",
          },
        },
      ],
      // Extend @eslint/css recommended rules
      ...cssRecommendedRules,
    },
  },
];

/**
 * Class-usage config: validates consumer-side class applications in JS/TS/JSX/HTML.
 * Use in addition to other configs to lint component class usage.
 *
 * @example
 * ```js
 * // eslint.config.js
 * import cssdoc from "@cssdoc/eslint-plugin";
 * import html from "@html-eslint/parser";
 *
 * export default [
 *   ...cssdoc.configs.recommended,
 *   ...cssdoc.configs.classUsage({ css: ["dist/components.css"] }),
 *   {
 *     files: ["**\/*.html"],
 *     languageOptions: { parser: html },
 *   },
 * ];
 * ```
 */
function classUsage(options?: { css?: string[] }): Linter.Config[] {
  return [
    {
      files: ["**/*.{js,jsx,ts,tsx}"],
      plugins: { cssdoc: plugin },
      rules: { "cssdoc/valid-class-usage": ["warn", options] },
    },
    {
      files: ["**/*.html"],
      plugins: { cssdoc: plugin },
      rules: { "cssdoc/valid-class-usage": ["warn", options] },
    },
  ];
}

/**
 * Full preset: recommended doc-comment validation + class-usage checks.
 * Use for complete cssdoc coverage (authors + consumers).
 *
 * @example
 * ```js
 * // eslint.config.js
 * import cssdoc from "@cssdoc/eslint-plugin";
 *
 * export default [
 *   ...cssdoc.configs.full({ css: ["dist/components.css"] }),
 * ];
 * ```
 */
function full(options?: { css?: string[] }): Linter.Config[] {
  return [...plugin.configs.recommended, ...plugin.configs.classUsage(options)];
}

export default plugin;
