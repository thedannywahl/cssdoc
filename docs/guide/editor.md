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
settings such as hover display, see the [language server reference](/guide/language-server-reference).

## Other LSP editors

Install the language server in your project and make its executable available to your editor. For
example, with Vite+:

```sh
vp add -D @cssdoc/language-server
export PATH="$PWD/node_modules/.bin:$PATH"
```

Start your editor from the project directory in that shell. On Windows, add the project's
`node_modules/.bin` directory to `PATH` using your shell's syntax. The server needs Node.js 26 or
newer.

The server discovers `**/*.css` in each workspace folder, excluding `node_modules`. It uses the
nearest [cssdoc config](/guide/config) and can also index files selected by client include/exclude
settings. Completion, hover, definitions, diagnostics, quick fixes, semantic tokens, and inlay hints
depend on your client's capabilities and settings. See the
[language server reference](/guide/language-server-reference) for settings, initialization options,
and refresh behavior.

### Neovim

For Neovim 0.11 or later, add this to your Lua configuration:

```lua
vim.lsp.config("cssdoc", {
  cmd = { "cssdoc-language-server", "--stdio" },
  root_markers = { { "cssdoc.json", "cssdoc.jsonc", "package.json", ".git" } },
  filetypes = {
    "css", "scss", "less", "html", "vue", "svelte", "astro", "markdown",
    "javascript", "javascriptreact", "typescript", "typescriptreact",
  },
  -- Optional: include embedded stylesheets in the workspace index.
  settings = { cssdoc = { include = { "**/*.{css,vue}" } } },
})
vim.lsp.enable("cssdoc")
```

Open a supported file under a project root, then use `:checkhealth vim.lsp` to check the client.
Remove the optional `settings` line to use the default CSS-only discovery.

### Helix

Add this to `.helix/languages.toml` to attach cssdoc alongside Helix's default CSS language server:

```toml
[language-server.cssdoc]
command = "cssdoc-language-server"
args = ["--stdio"]

[[language]]
name = "css"
language-servers = ["vscode-css-language-server", "cssdoc"]
```

The `language-servers` list replaces the configured list for that language. Add cssdoc to other
languages in the same way, keeping the existing servers you use. Start Helix from the project root.

### Zed

Zed requires an extension to register an additional language server. cssdoc doesn't currently publish
a Zed extension, so its executable can't be attached using settings alone. See Zed's
[language server extension documentation](https://zed.dev/docs/extensions/languages#language-servers)
if you want to create a local adapter.

### Troubleshooting

- Check that `cssdoc-language-server` is on the editor's `PATH` and that the client sends the intended
  project directory as a workspace folder.
- Make sure the stylesheet is included in the server's index and that its nearest cssdoc config is
  valid. Check the language server log for discovery and provider errors.
- If your client doesn't support watched-file registration, save an open document or restart the
  server after changing files outside the editor.
