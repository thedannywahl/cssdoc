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
| [`cssdoc for Zed`](servers/zed)                      | `servers/zed`             | A Zed language-server extension in development.                                                                                                                      |

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

Import sorting groups Node built-ins, external packages (including `@cssdoc/*`), internal aliases and
subpath imports, relative imports, styles, and unknown imports, in that order. Imports within each
group are sorted together, including type imports. Side-effect imports retain their relative order,
but other imports can move around them. Separate a file-level comment from imports with a blank line
so sorting doesn't move it with an import. Generated files with byte-exact checks remain owned by
their generators.

Style linting follows the formatter's import order and preserves authored ordering in catalogs,
schemas, and fixtures. It permits concise single-line guards but requires braces for multiline
control flow. Tests import Vitest explicitly and use strict boolean assertions where intended;
fixtures may include literal template placeholders and unsafe URLs.

Restriction linting permits parser increments and bit flags, explicit `undefined`, and framework
default exports. It checks parameter reassignment and use before initialization, permits `void`
statements for intentionally unawaited work, and allows console output in tests and build scripts.
Errors and warnings can be logged elsewhere.

Nursery linting stays off as a category. A selected rule rejects unreachable loops, while others
warn about dead stores and invalid named imports. Node ESM scripts also warn about undefined names
without accepting CommonJS-only globals. TypeScript checks undefined names separately.

Type-aware linting rejects unsafe assignments, arguments, calls, member access, and returns in
TypeScript. Untyped JavaScript is excluded from those checks because it lacks reliable type
information; the standalone VS Code Lit example is also excluded from the assignment, call, and
member-access checks.

The VitePress site also uses Oxlint's Vue rules. Oxlint checks Vue script blocks, not templates.

Selected `eslint-plugin-regexp` rules check native regex literals and `RegExp` constructors for
mistakes and inefficient matching. The plugin doesn't analyze `arkRegex.as` calls or the composed
strings in `@cssdoc/regex`; review and test those patterns separately. Its analysis doesn't prove
that a pattern is safe.

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
uses Oxlint's built-in JSDoc rules to check parameter tags, modifier tags, and `@returns` descriptions.
If a function documents any parameters, all its parameters must have tags. Functions without any
parameter tags aren't checked for missing tags. The native parameter-description rule treats a lone
TSDoc hyphen as a description, so review descriptions for substance. CSS doc-comment examples use the
cssdoc grammar, which is separate from the TSDoc comments documenting the TypeScript APIs.

The [eslint-plugin-jsdoc TSDoc preset](https://github.com/gajus/eslint-plugin-jsdoc#flat-config-declarative)
is a guide, not an Oxlint preset: Oxlint implements a subset of its rules. TSDoc syntax validation and
TypeDoc's public API coverage check complement the native rules.

## License

MIT
