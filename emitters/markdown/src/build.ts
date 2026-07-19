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
import { type CssDialect, resolveParser } from "@cssdoc/dialects";
import { parseCssDocsFromSource } from "@cssdoc/embedded";
import {
  type RenderEntryOptions,
  type RenderIndexOptions,
  groupEntries,
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
  /** The host language `css` is written in. Non-`css` values extract embedded CSS first. Default `css`. */
  lang?: "css" | "js" | "html" | "markdown";
  /** The stylesheet dialect of `css` (`scss`/`less` pick a dialect parser). Default `css`. */
  dialect?: CssDialect;
  /** The sidebar file name (defaults to `css-sidebar.json`). */
  sidebarFileName?: string;
  /**
   * Upstream cssdoc providers this doc set consumes (from `resolveProviders` in `@cssdoc/config`). Their
   * components become cross-link targets, so an `@structure` reference or Subcomponents entry pointing
   * at a provider component links out to the provider's rendered page (via its `href`).
   */
  providers?: {
    entries: readonly CssDocEntry[];
    href: (className: string) => string | undefined;
  };
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

/**
 * Build the sidebar tree (Overview, then a group per `@group` or kind). Grouping and order follow
 * {@link groupEntries}; pass `groups` for an explicit label order.
 */
export function buildSidebar(
  entries: readonly CssDocEntry[],
  baseHref = "/",
  groups?: readonly string[],
): SidebarItem[] {
  const sidebar: SidebarItem[] = [{ text: "Overview", link: baseHref }];
  for (const group of groupEntries(entries, groups)) {
    sidebar.push({
      text: group.label,
      collapsed: false,
      items: group.entries.map((e) => ({ text: e.name, link: `${baseHref}${e.name}.md` })),
    });
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
  const parse =
    options.dialect && options.dialect !== "css" ? resolveParser(options.dialect) : undefined;
  const parsed =
    options.lang && options.lang !== "css"
      ? parseCssDocsFromSource(css, {
          host: options.lang,
          configuration: options.configuration,
          parse,
        })
      : parseCssDocs(css, { configuration: options.configuration, parse });
  const entries = parsed.sort((a, b) => a.name.localeCompare(b.name));
  const baseHref = options.baseHref ?? "/";

  mkdirSync(options.outDir, { recursive: true });

  // Resolve an `@structure` sibling-component class to its page (for cross-links + the Subcomponents
  // section), unless the caller supplied its own resolver.
  const componentByClass = new Map(
    entries.map((e) => [
      e.className.replace(/^\./u, ""),
      { name: e.name, href: `${baseHref}${e.name}.md` },
    ]),
  );
  // A referenced upstream provider component links to its own page (via the provider's `href`); local
  // components win a name clash. Providers without a resolvable href aren't cross-linked.
  for (const e of options.providers?.entries ?? []) {
    const cls = e.className.replace(/^\./u, "");
    const href = options.providers?.href(cls);
    if (href && !componentByClass.has(cls)) componentByClass.set(cls, { name: e.name, href });
  }
  const resolveComponent =
    options.resolveComponent ?? ((className: string) => componentByClass.get(className));
  const renderOptions = { ...options, resolveComponent };

  const pages: string[] = [];
  for (const entry of entries) {
    const pagePath = join(options.outDir, `${entry.name}.md`);
    writeFileSync(pagePath, renderEntry(entry, renderOptions));
    pages.push(pagePath);
  }

  const indexPath = join(options.outDir, "index.md");
  writeFileSync(indexPath, renderIndex(entries, options));

  const sidebarPath = join(options.outDir, options.sidebarFileName ?? "css-sidebar.json");
  writeFileSync(
    sidebarPath,
    `${JSON.stringify(buildSidebar(entries, baseHref, options.groups), null, 2)}\n`,
  );

  return { entries, pages, indexPath, sidebarPath };
}
