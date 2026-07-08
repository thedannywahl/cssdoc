/**
 * The framework-agnostic core of the plugin: render CSS reference pages (via `@cssdoc/markdown`) into a
 * docs output directory and merge them into TypeDoc's sidebar. Kept free of the TypeDoc runtime so it
 * can be unit-tested directly; `index.ts` wires it to `RendererEvent.END`.
 *
 * @module
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { CssDocConfiguration } from "@cssdoc/core";
import {
  type BuildCssApiResult,
  type RenderEntryOptions,
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
  const outSubdir = options.outSubdir ?? "css";
  const label = options.label ?? "CSS";
  const baseHref = options.baseHref ?? `${outSubdir}/`;
  const cwd = options.cwd ?? process.cwd();

  const css = options.css.map((file) => readFileSync(resolve(cwd, file), "utf8"));
  const result = buildCssApi({
    css,
    outDir: join(options.outputDirectory, outSubdir),
    baseHref,
    configuration: options.configuration,
    resolveToken: options.resolveToken,
    resolveDemo: options.resolveDemo,
    headingPrefix: options.headingPrefix,
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
