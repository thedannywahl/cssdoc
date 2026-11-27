# @cssdoc/json

Emit the [`@cssdoc/core`](../../packages/core) model as JSON — the TypeDoc `--json` analog. Writes a
whole-model `model.json`, optionally one file per record plus a lightweight `index.json`, and the
**JSON Schema** of the model so consumers can validate or type the output.

## Usage

```ts
import { readFileSync } from "node:fs";

import { writeJson, cssDocSchema } from "@cssdoc/json";

writeJson({
  css: readFileSync("dist/components.css", "utf8"),
  outDir: "docs/api/json",
  perRecord: true, // + records/<name>.json and index.json
  schema: true, // + model.schema.json
});
```

`renderJson(entries)` returns the JSON string. `cssDocSchema` and `cssDocEntrySchema` re-export the
draft-07 schemas generated from `@cssdoc/core/schema`'s ArkType definitions. The static exports are
also available from `@cssdoc/core/lite` and don't load the runtime validator.

By default, JSON output omits private examples, prose, legacy private remarks, and to-dos.
For inline links to structured references, provide a complete lookup for each prose field's
original source. A missing, incomplete, ambiguous, or unsupported lookup causes public projection
to throw rather than publish an unverified target. For example, when a single CSS string is the
complete workspace:

```ts
import { createIndex } from "@cssdoc/index";
import { renderJson } from "@cssdoc/json";

const index = createIndex(css);
const lookup = { workspace: { complete: true, sources: [{ index }] } };
const json = renderJson(index.entries, { lookupFor: () => lookup });
```

For multiple sources or providers, supply their portable source keys and complete scopes. If prose
comes from another source, return the lookup for that original source. Links to private targets
become the authored label or `reference`; the label is serialized as plain text. Set
`includePrivate: true` to retain original authoring content without link projection. Annotation
and reference privacy aren't yet represented in the model.

## License

MIT
