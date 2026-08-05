# @cssdoc/lint-core

The shared doc-comment-hygiene rules for CSS, independent of any linter. Both
[`@cssdoc/stylelint-plugin`](../../plugins/stylelint) and [`@cssdoc/eslint-plugin`](../../plugins/eslint)
call `lintCssDocs` and translate its violations into their host's diagnostics — so the checks live in
one place.

## Rules

| Rule                             | Fires when                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `missing-summary`                | A record has no `@summary`.                                                  |
| `undocumented-modifier`          | An AST modifier has no `@modifier` description (and isn't deprecated).       |
| `undocumented-part`              | A part has no `@part` description.                                           |
| `undocumented-css-part`          | A shadow part has no `@csspart` description.                                 |
| `deprecated-requires-canonical`  | A deprecated modifier has no canonical replacement (`{@link -x}`) or note.   |
| `name-not-in-css`                | A documented `@modifier`/`@part` isn't defined by any selector (drift).      |
| `duplicate-record-id`            | A record id appears more than once for the same kind.                        |
| `duplicate-record-id-cross-kind` | A record id is shared across multiple kinds.                                 |
| `structure-unknown-selector`     | `@structure` references an unknown selector/class target.                    |
| `structure-unknown-record`       | `@structure` references a record id or typed record kind that doesn't exist. |
| `structure-ambiguous-record`     | `@structure` uses an untyped record reference that matches multiple kinds.   |
| `unknown-annotation-ref`         | A `@ref` points at no row in the local `@annotations` legend.                |
| `readonly-redefinition`          | A `@readonly` record redefines a declaration in a later rule.                |
| `sealed-reset-value`             | A `@sealed` record uses disallowed reset-like keywords.                      |
| `invalid-default-value`          | A registered property's default value doesn't match its syntax grammar.      |
| `invalid-property-value`         | A custom-property assignment doesn't match the registered syntax grammar.    |
| `invalid-fallback-value`         | A `var(--x, fallback)` fallback doesn't match the registered syntax grammar. |
| `cssdoc-directive`               | A `cssdoc-expect-error` directive matched no diagnostic.                     |

## Usage

```ts
import { lintCssDocs } from "@cssdoc/lint-core";

for (const v of lintCssDocs(css, { rules: { "missing-summary": false } })) {
  console.warn(`${v.record}:${v.line} [${v.rule}] ${v.message}`);
}
```

## License

MIT
