# @cssdoc/dtcg

Export the declared custom properties as [W3C Design Tokens](https://tr.designtokens.org/) (DTCG). Each
`@property` becomes a token with `$value` (its `initial-value`), `$type` (mapped from its `syntax`), and
`$description`, grouped by the record that declares it — so properties that double as design tokens
interchange with the token ecosystem.

## Usage

```ts
import { createIndex } from "@cssdoc/index";
import { writeDtcg } from "@cssdoc/dtcg";
import { readFileSync } from "node:fs";

const index = createIndex(readFileSync("dist/components.css", "utf8"));
writeDtcg({ index, outFile: "tokens.json" });
```

Syntax → `$type` mapping: `<color>` → `color`, `<length>` → `dimension`, `<time>` → `duration`,
`<number>`/`<integer>`/`<percentage>` → `number`. Unmapped syntaxes omit `$type`.

## License

MIT
