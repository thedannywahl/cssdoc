# Modifier conventions

cssdoc is framework-agnostic, so it doesn't assume one way of spelling a component's modifier
variations. A **modifier convention** tells the parser how to recognize a modifier on a base class,
how to render it back into a selector, and how to detect its use in HTML.

The **default is BEM** — a modifier is conjoined onto the base class with `--`, like
`.button--primary`. Set a different convention in `cssdoc.json` or via `ParseOptions`.

::: warning Behavior change
Earlier versions hard-coded the rscss `-modifier` convention. The default is now BEM. If your
stylesheet uses rscss (`.button.-color-secondary`), set `"modifierConvention": "rscss"`.
:::

## Presets

Three presets ship by name:

| Preset  | Structure | Example                    | prop / value                          |
| ------- | --------- | -------------------------- | ------------------------------------- |
| `bem`   | suffix    | `.button--primary`         | `prop: "primary"`                     |
| `rscss` | chained   | `.button.-color-secondary` | `prop: "color"`, `value: "secondary"` |
| `bare`  | chained   | `.button.primary`          | `prop: "primary"`                     |

```jsonc
{
  "$schema": "https://cssdoc.dev/cssdoc.schema.json",
  "modifierConvention": "rscss",
}
```

## The three structural forms

A custom convention is an object with a `structure`, a `separator`, and optional `prop`/`value`
splitting. Every well-known scheme is one of three structures:

```ts
interface ModifierConvention {
  structure: "chained" | "suffix" | "attribute";
  separator: string | string[]; // interpreted per structure (see below)
  propValue?: boolean; // split the body into prop/value? (default false)
  propValueSeparator?: string; // default "-"
}
```

- **`chained`** — a separate class chained to the base. `separator` is the required class prefix
  (`""` means any chained class).
- **`suffix`** — appended into the base class name. `separator` is the delimiter between the base and
  the modifier body.
- **`attribute`** — an attribute selector on the base. `separator` is the required attribute-name
  prefix (`""` means any attribute).

`separator` may be an **array** — any one of the values marks a modifier, useful for state prefixes
like `is-`/`has-`. Values are matched literally (never as a regex):

```jsonc
{ "modifierConvention": { "structure": "chained", "separator": ["is-", "has-"] } }
```

```css
.card.is-open {
  /* → modifier "is-open" */
}
.card.has-icon {
  /* → modifier "has-icon" */
}
```

## Worked examples

### BEM (default)

```jsonc
{ "modifierConvention": { "structure": "suffix", "separator": "--" } }
```

```css
.card {
  /* … */
}
.card--featured {
  /* … */
} /* → modifier "card--featured", prop "featured" */
```

### SUIT

Structurally identical to BEM; PascalCase blocks don't affect detection.

```jsonc
{ "modifierConvention": { "structure": "suffix", "separator": "--" } }
```

```css
.Card--featured {
  /* → modifier "Card--featured", prop "featured" */
}
```

### rscss

```jsonc
{ "modifierConvention": "rscss" }
```

```css
.card.-color-primary {
  /* → modifier "-color-primary", prop "color", value "primary" */
}
```

### CUBE CSS

CUBE exceptions are data attributes, which map cleanly onto `prop`/`value`.

```jsonc
{ "modifierConvention": { "structure": "attribute", "separator": "data-" } }
```

```css
.card[data-variant="ghost"] {
  /* → prop "variant", value "ghost" */
}
.card[data-loading] {
  /* → prop "loading" (boolean) */
}
```

### OOCSS

Standalone modifier classes chained to the base — the same as the `bare` preset. Because every chained
class is a candidate, pair it with `"unknown-modifier": "off"` (see below) so unrelated classes aren't
flagged.

```jsonc
{
  "modifierConvention": { "structure": "chained", "separator": "" },
  "rules": { "unknown-modifier": "off" },
}
```

```css
.card.featured {
  /* → modifier "featured" */
}
```

### is- state classes

```jsonc
{ "modifierConvention": { "structure": "chained", "separator": "is-" } }
```

```css
.card.is-loading {
  /* → modifier "is-loading", prop "loading" */
}
```

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
| `undocumented-part`             | `warn`  | a part has no `@part` description.                                           |
| `component-name-case`           | `warn`  | a component class breaks the configured `naming.component` case (see below). |
| `part-name-case`                | `warn`  | a part class breaks the configured `naming.part` case.                       |
| `invalid-default-value`         | `warn`  | a registered property's default doesn't match its syntax.                    |
| `invalid-property-value`        | `warn`  | an assignment doesn't match a property's declared syntax.                    |
| `invalid-fallback-value`        | `warn`  | a `var(--x, …)` fallback doesn't match the declared syntax.                  |
| `unknown-custom-property`       | `off`   | a `var(--x)` isn't documented (opt-in via a property prefix).                |

`unknown-modifier` defaults to `warn` because BEM's `--` is an unambiguous signal — only `base--…`
tokens are candidates. Under weak-signal conventions (`bare`/OOCSS), where every chained class is a
candidate, set it to `off` to avoid flagging unrelated classes.

## Name-case conventions

Enforce a case on component and part **class names** — e.g. SUIT's PascalCase components — with the
`naming` block. Each entry is a preset (`pascalCase`, `camelCase`, `lowercase`) or a custom regular
expression tested against the class name. The `*-name-case` rules only fire when `naming` is set.

```jsonc
{
  "modifierConvention": "bem",
  "naming": {
    "component": "pascalCase", // SUIT: .Card, .SiteHeader
    "part": "camelCase",
  },
}
```

| Preset       | Pattern               | Matches            |
| ------------ | --------------------- | ------------------ |
| `pascalCase` | `^[A-Z][A-Za-z0-9]*$` | `Card`, `SiteNav`  |
| `camelCase`  | `^[a-z][A-Za-z0-9]*$` | `card`, `siteNav`  |
| `lowercase`  | `^[a-z][a-z0-9-]*$`   | `card`, `site-nav` |

A custom value is used as a regex source (e.g. `"^c-[a-z]"`). It's your own config and is only
tested against short class names, but a pathological pattern can still be slow — prefer a preset
where one fits.

## In code

The convention is also settable programmatically:

```ts
import { parseCssDocs } from "@cssdoc/core";

const model = parseCssDocs(css, { modifierConvention: "rscss" });
// or a custom object:
parseCssDocs(css, { modifierConvention: { structure: "attribute", separator: "data-" } });
```
