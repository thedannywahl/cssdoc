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
index.componentForClass(".button"); // → the button record
index.isModifier(".button", "-color-x"); // → boolean
index.deprecationOf(".button", "-old"); // → { canonical } | undefined
index.location("button", "modifier:-color-secondary"); // → { file, span } | undefined
```

`createIndex(css)` includes spans; `indexFromEntries(entries)` builds a lookup-only index from a model
snapshot (`index.toManifest()`), without spans.

`resolveRecordReference` resolves the record portion of a parsed reference across explicitly
provided workspace or provider indexes. Supply each source's portable key and scope completeness;
the result distinguishes missing, ambiguous, and unavailable lookups without selecting the last
duplicate. Member resolution is separate and isn't implemented by this function.
Source-qualified lookups are unavailable if an otherwise matching input has no source key.

`resolveNamedMemberReference` additionally resolves `csspart`, `slot`, `property`, `token`,
`function`, `keyframes`, and `layer` members using CSS-parsed identifiers. Set a source's
`membersComplete` only when every occurrence is available. If the model collapses duplicates,
provide a `namedMemberOccurrences` map keyed by the source index's `RecordInfo` objects; include an
empty list for records with no named surfaces. Each occurrence may carry its source span. A missing
map entry or an incomplete source produces an unavailable result. The index doesn't yet collect
these occurrences automatically. Selector and at-rule-prelude members aren't supported by this
function.

## License

MIT
