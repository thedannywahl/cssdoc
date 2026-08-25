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
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Loaded via `fs` rather than a `with { type: "json" }` import — tsgo (TypeScript 7's native
// declaration emitter) can't yet generate a `.d.ts` for an attributed JSON import. Left untyped
// (JSON.parse's implicit `any`) so it stays structurally assignable to whatever grammar shape a
// consumer (Shiki's `LanguageInput`, VS Code's TextMate grammar, etc.) expects.
const grammarPath = fileURLToPath(new URL("../grammarkdown.tmLanguage.json", import.meta.url));
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- see comment above
const grammar = JSON.parse(readFileSync(grammarPath, "utf8"));

/** The grammarkdown TextMate grammar, shaped as a Shiki `LanguageRegistration`. */
export const grammarkdown = grammar;

export default grammar;
