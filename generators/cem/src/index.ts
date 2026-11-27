/**
 * `@cssdoc/cem` — generate a Custom Elements Manifest from the cssdoc model. cssdoc's vocabulary is
 * CEM-shaped (`@cssproperty`, `@csspart`, `@cssstate`), so each documented record maps to a declaration
 * carrying `cssProperties`, `cssParts`, and `cssStates` — making the model interoperable with the CEM
 * tooling ecosystem.
 *
 * @module \@cssdoc/cem
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { CssDocIndex } from "@cssdoc/index";

const stripDot = (name: string): string => (name.startsWith(".") ? name.slice(1) : name);

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
  /** Custom Elements Manifest schema version. */
  schemaVersion: string;
  /** Modules containing the generated declarations. */
  modules: CemModule[];
}

/**
 * Build a Custom Elements Manifest with one declaration per indexed record. Only shadow parts and
 * custom states map to CEM parts and states; class-based parts and native pseudo-classes do not.
 *
 * @param index - Index containing records and their documented CSS members.
 * @param options - Optional module path; defaults to the index filename, then `styles.css`.
 * @returns A manifest with one JavaScript module containing the record declarations.
 */
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
    // CEM `cssParts` are shadow-DOM `::part()` parts; class-based `parts` have no CEM slot.
    cssParts: entry.shadowParts.map((p) => ({ name: p.name, description: p.description })),
    // CEM `cssStates` are custom `:state()` states only — not native pseudo-classes or state classes.
    cssStates: entry.states
      .filter((s) => s.kind === "custom")
      .map((s) => ({ name: s.name, description: s.description })),
  }));
  return { schemaVersion: "2.1.0", modules: [{ kind: "javascript-module", path, declarations }] };
}

/**
 * Write a pretty-printed manifest, creating parent directories as needed.
 *
 * @param options - The source index, optional module path, and output path; the output defaults to
 * `custom-elements.json`.
 * @returns The output path.
 * @throws If a filesystem operation fails.
 */
export function writeCem(options: { index: CssDocIndex; outFile?: string; path?: string }): {
  /** Path where the manifest was written. */
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
