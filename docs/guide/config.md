# Configure cssdoc

Start with a `cssdoc.json` file when your project needs different parsing or lint settings. Put it
beside your `package.json` so it applies to the stylesheets under that directory.

## Match your project's selectors

Choose one of the following configurations for `cssdoc.json`. Each example documents a button and
shows the selectors cssdoc recognizes under that convention. The CSS AST supplies the modifiers;
doc-comments supply their prose.

### BEM (default)

BEM uses a suffix for modifiers and `__` for elements. You don't need to set `modifierConvention`
unless you want to make the default explicit:

::: code-group

```jsonc [cssdoc.json]
{
  "$schema": "https://cssdoc.dev/cssdoc.schema.json",
  // "modifierConvention": "bem", (optional)
}
```

```css [button.css]
/**
 * @component button
 * @summary A button for user actions.
 */
.button {
  padding: 0.5rem 1rem;
}
.button--primary {
  background: royalblue;
}
.button__label {
  font-weight: bold;
}
```

:::

cssdoc recognizes `button--primary` as a modifier and `button__label` as a part of `button`.

### RSCSS

RSCSS uses a separate class prefixed with `-`, chained to the component's base class:

::: code-group

```jsonc [cssdoc.json]
{
  "$schema": "https://cssdoc.dev/cssdoc.schema.json",
  "modifierConvention": "rscss",
}
```

```css [button.css]
/**
 * @component button
 * @summary A button for user actions.
 */
.button {
  padding: 0.5rem 1rem;
}
.button.-color-secondary {
  background: slategray;
}
```

:::

cssdoc recognizes `-color-secondary` as a modifier of `button`, split into property `color` and
value `secondary`.

### BARE

The bare preset treats any class chained to the base as a modifier, without a required prefix:

::: code-group

```jsonc [cssdoc.json]
{
  "$schema": "https://cssdoc.dev/cssdoc.schema.json",
  "modifierConvention": "bare",
}
```

```css [button.css]
/**
 * @component button
 * @summary A button for user actions.
 */
.button {
  padding: 0.5rem 1rem;
}
.button.primary {
  background: royalblue;
}
```

:::

cssdoc recognizes `primary` as a modifier of `button`. `.button .primary` isn't equivalent: the
space makes it a descendant selector rather than a modifier on the button itself.

### Custom convention

If the presets don't match your selectors, set `modifierConvention` to an object. Choose a
`structure`: `"suffix"` for modifiers appended to the base class, `"chained"` for separate classes
on the same element, or `"attribute"` for attribute selectors on the base. Set `separator` to the
literal delimiter or prefix that identifies your modifiers; use an array to accept several.

For class-based conventions, enable `propValue` to split modifier names into property/value pairs,
and set `propValueSeparator` if the split uses something other than `-`. You can also configure
`elementSeparator` for suffix-based parts and `statePrefixes` for state classes. See the
[custom convention fields](/guide/config-reference#modifierconvention) for all options.

#### Example: approximate CUBE CSS

CUBE CSS isn't a built-in preset. You can approximate its exception layer with `data-` attributes
on a block:

::: code-group

```jsonc [cssdoc.json]
{
  "$schema": "https://cssdoc.dev/cssdoc.schema.json",
  "modifierConvention": {
    "structure": "attribute",
    "separator": "data-",
  },
}
```

```css [button.css]
/**
 * @component button
 * @summary A button for user actions.
 */
.button {
  padding: 0.5rem 1rem;
}
.button[data-variant="primary"] {
  background: royalblue;
}
.button[data-size="compact"] {
  padding: 0.25rem 0.5rem;
}
```

:::

cssdoc recognizes these attributes as modifiers, deriving property `variant` with value `primary`
and property `size` with value `compact`. Attribute conventions derive property/value pairs
automatically; you don't need `propValue`.

This config only models CUBE-style exceptions. It doesn't enforce the composition, utility, or
block layers, and it treats every matching `data-` attribute on the base as a modifier. Use a
narrower `separator`, such as `"data-variant"`, if other data attributes aren't part of your API.

## Apply the config

The cssdoc [CLI](/guide/linting) and [editor integration](/guide/editor) pick up the config when
they read your CSS. These settings change how cssdoc interprets selectors; they don't rewrite your CSS.

The nearest config applies to each stylesheet. In a monorepo, this lets packages use different
conventions. Use [extends](/guide/config-reference#inheritance) to share defaults between them.

## Where to go next

- [Set rule severity](/guide/linting#set-rule-severity) to change what gets reported.
- [Connect another project's CSS or model](/guide/config-reference#providers) to reuse its documented components.
- [Load config from a script](/reference/@cssdoc/config/classes/CssDocConfigFile) when using the parser directly.
- [Look up a field or its default](/guide/config-reference) in the configuration reference.
