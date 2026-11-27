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
import { readFileSync } from "node:fs";

import { parseCssDocs, toJson } from "@cssdoc/core";

const model = parseCssDocs(readFileSync("dist/components.css", "utf8"));
writeFileSync("css-docs.json", toJson(model));
```

`toJson` omits private examples, prose, legacy private remarks, and to-dos by default. Pass
`{ includePrivate: true }` to retain them. It doesn't resolve inline references or redact their
targets; check authored public prose before publishing it.

`cssDocSchema` describes the whole model, and `cssDocEntrySchema` describes one record. Both are
draft-07 JSON Schema objects, available from `@cssdoc/core` and the parse-free `@cssdoc/core/lite`
entry. `@cssdoc/json` re-exports them, and `@cssdoc/config` uses the same schema to validate provider
snapshots. Core doesn't depend on a schema validator.

Mark a record as internal with `@component name {@private}` in its opening tag. Emitters that
filter internal records omit it unless `includeInternal` is enabled.

Generate `@custom-media` declarations from `@structure` profile references:

```ts
import { buildCustomMediaDeclarations, parseCssDocs } from "@cssdoc/core";

const model = parseCssDocs(css);
const customMedia = buildCustomMediaDeclarations(model, {
  resolveValue: (profile) => {
    if (profile === "--top-nav") return "(width >= 64rem)";
    return true;
  },
});

// @custom-media --top-nav (width >= 64rem);
```

Or compile directly from CSS in one step:

```ts
import { compileCustomMediaDeclarations } from "@cssdoc/core";

const declarations = compileCustomMediaDeclarations(css, {
  resolveValue: (profile) => (profile === "--top-nav" ? "(width >= 64rem)" : true),
});
```

`parseCssDocs(css)` returns one `CssDocEntry` per record. It is **AST-first** — modifiers, sub-element
parts, consumed and declared custom properties, and deprecated-alias links are extracted from the
selectors, so they never drift. Authored doc comments supply only prose (summaries, descriptions) and
delimit one component from the next.

To inspect authored tag text without a CSS parser, use `parseDocComment` from `@cssdoc/core/lite`.
Its `blocks` include unknown and disabled tags as well as examples, with UTF-16 offsets relative to
the input comment. `blockSourceRange` maps a range in a block's framing-free text back to the input.
The mappings retain LF, CRLF, and CR line endings, trailing spaces, and blank lines. These blocks
contain authored text, including private content; filter it before publishing.

For Markdown-aware prose modes without a CSS parser, use `parseDocComment` from
`@cssdoc/core/prose`. The lite entry always interprets prose as plain text and doesn't load a
Markdown parser.

`scanInlineTags` finds enabled inline tags with offsets in the original text. For a scanned
`{@link ...}`, `parseInlineLink` decodes its plain-text label and validates external URLs. Reference
targets remain authored strings; this helper doesn't resolve them or determine their visibility.
`parseReference` validates record-reference framing, provider IDs, and decoded source keys, and
retains member subjects for CSS-aware matching. It doesn't resolve records or validate member CSS.
`projectPrivateLinks` from `@cssdoc/core/prose` produces literal-label fragments for references
that a caller resolves as private, while preserving code and reporting unavailable lookups. Emitters
don't use it yet.

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
.button .icon {
  /* … */
}
.button.-color-secondary {
  /* … */
}
```

| Tag                                        | Meaning                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| `@component` / `@name <id>`                | Names the record (required; marks a boundary).                                 |
| `@utility <id>`                            | Marks a single-purpose class record.                                           |
| `@declaration <id>`                        | Marks a custom-property/function declaration record.                           |
| `@selector <selector>`                     | An explicit base selector (otherwise inferred from the first bare-class rule). |
| `@summary <text>`                          | One-line intro.                                                                |
| `@modifier -<x> — <desc>`                  | Prose for a modifier (the list itself is AST-derived).                         |
| `@part` / `@csspart .<x> — <desc>`         | Prose for a sub-element part.                                                  |
| `@cssproperty --<x> [<syntax>] — <desc>`   | A declared custom property.                                                    |
| `@cssstate <x> — <desc>`                   | A component state.                                                             |
| `@example`, `@deprecated`, `@demo`, `@see` | As in TSDoc.                                                                   |

Unknown tags don't populate interpreted fields, but remain available in `parseDocComment`'s `blocks`.

**Multi-line descriptions:** Long tag descriptions can span multiple lines by indenting continuation
lines. The parser joins them into a single line, except where Markdown structure (lists, headers,
paragraph breaks) is detected and preserved:

```css
/**
 * @component button
 * @modifier -should-animate — @interaction Triggered by JS
 *   while the ring's growth animation runs.
 */
```

See the [authoring guide](/guide/authoring.md) for full documentation.

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
