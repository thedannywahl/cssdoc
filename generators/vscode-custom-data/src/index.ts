/**
 * `@cssdoc/vscode-custom-data` — generate VS Code custom data from the cssdoc model, so the built-in
 * CSS and HTML language services offer completions and hover for the documented surface with no
 * extension. `html.customData` lists the component classes and modifiers as `class`-attribute values;
 * `css.customData` lists the declared custom properties.
 *
 * @module \@cssdoc/vscode-custom-data
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { CssDocIndex } from "@cssdoc/index";

const stripDot = (name: string): string => (name.startsWith(".") ? name.slice(1) : name);

/** A CSS custom-data property entry. */
export interface CssDataProperty {
  /** Custom-property name, including `--`. */
  name: string;
  /** Syntax and authored description, when present. */
  description?: string;
}

/** The `css.customData` document shape. */
export interface CssCustomData {
  /** VS Code custom-data format version. */
  version: 1.1;
  /** Declared custom properties. */
  properties: CssDataProperty[];
}

/** An HTML custom-data attribute value. */
export interface HtmlAttributeValue {
  /** Class value suggested by the HTML language service. */
  name: string;
  /** Summary or modifier description, including a deprecation marker when applicable. */
  description?: string;
}

/** The `html.customData` document shape (only the `class` global attribute is populated). */
export interface HtmlCustomData {
  /** VS Code custom-data format version. */
  version: 1.1;
  /** Global attributes offered by this data set. */
  globalAttributes: Array<{
    /** Attribute name. */
    name: string;
    /** Attribute description, when supplied. */
    description?: string;
    /** Suggested attribute values. */
    values: HtmlAttributeValue[];
  }>;
}

/** Build the `css.customData` document: the declared custom properties. */
export function cssCustomData(index: CssDocIndex): CssCustomData {
  const properties = index.allCustomProperties().map(({ property }) => ({
    name: property.name,
    description:
      [property.syntax && `syntax: \`${property.syntax}\``, property.description]
        .filter(Boolean)
        .join(" — ") || undefined,
  }));
  return { version: 1.1, properties };
}

/** Build the `html.customData` document: component classes and modifiers as `class` values. */
export function htmlCustomData(index: CssDocIndex): HtmlCustomData {
  const values: HtmlAttributeValue[] = [];
  const seen = new Set<string>();
  const add = (name: string, description?: string): void => {
    if (seen.has(name)) return;
    seen.add(name);
    values.push({ name, description });
  };
  for (const entry of index.entries) {
    add(stripDot(entry.className), entry.summary);
    for (const m of entry.modifiers) {
      add(
        `-${m.name.startsWith("-") ? m.name.slice(1) : m.name}`,
        [m.description, m.deprecated && "(deprecated)"].filter(Boolean).join(" ") || undefined,
      );
    }
  }
  return {
    version: 1.1,
    globalAttributes: [
      { name: "class", description: "Documented CSS classes and modifiers.", values },
    ],
  };
}

/** Write `css-custom-data.json` and `html-custom-data.json` into `outDir`. */
export function writeVscodeCustomData(options: { index: CssDocIndex; outDir: string }): {
  /** Path of the CSS custom-data file. */
  cssPath: string;
  /** Path of the HTML custom-data file. */
  htmlPath: string;
} {
  mkdirSync(options.outDir, { recursive: true });
  const cssPath = join(options.outDir, "css-custom-data.json");
  const htmlPath = join(options.outDir, "html-custom-data.json");
  writeFileSync(cssPath, `${JSON.stringify(cssCustomData(options.index), null, 2)}\n`);
  writeFileSync(htmlPath, `${JSON.stringify(htmlCustomData(options.index), null, 2)}\n`);
  return { cssPath, htmlPath };
}
