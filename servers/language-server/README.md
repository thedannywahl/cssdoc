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
for each workspace folder and reloads them after configuration changes. Other clients can push
settings under `cssdoc` with `workspace/didChangeConfiguration`. Client settings override
initialization options; an empty client `cssdoc.css` selects discovery rather than an empty index.

When the client supports watched-file registration, changes to workspace stylesheets and config files
refresh the index. The server also refreshes on document saves and uses unsaved text from open indexed
files. Clients without file watching need a save or server restart to pick up external changes.

The [language server reference](https://cssdoc.dev/guide/language-server-reference) lists all
settings and capabilities. For editor-specific setup, including Neovim and Helix, see the
[editor guide](https://cssdoc.dev/guide/editor). The server requires Node.js 26 or newer.
Hovers use portable Markdown by default; clients supporting VS Code's icons and theme HTML can set
the `hoverPresentation` initialization option to `"vscode"`.

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
