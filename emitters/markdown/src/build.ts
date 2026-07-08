/**
 * {@link buildCssApi} — parse CSS with `@cssdoc/core` and write a full markdown reference to a
 * directory: one page per record, an index, and a `css-sidebar.json` (compatible with
 * `typedoc-vitepress-theme`). The rendering lives in `render.ts`; this module adds the filesystem.
 *
 * @module
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CssDocConfiguration, CssDocEntry } from "@cssdoc/core";
import { parseCssDocs } from "@cssdoc/core";
import {
  KIND_GROUPS,
  type RenderEntryOptions,
  type RenderIndexOptions,
  renderEntry,
  renderIndex,
} from "./render.ts";

/** A `typedoc-vitepress-theme`-compatible sidebar node. */
export interface SidebarItem {
  text: string;
  link?: string;
  collapsed?: boolean;
  items?: SidebarItem[];
}

/** Options for {@link buildCssApi}. */
export interface BuildCssApiOptions extends RenderEntryOptions, RenderIndexOptions {
  /** The CSS source (one string, or several concatenated). */
  css: string | string[];
  /** The output directory (created if missing). */
  outDir: string;
  /** The tag configuration to parse with (e.g. from `@cssdoc/config`). */
  configuration?: CssDocConfiguration;
  /** The sidebar file name (defaults to `css-sidebar.json`). */
  sidebarFileName?: string;
}

/** What {@link buildCssApi} produced. */
export interface BuildCssApiResult {
  /** The parsed records, sorted by name. */
  entries: CssDocEntry[];
  /** Absolute paths of the per-record pages written. */
  pages: string[];
  /** Absolute path of the index page. */
  indexPath: string;
  /** Absolute path of the sidebar JSON. */
  sidebarPath: string;
}

/** Build the sidebar tree (Overview, then a group per kind). */
export function buildSidebar(entries: readonly CssDocEntry[], baseHref = "/"): SidebarItem[] {
  const sidebar: SidebarItem[] = [{ text: "Overview", link: baseHref }];
  for (const group of KIND_GROUPS) {
    const items = entries
      .filter((e) => e.kind === group.kind)
      .map((e) => ({ text: e.name, link: `${baseHref}${e.name}.md` }));
    if (items.length) sidebar.push({ text: group.label, collapsed: false, items });
  }
  return sidebar;
}

/**
 * Parse CSS and write the markdown reference to `outDir`.
 *
 * @param options - {@link BuildCssApiOptions}.
 * @returns The parsed entries and the paths written.
 *
 * @example
 * ```ts
 * import { buildCssApi } from "@cssdoc/markdown";
 * import { readFileSync } from "node:fs";
 *
 * buildCssApi({ css: readFileSync("dist/components.css", "utf8"), outDir: "docs/api/css" });
 * ```
 */
export function buildCssApi(options: BuildCssApiOptions): BuildCssApiResult {
  const css = Array.isArray(options.css) ? options.css.join("\n") : options.css;
  const entries = parseCssDocs(css, { configuration: options.configuration }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const baseHref = options.baseHref ?? "/";

  mkdirSync(options.outDir, { recursive: true });

  const pages: string[] = [];
  for (const entry of entries) {
    const pagePath = join(options.outDir, `${entry.name}.md`);
    writeFileSync(pagePath, renderEntry(entry, options));
    pages.push(pagePath);
  }

  const indexPath = join(options.outDir, "index.md");
  writeFileSync(indexPath, renderIndex(entries, options));

  const sidebarPath = join(options.outDir, options.sidebarFileName ?? "css-sidebar.json");
  writeFileSync(sidebarPath, `${JSON.stringify(buildSidebar(entries, baseHref), null, 2)}\n`);

  return { entries, pages, indexPath, sidebarPath };
}
