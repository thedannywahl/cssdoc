# Getting started

## Install

The parser and model live in `@cssdoc/core`:

```sh
npm i -D @cssdoc/core
```

Everything else (emitters, linters, the language server) builds on it — add those as you need them.

## Document a component

Put a `/** … */` comment above a component's rules. A record begins at a `@component` (or `@name`,
`@utility`, `@rule`, `@declaration`) tag and runs until the next one:

```css
/**
 * @component button
 * @summary The primary action control.
 * @modifier -color-secondary — A lower-emphasis action.
 * @cssproperty --instui-button-radius — The corner radius.
 */
.instui-button {
  border-radius: var(--instui-button-radius);
}
.instui-button.-color-secondary {
  background: #eee;
}
```

## Parse it

`parseCssDocs` returns one entry per record:

```ts
import { parseCssDocs, toJson } from "@cssdoc/core";
import { readFileSync, writeFileSync } from "node:fs";

const model = parseCssDocs(readFileSync("dist/components.css", "utf8"));

model[0].name; // "button"
model[0].className; // ".instui-button"
model[0].modifiers; // [{ name: "-color-secondary", prop: "color", value: "secondary", description: … }]

writeFileSync("css-docs.json", toJson(model)); // the raw model as JSON
```

The model is output-neutral. From here you can:

- turn it into docs — see [Emitting docs](/guide/emitters);
- export it to a standard format — see [Standard formats](/guide/generators);
- lint it and its usage — see [Linting](/guide/linting);
- power your editor — see [Editor support](/guide/editor).

## Learn the grammar

The full tag vocabulary — modifiers, parts, custom properties, functions, states, structure, release
stages, cross-references, and more — is covered in [Authoring doc comments](/guide/authoring).
