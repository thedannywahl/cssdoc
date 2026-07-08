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

## License

MIT
