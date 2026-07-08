# @cssdoc/stylelint-plugin

A [Stylelint](https://stylelint.io) plugin that checks CSS doc-comment hygiene, powered by the shared
[`@cssdoc/lint-core`](../../packages/lint-core) rules.

## Install

```sh
npm i -D @cssdoc/stylelint-plugin stylelint
```

## Setup

```js
// stylelint.config.js
export default {
  plugins: ["@cssdoc/stylelint-plugin"],
  rules: {
    "cssdoc/valid-doc-comments": true,
    // or with per-rule toggles:
    // "cssdoc/valid-doc-comments": [true, { rules: { "missing-summary": false } }],
  },
};
```

The rule reports every [`@cssdoc/lint-core`](../../packages/lint-core#rules) violation: missing
summaries, undocumented modifiers/parts, deprecations without a replacement, and documentation that has
drifted from the CSS.

## License

MIT
