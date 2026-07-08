# @cssdoc/vscode-custom-data

Generate [VS Code custom data](https://github.com/microsoft/vscode-custom-data) from the cssdoc model,
so the built-in CSS and HTML language services offer completions and hover for the documented surface —
no extension required.

- `html.customData` lists component classes and modifiers as `class`-attribute values → class-name
  completion in `class="…"`.
- `css.customData` lists the declared custom properties.

## Usage

```ts
import { createIndex } from "@cssdoc/index";
import { writeVscodeCustomData } from "@cssdoc/vscode-custom-data";
import { readFileSync } from "node:fs";

const index = createIndex(readFileSync("dist/components.css", "utf8"));
writeVscodeCustomData({ index, outDir: ".vscode" });
```

Then point VS Code at the files:

```jsonc
// .vscode/settings.json
{
  "css.customData": [".vscode/css-custom-data.json"],
  "html.customData": [".vscode/html-custom-data.json"],
}
```

## License

MIT
