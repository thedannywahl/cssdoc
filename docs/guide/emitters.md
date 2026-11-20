# Emitting docs

Emitters consume the model and produce an output format — one package per format, the way
`typedoc-plugin-markdown` and the default HTML theme are separate emitters over TypeDoc's reflections.
Each takes CSS (or an already-parsed model) and writes files.

Every emitter also accepts a `lang` (`"js"`, `"html"`, or `"markdown"`) to extract CSS from a host file
first, and a `dialect` (`"scss"` or `"less"`) to parse a preprocessor source — see
[Embedded CSS](/guide/embedded-css). So you can emit docs straight from a `.tsx`, `.vue`, or `.scss`.

## Markdown

[`@cssdoc/markdown`](https://www.npmjs.com/package/@cssdoc/markdown) writes one Markdown page per record,
an index, and a `css-sidebar.json` compatible with `typedoc-plugin-markdown` / `typedoc-vitepress-theme`.

```ts
import { buildCssApi } from "@cssdoc/markdown";
import { readFileSync } from "node:fs";

buildCssApi({
  css: readFileSync("dist/components.css", "utf8"),
  outDir: "docs/api/css",
  baseHref: "/api/css/",
});
```

Records marked `@visibility internal` are omitted from collection output by default. Set
`includeInternal: true` when generating an author-facing reference.

Pass a `resolveToken` hook to add a Type/Value column for consumed custom properties (e.g. resolve
`--your-*` against a design-token source); an authored `@tokens` description adds a Description column.
Other `renderEntry` options: `resolveSource` (a `**Source:**` link from `entry.source` — set `fileName`
on the parse to record the file), `importSnippet` (a fenced snippet in the Usage section), `baseHref`
(the `@related` cross-link prefix), `sectionOrder` (reorder or drop the `##` sections without a
post-processor), and `classNames` (wrap just the deprecation/release-stage marker _word_ — `Deprecated`,
`experimental`, etc. — in a `<span>` with your own classes, leaving the reason prose outside, e.g.
`{ deprecated: "-your-pill", stage: { experimental: "-your-pill" } }` — so a VitePress theme can style
them as compact pills/tags; off by default to keep the output pure Markdown). `renderEntry(entry)`
/ `renderIndex(entries)` return strings if you'd rather place the output yourself.

To cross-link components from an upstream [provider](/guide/config#consuming-another-provider), pass
`providers` — the result of `resolveProviders` from `@cssdoc/config`. A referenced provider component in
an `@structure` (or the derived Subcomponents list) then links out to that provider's page:

```ts
import { CssDocConfigFile, resolveProviders } from "@cssdoc/config";

const configFile = CssDocConfigFile.loadForFolder("packages/app");
buildCssApi({
  css: readFileSync("dist/app.css", "utf8"),
  outDir: "docs/api/css",
  baseHref: "/api/css/",
  providers: resolveProviders(configFile), // each provider's `baseHref` prefixes its links
  exampleFilter: configFile.render.exampleFilters?.markdown,
});
```

## HTML

[`@cssdoc/html`](https://www.npmjs.com/package/@cssdoc/html) writes standalone, self-contained HTML —
one page per record plus an index, styled inline, dark-mode aware, no build step.

```ts
import { buildHtml } from "@cssdoc/html";
buildHtml({ css, outDir: "docs/api/html", title: "CSS API reference" });
```

Pass `exampleFilter` to `buildHtml` or `renderPage` to filter examples, for example
`exampleFilter: configFile.render.exampleFilters?.html`. Set `includeInternal: true` on `buildHtml`
to include internal records.

## JSON

[`@cssdoc/json`](https://www.npmjs.com/package/@cssdoc/json) writes the model as JSON — a whole-model
file, optional per-record files with an index, and the model's **JSON Schema** for validating or typing
the output.

```ts
import { writeJson } from "@cssdoc/json";
writeJson({ css, outDir: "docs/api/json", perRecord: true, schema: true });
```

`writeJson` omits internal records by default; pass `includeInternal: true` to include them.

## llms.txt

[`@cssdoc/llms`](https://www.npmjs.com/package/@cssdoc/llms) writes an
[`llms.txt`](https://llmstxt.org/)-style digest — a flat, token-efficient Markdown summary of every
component's surface, sized for an LLM's context window.

```ts
import { writeLlms } from "@cssdoc/llms";
writeLlms({ css, outFile: "llms.txt", title: "My CSS" });
```

`writeLlms` omits internal records by default; pass `includeInternal: true` to include them.

## Alongside a TypeDoc site

[`@cssdoc/typedoc`](https://www.npmjs.com/package/@cssdoc/typedoc) is a TypeDoc plugin: on render it
emits the CSS reference (via `@cssdoc/markdown`) into the TypeDoc output and merges it into the TypeDoc
sidebar, so CSS docs sit beside your TS API docs.

```jsonc
// typedoc.json
{
  "plugin": ["typedoc-plugin-markdown", "typedoc-vitepress-theme", "@cssdoc/typedoc"],
  "cssdocCss": ["../packages/ui/dist/components.css"],
  "cssdocConfig": "../packages/ui/cssdoc.json",
  "cssdocBaseHref": "/api/css/",
}
```
