# CSSDoc 1.0 contract for review

Status: **Draft, not implemented or approved.** This decision table and the fixtures below describe
the intended 1.0 behavior, not the current 0.20.x implementation. They are a review artifact for
the first release gate; they don't close that gate or replace the detailed implementation plan.

## Decisions

| Area               | 1.0 contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Block grammar      | `@tag subject [scoped inline metadata] [- prose]`. A divider (`-` or `—`) precedes prose, including prose-only tags. Lists share metadata and prose; repeat tags when those differ. CSS subjects are parsed as CSS, not split blindly on commas.                                                                                                                                                                                                                                                              |
| Records and prose  | `@component`, `@utility`, and `@declaration` open records. `@name` remains a component alias. Record-header prose replaces `@summary`; extended prose uses repeatable `@remarks` with an optional kind.                                                                                                                                                                                                                                                                                                       |
| Prose modes        | `markdown` is the default; `plain` and opt-in `auto` are also available. A remark-kind override wins over a tag override, then the global mode. Block ownership doesn't change with the mode.                                                                                                                                                                                                                                                                                                                 |
| Markdown           | Start integration with CommonMark and `mdast-util-from-markdown`. The source-mapped CSSDoc scanner owns block boundaries. Phase 2 remains open until one integrated build passes the boundary and output-safety fixtures and reports complete bundle costs.                                                                                                                                                                                                                                                   |
| CSS surfaces       | The CSS AST owns modifiers, parts, consumed tokens, and other CSS facts. Tags annotate those facts; unmatched authored text is preserved for diagnostics and migration, not promoted into the resolved surface. CSS property descriptors override conflicting authored metadata.                                                                                                                                                                                                                              |
| Inline metadata    | Header metadata is scoped to its block. Modifier metadata includes `{@interaction}`, `{@global}`, `{@deprecated}`, `{@replacement ...}`, and `{@alias ...}`. `{@link ...}` in prose doesn't create a modifier relationship.                                                                                                                                                                                                                                                                                   |
| Examples and demos | Examples use positional comma-separated labels. Replace `@demo` with `@example`; remove the special demo model field, automatic demo fences, and `resolveDemo`. An authored `demo` fence remains ordinary Markdown. Report affected integrations for review.                                                                                                                                                                                                                                                  |
| Visibility         | Unmarked records, annotation definitions, and annotation references are public. Unmarked `todo` remarks default to private; other remark kinds default to public. `{@private}` controls output visibility, separately from membership restrictions.                                                                                                                                                                                                                                                           |
| Private targets    | Project public prose links to private targets to the explicitly authored label as unlinked text, or `reference` if no label was authored. Omit the target URL, identity, raw inline syntax, and resolution metadata. For a public annotation reference to a private definition, retain only the authored ID and attachment site in public JSON, and show the ID unlinked without a legend entry in Markdown and HTML. These projections don't depend on diagnostics.                                          |
| Inheritance        | A record accepts one `@extends` source. Single-value prose defaults to `fill`; repeatable prose defaults to inherited-first `append`. Inherited prose keeps its source lookup context and effective privacy. Match inherited surface prose only to a unique child surface of the same kind and canonical subject.                                                                                                                                                                                             |
| Membership         | Conflict handling defaults to `unresolved`, and reciprocity defaults to `infer`. A policy that can't select one parent retains unresolved claims. Either claim can restrict a resolved pair; a restriction mismatch doesn't weaken it.                                                                                                                                                                                                                                                                        |
| References         | Use the same grammar for `@extends`, membership, `@affects`, `{@for}`, and `{@link}`, with each tag restricting permitted targets. Bare names must resolve uniquely; kind, source, provider, and typed member qualifiers disambiguate. A failed lookup scope is unavailable, not a confirmed missing target.                                                                                                                                                                                                  |
| Source identity    | Use JSON-quoted `source("src/forms.css")::component:button` or `provider(ui, "src/forms.css")::component:button`. Decode before validating `/`-separated keys; reject absolute paths, backslashes, empty or dot segments, and controls. Disk keys are relative to the effective config directory. Generated, stdin, and outside-project inputs can use a caller-supplied `@virtual/` key. Unkeyed inputs can be parsed and linted in memory but not published or addressed by a source-qualified destination. |
| Provider IDs       | Every configured provider has a unique consumer-side `id` matching `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`. A glob has one ID; its records must have unique published source-key, kind, and name identities.                                                                                                                                                                                                                                                                                                        |
| Destinations       | `render.destinations` maps an unambiguous record reference to an extensionless path. Each explicit `/`-separated segment matches `^[a-z0-9]+(?:-[a-z0-9]+)*$` and isn't platform-reserved. Preserve safe, unique automatically derived URLs. Check final paths, case-normalized collisions, and generated files before any write; collisions are errors.                                                                                                                                                      |
| Config             | Stable configs declare `configVersion: 1`; legacy and incompatible layers require migration. Merge authored values before applying defaults. `null` clears inherited explicit settings, `[]` selects an empty list, and `overrides: null` clears inherited overrides while `overrides: []` leaves them intact.                                                                                                                                                                                                |
| Example filters    | Per-surface omission inherits, `null` resets to the surface default, `"all"` explicitly disables label filtering, and an object replaces the inherited surface filter as a unit. Visibility still applies. Migrate each legacy per-surface `null` to `"all"`.                                                                                                                                                                                                                                                 |
| Diagnostics        | Use a shared rule catalog for defaults, schema, presets, and directives, distinguishing authoring and usage applicability. Severity or suppression mustn't change parsing, resolution, or public projection. Missing, ambiguous, and unavailable outcomes are distinct.                                                                                                                                                                                                                                       |
| Published models   | Stable models use `{"modelSchemaVersion":"1.0.0","entries":[]}`. Preview revisions use `1.0.0-preview.N`; loaders accept only explicitly supported revisions and validate entries. Stable loaders reject preview and legacy models with regeneration instructions.                                                                                                                                                                                                                                            |
| Migration report   | The independent integer `reportVersion` is `1`; v1 readers accept exactly `1`. A finalized file is `migrated`, `unchanged`, or `needs-review`. A pending journal records planned hashes before writes; recovery compares both hashes and requires review if neither matches. A no-op rerun preserves the finalized report and statuses.                                                                                                                                                                       |
| Releases           | Publish npm beta and RC versions to `next` and GitHub prereleases. VS Code previews use increasing `0.21.N` versions and `--pre-release`; stable uses `1.0.0`. Bundle the matching language server and record its npm version. Open VSX and Zed use opt-in assets until their prerelease behavior is verified.                                                                                                                                                                                                |

