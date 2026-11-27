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
  "prose": {
    "mode": "auto",
    "tags": { "@example": "markdown" },
    "remarkKinds": { "usage": "plain" },
  },
}
```

| Field            | Meaning                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `extends`        | Paths (local `./…` or package specifiers) to other `cssdoc.json` files to inherit from.                                    |
| `noStandardTags` | Disable every built-in standard tag; only `tagDefinitions` stay supported.                                                 |
| `tagDefinitions` | Custom tags: `tagName`, `syntaxKind` (`record`/`block`/`modifier`/`inline`), `allowMultiple?`, `recordKind?`, `aliasFor?`. |
| `supportForTags` | Enable/disable specific tags by name.                                                                                      |
| `prose`          | Select `plain`, `markdown` (default), or `auto` interpretation, with tag and remark-kind overrides.                        |

Remark-kind overrides take precedence over tag overrides, then the global mode. Use `null` to clear
an inherited setting. Full core records the effective mode on extracted prose; lite always uses
`plain`. Emitter integration is still in progress.

`loadForFolder` walks up from a folder to the nearest `cssdoc.json`. A missing file yields a
`fileNotFound` instance (not an error); a malformed one collects messages on `getErrorSummary()`
instead of throwing.

## Provider models

`resolveProviders(configFile)` loads the providers declared in `cssdoc.json`. CSS providers use their
own configuration; JSON providers accept a `CssDocEntry[]` or a `{ "entries": [...] }` manifest.
The loader validates every entry with the ArkType definitions in `@cssdoc/core/schema` before applying
prefix rewrites or registering cross-links. Invalid models contribute no entries or links and
produce a message with the provider path and schema error location. Other providers still load.

## License

MIT
