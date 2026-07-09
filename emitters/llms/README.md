# @cssdoc/llms

Render the [`@cssdoc/core`](../../packages/core) model to an [`llms.txt`](https://llmstxt.org/)-style
digest — a flat, deterministic, token-efficient Markdown summary of every component's surface, sized for
an LLM's context window. One compact block per record; empty facets are omitted.

## Usage

```ts
import { writeLlms } from "@cssdoc/llms";
import { readFileSync } from "node:fs";

writeLlms({
  css: readFileSync("dist/components.css", "utf8"),
  outFile: "llms.txt",
  title: "InstUI CSS",
  intro: "Class-based component styles.",
});
```

`renderLlms(entries, opts)` returns the string. Example block:

```md
## button — `.instui-button`

The primary action control.

- Modifiers: `-color-secondary` (A lower-emphasis action.), `-variant-old` (deprecated → `-color-secondary`)
- Parts: `.icon` (A leading glyph.)
- States: `loading`
```

## License

MIT
