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

/** How much a component hover card shows (`cssdoc.hover.detail`). */
export type HoverDetail = "compact" | "full" | "custom";

/** Per-section visibility for the `custom` hover detail (`cssdoc.hover.sections`). */
export type HoverSections = Record<string, "on" | "off" | "auto">;

/** The `initializationOptions` sent to the server (documented CSS paths + the hover config). */
export function initializationOptions(
  cssPaths: readonly string[],
  hoverDetail: HoverDetail = "full",
  hoverSections: HoverSections = {},
): { css: string[]; hoverDetail: HoverDetail; hoverSections: HoverSections } {
  return { css: [...cssPaths], hoverDetail, hoverSections };
}
