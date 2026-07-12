/**
 * `@cssdoc/markdown` — an emitter that renders the `@cssdoc/core` model to markdown reference pages
 * plus a sidebar, in the shape `typedoc-plugin-markdown` / `typedoc-vitepress-theme` expect. Use
 * {@link renderEntry} / {@link renderIndex} for strings, or {@link buildCssApi} to write a whole
 * reference directory.
 *
 * @module @cssdoc/markdown
 */
export {
  DEFAULT_SECTION_ORDER,
  KIND_GROUPS,
  cell,
  escProse,
  renderEntry,
  renderIndex,
  type RenderEntryOptions,
  type RenderIndexOptions,
  type ResolveSource,
  type ResolveToken,
  type SectionKey,
} from "./render.ts";
export {
  buildCssApi,
  buildSidebar,
  type BuildCssApiOptions,
  type BuildCssApiResult,
  type SidebarItem,
} from "./build.ts";
