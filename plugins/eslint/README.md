# @cssdoc/eslint-plugin

An [ESLint](https://eslint.org) plugin for CSS documentation, powered by the shared cssdoc language
core:

- **`cssdoc/valid-doc-comments`** — on the [`@eslint/css`](https://github.com/eslint/css) language,
  checks the stylesheet's own doc-comment hygiene (via [`@cssdoc/lint-core`](../../packages/lint-core)).
- **`cssdoc/valid-class-usage`** — on JS/JSX and HTML, checks that the classes consumers apply — including
  chained modifiers like `class="btn -color-secondary"` — match the documented CSS surface (via
  [`@cssdoc/providers`](../../packages/providers)). Flags unknown and deprecated modifiers.

## Install

```sh
npm i -D @cssdoc/eslint-plugin eslint @eslint/css
# for the class-usage rule on HTML:
npm i -D @html-eslint/parser
```

## Setup

```js
// eslint.config.js
import cssdoc from "@cssdoc/eslint-plugin";

export default [
  // Lints **/*.css with the CSS language and enables cssdoc/valid-doc-comments.
  ...cssdoc.configs.recommended,
];
```

Or wire it manually:

```js
import css from "@eslint/css";
import cssdoc from "@cssdoc/eslint-plugin";

export default [
  {
    files: ["**/*.css"],
    plugins: { css, cssdoc },
    language: "css/css",
    rules: {
      "cssdoc/valid-doc-comments": ["warn", { rules: { "missing-summary": false } }],
    },
  },
];
```

`valid-doc-comments` reports every [`@cssdoc/lint-core`](../../packages/lint-core#rules) violation.

## Checking class usage (JSX + HTML)

Point `valid-class-usage` at your compiled CSS with the `css` option. It resolves the base component
class among an element's tokens, then validates each `-modifier` against that component:

```js
// eslint.config.js
import cssdoc from "@cssdoc/eslint-plugin";
import html from "@html-eslint/parser";

export default [
  {
    files: ["**/*.jsx", "**/*.tsx"],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { cssdoc },
    rules: { "cssdoc/valid-class-usage": ["warn", { css: ["dist/components.css"] }] },
  },
  {
    files: ["**/*.html"],
    languageOptions: { parser: html },
    plugins: { cssdoc },
    rules: { "cssdoc/valid-class-usage": ["warn", { css: ["dist/components.css"] }] },
  },
];
```

A `-modifier` on an element with no documented component among its classes is left alone, so unrelated
utility classes never trip the rule.

## Running under oxlint

`cssdoc/valid-class-usage`'s JS/JSX half loads unchanged through
[oxlint's `jsPlugins` bridge](https://oxc.rs/docs/guide/usage/linter/js-plugins.html) — it's plain
ESTree work with no custom parser or type information, and `cssdoc` isn't a reserved oxlint plugin
name, so no alias is required:

```jsonc
// .oxlintrc.json
{
  "jsPlugins": [{ "name": "cssdoc", "specifier": "@cssdoc/eslint-plugin" }],
  "rules": {
    "cssdoc/valid-class-usage": ["error", { "css": ["dist/components.css"] }],
  },
}
```

Two things to know:

- **The HTML half doesn't run under oxlint.** oxlint has no HTML language, so `Document()` (the
  `@html-eslint/parser` visitor `valid-class-usage` uses for `.html` files) never fires. Check HTML
  usage with `@cssdoc/eslint-plugin` under ESLint itself, or with the editor extension.
- **Point `css` at an unminified build.** `valid-class-usage` reads the doc comments in the CSS files
  named by `css` at lint time — a minified/stripped `dist/*.css` bundle has none, so the option needs
  an unminified build (or the source stylesheets themselves). This applies under ESLint too, not just
  oxlint.

`cssdoc/valid-doc-comments` (the CSS doc-hygiene rule) is a separate story — it can't run under oxlint
at all; see [the linting guide](https://cssdoc.dev/guide/linting) for why, and for the equivalent
Stylelint path.

## License

MIT
