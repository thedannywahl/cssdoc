# cssdoc

TSDoc, for CSS. This is the umbrella package: install it for the whole programmatic API in one
import, or reach for the scoped packages à la carte.

```sh
npm add cssdoc
```

```ts
import { parseCssDocs, createIndex, lintModel } from "cssdoc";

const model = parseCssDocs(css);
const findings = lintModel(createIndex(css));
```

It re-exports the three browser-safe building blocks. Loading `cssdoc.json` is Node-only, so add
`@cssdoc/config` when you need it.

## Which package do I need?

| I want to…                                       | Package                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| Parse CSS + doc-comments into a model            | `@cssdoc/core`                                                           |
| Query the model with source spans                | `@cssdoc/index`                                                          |
| Lint, complete, hover, go-to-definition          | `@cssdoc/providers`                                                      |
| **All of the above, one import**                 | **`cssdoc`**                                                             |
| Load a `cssdoc.json` / `cssdoc.jsonc` (Node)     | `@cssdoc/config`                                                         |
| The canonical tag vocabulary + grammar           | `@cssdoc/spec`                                                           |
| Syntax highlighting (TextMate / Shiki / VS Code) | `@cssdoc/tmlanguage`                                                     |
| Syntax highlighting (CodeMirror 6)               | `@cssdoc/codemirror`                                                     |
| ESLint / Stylelint / TypeDoc integration         | `@cssdoc/eslint-plugin` · `@cssdoc/stylelint-plugin` · `@cssdoc/typedoc` |
