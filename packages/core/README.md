# @cssdoc/core

TSDoc, for CSS. A small, framework-agnostic documentation extractor: parse a doc-comment grammar plus
the CSS AST into a serializable model, then build whatever emitter you like on top (markdown, JSON, a
component gallery) — the way `typedoc-plugin-markdown` builds on TypeDoc's reflections.

There's no modern, maintained "TypeDoc for plain CSS" (CSSdoc is abandoned, KSS-node is dated, SassDoc
is Sass-only). This is the missing core: it reads structured comments and derives the machine facts from
the actual selectors, so the docs can't drift from the shipping CSS.

## Install

```sh
npm i -D @cssdoc/core
```

## Usage

```ts
import { parseCssDocs, toJson } from "@cssdoc/core";
import { readFileSync } from "node:fs";

const model = parseCssDocs(readFileSync("dist/components.css", "utf8"));
writeFileSync("css-docs.json", toJson(model));
```

`parseCssDocs(css)` returns one `CssDocEntry` per record. It is **AST-first** — modifiers, sub-element
parts, consumed and declared custom properties, and deprecated-alias links are extracted from the
selectors, so they never drift. Authored doc comments supply only prose (summaries, descriptions) and
delimit one component from the next.

## The doc-comment grammar

A `/** … */` block above a component's rules. Records are delimited by `@component`/`@name`. The tag
vocabulary adopts the Custom Elements Manifest names (`@cssproperty`, `@csspart`, `@cssstate`) where
they exist, so it's standards-aligned:

```css
/**
 * @component button
 * @summary An accessible action control.
 * @modifier -color-secondary — A lower-emphasis action.
 * @part .icon — A leading glyph.
 * @cssproperty --ring <color> — The focus-ring colour.
 * @deprecated Use the button utility instead.
 * @demo self:button
 */
.button {
  /* … */
}
.button.-color-secondary {
  /* … */
}
```

| Tag                                        | Meaning                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `@component` / `@name <id>`                | Names the record (required; marks a boundary).                              |
| `@class <selector>`                        | An explicit base class (otherwise inferred from the first bare-class rule). |
| `@summary <text>`                          | One-line intro.                                                             |
| `@modifier -<x> — <desc>`                  | Prose for a modifier (the list itself is AST-derived).                      |
| `@part` / `@csspart .<x> — <desc>`         | Prose for a sub-element part.                                               |
| `@cssproperty --<x> [<syntax>] — <desc>`   | A declared custom property.                                                 |
| `@cssstate <x> — <desc>`                   | A component state.                                                          |
| `@example`, `@deprecated`, `@demo`, `@see` | As in TSDoc.                                                                |

Unknown tags are ignored, so the grammar degrades gracefully.

## Model

`parseCssDocs` returns `CssDocEntry[]`:

```ts
interface CssDocEntry {
  name: string;
  className: string;
  summary?: string;
  modifiers: {
    name: string;
    prop: string;
    value?: string;
    description?: string;
    deprecated?: { canonical: string };
  }[];
  parts: { name: string; description?: string }[];
  cssPropertiesConsumed: { name: string; description?: string }[];
  cssPropertiesDeclared: { name: string; syntax?: string; description?: string }[];
  examples: string[];
  demo?: string;
  deprecated?: string;
  see: string[];
  usage?: string;
  compat: string[];
  related: { name: string; description?: string }[];
  source?: { file?: string; line?: number; column?: number };
}
```

Records default to splitting on `@component`/`@name`; pass `parseCssDocs(css, { isRecordBoundary })` to
delimit on something else (e.g. a per-component header comment).

## License

MIT
