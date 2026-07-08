/**
 * `@cssdoc/dtcg` — export the declared custom properties as W3C Design Tokens (DTCG). Each `@property`
 * becomes a token with `$value` (its `initial-value`), `$type` (mapped from its `syntax`), and
 * `$description`, grouped by the record that declares it — so properties that double as design tokens
 * interchange with the token ecosystem.
 *
 * @module
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
  $value: string;
  $type?: string;
  $description?: string;
}

/** A DTCG token document: a group per record, each holding its custom-property tokens. */
export type DtcgDocument = Record<string, Record<string, DtcgToken>>;

/** Build a DTCG token document from the index's declared custom properties. */
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

/** Write the DTCG document to `outFile` (defaults to `tokens.json`). */
export function writeDtcg(options: { index: CssDocIndex; outFile?: string }): { outFile: string } {
  const outFile = options.outFile ?? "tokens.json";
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(toDtcg(options.index), null, 2)}\n`);
  return { outFile };
}
