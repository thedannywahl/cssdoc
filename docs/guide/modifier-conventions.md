# Modifier conventions

cssdoc is framework-agnostic, so it doesn't assume one way of spelling a component's modifier
variations. A **modifier convention** tells the parser how to recognize a modifier on a base class,
how to render it back into a selector, and how to detect its use in HTML.

The **default is BEM** — a modifier is conjoined onto the base class with `--`, like
`.button--primary`. Set a different convention in `cssdoc.json` or via `ParseOptions`.

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
  elementSeparator?: string | string[]; // BEM element delimiter, e.g. "__" → parts
  statePrefixes?: string[]; // state-class prefixes, e.g. ["is-","has-"] → states
  statePseudoClasses?: string[]; // native pseudo-classes as states, e.g. ["disabled"]; overrides the default set
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

## Elements and states

A convention can also name two roles that aren't modifiers, so they land in the model's `parts` and
`states` instead of being flattened into `modifiers`:

- **`elementSeparator`** — a BEM-style element delimiter inside the base class name. A matching class
  is recorded as a **part**. The default BEM preset sets `"__"`, so `.card__title` is a part named
  `card__title`.
- **`statePrefixes`** — class prefixes that mark a **state**. A class chained to the base whose name
  starts with one of these is recorded as a state and is never treated as a modifier. It's opt-in — no
  preset sets it.
- **`statePseudoClasses`** — native pseudo-classes recognized as states. cssdoc ships a curated default
  set of form/UI states (`:disabled`, `:checked`, `:open`, `:required`, `:valid`, …) — deliberately not
  `:hover`/`:focus` — so `.tab:disabled` is a `pseudo-class` state. Set this to override the default.
  (Custom `:state(x)` states and authored `@cssstate :x` are always captured regardless.)

```jsonc
{
  "modifierConvention": {
    "structure": "suffix",
    "separator": "--",
    "elementSeparator": "__",
    "statePrefixes": ["is-", "has-"],
  },
}
```

```css
.card__title {
  /* → part "card__title" */
}
.card--featured {
  /* → modifier "card--featured" */
}
.card.is-loading {
  /* → state "is-loading" (not a modifier) */
}
```

An element's own modifiers attach to the part: `.card__title--active` gives the part `card__title` a
modifier `active` (in its `modifiers`), rather than inventing a part named `card__title--active`.
Consumer-side usage is checked too — a class that looks like a state (`statePrefixes`) or an element
(`elementSeparator`) but isn't documented raises `unknown-state` / `unknown-part`.

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

## Examples

### BEM (preset, default)

```jsonc
// {"modifierConvention": "bem"} underlying structure
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

Learn more about [BEM](https://getbem.com/)

### rscss (preset)

```jsonc
{ "modifierConvention": "rscss" }
```

```css
.card.-color-primary {
  /* → modifier "-color-primary", prop "color", value "primary" */
}
```

Learn more about [rscss](https://ricostacruz.com/rscss/)

### SUIT

Structurally identical to BEM; but requires PascalCase for components.

```jsonc
{
  "modifierConvention": { "structure": "suffix", "separator": "--" },
  "naming": { "component": "pascalCase" },
}
```

```css
.Card--featured {
  /* → modifier "Card--featured", prop "featured" */
}
```

Learn more about [SUIT](https://suitcss.github.io/)

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

Learn more about [CUBE](https://cube.fyi/)

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
