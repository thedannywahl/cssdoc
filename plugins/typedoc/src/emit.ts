/**
 * The framework-agnostic core of the plugin: render CSS reference pages (via `@cssdoc/markdown`) into a
 * docs output directory and merge them into TypeDoc's sidebar. Kept free of the TypeDoc runtime so it
 * can be unit-tested directly; `index.ts` wires it to `RendererEvent.END`.
 *
 * @module
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { CssDocConfigFile } from "@cssdoc/config";
import type { CssDocConfiguration } from "@cssdoc/core";
import {
  type BuildCssApiResult,
  type RenderEntryOptions,
  type SectionKey,
  type SidebarItem,
  buildCssApi,
  buildSidebar,
} from "@cssdoc/markdown";

/** The sidebar file `typedoc-plugin-markdown` / `typedoc-vitepress-theme` writes. */
export const TYPEDOC_SIDEBAR_FILE = "typedoc-sidebar.json";

/** Options for {@link emitCssApi}. */
export interface EmitCssApiOptions extends RenderEntryOptions {
  /** The TypeDoc output root (where `typedoc-sidebar.json` lives). */
  outputDirectory: string;
  /** CSS source file paths (resolved against `cwd`). */
  css: string[];
  /** Subdirectory under the output root for the CSS pages (default `"css"`). */
  outSubdir?: string;
  /** The sidebar section label (default `"CSS"`). */
  label?: string;
  /** Link prefix for the emitted pages/sidebar (default `"<outSubdir>/"`). */
  baseHref?: string;
  /** The tag configuration to parse with. */
  configuration?: CssDocConfiguration;
  /**
   * A loaded `cssdoc.json` (from `@cssdoc/config`). When given, it supplies the parse `configuration`
   * (unless one is passed explicitly) and the render defaults
   * `sectionOrder`/`headingPrefix`/`baseHref`/`structureView` from its `render` block. Any explicit
   * option above still overrides the config file.
   */
  configFile?: CssDocConfigFile;
  /** Base directory the `css` paths are resolved against (default `process.cwd()`). */
  cwd?: string;
}

/**
 * Merge a CSS section into an existing TypeDoc sidebar, replacing any prior section with the same label.
 *
 * @param existing - The parsed `typedoc-sidebar.json` array.
 * @param label - The CSS section's label.
 * @param cssItems - The CSS sidebar items (from {@link buildSidebar}).
 * @returns A new sidebar array with the CSS section appended.
 */
export function mergeCssSidebar(
  existing: SidebarItem[],
  label: string,
  cssItems: SidebarItem[],
): SidebarItem[] {
  const withoutPrior = existing.filter((item) => item.text !== label);
  return [...withoutPrior, { text: label, collapsed: false, items: cssItems }];
}

/**
 * Render CSS pages into `<outputDirectory>/<outSubdir>` and, when a `typedoc-sidebar.json` is present at
 * the output root, merge a CSS section into it.
 *
 * @param options - {@link EmitCssApiOptions}.
 * @returns The {@link BuildCssApiResult} and whether the sidebar was merged.
 */
export function emitCssApi(
  options: EmitCssApiOptions,
): BuildCssApiResult & { sidebarMerged: boolean } {
  // Render defaults come from the `cssdoc.json` `render` block when a `configFile` is supplied; any
  // explicit option passed here wins over it. The parse `configuration` likewise falls back to the file.
  const render = options.configFile?.render;
  const outSubdir = options.outSubdir ?? "css";
  const label = options.label ?? "CSS";
  const baseHref = options.baseHref ?? render?.baseHref ?? `${outSubdir}/`;
  const configuration = options.configuration ?? options.configFile?.toConfiguration();
  const sectionOrder =
    options.sectionOrder ?? (render?.sectionOrder as readonly SectionKey[] | undefined);
  const headingPrefix = options.headingPrefix ?? render?.headingPrefix;
  const structureView = options.structureView ?? render?.structureView;
  const cwd = options.cwd ?? process.cwd();

  const css = options.css.map((file) => readFileSync(resolve(cwd, file), "utf8"));
  const result = buildCssApi({
    css,
    outDir: join(options.outputDirectory, outSubdir),
    baseHref,
    configuration,
    resolveToken: options.resolveToken,
    resolveDemo: options.resolveDemo,
    resolveSource: options.resolveSource,
    importSnippet: options.importSnippet,
    sectionOrder,
    headingPrefix,
    structureView,
  });

  const sidebarPath = join(options.outputDirectory, TYPEDOC_SIDEBAR_FILE);
  let sidebarMerged = false;
  if (existsSync(sidebarPath)) {
    const existing = JSON.parse(readFileSync(sidebarPath, "utf8")) as SidebarItem[];
    const merged = mergeCssSidebar(existing, label, buildSidebar(result.entries, baseHref));
    writeFileSync(sidebarPath, `${JSON.stringify(merged, null, 2)}\n`);
    sidebarMerged = true;
  }

  return { ...result, sidebarMerged };
}
