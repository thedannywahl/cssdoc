# Editor support

cssdoc brings its knowledge into the editor through a language server, so completion, hover,
go-to-definition, and quick-fixes work anywhere — driven by the same model everything else uses.

## VS Code

Install the extension — it bundles the language server:

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=cssdoc.cssdoc-vscode)
- [Open VSX](https://open-vsx.org/extension/cssdoc/cssdoc-vscode) — for Cursor, VSCodium, Windsurf,
  Gitpod, and other non-Microsoft editors

It's **zero-config** — the extension auto-detects the CSS in your workspace. To narrow or widen what it
scans, set globs (in `.vscode/settings.json` or the Settings UI):

```jsonc
// .vscode/settings.json
{
  "cssdoc.include": ["dist/**/*.css"], // default: ["**/*.css"]
  "cssdoc.exclude": ["**/node_modules/**"], // default: ["**/node_modules/**"]
}
```

For an exact list instead, `cssdoc.css` takes explicit paths and overrides auto-detection. The set
refreshes automatically when files or settings change.

### cssdoc.json is applied automatically

The server reads the nearest [`cssdoc.json`](/guide/config) walking up from each documented CSS file,
so your custom tags, [modifier convention](/guide/modifier-conventions), rule severities, and name-case
rules all take effect in the editor — no extra settings. In a monorepo, each package's `cssdoc.json`
governs its own CSS independently, so packages can use different conventions side by side. Editing a
`cssdoc.json` reloads the affected rules live.

In CSS (`.css`, `.scss`, `.less`) and host files (HTML, JSX/TSX, Vue, Svelte, Astro, Markdown) you get:

- **Completion** — a component's modifiers inside `class`/`className`, and declared custom properties
  inside `var(--…)`;
- **Hover** — a modifier's or custom property's documentation;
- **Definition** — jump to the CSS rule that defines a class or `@property`;
- **Diagnostics + quick-fix** — doc-comment hygiene in embedded CSS, and unknown or deprecated
  modifiers where classes are used (`class`, `className`, `:class`, `class:name`), with a one-click
  replace-with-canonical fix.

To cover embedded CSS, widen the scan globs to your host files:

```jsonc
// .vscode/settings.json
{
  "cssdoc.include": ["src/**/*.{css,scss,vue,svelte,tsx}"],
}
```

See [Embedded CSS](/guide/embedded-css) for what's read from each host.

## Any LSP editor

[`@cssdoc/language-server`](https://www.npmjs.com/package/@cssdoc/language-server) is editor-agnostic.
Point your editor's LSP client at the `cssdoc-language-server` binary and pass the CSS paths as
initialization options:

```jsonc
{
  "command": "cssdoc-language-server",
  "initializationOptions": { "css": ["dist/components.css"] },
}
```

That's the same protocol Neovim, Zed, and JetBrains speak, so the features above work there too.

## Zero-setup completions

If you'd rather not run a server, the [VS Code custom data](/guide/generators#vs-code-custom-data)
generator gives you class-name and custom-property completions through VS Code's built-in language
services with just a settings entry.
