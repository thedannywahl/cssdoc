# Set up your editor

Open a project with documented CSS to get tag completions, hover information, and diagnostics while
you work.

## VS Code and compatible editors

Install the cssdoc extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=cssdoc.cssdoc-vscode)
or [Open VSX](https://open-vsx.org/extension/cssdoc/cssdoc-vscode). Open `button.css` from
[Getting started](/guide/getting-started) and type `@` on a new line inside its doc comment.
The completion menu should list cssdoc tags.

The extension scans CSS files in your workspace by default. To include Vue styles and limit the
scan to `src`, add this to `.vscode/settings.json`:

```json
{
  "cssdoc.include": ["src/**/*.{css,vue}"]
}
```

The server uses the nearest [cssdoc config](/guide/config) for each stylesheet. For extension
settings such as hover display, see the
[VS Code extension README](https://github.com/thedannywahl/cssdoc/tree/main/servers/vscode).

## Other LSP editors

Install `@cssdoc/language-server` and point your editor's LSP client at `cssdoc-language-server`.
Pass the project's stylesheet paths in `initializationOptions.css`. See the
[language server README](https://github.com/thedannywahl/cssdoc/tree/main/servers/language-server#use-it)
for the initialization options.
