# @cssdoc/markdown

An emitter for [`@cssdoc/core`](../../packages/core): render the model to markdown reference pages and a
sidebar, in the shape `typedoc-plugin-markdown` / `typedoc-vitepress-theme` expect — so CSS docs theme
identically to a TypeDoc site.

## Install

```sh
npm i -D @cssdoc/markdown @cssdoc/core
```

## Usage

```ts
import { buildCssApi } from "@cssdoc/markdown";
import { readFileSync } from "node:fs";

buildCssApi({
  css: readFileSync("dist/components.css", "utf8"),
  outDir: "docs/api/css",
  baseHref: "/api/css/",
});
```

Writes one page per record, an `index.md`, and a `css-sidebar.json`. For string output without the
filesystem, use `renderEntry(entry)` and `renderIndex(entries)`.

## The `resolveToken` hook

`@cssdoc/markdown` never hard-codes any project's tokens. To show a Type/Value for each consumed custom
property (the "Tokens consumed" table), pass `resolveToken` — e.g. resolve `--mycss-*` against a design
token IR:

```ts
buildCssApi({
  css,
  outDir,
  resolveToken: (name) => {
    const token = tokenByName.get(name);
    return token ? { syntax: token.syntax, value: resolveValue(token.value) } : undefined;
  },
});
```

Without it, consumed tokens are listed by name only. An authored `@tokens --x — <desc>` adds a
Description column (and can document a token consumed indirectly, not just those found via `var()`).

## Other `renderEntry` / `buildCssApi` options

- **`resolveSource(entry)`** — return `{ href, label? }` to render a `**Source:**` link. The parser
  records `entry.source` (line/column, plus `file` when you pass `fileName` to the parse).
- **`importSnippet(entry)`** — return a snippet rendered as a fenced block in the "Usage" section,
  alongside any authored `@usage` prose (e.g. the `@import` line and class-prefix convention).
- **`baseHref`** — the link prefix for `@related` cross-links (defaults to `./`; set `""` for names only).
- **`sectionOrder`** — reorder or drop the `##` sections (see `DEFAULT_SECTION_ORDER` / `SectionKey`),
  so you don't need a post-processor.

## License

MIT
