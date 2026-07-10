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

| Field                | Meaning                                                                                                                                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extends`            | Paths (local `./…` or package specifiers) to other `cssdoc.json` files to inherit from.                                                                                                                                                                                                     |
| `noStandardTags`     | Disable every built-in standard tag; only `tagDefinitions` remain.                                                                                                                                                                                                                          |
| `tagDefinitions`     | Custom tags: `tagName`, `syntaxKind` (`record`/`block`/`modifier`/`inline`), `allowMultiple?`, `recordKind?`, `aliasFor?`.                                                                                                                                                                  |
| `supportForTags`     | Enable or disable specific tags by name.                                                                                                                                                                                                                                                    |
| `modifierConvention` | How modifier classes are spelled — a preset (`bem`, `rscss`, `bare`) or a custom object. A custom object can also map BEM elements to parts (`elementSeparator`), state classes to states (`statePrefixes`), and native pseudo-classes to states (`statePseudoClasses`). Defaults to `bem`. |
| `rules`              | Per-rule severity overrides (`off`/`warn`/`error`).                                                                                                                                                                                                                                         |
| `naming`             | Name-case to enforce on `component`/`part` class names — a preset (`pascalCase`/`camelCase`/`lowercase`) or a custom regex.                                                                                                                                                                 |

See [Modifier conventions](/guide/modifier-conventions) for the convention forms and the full rule list.

## Rule severities

Each lint rule has a configurable severity — `off`, `warn`, or `error` — set under `rules` in
`cssdoc.json`:

```jsonc
{
  "modifierConvention": "bem",
  "rules": {
    "unknown-modifier": "warn",
    "undocumented-modifier": "error",
  },
}
```

The rule ids:

| Rule                            | Default | Fires when…                                                                  |
| ------------------------------- | ------- | ---------------------------------------------------------------------------- |
| `missing-summary`               | `warn`  | a record has no `@summary`.                                                  |
| `undocumented-modifier`         | `warn`  | a modifier has no `@modifier` description.                                   |
| `deprecated-requires-canonical` | `warn`  | a deprecated modifier has no replacement.                                    |
| `name-not-in-css`               | `warn`  | a documented modifier/part isn't in any selector.                            |
| `unknown-modifier`              | `warn`  | a consumer uses a modifier candidate that isn't documented.                  |
| `deprecated-modifier`           | `warn`  | a consumer uses a deprecated modifier.                                       |
| `unknown-state`                 | `warn`  | a consumer uses a state class (`statePrefixes`) that isn't documented.       |
| `unknown-part`                  | `warn`  | a consumer uses an element class (`elementSeparator`) that isn't documented. |
| `undocumented-part`             | `warn`  | a part has no `@part` description.                                           |
| `undocumented-css-part`         | `warn`  | a shadow part (`@csspart`) has no description.                               |
| `component-name-case`           | `warn`  | a component class breaks the configured `naming.component` case (see below). |
| `part-name-case`                | `warn`  | a part class breaks the configured `naming.part` case.                       |
| `structure-unknown-selector`    | `warn`  | an `@structure` selector isn't the component class or a documented part.     |
| `invalid-default-value`         | `warn`  | a registered property's default doesn't match its syntax.                    |
| `invalid-property-value`        | `warn`  | an assignment doesn't match a property's declared syntax.                    |
| `invalid-fallback-value`        | `warn`  | a `var(--x, …)` fallback doesn't match the declared syntax.                  |
| `unknown-custom-property`       | `off`   | a `var(--x)` isn't documented (opt-in via a property prefix).                |

`unknown-modifier` defaults to `warn` because BEM's `--` is an unambiguous signal — only `base--…`
tokens are candidates. Under weak-signal conventions (`bare`/OOCSS), where every chained class is a
candidate, set it to `off` to avoid flagging unrelated classes.

## Loading it

```ts
import { CssDocConfigFile } from "@cssdoc/config";
import { parseCssDocs } from "@cssdoc/core";

const configFile = CssDocConfigFile.loadForFolder(process.cwd());
if (configFile.hasErrors) console.warn(configFile.getErrorSummary());

const model = parseCssDocs(css, { configuration: configFile.toConfiguration() });
```

`loadForFolder` walks up to the nearest `cssdoc.json` (or `cssdoc.jsonc`). A missing file is not an
error; a malformed one collects messages on `getErrorSummary()` instead of throwing (it's validated
against a JSON schema). Either name is parsed as JSON with comments, so you can annotate your config
with `//` comments and trailing commas — name it `cssdoc.jsonc` to make that explicit to your editor.

Every cssdoc tool that reads CSS — the emitters, generators, linters, and language server — accepts the
same configuration, so a custom tag you register is understood everywhere.
