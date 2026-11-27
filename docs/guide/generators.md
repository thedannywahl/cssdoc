# Export to other tools

Pick the format the receiving tool already understands.

| Destination                                | Format                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Web component documentation tools          | [Custom Elements Manifest](/reference/@cssdoc/cem/functions/writeCem)                        |
| A design token pipeline                    | [DTCG tokens](/reference/@cssdoc/dtcg/functions/writeDtcg) from declared custom properties   |
| VS Code's built-in CSS and HTML completion | [VS Code custom data](/reference/@cssdoc/vscode-custom-data/functions/writeVscodeCustomData) |

## Export a web component's shadow part

For example, put this in `toggle.css` to document a shadow part that consumers can style:

```css
/**
 * @component x-toggle
 * @selector x-toggle
 * @summary Switches a setting on or off.
 * @csspart label — The text beside the switch.
 */
x-toggle {
  display: inline-flex;
}

x-toggle::part(label) {
  font-weight: 600;
}
```

```sh
npm install -D @cssdoc/cssdoc @cssdoc/cem
```

Save this as `export-manifest.mjs` next to the stylesheet:

```js
import { readFileSync } from "node:fs";

import { writeCem } from "@cssdoc/cem";
import { createIndex } from "@cssdoc/cssdoc";

const index = createIndex(readFileSync("toggle.css", "utf8"));
writeCem({ index });
```

Run `node export-manifest.mjs`. Open `custom-elements.json` and look for the `x-toggle` declaration
with `label` under `cssParts`.
