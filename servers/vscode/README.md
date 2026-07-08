# @cssdoc/vscode

A thin VS Code extension that runs [`@cssdoc/language-server`](../language-server) and points it at the
workspace's documented CSS. It brings completions, hover, go-to-definition, and deprecation quick-fixes
for documented classes, modifiers, and custom properties to `.css`, `.html`, and JSX/TSX files.

## Settings

```jsonc
// .vscode/settings.json
{
  "cssdoc.css": ["dist/components.css"],
}
```

All the intelligence lives in the server and the providers; this package is just the client wiring
(`activate`/`deactivate`). Packaging to a `.vsix` for the Marketplace is a follow-up (it needs a
bundling step via `@vscode/vsce`).

## License

MIT
