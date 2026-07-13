# Packages

cssdoc is a set of small, composable packages — install only what you need. Every package name below
links to its npm page.

## Start here

| Package                                                          | What it is                                                                                                                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@cssdoc/cssdoc`](https://www.npmjs.com/package/@cssdoc/cssdoc) | The whole programmatic API in one install — re-exports `@cssdoc/core`, `@cssdoc/index`, and `@cssdoc/providers`. Reach for this first; drop to the scoped packages when you want less. |
| [`@cssdoc/core`](https://www.npmjs.com/package/@cssdoc/core)     | The parser and model: a formal grammar and an expansive tag vocabulary that documents the modern CSS surface AST-first.                                                                |

## Model, config, and querying

| Package                                                                | What it is                                                                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@cssdoc/spec`](https://www.npmjs.com/package/@cssdoc/spec)           | The canonical tag vocabulary and the RFC-style grammar — the single source of truth the parser and grammars derive from. Zero dependencies. |
| [`@cssdoc/config`](https://www.npmjs.com/package/@cssdoc/config)       | Loads a `cssdoc.json` / `cssdoc.jsonc` (custom tags, `extends`, conventions, rules). Node-only.                                             |
| [`@cssdoc/index`](https://www.npmjs.com/package/@cssdoc/index)         | A queryable semantic index over the model, with source spans — the shared data layer for the linters and the language server.               |
| [`@cssdoc/providers`](https://www.npmjs.com/package/@cssdoc/providers) | Host-agnostic diagnostics, completions, hover, and definitions over the index.                                                              |
| [`@cssdoc/lint-core`](https://www.npmjs.com/package/@cssdoc/lint-core) | The author-side doc-hygiene rules, shared by the ESLint and Stylelint plugins.                                                              |

### Embedding without postcss

`@cssdoc/core` uses [postcss](https://postcss.org/) to parse CSS, but only `parseCssDocs` needs it. If
you consume the model, the doc-comment grammar, the tag config, or the helpers (`toJson`, `toMermaid`)
without parsing at runtime, import the **parse-free** entry so postcss never enters your bundle:

```ts
import { parseDocComment, toJson, CssDocConfiguration, type CssDocEntry } from "@cssdoc/core/lite";
```

`@cssdoc/core/lite` re-exports everything except `parseCssDocs`, and pulls in no CSS parser. (The main
`@cssdoc/core` entry statically imports postcss for `parseCssDocs`, so importing from it can still bundle
postcss even if you only use parse-free names — use `/lite` when keeping postcss out matters.) When you
_do_ parse, use `parseCssDocs` (postcss by default) or inject any parser via `ParseOptions.parse` — e.g.
`@cssdoc/dialects`'s `resolveParser` for SCSS/Less.

## Embedded CSS and dialects

| Package                                                              | What it is                                                                                                                                         |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@cssdoc/embedded`](https://www.npmjs.com/package/@cssdoc/embedded) | Reads cssdoc out of host files — JS/TS tagged templates, HTML-like `<style>` blocks, and Markdown fences. See [Embedded CSS](/guide/embedded-css). |
| [`@cssdoc/dialects`](https://www.npmjs.com/package/@cssdoc/dialects) | Resolves a PostCSS parser for SCSS and Less so cssdoc can read those sources.                                                                      |

## Emitters

| Package                                                              | Output                                   |
| -------------------------------------------------------------------- | ---------------------------------------- |
| [`@cssdoc/markdown`](https://www.npmjs.com/package/@cssdoc/markdown) | Markdown reference pages plus a sidebar. |
| [`@cssdoc/html`](https://www.npmjs.com/package/@cssdoc/html)         | Standalone HTML pages plus an index.     |
| [`@cssdoc/json`](https://www.npmjs.com/package/@cssdoc/json)         | JSON plus the model's JSON Schema.       |
| [`@cssdoc/llms`](https://www.npmjs.com/package/@cssdoc/llms)         | An `llms.txt` digest.                    |

## Standard formats

| Package                                                                                  | Output                                                |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [`@cssdoc/cem`](https://www.npmjs.com/package/@cssdoc/cem)                               | A Custom Elements Manifest (`cssParts`, `cssStates`). |
| [`@cssdoc/dtcg`](https://www.npmjs.com/package/@cssdoc/dtcg)                             | W3C Design Tokens.                                    |
| [`@cssdoc/vscode-custom-data`](https://www.npmjs.com/package/@cssdoc/vscode-custom-data) | VS Code `css`/`html` custom data.                     |

## Editor and lint integrations

| Package                                                                              | What it is                                                                                          |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| [`@cssdoc/language-server`](https://www.npmjs.com/package/@cssdoc/language-server)   | An editor-agnostic LSP: diagnostics, hover, completion, go-to-definition — in CSS and embedded CSS. |
| [`@cssdoc/stylelint-plugin`](https://www.npmjs.com/package/@cssdoc/stylelint-plugin) | Stylelint rules for doc-comment hygiene.                                                            |
| [`@cssdoc/eslint-plugin`](https://www.npmjs.com/package/@cssdoc/eslint-plugin)       | ESLint rules: doc hygiene plus consumer-side class usage.                                           |
| [`@cssdoc/typedoc`](https://www.npmjs.com/package/@cssdoc/typedoc)                   | A TypeDoc plugin that emits CSS reference pages alongside a TS API-docs build.                      |

The VS Code extension bundles the language server — install it from the editor, not npm:
[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=cssdoc.cssdoc-vscode) ·
[Open VSX](https://open-vsx.org/extension/cssdoc/cssdoc-vscode) (Cursor, VSCodium, Windsurf, and other
non-Microsoft editors).

## Syntax highlighting

| Package                                                                  | What it is                                                                 |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [`@cssdoc/tmlanguage`](https://www.npmjs.com/package/@cssdoc/tmlanguage) | A TextMate injection grammar for Shiki, VS Code, and other TextMate hosts. |
| [`@cssdoc/codemirror`](https://www.npmjs.com/package/@cssdoc/codemirror) | A CodeMirror 6 highlighter for the same doc-comment vocabulary.            |
