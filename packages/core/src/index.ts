/**
 * `@cssdoc/core` — a generic, framework-agnostic documentation extractor for CSS, in the shape of
 * TSDoc/TypeDoc: parse a small doc-comment grammar plus the CSS AST into a serializable model, then let
 * an emitter turn that model into whatever output you need (markdown, JSON, a component gallery).
 *
 * The core makes no assumptions about any project, class prefix, or framework. It:
 * - reads `/** … *\/` doc comments in the {@link parseDocComment | grammar} (`@component`, `@summary`,
 *   `@modifier`, `@part`, `@cssproperty`/`@csspart`/`@cssstate`, `@example`, `@demo`, `@see`, and a
 *   `deprecated` tag), adopting the Custom Elements Manifest tag names where they exist;
 * - AST-extracts the machine facts (base class, `-modifier` families, sub-element parts, consumed and
 *   declared custom properties, deprecated-alias links) from the actual selectors — so they can't drift;
 * - returns a {@link CssDocEntry}[] model (one record per `@component`), plus a {@link toJson} helper.
 *
 * Build a project-specific emitter on top  — the way `typedoc-plugin-markdown` builds on TypeDoc's reflections.
 *
 * @example
 * ```ts
 * import { parseCssDocs, toJson } from "@cssdoc/core";
 *
 * const model = parseCssDocs(cssWithDocComments);
 * writeFileSync("css-docs.json", toJson(model));
 * ```
 *
 * @module @cssdoc/core
 */
// The full surface: the parse-free `@cssdoc/core/lite` barrel plus `parseCssDocs` (the only export that
// links a CSS parser, postcss). Consumers who never parse should import from `@cssdoc/core/lite` to keep
// postcss out of their bundle — this entry statically imports it for `parseCssDocs`.
export * from "./lite.ts";
export { parseCssDocs } from "./parse.ts";
