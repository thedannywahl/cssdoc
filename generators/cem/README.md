# @cssdoc/cem

Generate a [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest) from
the cssdoc model. cssdoc's vocabulary is CEM-shaped (`@cssproperty`, `@csspart`, `@cssstate`), so each
record becomes a declaration carrying `cssProperties`, `cssParts`, and `cssStates` — interoperable with
the CEM tooling ecosystem.

## Usage

```ts
import { readFileSync } from "node:fs";

import { writeCem } from "@cssdoc/cem";
import { createIndex } from "@cssdoc/index";

const index = createIndex(readFileSync("dist/components.css", "utf8"), { file: "components.css" });
writeCem({ index, outFile: "custom-elements.json" });
```

`toCem(index)` returns the manifest object if you'd rather serialize it yourself.

## License

MIT
