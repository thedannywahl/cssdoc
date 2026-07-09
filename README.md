# @cssdoc

A framework-agnostic documentation toolchain for plain CSS — TSDoc, for CSS. Parse a doc-comment
grammar plus the CSS AST into a serializable model, then emit whatever you like on top — the way the
`@microsoft/tsdoc` family and TypeDoc split a parser, a config loader, and a set of emitters/plugins.

## Packages

Three tiers — a model, host-agnostic providers over it, and thin adapters — mirroring how TypeScript
and the CSS/HTML language services share one core.

### Model & config

| Package                                   | Path                 | What it is                                                                                                                             |
| ----------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [`@cssdoc/core`](packages/core)           | `packages/core`      | The parser + model. A formal grammar (grammarkdown) and an expansive tag vocabulary that documents the modern CSSOM surface AST-first. |
| [`@cssdoc/config`](packages/config)       | `packages/config`    | Loads a `cssdoc.json` config file (custom tags, `extends`). Like `@microsoft/tsdoc-config`.                                            |
| [`@cssdoc/index`](packages/index)         | `packages/index`     | A queryable semantic index over the model, plus the `Usage` abstraction and source spans.                                              |
| [`@cssdoc/providers`](packages/providers) | `packages/providers` | Host-agnostic aspect providers: diagnostics, completions, hover, and definitions.                                                      |
| [`@cssdoc/lint-core`](packages/lint-core) | `packages/lint-core` | Author-side doc-hygiene rules, as a façade over the providers.                                                                         |

### Emitters

| Package                                 | Path                | What it is                                                   |
| --------------------------------------- | ------------------- | ------------------------------------------------------------ |
| [`@cssdoc/markdown`](emitters/markdown) | `emitters/markdown` | Markdown pages + a sidebar (typedoc-vitepress-compatible).   |
| [`@cssdoc/html`](emitters/html)         | `emitters/html`     | Standalone, self-contained HTML pages + an index.            |
| [`@cssdoc/json`](emitters/json)         | `emitters/json`     | Structured JSON output + the model's JSON Schema.            |
| [`@cssdoc/llms`](emitters/llms)         | `emitters/llms`     | An `llms.txt`-style, token-efficient digest for LLM context. |

### Generators (standard interchange)

| Package                                                       | Path                            | What it is                                                             |
| ------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| [`@cssdoc/vscode-custom-data`](generators/vscode-custom-data) | `generators/vscode-custom-data` | VS Code `css`/`html` custom data for built-in editor completions.      |
| [`@cssdoc/cem`](generators/cem)                               | `generators/cem`                | A Custom Elements Manifest (`cssProperties`, `cssParts`, `cssStates`). |
| [`@cssdoc/dtcg`](generators/dtcg)                             | `generators/dtcg`               | Custom properties as W3C Design Tokens (DTCG).                         |

### Integrations

| Package                                              | Path                      | What it is                                                                                    |
| ---------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| [`@cssdoc/typedoc`](plugins/typedoc)                 | `plugins/typedoc`         | TypeDoc plugin: emits CSS reference pages alongside a TS API-docs build.                      |
| [`@cssdoc/stylelint-plugin`](plugins/stylelint)      | `plugins/stylelint`       | Stylelint rules for doc-comment hygiene.                                                      |
| [`@cssdoc/eslint-plugin`](plugins/eslint)            | `plugins/eslint`          | ESLint rules: doc-comment hygiene (`@eslint/css`) and consumer-side class-usage (JSX + HTML). |
| [`@cssdoc/language-server`](servers/language-server) | `servers/language-server` | An editor-agnostic LSP: completion, hover, definition, and deprecation quick-fixes.           |
| [`cssdoc-vscode`](servers/vscode)                    | `servers/vscode`          | A thin VS Code extension that runs the language server.                                       |

## Develop

```sh
vp install        # install dependencies
vp run -r build   # build every package
vp check          # format + lint + typecheck
vp run -r test    # run every package's tests
vp run -r publint # check each package is publish-ready
```

## License

MIT
