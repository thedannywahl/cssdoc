# cssdoc for VS Code

Bring your documented CSS into the editor. This extension adds completion, hover, go-to-definition,
deprecation quick-fixes, and live diagnostics for the classes, modifiers, and custom properties you
document with [cssdoc](https://cssdoc.dev) — in your `.css`, `.html`, and JSX/TSX files.

## Install

- **VS Code Marketplace** — <https://marketplace.visualstudio.com/items?itemName=cssdoc.cssdoc-vscode>
- **Open VSX** (Cursor, VSCodium, Windsurf, Gitpod, and other non‑Microsoft editors) —
  <https://open-vsx.org/extension/cssdoc/cssdoc-vscode>

Or open the Extensions view and search **cssdoc**.

## Setup

**Zero-config by default.** The extension auto-detects the CSS in your workspace and reads its doc
comments — no setting required.

To narrow or widen what it scans, set globs in your workspace settings (`.vscode/settings.json`) or the
Settings UI:

```jsonc
{
  "cssdoc.include": ["dist/**/*.css"], // default: ["**/*.css"]
  "cssdoc.exclude": ["**/node_modules/**"], // default: ["**/node_modules/**"]
}
```

Prefer an exact list? `cssdoc.css` takes explicit paths and overrides auto-detection. Either way, the set
updates automatically when files or settings change — no reload needed.

## What you get

In `.css`, `.html`, and JSX/TSX files:

- **Completion** — a component's `-modifiers` inside `class`/`className`, and declared custom properties
  inside `var(--…)`.
- **Hover** — the documentation for a modifier or custom property.
- **Go to definition** — jump to the CSS rule (or `@property`) that defines a class or property.
- **Diagnostics + quick fix** — unknown and deprecated modifiers, with a one-click
  replace-with-canonical fix. In CSS files it also flags values that don't match a registered
  `@property` syntax.

Everything is powered by the cssdoc language server, driven by the same model the rest of the toolchain
uses — so your editor and your generated docs never disagree.

## Documentation

Full guides, the tag vocabulary, and the API reference are at **[cssdoc.dev](https://cssdoc.dev)**.

## Contributing

Source, issues, and the wider cssdoc toolchain: <https://github.com/thedannywahl/cssdoc>.

## License

MIT
