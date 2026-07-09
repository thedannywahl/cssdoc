/**
 * `@cssdoc/tmlanguage` — a TextMate injection grammar that highlights cssdoc doc-comment tags inside
 * CSS comments, the way TSDoc highlights JSDoc tags inside `/** … *\/` comments. It layers onto the host
 * CSS grammar's comment scope, so `@component`, `@modifier`, `@cssproperty`, `{@link …}`, the release
 * modifiers, and custom properties light up wherever CSS is highlighted.
 *
 * The default export is the grammar as a Shiki `LanguageRegistration` (it carries `injectTo`), so it
 * drops into a Shiki or VitePress config; the raw grammar is also published at
 * `./cssdoc.injection.tmLanguage.json` for VS Code's `contributes.grammars` and other TextMate hosts.
 *
 * @example
 * ```ts
 * // .vitepress/config.ts
 * import cssdoc from "@cssdoc/tmlanguage";
 * export default { markdown: { languages: [cssdoc] } };
 * ```
 *
 * @module @cssdoc/tmlanguage
 */
import grammar from "../cssdoc.injection.tmLanguage.json" with { type: "json" };

/** The scopes the injection layers onto (CSS, plus SCSS/Less and CSS embedded in HTML `<style>`). */
export const injectTo = ["source.css", "source.scss", "source.less"];

/** The cssdoc doc-comment injection grammar, shaped as a Shiki `LanguageRegistration`. */
export const cssdoc = { ...grammar, injectTo };

export default cssdoc;
