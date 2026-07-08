# @cssdoc/index

A queryable semantic index over the [`@cssdoc/core`](../core) model — the shared data layer every
cssdoc linter and the language server query. It adds the two cross-cutting concerns those tools need:

- a host-agnostic **`Usage`** abstraction (`ClassUsage`, `PropertyUsage`) so HTML, JSX, template
  literals, and CSS selectors all feed the same providers; and
- optional **source spans**, built in a dedicated PostCSS pass (so `@cssdoc/core` stays position-free),
  powering diagnostics locations, hover ranges, and go-to-definition.

## Usage

```ts
import { createIndex } from "@cssdoc/index";

const index = createIndex(css, { file: "components.css" });
index.componentForClass(".instui-button"); // → the button record
index.isModifier(".instui-button", "-color-x"); // → boolean
index.deprecationOf(".instui-button", "-old"); // → { canonical } | undefined
index.location("button", "modifier:-color-secondary"); // → { file, span } | undefined
```

`createIndex(css)` includes spans; `indexFromEntries(entries)` builds a lookup-only index from a model
snapshot (`index.toManifest()`), without spans.

## License

MIT
