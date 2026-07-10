/**
 * `@cssdoc/grammarkdown-tmlanguage` — a TextMate grammar for
 * [grammarkdown](https://github.com/rbuckton/grammarkdown), the ECMAScript-style grammar notation used
 * by TSDoc and by cssdoc's own doc-comment spec. The default export is the grammar as a Shiki
 * `LanguageRegistration` (it carries `name` and `scopeName`), so it drops straight into a Shiki or
 * VitePress config; the raw grammar is also published at `./grammarkdown.tmLanguage.json` for editors
 * and other TextMate consumers.
 *
 * @example
 * ```ts
 * // .vitepress/config.ts
 * import grammarkdown from "@cssdoc/grammarkdown-tmlanguage";
 * export default { markdown: { languages: [grammarkdown] } };
 * ```
 *
 * @module @cssdoc/grammarkdown-tmlanguage
 */
import grammar from "../grammarkdown.tmLanguage.json" with { type: "json" };

/** The grammarkdown TextMate grammar, shaped as a Shiki `LanguageRegistration`. */
export const grammarkdown = grammar;

export default grammar;
