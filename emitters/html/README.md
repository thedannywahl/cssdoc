# @cssdoc/html

Render the [`@cssdoc/core`](../../packages/core) model to standalone, self-contained HTML — one page per
record plus an index, each with inline styles and no build step. The TypeDoc default-theme analog.

## Usage

```ts
import { readFileSync } from "node:fs";

import { buildHtml } from "@cssdoc/html";

buildHtml({
  css: readFileSync("dist/components.css", "utf8"),
  outDir: "docs/api/html",
  title: "CSS API reference",
});
```

`renderPage(entry)` and `renderIndex(entries)` return HTML strings if you'd rather place the output
yourself. All prose is HTML-escaped; each page is a complete document (dark-mode aware).
Remarks and examples with recorded plain prose modes retain Markdown punctuation as literal text.
CommonMark output passes through `hast-util-sanitize`; authored HTML remains escaped text.

## License

MIT
