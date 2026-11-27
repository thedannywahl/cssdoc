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
Record boundaries follow the core parser: ordinary block comments don't open records.

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
map entry or an incomplete source produces an unavailable result.

`resolveSelectorMemberReference` resolves `modifier`, `part`, `wrapper`, `state`, and
`pseudo-element` subjects against explicit `selectorMemberOccurrences`. Set
`selectorMembersComplete` only when that map preserves every selector occurrence for the source.
Namespaced type selectors and unsupported CSS parser forms produce an unavailable result. Neither
resolver collects those named or selector occurrences automatically.

`resolveScopeMemberReference` uses CSS `@scope` occurrences collected from a record's owned rules,
including nested scopes and source spans. Model-only indexes and indexes built with a custom dialect
parser return unavailable for scope members. Unsupported selector syntax also returns unavailable.
`resolveMediaMemberReference` and `resolveContainerMemberReference` similarly use source-backed
query occurrences and compare CSS numbers without losing decimal precision. Container names retain
their case. They return unavailable when a numeric spelling changes the token's integer type.
Unsupported query syntax, including style queries and nested conditions that the CSS parser can't
represent, also returns unavailable.
`resolveSupportsMemberReference` uses source-backed supports occurrences for declaration conditions
and supported `selector()` functions.
It preserves value case and integer token types where CSS interpretation may differ, returning
unavailable when those differences could affect a match. Unsupported functions or selector forms,
custom-property values, and nested conditions also return unavailable.

`projectPrivateLinksInLookup` projects links using the prose's original reference lookup.
It preserves labels as literal fragments and reports unavailable targets; callers must handle that
result before publishing. Public emitters don't yet apply this projection automatically.

## License

MIT