### New rule defaults

These are the agreed defaults for new or changed 1.0 rules. Retained rule IDs keep their existing
defaults unless another decision changes them.

| Default | Rule IDs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `error` | `malformed-tag-header`, `missing-prose-divider`, `duplicate-singleton-tag`, `duplicate-singleton-metadata`, `invalid-surface-subject`, `inheritance-cycle`, `conflicting-annotation-definition`                                                                                                                                                                                                                                                                                              |
| `warn`  | `unknown-block-tag`, `disabled-block-tag`, `unknown-remark-kind`, `disabled-remark-kind`, `invalid-inline-tag`, `unknown-inline-tag`, `empty-prose`, `surface-not-found`, `ambiguous-surface`, `undocumented-surface`, `conflicting-token-description`, `property-descriptor-conflict`, `reference-not-found`, `ambiguous-reference`, `relationship-conflict`, `restriction-mismatch`, `modifier-guidance-mismatch`, `public-ref-to-private-annotation`, `unsafe-prose-link`, `since-format` |
| `off`   | `tag-order`, `missing-membership-reciprocity`, `record-deprecation-requires-replacement`, `markdown-unclosed-fence`, `markdown-in-plain-prose`                                                                                                                                                                                                                                                                                                                                               |

`tag-order` defaults to `warn` when an order is explicitly configured, unless its severity is also
explicitly set. Tag-specific severities override general severities within a layer; later matching
layers apply afterward.

