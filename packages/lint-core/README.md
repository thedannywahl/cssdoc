# @cssdoc/lint-core

The shared doc-comment-hygiene rules for CSS, independent of any linter. Both
[`@cssdoc/stylelint-plugin`](../../plugins/stylelint) and [`@cssdoc/eslint-plugin`](../../plugins/eslint)
call `lintCssDocs` and translate its violations into their host's diagnostics — so the checks live in
one place.

## Rules

| Rule                            | Fires when                                                                 |
| ------------------------------- | -------------------------------------------------------------------------- |
| `missing-summary`               | A record has no `@summary`.                                                |
| `undocumented-modifier`         | An AST modifier has no `@modifier` description (and isn't deprecated).     |
| `undocumented-part`             | A part has no `@part` description.                                         |
| `deprecated-requires-canonical` | A deprecated modifier has no canonical replacement (`{@link -x}`) or note. |
| `name-not-in-css`               | A documented `@modifier`/`@part` isn't defined by any selector (drift).    |

## Usage

```ts
import { lintCssDocs } from "@cssdoc/lint-core";

for (const v of lintCssDocs(css, { rules: { "missing-summary": false } })) {
  console.warn(`${v.record}:${v.line} [${v.rule}] ${v.message}`);
}
```

## License

MIT
