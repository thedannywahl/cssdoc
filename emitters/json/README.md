# @cssdoc/json

Emit the [`@cssdoc/core`](../../packages/core) model as JSON — the TypeDoc `--json` analog. Writes a
whole-model `model.json`, optionally one file per record plus a lightweight `index.json`, and the
**JSON Schema** of the model so consumers can validate or type the output.

## Usage

```ts
import { writeJson, cssDocSchema } from "@cssdoc/json";
import { readFileSync } from "node:fs";

writeJson({
  css: readFileSync("dist/components.css", "utf8"),
  outDir: "docs/api/json",
  perRecord: true, // + records/<name>.json and index.json
  schema: true, // + model.schema.json
});
```

`renderJson(entries)` returns the JSON string; `cssDocSchema` is the draft-07 schema object (kept in
step with `@cssdoc/core`'s model — a test validates the model against it).

## License

MIT
