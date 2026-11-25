# cssdoc for Zed

This extension is in development and isn't published in the Zed extension registry yet. It connects
Zed to the [cssdoc language server](../language-server).

## Try the development extension

Install Rust with rustup, run **zed: install dev extension** in Zed, and select this directory.
Zed builds the extension for `wasm32-wasip2`. Open a trusted project containing documented CSS.
The [language server reference](../../docs/guide/language-server-reference.md) describes the available
features and settings.

The extension starts a configured binary first, then `cssdoc-language-server` on the worktree's
`PATH`. Otherwise, it installs the pinned `@cssdoc/language-server` package using Zed's npm API.
Automatic installation requires network access and Node.js 26 or newer. The current pin is 0.20.0.
To use a local server instead, build the workspace language server and configure its executable
explicitly.

For example, add the following to the project's `.zed/settings.json`, replacing the path with the
absolute path to a built server executable:

```json
{
  "lsp": {
    "cssdoc-language-server": {
      "binary": {
        "path": "/absolute/path/to/cssdoc-language-server",
        "arguments": ["--stdio"]
      },
      "settings": {
        "cssdoc": {
          "include": ["**/*.{css,vue}"]
        }
      }
    }
  }
}
```

Zed reads `initialization_options` and `settings` from the same language-server entry. Settings use
the nested `cssdoc` object shown above; initialization options use the flat names from the reference.
If the server doesn't start, check **zed: open log**, the project trust prompt, Node.js, and the
configured executable and arguments.

Zed disables semantic tokens by default. To request them alongside Tree-sitter highlighting, set
`"semantic_tokens": "combined"` for the language in Zed's settings. Themes and other language servers
also affect the result. See [Zed's semantic token documentation](https://zed.dev/docs/semantic-tokens).

## Release

Keep the pinned server version in `src/lib.rs` aligned with `servers/language-server/package.json`.
Publish that server version before publishing the extension. Test the exact extension commit in Zed,
including installation, startup, settings, hover, and semantic tokens, before registry submission.
