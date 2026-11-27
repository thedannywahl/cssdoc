/**
 * `@cssdoc/json` — emit the `@cssdoc/core` model as JSON: a whole-model file, optional per-record files
 * with a lightweight index, and the JSON Schema of the model (for validating/typing the output). The
 * TypeDoc `--json` analog.
 *
 * @module \@cssdoc/json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { type CssDocConfiguration, type CssDocEntry, parseCssDocs } from "@cssdoc/core";
import { type CssDialect, resolveParser } from "@cssdoc/dialects";
import { parseCssDocsFromSource } from "@cssdoc/embedded";
import {
  indexFromEntries,
  projectPublicModel,
  type PublicProseContext,
  type ReferenceLookup,
} from "@cssdoc/index";

import { cssDocSchema } from "./schema.ts";

export { cssDocEntrySchema, cssDocSchema } from "./schema.ts";

/** Either a CSS source or an already-parsed model. */
export interface ModelInput {
  /** CSS source (one string or several concatenated) to parse. */
  css?: string | string[];
  /** An already-parsed model (takes precedence over `css`). */
  entries?: CssDocEntry[];
  /** The tag configuration to parse `css` with. */
  configuration?: CssDocConfiguration;
  /** The host language `css` is written in. Non-`css` values extract embedded CSS first. Default `css`. */
  lang?: "css" | "js" | "html" | "markdown";
  /** The stylesheet dialect of `css` (`scss`/`less` pick a dialect parser). Default `css`. */
  dialect?: CssDialect;
}

/** Privacy options for JSON output. */
export interface JsonProjectionOptions {
  /** Include internal records. */
  includeInternal?: boolean;
  /** Include private authoring content without projecting links. */
  includePrivate?: boolean;
  /**
   * Provide a complete lookup for each prose field's original source. Without one, links to
   * structured references fail closed because a model snapshot doesn't establish workspace scope.
   */
  lookupFor?: (context: PublicProseContext) => ReferenceLookup;
  /** Active inline-tag vocabulary. */
  configuration?: CssDocConfiguration;
}

function projectEntries(
  entries: readonly CssDocEntry[],
  options: JsonProjectionOptions,
): CssDocEntry[] {
  if (options.includePrivate) {
    return entries.filter((entry) => options.includeInternal || entry.visibility !== "internal");
  }
  const index = indexFromEntries([...entries]);
  return projectPublicModel(entries, {
    lookupFor:
      options.lookupFor ?? (() => ({ workspace: { complete: false, sources: [{ index }] } })),
    configuration: options.configuration,
    includeInternal: options.includeInternal,
  });
}

function resolveEntries(input: ModelInput): CssDocEntry[] {
  if (input.entries) return input.entries;
  const css = Array.isArray(input.css) ? input.css.join("\n") : (input.css ?? "");
  const parse = input.dialect && input.dialect !== "css" ? resolveParser(input.dialect) : undefined;
  return input.lang && input.lang !== "css"
    ? parseCssDocsFromSource(css, { host: input.lang, configuration: input.configuration, parse })
    : parseCssDocs(css, { configuration: input.configuration, parse });
}

/**
 * Serialize the model to pretty JSON, omitting internal records and private content by default.
 *
 * @param entries - Records to serialize.
 * @param options - Whether to include internal records or private content.
 * @returns A JSON array followed by a newline.
 * @throws If a structured reference's visibility can't be established.
 */
export function renderJson(
  entries: readonly CssDocEntry[],
  options: JsonProjectionOptions = {},
): string {
  return `${JSON.stringify(projectEntries(entries, options), null, 2)}\n`;
}

/** A lightweight index row (name, kind, class, summary) for `index.json`. */
export interface JsonIndexRow {
  /** Record name. */
  name: string;
  /** Record kind. */
  kind: string;
  /** Base class selector. */
  className: string;
  /** Authored summary, when present. */
  summary?: string;
}

/** Options for {@link writeJson}. */
export interface WriteJsonOptions extends ModelInput, JsonProjectionOptions {
  /** The output directory (created if missing). */
  outDir: string;
  /** Also write one file per record under `records/`, plus an `index.json` (default `false`). */
  perRecord?: boolean;
  /** Also write the model JSON Schema as `model.schema.json` (default `false`). */
  schema?: boolean;
}

/** What {@link writeJson} produced. */
export interface WriteJsonResult {
  /** Visible entries, sorted by name. */
  entries: CssDocEntry[];
  /** Path of the whole-model JSON file. */
  modelPath: string;
  /** Paths of individual record files, when requested. */
  recordPaths: string[];
  /** Path of the record index, when requested. */
  indexPath?: string;
  /** Path of the model schema, when requested. */
  schemaPath?: string;
}

/**
 * Write `model.json` and optionally per-record files, an index, and the schema. Records are sorted by
 * name and internal records are omitted unless explicitly included.
 *
 * @param options - Input, output directory, and optional output files.
 * @returns The selected records and paths written.
 * @throws If a structured reference's visibility can't be established, parsing plain CSS fails,
 * or a filesystem operation fails. Embedded-source parsing returns no records on failure.
 */
export function writeJson(options: WriteJsonOptions): WriteJsonResult {
  const entries = projectEntries(resolveEntries(options), options).toSorted((a, b) =>
    a.name.localeCompare(b.name),
  );
  mkdirSync(options.outDir, { recursive: true });

  const modelPath = join(options.outDir, "model.json");
  writeFileSync(modelPath, renderJson(entries, { includeInternal: true, includePrivate: true }));

  const result: WriteJsonResult = { entries, modelPath, recordPaths: [] };

  if (options.perRecord) {
    const recordsDir = join(options.outDir, "records");
    mkdirSync(recordsDir, { recursive: true });
    for (const entry of entries) {
      const path = join(recordsDir, `${entry.name}.json`);
      writeFileSync(path, `${JSON.stringify(entry, null, 2)}\n`);
      result.recordPaths.push(path);
    }
    const index: JsonIndexRow[] = entries.map((e) => ({
      name: e.name,
      kind: e.kind,
      className: e.className,
      summary: e.summary,
    }));
    result.indexPath = join(options.outDir, "index.json");
    writeFileSync(result.indexPath, `${JSON.stringify(index, null, 2)}\n`);
  }

  if (options.schema) {
    result.schemaPath = join(options.outDir, "model.schema.json");
    writeFileSync(result.schemaPath, `${JSON.stringify(cssDocSchema, null, 2)}\n`);
  }

  return result;
}
