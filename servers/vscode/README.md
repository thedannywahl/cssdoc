# cssdoc for VS Code

A thin VS Code extension that runs the cssdoc language server and points it at the workspace's
documented CSS. It brings completions, hover, go-to-definition, and deprecation quick-fixes for
documented classes, modifiers, and custom properties to `.css`, `.html`, and JSX/TSX files.

## Settings

```jsonc
// .vscode/settings.json
{
  "cssdoc.css": ["dist/components.css"],
}
```

All the intelligence lives in the `cssdoc-language-server` and the cssdoc providers; this package is
just the client wiring. The extension and the server are bundled into two self-contained CommonJS files
(`dist/extension.cjs` and `dist/server.cjs`) with esbuild, and packaged to a `.vsix` with `@vscode/vsce`
via `vp run package`.

## Develop

Open this folder (`servers/vscode`) in VS Code and press **F5**. The `Run cssdoc extension` launch config
builds the bundles and opens an Extension Development Host on the bundled `examples/` project (a
documented `components.css` + `index.html`). In that window, open `index.html` to see the unknown- and
deprecated-modifier diagnostics, hover a modifier, or go to its definition.

## License

MIT
