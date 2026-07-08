# cssdoc

TSDoc, for CSS. A framework-agnostic documentation toolchain for plain CSS: parse a doc-comment grammar
plus the CSS AST into a serializable model, then emit whatever you like on top — the way the
`@microsoft/tsdoc` family and TypeDoc split a parser, a config loader, and a set of emitters/plugins.

This is a [Vite+](https://voidzero.dev/posts/announcing-vite-plus) / pnpm monorepo.

## Packages

| Package                                         | Path                 | What it is                                                                                                                                                                     |
| ----------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`@cssdoc/core`](packages/core)                 | `packages/core`      | The parser + model. A formal grammar (grammarkdown) and an expansive, TSDoc-modeled tag vocabulary that documents the modern CSSOM surface AST-first. Like `@microsoft/tsdoc`. |
| [`@cssdoc/config`](packages/config)             | `packages/config`    | Loads a `cssdoc.json` config file (custom tags, `extends`). Like `@microsoft/tsdoc-config`.                                                                                    |
| [`@cssdoc/lint-core`](packages/lint-core)       | `packages/lint-core` | Shared doc-comment-hygiene rules consumed by both lint adapters.                                                                                                               |
| [`@cssdoc/markdown`](emitters/markdown)         | `emitters/markdown`  | Emitter: renders the model to markdown pages + a sidebar.                                                                                                                      |
| [`@cssdoc/typedoc`](plugins/typedoc)            | `plugins/typedoc`    | TypeDoc plugin: emits CSS reference pages alongside a TS API-docs build.                                                                                                       |
| [`@cssdoc/stylelint-plugin`](plugins/stylelint) | `plugins/stylelint`  | Stylelint rules for doc-comment hygiene.                                                                                                                                       |
| [`@cssdoc/eslint-plugin`](plugins/eslint)       | `plugins/eslint`     | ESLint (`@eslint/css`) rules for doc-comment hygiene.                                                                                                                          |

## Develop

```sh
pnpm install
vp run -r build   # build every package
vp check          # format + lint + typecheck
vp run -r test    # run every package's tests
```

## License

MIT
