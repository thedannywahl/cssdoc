# Document embedded CSS

Put your cssdoc comment next to the rule inside the host file. For example, in a Vue component,
write it inside the `<style>` block so the parser and linters configured for Vue can read it.

## Read the styles in a Vue file

Save this as `Button.vue`:

```vue
<template>
  <button class="button">Save</button>
</template>

<style scoped>
/**
 * @component button
 * @summary Saves the current changes.
 */
.button {
  padding: 0.5rem 1rem;
}
</style>
```

To inspect what cssdoc found, install the embedded CSS parser:

```sh
npm install -D @cssdoc/embedded
```

Save this as `inspect-vue.mjs` beside the Vue file:

```js
import { readFileSync } from "node:fs";
import { parseCssDocsFromSource } from "@cssdoc/embedded";

const source = readFileSync("Button.vue", "utf8");
const [button] = parseCssDocsFromSource(source, { filename: "Button.vue" });
console.log(button.name, button.className);
```

Run `node inspect-vue.mjs`. It prints `button .button`.

To [generate docs](/guide/emitters) from a Vue file, pass its contents as `css` and set `lang: "html"`.
For tagged templates, preprocessors, and editor or linter setup, see
[embedded CSS support](/guide/embedded-css-support).