`since-format` checks identifiers only when the effective format is `semver` or a pattern; an
explicit severity still controls enforcement.

### Detailed decisions

- **Inline prose:** In every mode an odd run of backslashes before `{@` escapes the opener;
  `\{@` renders as literal `{@` without the escape. Preserve original bytes for source mapping and
  migration, and preserve protected code verbatim. Links use `{@link TARGET}` or
  `{@link TARGET | Label}`. Labels are nonempty plain text with `\\`, `\|`, and `\}` escapes;
  the first unescaped top-level pipe separates the label. External links use a JSON-quoted
  `url("…")` target and accept only absolute `https:`, `http:`, or `mailto:` destinations, checked
  after decoding.
- **Automatic prose:** Select Markdown for a CommonMark parse containing emphasis, strong emphasis,
  a link, image, code, heading, list, blockquote, thematic break, hard break, or more than one
  paragraph. Raw HTML, ordinary punctuation, soft breaks, and CSSDoc inline tags alone remain
  plain. Ignore Markdown syntax inside recognized CSSDoc inline-tag spans, including plain-text link
  labels. Detection doesn't change block ownership.
- **Empty prose:** Check recognized, enabled, structurally valid `@remarks`, `@example`, and
  `@annotation` blocks with no meaningful body, plus any valid header with an explicitly opened
  but empty prose body. Whitespace and empty formatting shells are empty; visible text, an inline
  reference, and non-whitespace example code are content. Bare flags, reference-only `@ref`, and
  optional descriptions without dividers remain valid.
- **Names and versions:** Stage and remark-kind names match `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`
  case-sensitively; preserve authored spelling. Compile `sinceFormat` patterns as JavaScript regexes
  in Unicode mode, require a full-identifier match, and reject invalid patterns when loading
  config. The `semver` policy accepts SemVer 2.0.0, including prerelease and build metadata.
- **Membership:** Use `{@restricted}` on membership tags and `restricted` in `@structure`. Migrate
  positional `private` when it expresses a usage restriction. Preserve repeated parent claims in
  source order and coalesce edges; any restriction on the pair restricts the edge. Repeated
  `@memberOf` is a singleton violation; conflicting child claims leave that choice unresolved.
  `tabs.item.icon` implies `tabs.item` only without explicit child or parent-side claims; implication
  supplies neither restriction nor reciprocity. An incomplete required scope keeps the edge
  inconclusive and defers dependent unknown-target, reciprocity, and usage diagnostics.
- **Surface matching:** Match within owned CSS by surface kind and canonical subject, using parsed
  selectors, canonical identifiers, or parsed condition preludes as appropriate. Normalize comments,
  escapes, and insignificant whitespace according to CSS grammar, preserving meaningful order.
  Associate every CSS `@scope` occurrence with records whose owned rules it encloses. An unqualified
  scope tag requires exactly one occurrence; an explicit prelude matches parsed root and limit.
  Multiple matches are ambiguous.
- **Tokens and properties:** Identical token descriptions coalesce in the rendered view but retain
  every source span. Different nonempty descriptions emit `conflicting-token-description` and use
  the first in source order; unqualified token prose stays separate. Namespace `acme` matches
  `--acme-<nonempty suffix>` case-sensitively after CSS escape decoding, for documented property
  subjects only. Compare property `inherits` as a boolean, `syntax` as parsed grammar, and
  `initial-value` as normalized CSS tokens, retaining distinctions such as `0` and `0px`. On
  `property-descriptor-conflict`, the CSS descriptor remains effective. Reserve `{@initial}` for
  registration semantics. Migrate a legacy documented default to it only when the codemod can
  establish that it describes the registration; otherwise preserve the declaration for review.
