# Standard formats

Generators export the model to standard interchange formats — the cheapest way to get editor support
and tooling interop, without a bespoke consumer.

## VS Code custom data

[`@cssdoc/vscode-custom-data`](https://www.npmjs.com/package/@cssdoc/vscode-custom-data) emits the JSON
that VS Code's built-in CSS and HTML language services read — so custom properties and documented
classes get completions and hover with **no extension**.

```ts
import { writeVscodeCustomData } from "@cssdoc/vscode-custom-data";
writeVscodeCustomData({ css, outDir: ".vscode" });
```

```jsonc
// .vscode/settings.json
{
  "css.customData": [".vscode/css-custom-data.json"],
  "html.customData": [".vscode/html-custom-data.json"],
}
```

`html.customData` lists your component classes and modifiers as `class`-attribute values;
`css.customData` lists the declared custom properties.

## Custom Elements Manifest

[`@cssdoc/cem`](https://www.npmjs.com/package/@cssdoc/cem) emits a
[Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest) — each record
becomes a declaration carrying `cssProperties`, `cssParts`, and `cssStates`, interoperable with the CEM
tooling ecosystem.

```ts
import { writeCem } from "@cssdoc/cem";
writeCem({ css, outFile: "custom-elements.json" });
```

## Design Tokens (DTCG)

[`@cssdoc/dtcg`](https://www.npmjs.com/package/@cssdoc/dtcg) exports declared custom properties as
[W3C Design Tokens](https://tr.designtokens.org/) — `$value` from the `initial-value`, `$type` mapped
from the `syntax`, `$description` — grouped by record.

```ts
import { writeDtcg } from "@cssdoc/dtcg";
writeDtcg({ css, outFile: "tokens.json" });
```
