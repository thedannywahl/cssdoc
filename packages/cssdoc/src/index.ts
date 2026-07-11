/**
 * `@cssdoc/cssdoc` — the programmatic API in a single install. This umbrella package re-exports the three
 * browser-safe building blocks so you can `import { parseCssDocs, createIndex, lintModel } from "@cssdoc/cssdoc"`
 * instead of wiring up the scoped packages yourself:
 *
 * - {@link https://cssdoc.dev @cssdoc/core} — parse doc-comments + the CSS AST into a model.
 * - {@link https://cssdoc.dev @cssdoc/index} — build a queryable index with source spans.
 * - {@link https://cssdoc.dev @cssdoc/providers} — lint, complete, hover, and go-to-definition.
 *
 * Loading `cssdoc.json` files is Node-only, so it stays in its own package — add `@cssdoc/config`
 * alongside this one when you need it.
 *
 * @example
 * ```ts
 * import { parseCssDocs, createIndex, lintModel } from "@cssdoc/cssdoc";
 *
 * const model = parseCssDocs(css);
 * const findings = lintModel(createIndex(css));
 * ```
 *
 * @module @cssdoc/cssdoc
 */
export * from "@cssdoc/core";
export * from "@cssdoc/index";
export * from "@cssdoc/providers";
