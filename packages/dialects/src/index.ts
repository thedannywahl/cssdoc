/// <reference path="./postcss-less.d.ts" />

/**
 * `@cssdoc/dialects` — resolve a PostCSS parser for a stylesheet dialect, so cssdoc can document
 * `.scss`/`.sass`/`.less` sources (and `<style lang="scss">` blocks) the same way it documents plain
 * CSS. Pass the resolved parser as the `parse` option to `parseCssDocs`, `createIndex`, `cssValueSites`,
 * or `lintCssDocs`.
 *
 * Dialect-only constructs (`$vars`, `@mixin`, `@include`, `//` comments) are parsed but ignored by
 * cssdoc; the doc comments, class selectors, `@property` at-rules, and custom properties still read.
 *
 * @example
 * ```ts
 * import { resolveParser, dialectForFilename } from "@cssdoc/dialects";
 * import { parseCssDocs } from "@cssdoc/core";
 *
 * const parse = resolveParser(dialectForFilename("theme.scss"));
 * const records = parseCssDocs(scssSource, { parse });
 * ```
 *
 * @module \@cssdoc/dialects
 */

import { FILE_EXTENSION } from "@cssdoc/regex";
import { parse as parseCss, type Root } from "postcss";
import { parse as parseLess } from "postcss-less";
import { parse as parseScss } from "postcss-scss";

/** A stylesheet dialect cssdoc can parse. */
export type CssDialect = "css" | "scss" | "less";

/** A PostCSS parse function — turns a source string into a PostCSS `Root`. */
export type CssParse = (css: string) => Root;

/** The parser for a dialect. `"scss"` also covers `.sass` sources written in the SCSS syntax. */
export function resolveParser(dialect: CssDialect): CssParse {
  if (dialect === "scss") return (css) => parseScss(css);
  if (dialect === "less") return (css) => parseLess(css);
  return (css) => parseCss(css);
}

/** The dialect implied by a filename's extension (`.scss`/`.sass` → scss, `.less` → less, else css). */
export function dialectForFilename(filename?: string): CssDialect {
  const ext = filename?.toLowerCase().match(FILE_EXTENSION)?.[1];
  if (ext === "scss" || ext === "sass") return "scss";
  if (ext === "less") return "less";
  return "css";
}
