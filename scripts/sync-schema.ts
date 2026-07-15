/**
 * Single source of truth → mirrors. `cssDocSchema` in `@cssdoc/config` is the ONE hand-edited copy of
 * the `cssdoc.json` schema; this script writes it, byte-for-byte, to every location that ships or
 * references the JSON:
 *
 *   - packages/config/cssdoc.schema.json   — the npm-published copy (referenced by `$schema`)
 *   - docs/public/cssdoc.schema.json       — served at https://cssdoc.dev/cssdoc.schema.json
 *   - servers/vscode/schemas/cssdoc.schema.json — bundled with the VS Code extension
 *   - schemas/cssdoc.schema.json           — the repo-root copy
 *
 * The generated files are formatter-ignored (see `vite.config.ts` `fmt.ignorePatterns`) so their exact
 * bytes are owned here — `JSON.stringify(schema, null, 2)` + trailing newline — not by oxfmt. That lets
 * the drift check below be a plain byte comparison.
 *
 * Usage:
 *   node scripts/sync-schema.ts           regenerate every mirror from the source
 *   node scripts/sync-schema.ts --check   verify every mirror is in sync (exit 1 on drift)
 *
 * `--check` runs as part of `vp run check` and is mirrored by a test in `@cssdoc/config`, so drift
 * fails CI either way.
 *
 * @module
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { cssDocSchema } from "../packages/config/src/schema.ts";

/** Repo-root-relative paths that must mirror {@link cssDocSchema}, byte-for-byte. */
export const SCHEMA_TARGETS = [
  "packages/config/cssdoc.schema.json",
  "docs/public/cssdoc.schema.json",
  "servers/vscode/schemas/cssdoc.schema.json",
  "schemas/cssdoc.schema.json",
] as const;

/** The canonical bytes every target must contain (2-space JSON + trailing newline). */
export const SCHEMA_JSON = `${JSON.stringify(cssDocSchema, null, 2)}\n`;

const resolve = (rel: string): string => fileURLToPath(new URL(`../${rel}`, import.meta.url));

/** Return the targets whose on-disk bytes differ from the source (missing files count as drifted). */
export function findSchemaDrift(): string[] {
  return SCHEMA_TARGETS.filter((rel) => {
    try {
      return readFileSync(resolve(rel), "utf8") !== SCHEMA_JSON;
    } catch {
      return true;
    }
  });
}

if (import.meta.main) {
  if (process.argv.includes("--check")) {
    const drifted = findSchemaDrift();
    if (drifted.length) {
      console.error("cssdoc.schema.json is out of sync — run `vp run sync:schema`:");
      for (const rel of drifted) console.error(`  ✗ ${rel}`);
      process.exit(1);
    }
    console.log(`cssdoc.schema.json in sync across ${SCHEMA_TARGETS.length} locations`);
  } else {
    for (const rel of SCHEMA_TARGETS) writeFileSync(resolve(rel), SCHEMA_JSON);
    console.log(`Wrote cssdoc.schema.json to ${SCHEMA_TARGETS.length} locations`);
  }
}
