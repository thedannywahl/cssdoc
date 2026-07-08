# @cssdoc/config

Load a `cssdoc.json` file into an [`@cssdoc/core`](../core) `CssDocConfiguration` — TSDoc-config, for
CSS. Model on `@microsoft/tsdoc-config`: a separate package (it needs Node and ajv) that reads the
config, validates it against a JSON schema, resolves `extends`, and applies it to a parser.

## Install

```sh
npm i -D @cssdoc/config @cssdoc/core
```

## Usage

```ts
import { CssDocConfigFile } from "@cssdoc/config";
import { parseCssDocs } from "@cssdoc/core";

const configFile = CssDocConfigFile.loadForFolder(process.cwd());
if (configFile.hasErrors) console.warn(configFile.getErrorSummary());

const model = parseCssDocs(css, { configuration: configFile.toConfiguration() });
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
}
```

| Field            | Meaning                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `extends`        | Paths (local `./…` or package specifiers) to other `cssdoc.json` files to inherit from.                                    |
| `noStandardTags` | Disable every built-in standard tag; only `tagDefinitions` stay supported.                                                 |
| `tagDefinitions` | Custom tags: `tagName`, `syntaxKind` (`record`/`block`/`modifier`/`inline`), `allowMultiple?`, `recordKind?`, `aliasFor?`. |
| `supportForTags` | Enable/disable specific tags by name.                                                                                      |

`loadForFolder` walks up from a folder to the nearest `cssdoc.json`. A missing file yields a
`fileNotFound` instance (not an error); a malformed one collects messages on `getErrorSummary()`
instead of throwing.

## License

MIT
