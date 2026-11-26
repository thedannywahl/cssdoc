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

| Default | Rule IDs                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `error` | `malformed-tag-header`, `missing-prose-divider`, `duplicate-singleton-tag`, `duplicate-singleton-metadata`, `invalid-surface-subject`, `inheritance-cycle`, `conflicting-annotation-definition`                                                                                                                                                                                                             |
| `warn`  | `unknown-block-tag`, `disabled-block-tag`, `unknown-remark-kind`, `disabled-remark-kind`, `invalid-inline-tag`, `unknown-inline-tag`, `empty-prose`, `surface-not-found`, `ambiguous-surface`, `undocumented-surface`, `reference-not-found`, `ambiguous-reference`, `relationship-conflict`, `restriction-mismatch`, `modifier-guidance-mismatch`, `public-ref-to-private-annotation`, `unsafe-prose-link` |
| `off`   | `tag-order`, `missing-membership-reciprocity`, `record-deprecation-requires-replacement`, `markdown-unclosed-fence`, `markdown-in-plain-prose`                                                                                                                                                                                                                                                              |

`tag-order` defaults to `warn` when an order is explicitly configured, unless its severity is also
explicitly set. Tag-specific severities override general severities within a layer; later matching
layers apply afterward.

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

## Open decisions before approval

- Define the literal inline-tag escape and link-label/URL grammar. The private-link fixture above
  intentionally uses the already-decided no-label fallback.
- Set exact `auto` prose detection and `empty-prose` applicability, stage and remark-kind name
  validation, and regular-expression matching semantics for `sinceFormat`.
- Confirm the membership restriction marker and settle repeated claims, dotted-name relationships,
  and incomplete-index behavior.
- Specify surface-specific matching, scope association, token-description conflicts, property
  namespace boundaries, and authored-versus-CSS descriptor conflict comparison.
- Settle `@affects` target syntax and whether to check connecting CSS; choose the remaining
  section keys and the treatment of non-todo remark kinds in ordinary CSS comments.
- Approve the decision table and before-and-after fixtures. The parser engine's integrated
  boundary, safety, and complete bundle checks remain a separate phase 2 gate.
