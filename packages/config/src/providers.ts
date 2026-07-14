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

/**
 * Resolve every provider a config declares. `.json` paths load a published model; other paths are
 * parsed as stylesheets. Paths starting with `.` resolve relative to the config file; the rest go
 * through Node resolution (so a package specifier works), mirroring `extends`.
 */
export function resolveProviders(configFile: CssDocConfigFile): ResolvedProviders {
  const entries: CssDocEntry[] = [];
  const messages: string[] = [];
  const hrefByClass = new Map<string, string>();
  const requireFrom = createRequire(configFile.filePath);
  const from = dirname(configFile.filePath);

  for (const provider of configFile.providers) {
    let resolved: string;
    try {
      resolved = provider.path.startsWith(".")
        ? resolve(from, provider.path)
        : requireFrom.resolve(provider.path);
    } catch (error) {
      messages.push(`Cannot resolve provider "${provider.path}": ${(error as Error).message}`);
      continue;
    }
    let loaded: CssDocEntry[];
    try {
      loaded = resolved.endsWith(".json") ? loadModel(resolved) : loadStylesheet(resolved);
    } catch (error) {
      messages.push(`Cannot load provider "${provider.path}": ${(error as Error).message}`);
      continue;
    }
    // A trailing slash keeps `baseHref` join-safe; the page slug matches the markdown emitter (`<name>.md`).
    const base = provider.baseHref?.replace(/\/?$/u, "/");
    for (const entry of loaded) {
      entries.push(entry);
      if (base && entry.className)
        hrefByClass.set(stripDot(entry.className), `${base}${entry.name}.md`);
    }
  }

  return { entries, messages, href: (className) => hrefByClass.get(stripDot(className)) };
}
