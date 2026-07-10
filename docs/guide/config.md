# Configuration

`@cssdoc/core` ships an expansive standard tag vocabulary out of the box, so most projects need no
configuration. When you want **custom tags** or want to **turn standard ones off**, add a `cssdoc.json`
and load it with [`@cssdoc/config`](https://www.npmjs.com/package/@cssdoc/config) — the analog of
`@microsoft/tsdoc-config`.

```sh
npm i -D @cssdoc/config @cssdoc/core
```

## cssdoc.json

```jsonc
{
  "$schema": "https://cssdoc.dev/cssdoc.schema.json",
  "extends": ["./base.cssdoc.json"],
  "noStandardTags": false,
  "tagDefinitions": [
    { "tagName": "@token", "syntaxKind": "block", "allowMultiple": true },
    { "tagName": "@pattern", "syntaxKind": "record", "recordKind": "component" },
  ],
  "supportForTags": {
    "@privateRemarks": false,
  },
  "modifierConvention": "bem",
  "rules": {
    "unknown-modifier": "warn",
  },
}
```

| Field                | Meaning                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `extends`            | Paths (local `./…` or package specifiers) to other `cssdoc.json` files to inherit from.                                    |
| `noStandardTags`     | Disable every built-in standard tag; only `tagDefinitions` remain.                                                         |
| `tagDefinitions`     | Custom tags: `tagName`, `syntaxKind` (`record`/`block`/`modifier`/`inline`), `allowMultiple?`, `recordKind?`, `aliasFor?`. |
| `supportForTags`     | Enable or disable specific tags by name.                                                                                   |
| `modifierConvention` | How modifier classes are spelled — a preset (`bem`, `rscss`, `bare`) or a custom object. Defaults to `bem`.                |
| `rules`              | Per-rule severity overrides (`off`/`warn`/`error`).                                                                        |

See [Modifier conventions](/guide/modifier-conventions) for the convention forms and the full rule list.

## Loading it

```ts
import { CssDocConfigFile } from "@cssdoc/config";
import { parseCssDocs } from "@cssdoc/core";

const configFile = CssDocConfigFile.loadForFolder(process.cwd());
if (configFile.hasErrors) console.warn(configFile.getErrorSummary());

const model = parseCssDocs(css, { configuration: configFile.toConfiguration() });
```

`loadForFolder` walks up to the nearest `cssdoc.json`. A missing file is not an error; a malformed one
collects messages on `getErrorSummary()` instead of throwing (it's validated against a JSON schema).

Every cssdoc tool that reads CSS — the emitters, generators, linters, and language server — accepts the
same configuration, so a custom tag you register is understood everywhere.
