/**
 * `@cssdoc/cem` — generate a Custom Elements Manifest from the cssdoc model. cssdoc's vocabulary is
 * CEM-shaped (`@cssproperty`, `@csspart`, `@cssstate`), so each documented record maps to a declaration
 * carrying `cssProperties`, `cssParts`, and `cssStates` — making the model interoperable with the CEM
 * tooling ecosystem.
 *
 * @module @cssdoc/cem
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { CssDocIndex } from "@cssdoc/index";

const stripDot = (name: string): string => name.replace(/^\./u, "");

interface CemCssProperty {
  name: string;
  syntax?: string;
  default?: string;
  description?: string;
}
interface CemNamed {
  name: string;
  description?: string;
}
interface CemDeclaration {
  kind: "class";
  customElement: true;
  name: string;
  tagName: string;
  description?: string;
  deprecated?: string;
  cssProperties: CemCssProperty[];
  cssParts: CemNamed[];
  cssStates: CemNamed[];
}
interface CemModule {
  kind: "javascript-module";
  path: string;
  declarations: CemDeclaration[];
}

/** A Custom Elements Manifest. */
export interface CustomElementsManifest {
  schemaVersion: string;
  modules: CemModule[];
}

/** Build a Custom Elements Manifest from the index. */
export function toCem(index: CssDocIndex, options: { path?: string } = {}): CustomElementsManifest {
  const path = options.path ?? index.file ?? "styles.css";
  const declarations: CemDeclaration[] = index.entries.map((entry) => ({
    kind: "class",
    customElement: true,
    name: entry.name,
    tagName: stripDot(entry.className),
    description: entry.summary,
    deprecated: entry.deprecated,
    cssProperties: entry.cssPropertiesDeclared.map((p) => ({
      name: p.name,
      syntax: p.syntax,
      default: p.defaultValue,
      description: p.description,
    })),
    cssParts: entry.parts.map((p) => ({ name: p.name, description: p.description })),
    cssStates: entry.states.map((s) => ({ name: s.name, description: s.description })),
  }));
  return { schemaVersion: "2.1.0", modules: [{ kind: "javascript-module", path, declarations }] };
}

/** Write the manifest to `outFile` (defaults to `custom-elements.json`). */
export function writeCem(options: { index: CssDocIndex; outFile?: string; path?: string }): {
  outFile: string;
} {
  const outFile = options.outFile ?? "custom-elements.json";
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(
    outFile,
    `${JSON.stringify(toCem(options.index, { path: options.path }), null, 2)}\n`,
  );
  return { outFile };
}