- **Effects and sections:** `@affects modifier(.table--stacked) -> component:table.cell#pseudo-element(::before)`
  resolves the modifier in the current record and targets through shared references. Split target
  lists at top-level commas; the effect is authored documentation and doesn't require a connecting
  selector. Use `remarks` for unkinded remarks and `remarks:<kind>` for named kinds. Migrate
  `usage`, `compat`, `accessibility`, and `see` to `remarks:usage`, `remarks:compat`,
  `remarks:a11y`, and `remarks:see`. Keep the usage import snippet even when it's the only section
  content, retain other non-remark section keys except `demo`, and add `scopes`. Targeted alias and
  deprecation remarks render with their modifier. When `sectionOrder` is omitted, configured custom
  kinds with content follow built-in remark sections in first-occurrence order; an explicit list
  includes only named sections. Ordinary CSS comments recognize only `@remarks todo` as a remark
  directive; other kinds follow existing ordinary-comment behavior.
- **Incomplete inheritance:** If any required link in an inheritance chain is inconclusive,
  preserve the child's local documentation and leave the entire inheritance unresolved. Don't
  publish partial inherited prose, even when the direct base resolves. JSON and rendered outputs
  use the same result.

## Representative fixtures

These are review fixtures with expected outcomes, not executable tests against the current parser.

### Partial migration

Before, in `src/button.css` under a 0.20.x config:

```css
/**
 * @component button
 * @summary An action.
 * @remarks usage
 */
.button {
}
```

After safe edits and a 1.0 config migration:

```css
/**
 * @component button - An action.
 * @remarks usage
 */
.button {
}
```

**Expected:** The file is `needs-review`. Preserve `@remarks usage` verbatim: in 0.20.x it can be
literal prose, while in 1.0 it can be an empty `usage` remark. The v1 report records an
`ambiguous-legacy-syntax` issue with a stable ID, the source range, and a reason. The pending
journal records before and after SHA-256 hashes before writes. A no-op rerun leaves both the file
and finalized report byte-for-byte unchanged and retains the unresolved issue.

### Duplicate destination

Two local files each define `@component button`, one in `src/forms.css` and one in
`src/dialog.css`. Their distinct source identities both default to `button.md`.

**Expected:** Markdown emission fails before creating, deleting, or overwriting any output. The
error identifies both records and the destination. Existing output stays unchanged; neither URL
is renamed automatically. An author can disambiguate the forms record with:

```json
{
  "render": {
    "destinations": {
      "source(\"src/forms.css\")::component:button": "forms/button"
    }
  }
}
```

The forms page becomes `forms/button.md`; the dialog page remains `button.md`. HTML and per-record
JSON use the corresponding extension and output root.

### Public link to a private target

Given these 1.0 records and a complete local index:

```css
/**
 * @component public-card - See {@link component:internal-detail}.
 */
.public-card {
}

/**
 * @component internal-detail {@private} - Internal detail.
 */
.internal-detail {
}
```

**Expected:** Public Markdown and serialized JSON retain the public record and present `See
reference.` as plain text. They don't expose the private record, target identity, URL, raw inline
tag, or link-resolution metadata. The same projection applies with link diagnostics enabled or
disabled. Internal output can retain the private record and resolved link.

### Escaped and labeled links

Assume `source("src/a|b.css")::component:button` uniquely resolves to a public record:

```css
/**
 * @component link-demo - Link examples.
 * @remarks - Literal \{@link button}; see {@link source("src/a|b.css")::component:button | Open \| close \}}.
 * @remarks - Visit {@link url("https://example.com/docs") | Guide}.
 * @remarks - Code: `\{@link button}`.
 */
.link-demo {
}
```

**Expected:** The first opener is literal and displays `{@link button}` without its escape.
The source-key pipe isn't a label separator; the linked label is `Open | close }`. `Guide` links
to the validated HTTPS URL. The backslash and tag inside code remain verbatim. Preserve the
authored bytes and source ranges for all four occurrences.

### Empty prose versus a bare flag

