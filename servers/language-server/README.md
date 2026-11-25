# @cssdoc/language-server

An editor-agnostic [LSP](https://microsoft.github.io/language-server-protocol/) server for the
documented CSS surface, over [`@cssdoc/providers`](../../packages/providers). It offers tag, class, modifier, and custom-property completions; documentation hover; definitions;
diagnostics and deprecation quick fixes; semantic tokens for doc comments; and custom-property inlay
hints. Client capabilities and settings determine which features are displayed.

## Use it

Start `cssdoc-language-server --stdio` and provide workspace folders through LSP. By default, the
server discovers `**/*.css` in each folder, excluding `node_modules`. Configure discovery with
`initializationOptions.include` and `initializationOptions.exclude`, or set
`initializationOptions.css` to an explicit list of paths (including an empty list to disable
discovery). Relative paths resolve against each workspace folder. Without a workspace folder, automatic
discovery is disabled and relative explicit paths resolve against the server's working directory.

When a client supports `workspace/configuration`, the server reads its `cssdoc` settings separately
for each workspace folder and reloads them after configuration changes. Client settings override
initialization options. The `cssdoc.css` client setting uses an empty array to select discovery;
an empty `initializationOptions.css` explicitly selects no files. Hover settings use
`cssdoc.hover.detail`, `cssdoc.hover.sections`, and `cssdoc.hover.sectionOrder`.
Clients without `workspace/configuration` can send a `workspace/didChangeConfiguration` notification
with settings under `cssdoc`.

| Client setting                        | Default                  | Purpose                                          |
| ------------------------------------- | ------------------------ | ------------------------------------------------ |
| `cssdoc.css`                          | `[]`                     | Explicit paths; a nonempty list overrides globs. |
| `cssdoc.include`                      | `["**/*.css"]`           | Workspace-relative discovery globs.              |
| `cssdoc.exclude`                      | `["**/node_modules/**"]` | Excluded discovery globs.                        |
| `cssdoc.hover.detail`                 | `"full"`                 | Component hover detail level.                    |
| `cssdoc.hover.sections`               | `{}`                     | Section visibility in custom-detail hovers.      |
| `cssdoc.hover.sectionOrder`           | `[]`                     | Hover section order; empty uses the default.     |
| `cssdoc.editor.providerDiscovery`     | `true`                   | Discover nested configs, even without local CSS. |
| `cssdoc.editor.providerScanDepth`     | `3`                      | Maximum depth for nested config discovery.       |
| `cssdoc.editor.providerGlobs`         | `true`                   | Expand provider path globs.                      |
| `cssdoc.editor.circularReferenceMode` | `"warn"`                 | Handling for repeated provider paths.            |

Initialization options use `css`, `include`, `exclude`, `hoverDetail`, `hoverSections`,
`hoverSectionOrder`, `providerDiscovery`, `providerScanDepth`, `providerGlobs`, and
`circularReferenceMode` directly.

When the client supports watched-file registration, changes to workspace stylesheets and config files
refresh the index. The server also refreshes on document saves and uses unsaved text from open indexed
files. Clients without file watching need a save or server restart to pick up external changes.

For editor-specific setup, including Neovim and Helix, see the
[editor guide](https://cssdoc.dev/guide/editor).

```jsonc
{
  "command": "cssdoc-language-server",
  "args": ["--stdio"],
  "initializationOptions": { "css": ["dist/components.css"] },
}
```

Or embed the pure service (no LSP runtime):

```ts
import { createIndex } from "@cssdoc/index";
import { CssDocLanguageService } from "@cssdoc/language-server";

const service = new CssDocLanguageService(createIndex(css, { file: "components.css" }));
service.completions(documentText, { line, character });
service.diagnostics(documentText);
```

## License

MIT
