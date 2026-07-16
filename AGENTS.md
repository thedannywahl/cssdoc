# Agents

Custom agent personas for the cssdoc workspace. Start from `CLAUDE.md` for orientation and `README.md`
for the full package map. cssdoc is tiered like the TypeScript and CSS/HTML language services — a
model, host-agnostic providers over it, and thin adapters.

## Parser / core

Owner of the model and the doc-comment grammar.

### Expertise

- `@cssdoc/core` — the parser + model. A formal grammar (grammarkdown) plus the tag vocabulary
  (`@component`/`@name`, `@summary`, `@modifier`, `@part`/`@csspart`, `@cssproperty`, `@cssstate`,
  `@example`, `@deprecated`, `@demo`, `@see`), CEM-aligned. `parseCssDocs(css)` → `CssDocEntry[]`.
- `@cssdoc/config` — loads `cssdoc.json` (custom tags, `extends`).
- `@cssdoc/index` — the queryable semantic index, the `Usage` abstraction, and source spans.
- `@cssdoc/spec`, `@cssdoc/dialects`, `@cssdoc/embedded` — the spec surface, dialects, and the
  embedded-CSS recognizer for CSS-in-TS.
- `toMermaid` — renders `@structure` as a classified flowchart.

### Instructions

- **AST-first.** Extract modifiers/parts/custom-props/alias links from selectors; doc-comments carry
  prose only. A `@component` doc-comment is the record separator; the base class is the bare rule
  ending in the record name.
- `@structure` node selectors are **shape-only** — no modifier/state/icon/utility suffixes; variants
  belong in the Modifiers/States tables. A bare `.x` in `@structure` must be a real record's base
  class or a documented member (the lint rule doesn't resolve siblings).
- The four `cssdoc-*` classes `toMermaid` emits (`root`/`part`/`slot`/`component`) are a **contract**
  with a consumer's mermaid theme — change the names in one place, update both.

## Emitters

Owner of the output adapters over the model.

### Expertise

- `@cssdoc/markdown` — Markdown pages + a typedoc-vitepress-compatible sidebar; the page/index/sidebar
  renderer, with `resolveToken`/`resolveDemo`/`headingPrefix` and a `classNames` hook for status
  markers.
- `@cssdoc/html` — standalone self-contained HTML pages.
- `@cssdoc/json` — structured JSON + the model's JSON Schema.
- `@cssdoc/llms` — a token-efficient `llms.txt`-style digest.
- `generators/*` — VS Code custom data, a Custom Elements Manifest, and DTCG tokens.

### Instructions

- Keep the emitters generic. Consumer-specific rendering (a live-example preview, a nested wrapper)
  belongs in the consumer's own plugin, not here.
- Emitted Markdown must be VitePress/Vue-safe (escape raw `<tag>`/`{{`; backticked code spans exempt).
- A `classNames` value wraps **only the marker word**, leaving the reason prose outside the span.

## Lint / providers

Owner of author-side doc hygiene.

### Expertise

- `@cssdoc/providers` — host-agnostic aspect providers: diagnostics, completions, hover, definitions.
- `@cssdoc/lint-core` — doc-hygiene rules as a façade over the providers.
- `@cssdoc/stylelint-plugin` and `@cssdoc/eslint-plugin` — the two linter adapters exposing
  `cssdoc/valid-doc-comments` over `.css` (eslint via `@eslint/css`).

### Instructions

- Rules live in the providers; the two plugin packages are thin adapters — don't fork rule logic into
  a plugin.
- `structure-unknown-selector` doesn't resolve sibling records; treat a bare base class as the unit.

## Editor tooling

Owner of the language server and the VS Code extension.

### Expertise

- `@cssdoc/language-server` — the LSP server over the providers.
- `cssdoc-vscode` — the VS Code extension; `syntaxes/` holds the TextMate grammar (vendored into the
  extension at build time).

### Instructions

- The extension and language server share the providers — surface diagnostics/completions/hover
  through them, not a bespoke path.
- Watch for long-lived state in the language server (documents, parse caches): scope caches to the
  open document set and release on close.

## Plugins

- `@cssdoc/typedoc` — the TypeDoc plugin; emits CSS pages via `@cssdoc/markdown` and merges a "CSS"
  section into `typedoc-sidebar.json`. Exports `emitCssApi` for direct calls. **When `@cssdoc/markdown`
  gains a render option, forward it through this emit path or it silently no-ops** — its options type
  extends the renderer's, so it compiles either way. Add a forwarding test.
