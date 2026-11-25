# @cssdoc/language-server

An editor-agnostic [LSP](https://microsoft.github.io/language-server-protocol/) server for the
documented CSS surface, over [`@cssdoc/providers`](../../packages/providers). It offers:

- **completion** — a component's modifiers inside `class`/`className`, and declared custom properties
  inside `var(--…)`;
- **hover** — a modifier's or custom property's documentation;
- **definition** — jump to the CSS rule that defines a class or `@property`;
- **diagnostics + quick-fix** — unknown and deprecated modifiers, with a one-click replace-with-canonical
  fix.

## Use it

Editors spawn the built binary and provide workspace folders through LSP. By default, the server
discovers `**/*.css` in each folder, excluding `node_modules`. Configure discovery with
`initializationOptions.include` and `initializationOptions.exclude`, or set
`initializationOptions.css` to an explicit list of paths (including an empty list to disable discovery).
Relative paths resolve against each workspace folder.

When a client supports `workspace/configuration`, the server reads its `cssdoc` settings separately
for each workspace folder and reloads them after configuration changes. Client settings override
initialization options. The `cssdoc.css` client setting uses an empty array to select discovery;
an empty `initializationOptions.css` explicitly selects no files. Hover settings use
`cssdoc.hover.detail`, `cssdoc.hover.sections`, and `cssdoc.hover.sectionOrder`.
The server also discovers nested config files (three directories deep by default) so their providers
work even when the folder has no indexed stylesheet. Client settings under `cssdoc.editor` control
provider discovery, scan depth, glob expansion, and repeated provider paths.

When the client supports watched-file registration, changes to workspace stylesheets and config files
refresh the index. The server also refreshes on document saves and uses unsaved text from open indexed
files. Clients without file watching need a save or server restart to pick up external changes.

```jsonc
{
  "command": "cssdoc-language-server",
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
