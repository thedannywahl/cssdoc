/**
 * Pure configuration helpers for the extension — no `vscode` or `vscode-languageclient` imports, so
 * they can be unit-tested. `index.ts` (the extension entry) uses them to build the language client.
 *
 * @module
 */

/**
 * The documents the language server is offered for. This mirrors the injection grammar's `injectTo`
 * hosts (see the extension `package.json`): direct stylesheets (`css`/`scss`/`less`), markup that uses
 * documented classes (`html`/`vue`/`svelte`/`astro`/`markdown`), and JS/TS in every flavor (both for
 * `className` usage and for CSS-in-JS authoring inside `css`/`styled` templates).
 */
export const DOCUMENT_SELECTOR = [
  { scheme: "file", language: "css" },
  { scheme: "file", language: "scss" },
  { scheme: "file", language: "less" },
  { scheme: "file", language: "html" },
  { scheme: "file", language: "vue" },
  { scheme: "file", language: "svelte" },
  { scheme: "file", language: "astro" },
  { scheme: "file", language: "markdown" },
  { scheme: "file", language: "javascript" },
  { scheme: "file", language: "javascriptreact" },
  { scheme: "file", language: "typescript" },
  { scheme: "file", language: "typescriptreact" },
] as const;
