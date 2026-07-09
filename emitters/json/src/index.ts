/**
 * `@cssdoc/json` — emit the `@cssdoc/core` model as JSON: a whole-model file, optional per-record files
 * with a lightweight index, and the JSON Schema of the model (for validating/typing the output). The
 * TypeDoc `--json` analog.
 *
 * @module @cssdoc/json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type CssDocConfiguration, type CssDocEntry, parseCssDocs } from "@cssdoc/core";
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
}

function resolveEntries(input: ModelInput): CssDocEntry[] {
  if (input.entries) return input.entries;
  const css = Array.isArray(input.css) ? input.css.join("\n") : (input.css ?? "");
  return parseCssDocs(css, { configuration: input.configuration });
}

/** Serialize the model to a pretty JSON string. */
export function renderJson(entries: readonly CssDocEntry[]): string {
  return `${JSON.stringify(entries, null, 2)}\n`;
}

/** A lightweight index row (name, kind, class, summary) for `index.json`. */
export interface JsonIndexRow {
  name: string;
  kind: string;
  className: string;
  summary?: string;
}

/** Options for {@link writeJson}. */
export interface WriteJsonOptions extends ModelInput {
  /** The output directory (created if missing). */
  outDir: string;
  /** Also write one file per record under `records/`, plus an `index.json` (default `false`). */
  perRecord?: boolean;
  /** Also write the model JSON Schema as `model.schema.json` (default `false`). */
  schema?: boolean;
}

/** What {@link writeJson} produced. */
export interface WriteJsonResult {
  entries: CssDocEntry[];
  modelPath: string;
  recordPaths: string[];
  indexPath?: string;
  schemaPath?: string;
}

/** Write the model to `outDir/model.json` (and optionally per-record files, an index, and the schema). */
export function writeJson(options: WriteJsonOptions): WriteJsonResult {
  const entries = resolveEntries(options).sort((a, b) => a.name.localeCompare(b.name));
  mkdirSync(options.outDir, { recursive: true });

  const modelPath = join(options.outDir, "model.json");
  writeFileSync(modelPath, renderJson(entries));

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
