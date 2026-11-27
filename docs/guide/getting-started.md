# Getting started

Parse one CSS component and see which selector and modifier cssdoc discovers. You'll need Node.js
and a project with a `package.json`. In an empty directory, run `npm init -y` to create one.

## Install

```sh
npm install -D @cssdoc/cssdoc
```

## Document a component

Create `button.css` in your project:

```css
/**
 * @component button
 * @summary Triggers an action.
 */
.button {
  padding: 0.5rem 1rem;
}

.button--quiet {
  background: transparent;
}
```

`@component button` starts a documentation record named `button`. The default BEM convention lets
cssdoc recognize `.button--quiet` as a modifier from the selector alone.

## Parse it

Create `inspect.mjs` next to `button.css`:

```js
import { readFileSync } from "node:fs";

import { parseCssDocs } from "@cssdoc/cssdoc";

const css = readFileSync(new URL("./button.css", import.meta.url), "utf8");
const [button] = parseCssDocs(css);

console.log(button.name, button.className);
console.log(button.modifiers.map(({ name }) => name).join(", "));
```

Run it:

```sh
node inspect.mjs
```

You should see:

```text
button .button
button--quiet
```

## Next steps

[Document a component](/guide/authoring) to explain when to use the quiet button and how to customize
it. When you're ready to publish, [generate documentation](/guide/emitters).

You can also [set up your editor](/guide/editor) or [try a change in the Playground](/guide/playground).
