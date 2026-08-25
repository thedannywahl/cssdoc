/**
 * Resolve the upstream cssdoc **providers** a `cssdoc.json` declares (its `providers` field) into a flat
 * set of {@link CssDocEntry} plus a cross-link resolver. This is how a consumer scope learns another
 * provider's documented components — so the consumer's lint, hover, and docs recognize (and link to)
 * vendor classes it composes, without a `structureIgnore` escape hatch.
 *
 * A provider is consumed via its published model (`model.json`, the JSON emitter's `CssDocEntry[]`
 * output) or a source stylesheet parsed on the spot with the provider's own convention. `extends`
 * carries configuration; `providers` carries components — the two are orthogonal.
 *
 * @module
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { type CssDocEntry, parseCssDocs } from "@cssdoc/core";
import { CssDocConfigFile } from "./CssDocConfigFile.ts";

/** Options for provider resolution. */
export interface ResolveProvidersOptions {
  /** Expand glob patterns in provider paths (e.g., `generated/*.css`). Default: true. */
  expandGlobs?: boolean;
  /**
   * How to handle circular provider references when expanding globs:
   * - `"first"`: use first occurrence in dependency tree
   * - `"last"`: use last occurrence in dependency tree
   * - `"ignore"`: skip silently
   * - `"warn"`: log and continue (default)
   * - `"error"`: fail fast
   */
  circularReferenceMode?: "first" | "last" | "ignore" | "warn" | "error";
}

const stripDot = (name: string): string => name.replace(/^\./u, "");

/** The upstream components a config consumes, plus a resolver for links to their rendered pages. */
export interface ResolvedProviders {
  /** Every component/record the declared providers document. */
  entries: CssDocEntry[];
  /** The doc-page URL for a class, from the owning provider's `baseHref` (`undefined` if none). */
  href: (className: string) => string | undefined;
  /** Resolution problems (missing file, parse/JSON error), one per provider that failed. */
  messages: string[];
}

/** Read a provider's `model.json` — a `CssDocEntry[]` or a `{ entries }` manifest wrapper. */
function loadModel(file: string): CssDocEntry[] {
  const data: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (Array.isArray(data)) return data as CssDocEntry[];
  if (data && typeof data === "object" && Array.isArray((data as { entries?: unknown }).entries)) {
    return (data as { entries: CssDocEntry[] }).entries;
  }
  throw new Error("expected a CssDocEntry[] or a { entries } manifest");
}

/** Parse a provider source stylesheet with its own governing `cssdoc.json` convention. */
function loadStylesheet(file: string): CssDocEntry[] {
  const configuration = CssDocConfigFile.loadForFolder(dirname(file)).toConfiguration();
  return parseCssDocs(readFileSync(file, "utf8"), { configuration, fileName: file });
}

/** Check if a path contains glob patterns. */
function hasGlobPattern(path: string): boolean {
  return /[*?[\]{}()!]/.test(path);
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

/**
 * Rewrite a `.foo-bar` base-class prefix per {@link ProviderRef.prefix} — anchored to the start of the
 * bare class name so it can only ever match a genuine prefix, not an incidental substring elsewhere in
 * it. Non-class base selectors (`[data-x]`, `:host`, `#id`) are left untouched; there's no prefix to
 * rewrite. `to` is spliced in verbatim, with no separator assumed.
 */
function rewriteEntryPrefix(
  entry: CssDocEntry,
  prefix: NonNullable<ProviderRef["prefix"]>,
): CssDocEntry {
  if (!entry.className?.startsWith(".")) return entry;
  const bare = entry.className.slice(1);
  const pattern = prefix.isRegExp ? prefix.from : escapeRe(prefix.from);
  const re = new RegExp(`^(?:${pattern})`, "u");
  if (!re.test(bare)) return entry;
  return { ...entry, className: `.${bare.replace(re, prefix.to ?? "")}` };
}

/** Expand glob patterns using Node's built-in glob module. */
function expandGlob(pattern: string, cwd: string): string[] {
  try {
    // Use createRequire to load globSync - this works in both ESM and CJS contexts
    // without relying on module-level helpers that break when bundled to CJS
    const requireGlob = createRequire(new URL(import.meta.url).pathname);
    const { globSync } = requireGlob("node:glob");
    return globSync(pattern, { cwd });
  } catch {
    // If glob fails, return the pattern as-is
    return [pattern];
  }
}

/**
 * Resolve every provider a config declares. `.json` paths load a published model; other paths are
 * parsed as stylesheets. Paths starting with `.` resolve relative to the config file; the rest go
 * through Node resolution (so a package specifier works), mirroring `extends`.
 *
 * When `expandGlobs` is true (default), glob patterns in provider paths are expanded using Node's glob.
 */
export function resolveProviders(
  configFile: CssDocConfigFile,
  options?: ResolveProvidersOptions,
): ResolvedProviders {
  const expandGlobs = options?.expandGlobs !== false;
  const circularReferenceMode = options?.circularReferenceMode ?? "warn";
  const entries: CssDocEntry[] = [];
  const messages: string[] = [];
  const hrefByClass = new Map<string, string>();
  const requireFrom = createRequire(configFile.filePath);
  const from = dirname(configFile.filePath);
  const seen = new Set<string>();

  for (const provider of configFile.providers) {
    // Resolve the provider path (might be a glob pattern if expandGlobs is true)
    let resolvedPaths: string[];
    try {
      const pathPattern = provider.path.startsWith(".")
        ? resolve(from, provider.path)
        : requireFrom.resolve(provider.path);

      // If it's a glob pattern and expandGlobs is enabled, expand it
      if (expandGlobs && hasGlobPattern(pathPattern)) {
        resolvedPaths = expandGlob(pathPattern, from);
      } else {
        resolvedPaths = [pathPattern];
      }

      if (resolvedPaths.length === 0) {
        messages.push(`Provider "${provider.path}": glob pattern matched no files`);
        continue;
      }
    } catch (error) {
      messages.push(`Cannot resolve provider "${provider.path}": ${(error as Error).message}`);
      continue;
    }

    // Process each resolved file
    for (const resolvedPath of resolvedPaths) {
      // Check for circular references
      if (seen.has(resolvedPath)) {
        const msg = `Circular provider reference detected: ${resolvedPath}`;
        if (circularReferenceMode === "error") {
          throw new Error(msg);
        } else if (circularReferenceMode === "warn") {
          messages.push(msg);
        }
        // "first" and "last" modes: skip (for "first" we already have it; "last" will pick it up in next iteration if needed)
        if (circularReferenceMode === "first" || circularReferenceMode === "last") {
          continue;
        }
        // "ignore" mode: continue silently
        if (circularReferenceMode === "ignore") {
          continue;
        }
      }
      seen.add(resolvedPath);

      let loaded: CssDocEntry[];
      try {
        loaded = resolvedPath.endsWith(".json")
          ? loadModel(resolvedPath)
          : loadStylesheet(resolvedPath);
      } catch (error) {
        messages.push(`Cannot load provider "${resolvedPath}": ${(error as Error).message}`);
        continue;
      }

      // A trailing slash keeps `baseHref` join-safe; the page slug matches the markdown emitter (`<name>.md`).
      const base = provider.baseHref?.replace(/\/?$/u, "/");
      for (const raw of loaded) {
        const entry = provider.prefix ? rewriteEntryPrefix(raw, provider.prefix) : raw;
        entries.push(entry);
        if (base && entry.className)
          hrefByClass.set(stripDot(entry.className), `${base}${entry.name}.md`);
      }
    }
  }

  return { entries, messages, href: (className) => hrefByClass.get(stripDot(className)) };
}
