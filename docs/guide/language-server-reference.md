# Language server

The cssdoc language server exposes editor features through the Language Server Protocol (LSP).
For installation and editor-specific setup, see [Set up your editor](/guide/editor). For embedding
the service in code, see the generated [`@cssdoc/language-server` API](/reference/@cssdoc/language-server/).

## Starting the server

The server requires Node.js 26 or newer. An LSP client can launch
`cssdoc-language-server --stdio` and send workspace folders during initialization. The VS Code
extension starts the server for you.

The server indexes files separately for each workspace folder and groups them by their nearest
`cssdoc.json` or `cssdoc.jsonc`. It also reads the nearest config for open documents. These project
files configure parsing, lint rules, providers, and rendering; the discovery and hover settings on
this page belong to the LSP client, not to `cssdoc.json`. See the
[configuration reference](/guide/config-reference) for project settings.

Without a workspace folder, automatic stylesheet and nested-config discovery are disabled. Relative
explicit paths resolve against the server's working directory. Non-file workspace URIs aren't
scanned.

## Client settings and initialization options

Clients that support `workspace/configuration` provide a `cssdoc` configuration section. The server
requests it separately for each workspace folder and again when configuration changes. Other clients
can send `workspace/didChangeConfiguration` with settings nested under `cssdoc`. Client settings
override initialization options per setting; otherwise, the defaults below apply.

Client settings use nested `cssdoc` names; initialization options use the flat names given below.
Editors differ in how they express client settings: for example, VS Code uses dotted keys, while
another client may expect nested objects.

The server validates the type of supplied options and the values of the enumerated settings.
Initialization fails for invalid initialization options. Invalid client settings are logged as
warnings instead of being applied.

### File discovery

#### `cssdoc.include`

An array of workspace-relative discovery glob strings. It defaults to `["**/*.css"]`; its
initialization option is `include`. Include other supported file types explicitly when their embedded
or dialect CSS should enter the workspace index; see [Embedded CSS support](/guide/embedded-css-support).

#### `cssdoc.exclude`

An array of workspace-relative globs excluded from discovery. It defaults to
`["**/node_modules/**"]`; its initialization option is `exclude`.

#### `cssdoc.css`

`cssdoc.css` is an array of explicit file path strings, corresponding to the `css` initialization
option. A nonempty client list overrides `include` and `exclude`. The client setting defaults to
`[]`; an empty client list selects discovery, even if initialization supplied an explicit list. In
contrast, an `initializationOptions.css` list is explicit even when empty: `css: []` disables
stylesheet discovery unless client settings override it. Paths may be absolute; relative paths
resolve against each workspace folder. Explicit paths aren't filtered by the include or exclude globs.

#### Discovery examples

For example, this client configuration discovers CSS and Vue files under `src`:

```json
{
  "cssdoc": {
    "include": ["src/**/*.{css,vue}"],
    "exclude": ["**/node_modules/**", "**/generated/**"]
  }
}
```

This initialization option instead indexes only the named file:

```json
{
  "css": ["dist/components.css"]
}
```

### Hover display

#### `cssdoc.hover.detail`

`cssdoc.hover.detail` selects `"compact"`, `"full"`, or `"custom"` and defaults to `"full"`.
Its initialization option is `hoverDetail`. `compact` shows the component header, summary,
deprecation, and facet counts. `full` shows sections with content.

#### `cssdoc.hover.sections`

`custom` uses `cssdoc.hover.sections`, an object mapping section names to visibility modes. It
defaults to `{}`; its initialization option is `hoverSections`. `auto` shows a section only when it
has content, `on` also shows empty sections with a placeholder, and `off` hides it. Unspecified
sections use `auto`. These options affect component cards, not every kind of hover.

#### `cssdoc.hover.sectionOrder`

The default section order is `summary`, `deprecated`, `remarks`, `accessibility`, `modifiers`,
`parts`, `shadowParts`, `pseudoElements`, `states`, `customProperties`, `functions`, `slots`,
`animations`, `layers`, `conditions`, `see`, `todos`, `structure`, and `examples`. A nonempty
`cssdoc.hover.sectionOrder` string array sets both the order and the sections to show: omitted
sections are dropped. It defaults to `[]`, which uses the default order; its initialization option
is `hoverSectionOrder`. The header always comes first. The order applies to `full` and `custom`
cards, not `compact` cards.
The VS Code extension's settings schema currently lists a subset of these keys for section order.

