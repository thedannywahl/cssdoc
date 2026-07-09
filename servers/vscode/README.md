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
via `pnpm run package`.

## License

MIT
