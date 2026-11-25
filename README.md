# @cssdoc

![cssdoc: A documentation toolchain for plain CSS — TSDoc, for CSS.](https://cssdoc.dev/og.png)

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
| [`@cssdoc/regex`](packages/regex)         | `packages/regex`     | Shared CSS and cssdoc regex patterns and character primitives.                                                                         |
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

| Package                                              | Path                      | What it is                                                                                                                                                           |
| ---------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@cssdoc/typedoc`](plugins/typedoc)                 | `plugins/typedoc`         | TypeDoc plugin: emits CSS reference pages alongside a TS API-docs build.                                                                                             |
| [`@cssdoc/stylelint-plugin`](plugins/stylelint)      | `plugins/stylelint`       | Stylelint rules for doc-comment hygiene. The supported path for oxc-based toolchains (oxlint has no CSS language — see [Linting](https://cssdoc.dev/guide/linting)). |
| [`@cssdoc/eslint-plugin`](plugins/eslint)            | `plugins/eslint`          | ESLint rules: doc-comment hygiene (`@eslint/css`, ESLint-only) and consumer-side class-usage (JSX + HTML; the JSX half also runs under oxlint's `jsPlugins`).        |
| [`@cssdoc/cli`](packages/cli)                        | `packages/cli`            | A host-agnostic `cssdoc lint` command — no ESLint or Stylelint required.                                                                                             |
| [`@cssdoc/language-server`](servers/language-server) | `servers/language-server` | An editor-agnostic LSP: completion, hover, definition, and deprecation quick-fixes.                                                                                  |
| [`cssdoc-vscode`](servers/vscode)                    | `servers/vscode`          | A thin VS Code extension that runs the language server.                                                                                                              |

## Develop

```sh
vp install        # install dependencies
vp run -r build   # build every package
vp run check      # format + lint + type-check + schema check
vp run type-check # run tsc across every workspace project
vp run -r test    # run every package's tests
vp run check:publish # check each package with publint and ATTW
```

Package configs merge shared lint, format, and library pack settings from `vite.config.base.ts`.
Package commands remain in each package's `vite.config.ts` as Vite tasks. The remaining
`package.json` scripts bridge the install-time `prepare` and publish-time `prepublishOnly` lifecycle
hooks to those tasks.

The TypeScript catalog is pinned to the upstream revision targeted by Vite+'s tsrs checker; a test
checks that they stay aligned. TypeDoc uses TypeScript 6 separately because of its peer dependency;
the docs and TypeDoc plugin type-check tasks use the root TypeScript compiler instead.

The root `tsdoc.json` defines cssdoc tags for TSDoc linting. Its definitions are checked against the
canonical vocabulary in `@cssdoc/spec`.

### Documenting TypeScript APIs

Write public API comments in TSDoc syntax. Start with what the API does, then describe behavior a caller
can't infer from the signature: defaults, ordering, side effects, errors, and edge cases. Use
`@param name - description` for parameters and `@returns` for a useful return description; avoid
restating the TypeScript types. Add `@throws`, `@remarks`, and runnable `@example` blocks when they
help explain the contract. Keep examples consistent with the implementation and tests.

The root lint configuration checks TSDoc syntax, requires comments on exported source declarations, and
requires a description when `@returns` is present. CSS doc-comment examples use the cssdoc grammar,
which is separate from the TSDoc comments documenting the TypeScript APIs.

## License

MIT
