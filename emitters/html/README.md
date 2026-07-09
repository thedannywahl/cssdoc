# @cssdoc/html

Render the [`@cssdoc/core`](../../packages/core) model to standalone, self-contained HTML — one page per
record plus an index, each with inline styles and no build step. The TypeDoc default-theme analog.

## Usage

```ts
import { buildHtml } from "@cssdoc/html";
import { readFileSync } from "node:fs";

buildHtml({
  css: readFileSync("dist/components.css", "utf8"),
  outDir: "docs/api/html",
  title: "CSS API reference",
});
```

`renderPage(entry)` and `renderIndex(entries)` return HTML strings if you'd rather place the output
yourself. All prose is HTML-escaped; each page is a complete document (dark-mode aware).

## License

MIT
