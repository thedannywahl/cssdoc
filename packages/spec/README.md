# @cssdoc/spec

The canonical cssdoc tag vocabulary — the single source of truth for the doc-comment tags, shared by
the parser and every syntax grammar. Zero dependencies, data only.

Each tag carries its name, syntactic `kind` (`record` / `block` / `modifier` / `inline`), any
`aliasFor` target, whether it `allowMultiple`, its `recordKind` (for record tags), and its `argument`
shape (for the three argument-bearing tags: `@modifier`, `@part`/`@slot`, `@cssproperty`).

```ts
import { CSSDOC_TAGS, cssdocTagNamesByKind, cssdocTagNamesByArgument } from "@cssdoc/spec";

cssdocTagNamesByKind("inline"); // ["link", "inheritDoc", "label"]
cssdocTagNamesByArgument("custom-property"); // ["cssproperty", "property"]
```

## Consumers

- [`@cssdoc/core`](../core) seeds its parser's tag-definition registry from `CSSDOC_TAGS`.
- [`@cssdoc/tmlanguage`](../../syntaxes/cssdoc/tmlanguage) generates its TextMate grammar from it.
- [`@cssdoc/codemirror`](../../syntaxes/cssdoc/codemirror) builds its highlighter's matcher from it.

Add or change a tag here, and the parser and both grammars follow.