#### Hover example

For example, a client can request a shorter card:

```json
{
  "cssdoc": {
    "hover": {
      "detail": "custom",
      "sections": { "examples": "off", "parts": "on" },
      "sectionOrder": ["summary", "deprecated", "parts"]
    }
  }
}
```

The nearest config's `render.exampleFilters.hover` can also filter examples in hover cards; see
[render options](/guide/config-reference#render-options).

### Provider discovery

#### `cssdoc.editor.providerDiscovery`

`cssdoc.editor.providerDiscovery` enables nested-config discovery and defaults to `true`; its
initialization option is `providerDiscovery`. The root config and configs governing indexed files
are loaded regardless of this boolean setting. When enabled, nested-config discovery also finds
configs with providers even if their directories contain no indexed CSS.

#### `cssdoc.editor.providerScanDepth`

`cssdoc.editor.providerScanDepth` sets the maximum depth as a non-negative integer, defaulting to
`3`; its initialization option is `providerScanDepth`. Depth counts directories below the workspace
root: `0` checks only the root. The scan skips hidden directories, `node_modules`, `dist`, and `build`.

#### `cssdoc.editor.providerGlobs`

Provider paths come from the project config's [`providers`](/guide/config-reference#providers)
field. `cssdoc.editor.providerGlobs` is a boolean, defaulting to `true`; its initialization option
is `providerGlobs`. When enabled, glob patterns expand to matching paths; when disabled, paths are
used literally. Provider resolution problems are reported in the server log.

#### `cssdoc.editor.circularReferenceMode`

`cssdoc.editor.circularReferenceMode` controls repeated resolved paths within one config's provider
list. It defaults to `"warn"`; its initialization option is `circularReferenceMode`. The accepted
values are:

- `first`, `last`, and `ignore` skip repeated paths silently. Currently `last` also retains the first
  occurrence; it doesn't replace it.
- `warn` logs a warning and processes the repeated path again.
- `error` stops provider resolution for that config, logs an error, and leaves its provider index empty.

## LSP features

The server advertises incremental document synchronization, completion, hover, definition, code
actions, full-document semantic tokens, inlay hints, and workspace-folder changes. It publishes
diagnostics for open documents. The client must attach the server to the relevant file types and
support or enable each feature; it controls how results appear.

| Feature         | Behavior                                                                                                                                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completion      | Suggests supported doc-comment tags in CSS regions, custom properties in `var()`, and documented classes or modifiers at recognized class usage sites.                                                                     |
| Hover           | Shows documentation for classes and custom properties in CSS and recognized usages, and resolves `@ref` annotations. Component cards use the hover settings above.                                                         |
| Definition      | Finds source locations for classes and custom properties in the open document or indexed workspace files. Provider-only entries aren't definition targets.                                                                 |
| Diagnostics     | Checks doc comments and registered-property usage in CSS, and recognized class usage in host documents. The nearest project config controls rules and severities. See [lint rules and diagnostics](/guide/lint-reference). |
| Quick fixes     | Replaces a deprecated modifier when its diagnostic includes a canonical replacement.                                                                                                                                       |
| Semantic tokens | Provides full-document tokens for tags and values in doc comments; the client and theme determine highlighting.                                                                                                            |
| Inlay hints     | Shows indexed custom-property metadata at matching property names. The client controls whether hints are displayed.                                                                                                        |

CSS inside supported hosts is projected for editor features; the server also recognizes CSS in the
open host document itself. See [Embedded CSS support](/guide/embedded-css-support) for supported
hosts and extraction limits. Workspace lookups depend on indexed files and declared providers.

## Refreshing the index

The server rebuilds its index after settings or workspace-folder changes, document saves, and changes
or closes of open indexed files. It uses unsaved text from open indexed files and republishes
diagnostics after a refresh. When the client supports dynamic watched-file registration, file
notifications also trigger a refresh; watched patterns cover common CSS, host, and config files as
well as configured include globs.

If file watching isn't available, save an open document or restart the server to pick up external
changes. Check the server log for configuration, discovery, indexing, and provider errors.
