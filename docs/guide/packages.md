# Packages

cssdoc is a set of small, composable packages. Install only what you need.

## Model & config

| Package             | What it is                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `@cssdoc/core`      | The parser + model. A formal grammar and an expansive tag vocabulary that documents the modern CSSOM surface AST-first.   |
| `@cssdoc/config`    | Loads a `cssdoc.json` config file (custom tags, `extends`).                                                               |
| `@cssdoc/index`     | A queryable semantic index over the model, with source spans — the shared data layer for the linters and language server. |
| `@cssdoc/providers` | Host-agnostic diagnostics, completions, hover, and definitions over the index.                                            |
| `@cssdoc/lint-core` | The author-side doc-hygiene rules.                                                                                        |

## Emitters

| Package            | Output                            |
| ------------------ | --------------------------------- |
| `@cssdoc/markdown` | Markdown pages + a sidebar.       |
| `@cssdoc/html`     | Standalone HTML pages + an index. |
| `@cssdoc/json`     | JSON + the model's JSON Schema.   |
| `@cssdoc/llms`     | An `llms.txt` digest.             |

## Standard formats

| Package                      | Output                            |
| ---------------------------- | --------------------------------- |
| `@cssdoc/vscode-custom-data` | VS Code `css`/`html` custom data. |
| `@cssdoc/cem`                | A Custom Elements Manifest.       |
| `@cssdoc/dtcg`               | W3C Design Tokens.                |

## Integrations

| Package                    | What it is                                                                     |
| -------------------------- | ------------------------------------------------------------------------------ |
| `@cssdoc/typedoc`          | A TypeDoc plugin that emits CSS reference pages alongside a TS API-docs build. |
| `@cssdoc/stylelint-plugin` | Stylelint rules for doc-comment hygiene.                                       |
| `@cssdoc/eslint-plugin`    | ESLint rules: doc hygiene + consumer-side class usage (JSX + HTML).            |
| `@cssdoc/language-server`  | An editor-agnostic LSP.                                                        |

The `cssdoc` VS Code extension bundles the language server; install it from the Marketplace rather than
from npm.
