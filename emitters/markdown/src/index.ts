/**
 * `@cssdoc/markdown` — an emitter that renders the `@cssdoc/core` model to markdown reference pages
 * plus a sidebar, in the shape `typedoc-plugin-markdown` / `typedoc-vitepress-theme` expect. Use
 * {@link renderEntry} / {@link renderIndex} for strings, or {@link buildCssApi} to write a whole
 * reference directory. The pantoken-specific token resolution is injected via the `resolveToken` hook —
 * cssdoc never hard-codes any project's tokens.
 *
 * @module
 */
export {
  KIND_GROUPS,
  cell,
  escProse,
  renderEntry,
  renderIndex,
  type RenderEntryOptions,
  type RenderIndexOptions,
  type ResolveToken,
} from "./render.ts";
export {
  buildCssApi,
  buildSidebar,
  type BuildCssApiOptions,
  type BuildCssApiResult,
  type SidebarItem,
} from "./build.ts";
