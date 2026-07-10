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

/** Default globs for auto-detecting documented CSS in the workspace. */
export const DEFAULT_INCLUDE = ["**/*.css"] as const;

/** Default globs excluded from auto-detection. */
export const DEFAULT_EXCLUDE = ["**/node_modules/**"] as const;

/**
 * Combine globs into a single VS Code glob pattern (brace-expanded for multiple), or `undefined` when
 * the list is empty.
 *
 * @param globs - The glob patterns.
 * @returns A single pattern, or `undefined`.
 */
export function toGlob(globs: readonly string[]): string | undefined {
  if (globs.length === 0) return undefined;
  if (globs.length === 1) return globs[0];
  return `{${globs.join(",")}}`;
}

/** The `initializationOptions` sent to the server (the documented CSS file paths). */
export function initializationOptions(cssPaths: readonly string[]): { css: string[] } {
  return { css: [...cssPaths] };
}
