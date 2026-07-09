# Editor support

cssdoc brings its knowledge into the editor through a language server, so completion, hover,
go-to-definition, and quick-fixes work anywhere — driven by the same model everything else uses.

## VS Code

Install the extension (which bundles the language server) and point it at your compiled CSS:

```jsonc
// .vscode/settings.json
{
  "cssdoc.css": ["dist/components.css"],
}
```

In `.css`, `.html`, and JSX/TSX files you get:

- **Completion** — a component's modifiers inside `class`/`className`, and declared custom properties
  inside `var(--…)`;
- **Hover** — a modifier's or custom property's documentation;
- **Definition** — jump to the CSS rule that defines a class or `@property`;
- **Diagnostics + quick-fix** — unknown and deprecated modifiers, with a one-click
  replace-with-canonical fix.

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
