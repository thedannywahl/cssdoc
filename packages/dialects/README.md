# @cssdoc/dialects

Resolve a [PostCSS](https://postcss.org) parser for a stylesheet dialect so [cssdoc](https://cssdoc.dev)
can read `.scss`, `.sass`, and `.less` sources — not just plain CSS.

```ts
import { resolveParser, dialectForFilename } from "@cssdoc/dialects";
import { lintCssDocs } from "@cssdoc/lint-core";

const parse = resolveParser(dialectForFilename("Button.scss"));
const problems = lintCssDocs(scssSource, { parse });
```

The `parse` option is accepted by `parseCssDocs` (`@cssdoc/core`), `createIndex` / `cssValueSites`
(`@cssdoc/index`), and `lintCssDocs` (`@cssdoc/lint-core`).

## Limitations

Dialect-only constructs — `$variables`, `@mixin`/`@include`, `//` line comments — are parsed but
ignored. cssdoc still reads the `/** */` doc comments, class selectors, `@property` at-rules, and
custom properties. Sass's indented syntax and Stylus aren't supported; write SCSS.