```css
/**
 * @component button - An action.
 * @remarks -
 * @example -
 * @deprecated
 */
.button {
}
```

**Expected:** `empty-prose` reports the empty remark and example, but not the bare
`@deprecated`. Disabling the diagnostic doesn't change the parsed blocks.

### Partial membership with a dotted name

An available child record is named `tabs.item.icon`, has no `@memberOf`, and is evaluated while
the scope containing possible parent-side claims is incomplete. A unique `tabs.item` parent exists.

**Expected:** The parent edge remains inconclusive; don't assert the implied edge or emit dependent
unknown-target, missing-reciprocity, or usage diagnostics. Once the scope is complete and establishes
that there are no parent-side claims, infer `tabs.item` as the parent without a restriction or
reciprocal evidence. An explicit parent-side claim prevents that dotted-name implication.

### Matching scopes and conflicting token descriptions

```css
/**
 * @component card - A card.
 * @scope (.card) - Card scope.
 * @token --accent - First description.
 * @token --accent - Second description.
 */
@scope (.card) {
  .card {
    color: var(--accent);
  }
}
@scope (.card) {
  .card {
    border-color: var(--accent);
  }
}
```

**Expected:** Both scope occurrences belong to `card`, so the doc tag is ambiguous and produces
`ambiguous-surface`; neither occurrence is selected. `conflicting-token-description` reports the
different token descriptions, and the rendered view uses `First description.` Both token
declarations and scope occurrences retain their source spans. Suppressing either warning doesn't
change those outcomes.

### Auto detection and inline labels

With `prose.mode` set to `auto` and `button` resolving uniquely:

```css
/**
 * @component link-demo - Link examples.
 * @remarks - {@link button | *Open*}
 * @remarks - **Notice** {@link button | *Open*}
 */
.link-demo {
}
```

**Expected:** The first remark uses `plain` and displays `*Open*` literally as the link label.
The second uses Markdown because the emphasis is outside the inline tag; its link label still
displays `*Open*` literally. Both references resolve normally.

### Custom remark section order

Configure `troubleshooting` as an enabled remark kind and give `usage` and `troubleshooting` content:

```css
/**
 * @component button - An action.
 * @remarks troubleshooting - Check the connection.
 * @remarks usage - Press to continue.
 */
.button {
}
```

**Expected:** With `sectionOrder` omitted, `remarks:usage` appears before
`remarks:troubleshooting`, even though the custom remark occurs first in the source. With the
explicit order `["remarks:usage"]`, the usage section appears and the troubleshooting section
doesn't. Multiple configured custom kinds with content follow the built-ins in first-occurrence
order.

### Incomplete inheritance chain

The direct local base resolves, but its provider-backed base is unavailable:

```css
/**
 * @component base-button - Base summary.
 * @extends provider(ui)::component:foundation
 */
.base-button {
}

/**
 * @component button
 * @extends component:base-button
 * @remarks - Local note.
 */
.button {
}
```

**Expected:** The button's inheritance stays unresolved and its local remark remains available.
Neither JSON nor rendered output supplies `Base summary.` as a partial inherited summary. Report
the provider failure rather than a missing-reference warning; suppressing diagnostics doesn't
change the unresolved result.

### Documented default versus registered initial value

In 0.20.x, the control's documented default differs from the registration:

```css
@property --control-size {
  syntax: "<length>";
  inherits: false;
  initial-value: 1rem;
}

/**
 * @component control
 * @cssproperty --control-size
 * @defaultValue 2rem
 */
.control {
  --control-size: 2rem;
}
```

**Expected:** The codemod preserves the legacy `@defaultValue 2rem` declaration and marks the file
`needs-review`; it doesn't rewrite that declaration as `{@initial 2rem}`. The registered
`initial-value: 1rem` remains authoritative. A no-op migration rerun preserves the unresolved
issue and the file bytes.

## Review status

The decision table and eleven fixtures await approval. The parser engine's integrated boundary,
safety, and complete bundle checks remain a separate phase 2 gate.
