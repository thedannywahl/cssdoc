# API

cssdoc is a set of composable packages. Install the packages you need, or start with
[`@cssdoc/cssdoc`](/reference/@cssdoc/cssdoc/), which brings together the core, index, and providers.
For installation and packages without a generated API, see [Packages](/guide/packages).

## Model and providers

Parse CSS and doc comments into a model, configure the vocabulary, and query it through shared
providers.

| Package                                              | What it does                                               |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| [`@cssdoc/cssdoc`](/reference/@cssdoc/cssdoc/)       | Re-exports the core, index, and providers.                 |
| [`@cssdoc/core`](/reference/@cssdoc/core/)           | Parses CSS documentation and provides the model.           |
| [`@cssdoc/spec`](/reference/@cssdoc/spec/)           | Defines the tag vocabulary and grammar.                    |
| [`@cssdoc/regex`](/reference/packages/regex/src/)    | Provides shared CSS and cssdoc patterns.                   |
| [`@cssdoc/config`](/reference/@cssdoc/config/)       | Loads and resolves cssdoc configuration.                   |
| [`@cssdoc/index`](/reference/@cssdoc/index/)         | Indexes records, usages, and source spans.                 |
| [`@cssdoc/providers`](/reference/@cssdoc/providers/) | Supplies diagnostics, completions, hover, and definitions. |
| [`@cssdoc/lint-core`](/reference/@cssdoc/lint-core/) | Exposes author-side lint rules.                            |
| [`@cssdoc/embedded`](/reference/@cssdoc/embedded/)   | Extracts CSS from host languages.                          |
| [`@cssdoc/dialects`](/reference/@cssdoc/dialects/)   | Resolves parsers for CSS dialects.                         |

## Emitters

Turn the model into documentation.

| Package                                            | Output                        |
| -------------------------------------------------- | ----------------------------- |
| [`@cssdoc/markdown`](/reference/@cssdoc/markdown/) | Markdown pages and a sidebar. |
| [`@cssdoc/html`](/reference/@cssdoc/html/)         | Standalone HTML pages.        |
| [`@cssdoc/json`](/reference/@cssdoc/json/)         | JSON and JSON Schema.         |
| [`@cssdoc/llms`](/reference/@cssdoc/llms/)         | A token-efficient LLM digest. |

## Standard formats

Export documentation in standard interchange formats.

| Package                                                                | Output                            |
| ---------------------------------------------------------------------- | --------------------------------- |
| [`@cssdoc/cem`](/reference/@cssdoc/cem/)                               | A Custom Elements Manifest.       |
| [`@cssdoc/dtcg`](/reference/@cssdoc/dtcg/)                             | W3C Design Tokens.                |
| [`@cssdoc/vscode-custom-data`](/reference/@cssdoc/vscode-custom-data/) | VS Code CSS and HTML custom data. |

## Integrations

Use the shared model and providers from command-line, lint, documentation, and editor tools.

| Package                                                            | What it does                                   |
| ------------------------------------------------------------------ | ---------------------------------------------- |
| [`@cssdoc/cli`](/reference/@cssdoc/cli/)                           | Lints CSS documentation from the command line. |
| [`@cssdoc/eslint-plugin`](/reference/@cssdoc/eslint-plugin/)       | Checks doc comments and class usage in ESLint. |
| [`@cssdoc/stylelint-plugin`](/reference/@cssdoc/stylelint-plugin/) | Checks doc comments in Stylelint.              |
| [`@cssdoc/typedoc`](/reference/@cssdoc/typedoc/)                   | Emits CSS reference pages alongside TypeDoc.   |
| [`@cssdoc/language-server`](/reference/@cssdoc/language-server/)   | Provides editor-agnostic language services.    |
