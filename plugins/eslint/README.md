# @cssdoc/eslint-plugin

An [ESLint](https://eslint.org) plugin — built on the [`@eslint/css`](https://github.com/eslint/css)
language — that checks CSS doc-comment hygiene, powered by the shared
[`@cssdoc/lint-core`](../../packages/lint-core) rules.

## Install

```sh
npm i -D @cssdoc/eslint-plugin eslint @eslint/css
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

The rule reports every [`@cssdoc/lint-core`](../../packages/lint-core#rules) violation.

## License

MIT
