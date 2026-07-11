# Changelog

All notable changes to the cssdoc packages are recorded here. Entries are generated from
[Conventional Commits](https://www.conventionalcommits.org/) by changelogen at release time
(`vp run release`). All packages share one version.

## v0.3.3

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.3.2...v0.3.3)

### 🩹 Fixes

- Edge cases for VS Code plugin ([ee2aeee](https://github.com/thedannywahl/cssdoc/commit/ee2aeee))
- Update playground instructions for clarity and usability ([157daf9](https://github.com/thedannywahl/cssdoc/commit/157daf9))

### 🏡 Chore

- Update dependencies for CodeMirror packages ([d66d9e2](https://github.com/thedannywahl/cssdoc/commit/d66d9e2))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.3.2

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.3.1...v0.3.2)

### 🏡 Chore

- Add vitepress-plugin-llms to pnpm workspace catalog ([9c70458](https://github.com/thedannywahl/cssdoc/commit/9c70458))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.3.1

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.3.0...v0.3.1)

### 🩹 Fixes

- Esm calls in VS Code server bundle ([14d885c](https://github.com/thedannywahl/cssdoc/commit/14d885c))
- Add css-tree shim for improved compatibility with bundled builds ([a26c658](https://github.com/thedannywahl/cssdoc/commit/a26c658))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

## v0.3.0

[compare changes](https://github.com/thedannywahl/cssdoc/compare/v0.2.0...v0.3.0)

### 🚀 Enhancements

- **core:** Allow an array of modifier separators ([6ce8e45](https://github.com/thedannywahl/cssdoc/commit/6ce8e45))
- **lint:** Add configurable name-case rules for class names ([b533e81](https://github.com/thedannywahl/cssdoc/commit/b533e81))
- **language-server:** Per-package cssdoc.json config with live reload ([8597b32](https://github.com/thedannywahl/cssdoc/commit/8597b32))
- Enhance CodeEditor and playground with improved linting rules and configurations ([9762c0c](https://github.com/thedannywahl/cssdoc/commit/9762c0c))
- Add @cssdoc/codemirror extension for highlighting cssdoc tags in CSS comments ([6090d0e](https://github.com/thedannywahl/cssdoc/commit/6090d0e))
- Add grammar specification and validation test for CssDoc ([6ce8f00](https://github.com/thedannywahl/cssdoc/commit/6ce8f00))
- Add support for jsonc configuration files and enhance modifier conventions ([c70693c](https://github.com/thedannywahl/cssdoc/commit/c70693c))
- Refactor HTML generation in presets and add TypeScript configuration ([ddc4972](https://github.com/thedannywahl/cssdoc/commit/ddc4972))
- Enhance CSS documentation with shadow parts and native pseudo-class states ([8d207fb](https://github.com/thedannywahl/cssdoc/commit/8d207fb))
- Enhance modifier and part handling in CSS documentation and diagnostics ([94e9da7](https://github.com/thedannywahl/cssdoc/commit/94e9da7))
- Enhance @structure support with nested CSS and description handling ([2b10772](https://github.com/thedannywahl/cssdoc/commit/2b10772))
- Add support for @structure highlighting in CSS documentation ([59b33e9](https://github.com/thedannywahl/cssdoc/commit/59b33e9))
- Add DEFAULT_STATE_PSEUDO_CLASSES export to index ([3b5e15e](https://github.com/thedannywahl/cssdoc/commit/3b5e15e))
- **embedded:** Add @cssdoc/embedded package for extracting CSS from various sources ([eb9d6de](https://github.com/thedannywahl/cssdoc/commit/eb9d6de))
- Add support for SCSS and Less dialects in cssdoc ([0249f47](https://github.com/thedannywahl/cssdoc/commit/0249f47))
- Add class usage scanning for JSX, Vue, and Svelte templates ([eb3fec6](https://github.com/thedannywahl/cssdoc/commit/eb3fec6))
- Implement cssdoc comment directives for inline suppression and error expectations ([f8c2b22](https://github.com/thedannywahl/cssdoc/commit/f8c2b22))
- Update documentation and package structure for improved clarity and usability ([80c93c8](https://github.com/thedannywahl/cssdoc/commit/80c93c8))

### 🩹 Fixes

- **changelog:** Update version from v0.1.0 to v0.2.0 ([b406332](https://github.com/thedannywahl/cssdoc/commit/b406332))
- **docs:** Publish cssdoc.schema.json to the docs site ([1eafbb0](https://github.com/thedannywahl/cssdoc/commit/1eafbb0))

### 💅 Refactors

- **release-changelog:** Remove unused changelog cleaning logic ([e0afc1f](https://github.com/thedannywahl/cssdoc/commit/e0afc1f))
- Simplify and clarify comments in CssDoc grammar specification ([edbe53c](https://github.com/thedannywahl/cssdoc/commit/edbe53c))

### 📖 Documentation

- Add Example + Playground reference pages ([ea51b15](https://github.com/thedannywahl/cssdoc/commit/ea51b15))

### 📦 Build

- Move root package.json scripts to vite.config.ts tasks ([7101ff2](https://github.com/thedannywahl/cssdoc/commit/7101ff2))

### 🤖 CI

- **release:** Title changelog sections by version, not the compare range ([782bf3e](https://github.com/thedannywahl/cssdoc/commit/782bf3e))
- **release:** Title changelog by version and drop the compare-changes line ([0c0c35e](https://github.com/thedannywahl/cssdoc/commit/0c0c35e))
- Use the setup-vp action instead of pnpm exec ([e20a988](https://github.com/thedannywahl/cssdoc/commit/e20a988))
- **docs:** Deploy docs on a successful release, not on every push ([4224e27](https://github.com/thedannywahl/cssdoc/commit/4224e27))

### ❤️ Contributors

- Danny Wahl <dwahl@instructure.com>

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
