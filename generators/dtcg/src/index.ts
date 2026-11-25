/**
 * `@cssdoc/dtcg` — export the declared custom properties as W3C Design Tokens (DTCG). Each `@property`
 * becomes a token with `$value` (its `initial-value`), `$type` (mapped from its `syntax`), and
 * `$description`, grouped by the record that declares it — so properties that double as design tokens
 * interchange with the token ecosystem.
 *
 * @module \@cssdoc/dtcg
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { CssDocIndex } from "@cssdoc/index";

/** Map a CSS `@property` syntax descriptor to a DTCG `$type`, when there's a clear correspondence. */
const SYNTAX_TO_TYPE: Record<string, string> = {
  "<color>": "color",
  "<length>": "dimension",
  "<length-percentage>": "dimension",
  "<percentage>": "number",
  "<number>": "number",
  "<integer>": "number",
  "<time>": "duration",
  "<angle>": "number",
};

function dtcgType(syntax: string | undefined): string | undefined {
  return syntax ? SYNTAX_TO_TYPE[syntax.trim()] : undefined;
}

/** A single DTCG token. */
export interface DtcgToken {
  /** The custom property's default value, or an empty string when absent. */
  $value: string;
  /** DTCG type mapped from a recognized CSS syntax, when available. */
  $type?: string;
  /** Authored property description, when present. */
  $description?: string;
}

/** A DTCG token document: a group per record, each holding its custom-property tokens. */
export type DtcgDocument = Record<string, Record<string, DtcgToken>>;

/**
 * Build a DTCG token document from declared custom properties, grouped by record name. Leading `--`
 * is removed from token names. Missing defaults become empty strings; recognized syntax descriptors
 * supply a `$type`, while unrecognized descriptors leave it out.
 *
 * @param index - Index containing records and their declared custom properties.
 * @returns A token document; records without declared properties are omitted.
 */
export function toDtcg(index: CssDocIndex): DtcgDocument {
  const root: DtcgDocument = {};
  for (const entry of index.entries) {
    if (!entry.cssPropertiesDeclared.length) continue;
    const group: Record<string, DtcgToken> = {};
    for (const property of entry.cssPropertiesDeclared) {
      const type = dtcgType(property.syntax);
      group[property.name.replace(/^--/u, "")] = {
        $value: property.defaultValue ?? "",
        ...(type ? { $type: type } : {}),
        ...(property.description ? { $description: property.description } : {}),
      };
    }
    root[entry.name] = group;
  }
  return root;
}

/**
 * Write a pretty-printed token document, creating parent directories as needed.
 *
 * @param options - The source index and optional output path, which defaults to `tokens.json`.
 * @returns The output path.
 * @throws If a filesystem operation fails.
 */
export function writeDtcg(options: { index: CssDocIndex; outFile?: string }): {
  /** Path where the token document was written. */
  outFile: string;
} {
  const outFile = options.outFile ?? "tokens.json";
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(toDtcg(options.index), null, 2)}\n`);
  return { outFile };
}
