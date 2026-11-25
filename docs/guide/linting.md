# Set up linting

Check that the modifiers you expose in CSS have documentation, and catch references to CSS that
has changed.

| Your project uses…                  | Start with                              |
| ----------------------------------- | --------------------------------------- |
| No CSS linter                       | [cssdoc CLI](#run-a-check-with-the-cli) |
| Stylelint, or an oxlint/Vite+ setup | [Stylelint](#add-cssdoc-to-stylelint)   |
| ESLint with `@eslint/css`           | [ESLint](#add-cssdoc-to-eslint)         |

## Run a check with the CLI

Use `button.css` from [Getting started](/guide/getting-started):

```sh
npm install -D @cssdoc/cli
npx cssdoc lint button.css
```

Look for `undocumented-modifier`. cssdoc found `button--quiet` in the CSS and couldn't find its
description. Add `@modifier button--quiet — Use for secondary actions.` to the doc comment, then
run the command again to clear the diagnostic.

## Add cssdoc to Stylelint

Install `stylelint` and `@cssdoc/stylelint-plugin`. Add the plugin and rule to your Stylelint config.
For a fresh project, save this as `stylelint.config.mjs`:

```js
export default {
  plugins: ["@cssdoc/stylelint-plugin"],
  rules: { "cssdoc/valid-doc-comments": true },
};
```

Run `npx stylelint button.css`. For Vue files or tagged templates, see
[embedded CSS lint setup](/guide/embedded-css-support#linting).

## Add cssdoc to ESLint

Install `eslint`, `@eslint/css`, and `@cssdoc/eslint-plugin`. Add the recommended config to your
ESLint config, or save this as `eslint.config.mjs`:

```js
import cssdoc from "@cssdoc/eslint-plugin";

export default [...cssdoc.configs.recommended];
```

Run `npx eslint button.css`. To check the classes used in HTML or JSX, see
[consumer-side class checks](/guide/lint-reference#class-usage).

## Set rule severity

To require summaries, add this to `cssdoc.json` beside your stylesheet:

```json
{
  "rules": {
    "missing-summary": "error"
  }
}
```

Remove `@summary` from the button example and rerun your linter to see the error.
See [lint settings](/guide/config-reference#lint-rules) for per-file overrides and
[lint checks](/guide/lint-reference) for rules and suppression directives.
