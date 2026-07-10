# Changelog

All notable changes to the cssdoc packages are recorded here. Entries are generated from
[Conventional Commits](https://www.conventionalcommits.org/) by changelogen at release time
(`vp run release`). All packages share one version.

## v0.2.0

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.1.0...main)

### 🚀 Enhancements

- **vscode:** Auto-detect documented CSS with include/exclude globs ([a562183](https://github.com/thedannywahl/cssdoc/commit/a562183))
- **core:** ⚠️ Configurable modifier convention ([a705fd3](https://github.com/thedannywahl/cssdoc/commit/a705fd3))

### 📖 Documentation

- Rewrite the VS Code extension README for consumers + add install links ([d40d528](https://github.com/thedannywahl/cssdoc/commit/d40d528))

### 🤖 CI

- **release:** Make extension publishing resilient ([05bf62c](https://github.com/thedannywahl/cssdoc/commit/05bf62c))
- **release:** Switch npm publish to OIDC trusted publishing ([8fe9e9d](https://github.com/thedannywahl/cssdoc/commit/8fe9e9d))

#### ⚠️ Breaking Changes

- **core:** ⚠️ Configurable modifier convention ([a705fd3](https://github.com/thedannywahl/cssdoc/commit/a705fd3))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.1.0

The first public release of cssdoc — TSDoc, for CSS. You write structured `/** … */` doc comments above
your CSS; cssdoc parses those comments _plus the stylesheet itself_ into a serializable model, and a
family of small packages turns that model into documentation, standard-format exports, lint rules, and
editor IntelliSense. The machine facts — base classes, `-modifier` families, parts, registered custom
properties, functions, keyframes, layers, and conditions — are read from the actual selectors and
at-rules, so the docs can't drift from what ships.

### Core

- **`@cssdoc/core`** — the parser and model. An AST-first extractor over doc comments and the PostCSS
  tree, with an expansive, TSDoc-modeled tag vocabulary (record, block, modifier, and inline tags)
  covering the modern CSSOM surface. The doc-comment grammar is defined by a formal grammarkdown spec.
- **`@cssdoc/config`** — loads and validates a `cssdoc.json` (custom tags, `extends` chains), the way
  `@microsoft/tsdoc-config` configures TSDoc.
- **`@cssdoc/index`** — a queryable semantic index over the model, with source spans and a host-agnostic
  usage abstraction shared by the linters and the language server.

### Emitters

- **`@cssdoc/markdown`** — renders the model to Markdown pages plus a sidebar.
- **`@cssdoc/html`** — a standalone HTML reference.
- **`@cssdoc/json`** — the model as JSON, with a JSON Schema.
- **`@cssdoc/llms`** — an `llms.txt`-style digest.

### Standard-format generators

- **`@cssdoc/vscode-custom-data`**, **`@cssdoc/cem`** (Custom Elements Manifest), and **`@cssdoc/dtcg`**
  (W3C Design Tokens) — export the model into the formats other tools already understand.

### Linting

- **`@cssdoc/lint-core`** with **`@cssdoc/stylelint-plugin`** and **`@cssdoc/eslint-plugin`** — one shared
  rule core, two linters. Three kinds of check:
  - doc-comment hygiene (missing summaries, undocumented or drifted modifiers and parts);
  - consumer-side class usage — the classes your HTML and JSX apply, including chained `-modifiers`, are
    validated against the documented surface;
  - registered-property value checks — values are matched against a custom property's `@property`
    `syntax`, flagging a bad `initial-value`, assignment, or `var()` fallback (runtime substitutions and
    CSS-wide keywords are skipped).

### TypeDoc integration

- **`@cssdoc/typedoc`** — a TypeDoc plugin that renders a CSS reference alongside a TypeScript API build
  and merges it into the same sidebar.

### Editor support

- **`@cssdoc/language-server`** — an editor-agnostic LSP server: completions, hover, go-to-definition,
  deprecation quick-fixes, and live diagnostics for CSS documents.
- The **cssdoc VS Code extension** ships the language server and a TextMate injection grammar, published
  to the VS Code Marketplace and Open VSX.

### Syntax highlighting

- **`@cssdoc/tmlanguage`** — a TextMate injection grammar that highlights cssdoc doc-comment tags inside
  CSS comments, the way TSDoc highlights JSDoc.
- **`@cssdoc/grammarkdown-tmlanguage`** — a TextMate grammar for the grammarkdown notation.

### Documentation

- A VitePress documentation site at [cssdoc.dev](https://cssdoc.dev), including a generated API
  reference and the grammar spec.
