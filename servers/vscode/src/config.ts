/**
 * Pure configuration helpers for the extension — no `vscode` or `vscode-languageclient` imports, so
 * they can be unit-tested. `index.ts` (the extension entry) uses them to build the language client.
 *
 * @module
 */

/** The documents the language server is offered for. */
export const DOCUMENT_SELECTOR = [
  { scheme: "file", language: "css" },
  { scheme: "file", language: "html" },
  { scheme: "file", language: "javascriptreact" },
  { scheme: "file", language: "typescriptreact" },
] as const;

/** The `initializationOptions` sent to the server (the documented CSS file paths). */
export function initializationOptions(cssPaths: readonly string[]): { css: string[] } {
  return { css: [...cssPaths] };
}
