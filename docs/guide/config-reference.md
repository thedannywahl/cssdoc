---
aside: false
editLink: false
---

# Config reference

`cssdoc.json` and `cssdoc.jsonc` configure tag parsing, lint rules, providers, and rendered output.
The [configuration guide](/guide/config) shows common setups; this page documents every field accepted
by the schema.

The schema is published at
[`https://cssdoc.dev/cssdoc.schema.json`](https://cssdoc.dev/cssdoc.schema.json). Add it to a config
file for editor validation and completion:

```jsonc
{
  "$schema": "https://cssdoc.dev/cssdoc.schema.json",
}
```

Both file names accept JSON with comments and trailing commas. `cssdoc.jsonc` makes that format
explicit. The schema rejects unknown fields, so misspellings are reported rather than silently ignored.

## Top-level fields

| Field                | Type                                             | Purpose                                                                                                |
| -------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `$schema`            | string                                           | Schema URL used by editors.                                                                            |
| `extends`            | string[]                                         | Config files or package exports to inherit. Relative paths resolve from the config that declares them. |
| `noStandardTags`     | boolean                                          | Disable all standard tags; only custom `tagDefinitions` remain enabled.                                |
| `tagDefinitions`     | object[]                                         | Add custom doc-comment tags.                                                                           |
| `supportForTags`     | object                                           | Enable or disable individual tags by name.                                                             |
| `modifierConvention` | preset or object                                 | Describe how modifier, part, and state selectors are spelled.                                          |
| `inlineComments`     | `"append" \| "prepend" \| "replace" \| "ignore"` | Choose how a member's CSS comment combines with its tag prose.                                         |
| `providers`          | object[]                                         | Consume records from another CSS source or published model.                                            |
| `rules`              | object                                           | Set lint rule severities.                                                                              |
| `overrides`          | object[]                                         | Set rule severities for matching file globs.                                                           |
| `ruleOptions`        | object                                           | Tune behavior shared by related lint rules.                                                            |
| `naming`             | object                                           | Enforce naming conventions for component and part classes.                                             |
| `structureIgnore`    | string[]                                         | Exempt external class names from `structure-unknown-selector`.                                         |
| `globalPrecedence`   | `"base" \| "global"`                             | Choose which modifier wins when a global and explicit definition conflict.                             |
| `render`             | object                                           | Set defaults for rendered API pages and editor hovers. Explicit emitter options take precedence.       |

Unknown top-level and nested properties aren't allowed. See the [complete schema](#complete-json-schema)
for exact constraints.

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Basic setup]
{
  "$schema": "https://cssdoc.dev/cssdoc.schema.json",
  // Inherit from a preset configuration package
  "extends": ["@cssdoc/config/web-components"],
}
```

```jsonc [With custom tags and rules]
{
  "$schema": "https://cssdoc.dev/cssdoc.schema.json",
  // Add a custom @author tag for author information
  "tagDefinitions": [
    {
      "tagName": "@author",
      "syntaxKind": "block",
    },
  ],
  // Configure rule severities
  "rules": {
    "missing-summary": "off", // Allow components without summaries
    "unknown-custom-property": "warn", // Warn about unknown CSS custom properties
  },
}
```

```jsonc [With providers and naming]
{
  "$schema": "https://cssdoc.dev/cssdoc.schema.json",
  // Consume documentation from vendor stylesheets
  "providers": [
    {
      "path": "./vendor/external.css",
      "baseHref": "https://example.com/api/",
    },
  ],
  // Enforce naming conventions
  "naming": {
    "component": "pascalCase",
    "part": "camelCase",
  },
}
```

```jsonc [With render defaults]
{
  "$schema": "https://cssdoc.dev/cssdoc.schema.json",
  // Configure output rendering defaults
  "render": {
    "includeInternal": false, // Hide internally-marked records
    "structureView": "diagram", // Show component structure as a diagram
    "baseHref": "https://docs.example.com/", // Base URL for documentation links
  },
}
```

:::

</details>

## Inheritance

`extends` accepts paths to other config files or package specifiers resolved from the declaring file.
Extended configs apply first; fields in the current file override them. Rule severities, naming,
`ruleOptions`, and render settings merge with the current file taking precedence. Structure-ignore
patterns are unioned, while rule overrides are appended and evaluated in order. `providers` belong to
the current config and aren't inherited.

### Basic extends

You can extend from local config files or published npm packages. When you extend, the base config loads first, then your config overrides or adds to it. Use multiple extends to layer configs in order of precedence.

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Local config]
{
  // Inherit from another config file in the project
  "extends": ["./cssdoc.base.json"],
  // Override specific fields
}
```

```jsonc [Package preset]
{
  // Inherit from a published config preset
  "extends": ["@cssdoc/config/web-components"],
  // Add or override settings
  "rules": {
    "missing-summary": "off", // This overrides the inherited value
  },
}
```

```jsonc [Multiple extends]
{
  // Extends are applied in order; later files override earlier ones
  "extends": [
    "@cssdoc/config/base", // Apply base rules first
    "@cssdoc/config/web-components", // Then web-component conventions
    "./cssdoc.local.json", // Finally, local overrides
  ],
  "rules": {
    "unknown-modifier": "error", // This overrides all inherited values
  },
}
```

:::

</details>

### Merge behavior

Most config fields merge with inherited values rather than replace them completely. When you specify a field, it overrides the inherited value for that specific key, but other keys from the base config are preserved. This applies to `rules`, `naming`, `ruleOptions`, and `render`.

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Rules and render merge]
{
  // Base config has:
  // "rules": { "unknown-part": "warn", "missing-summary": "off" }
  // "render": { "structureView": "both", "baseHref": "..." }

  "extends": ["./base.json"],

  // These fields MERGE with inherited ones:
  "rules": {
    "unknown-part": "error", // Overrides inherited value
    // "missing-summary" from base is kept
  },
  "render": {
    "structureView": "diagram", // Overrides inherited value
    // "baseHref" from base is kept
  },
}
```

:::

</details>

### Special merge behaviors

Some fields have unique merging semantics. `structureIgnore` patterns are combined into a single array, while `overrides` are appended in order and evaluated last-match-wins. These behaviors allow you to layer rules without replacing base configurations.

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Structure ignore unioned]
{
  // Base config has:
  // "structureIgnore": ["bootstrap-*", "vendor-*"]

  "extends": ["./base.json"],

  // Patterns are UNIONED (combined, not replaced):
  "structureIgnore": [
    "material-*", // Added to inherited patterns
  ],
  // Result: ["bootstrap-*", "vendor-*", "material-*"]
}
```

```jsonc [Rule overrides appended]
{
  // Base config has overrides for "src/**/*.css"

  "extends": ["./base.json"],

  // Overrides are APPENDED and evaluated in order:
  "overrides": [
    {
      "files": "experimental/**/*.css",
      "rules": { "structure-unknown-selector": "warn" },
    },
    // Later matches override earlier ones
  ],
}
```

:::

</details>

## Tags

### `tagDefinitions`

Each definition requires `tagName` and `syntaxKind`.

| Property        | Type                                                    | Purpose                                                                                                             |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `tagName`       | string                                                  | Tag name, with or without the leading `@`; it must start with a letter and may contain letters, digits, or hyphens. |
| `syntaxKind`    | `"record" \| "block" \| "modifier" \| "inline"`         | How the parser reads the tag.                                                                                       |
| `allowMultiple` | boolean                                                 | Allow the tag to appear more than once in a comment.                                                                |
| `recordKind`    | `"component" \| "utility" \| "declaration" \| "layout"` | Record category for a custom record tag.                                                                            |
| `aliasFor`      | string                                                  | Identify the tag this custom tag aliases.                                                                           |

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Custom block tag]
{
  "tagDefinitions": [
    {
      "tagName": "@author",
      "syntaxKind": "block", // Standalone block at the end of a doc comment
    },
  ],
}
```

```jsonc [Custom record tag]
{
  "tagDefinitions": [
    {
      "tagName": "@widget",
      "syntaxKind": "record", // Marks a new record (like @component)
      "recordKind": "component", // Treat as a component type
      "allowMultiple": false,
    },
  ],
}
```

```jsonc [Custom inline tag with multiple occurrences]
{
  "tagDefinitions": [
    {
      "tagName": "@audience",
      "syntaxKind": "inline", // Can appear inline in prose
      "allowMultiple": true, // Can be used multiple times
    },
  ],
}
```

```jsonc [Tag aliasing]
{
  "tagDefinitions": [
    {
      "tagName": "@deprecated-reason",
      "syntaxKind": "block",
      "aliasFor": "@deprecated", // This tag is an alias for @deprecated
    },
  ],
}
```

:::

</details>

### `supportForTags`

Use tag names as keys and booleans as values. Set a standard tag to `false` to disable it or `true` to
enable it. This is useful when keeping the standard vocabulary but changing support for selected tags.

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Disable specific tags]
{
  "supportForTags": {
    "example": false, // Don't process @example tags
    "see": false, // Don't process @see tags
  },
}
```

```jsonc [Re-enable disabled tags]
{
  "noStandardTags": true, // Disable all standard tags by default
  "supportForTags": {
    "summary": true, // But enable @summary
    "modifier": true, // And @modifier
    "csspart": true, // And @csspart
  },
}
```

:::

</details>

## CSS interpretation

### `modifierConvention`

Choose a preset or supply a custom convention:

```jsonc
{
  "modifierConvention": "bem",
  // Or describe a custom convention:
  // "modifierConvention": {
  //   "structure": "chained",
  //   "separator": "-",
  //   "elementSeparator": "__",
  //   "statePrefixes": ["is-", "has-"]
  // }
}
```

The built-in presets are `bem`, `rscss`, and `bare`. A custom convention accepts:

| Property             | Type                                   | Purpose                                                                                                 |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `structure`          | `"chained" \| "suffix" \| "attribute"` | Selector form used for modifiers.                                                                       |
| `separator`          | string or string[]                     | Modifier separator or separators.                                                                       |
| `elementSeparator`   | string or string[]                     | BEM-style element delimiter; matching classes become parts.                                             |
| `statePrefixes`      | string[]                               | Class prefixes that identify states, such as `is-` and `has-`.                                          |
| `statePseudoClasses` | string[]                               | Native pseudo-classes to treat as states. Supplying this replaces the built-in set.                     |
| `pseudoElements`     | string[]                               | Native pseudo-elements to document, without the leading `::`. Supplying this replaces the built-in set. |
| `propValue`          | boolean                                | Split modifier names into property and value segments.                                                  |
| `propValueSeparator` | string                                 | Separator between those segments when `propValue` is enabled.                                           |

`structure` and `separator` are required for a custom object. The preset defaults to BEM when omitted.

#### Presets

Use a built-in preset for conventions matching popular CSS naming systems:

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [BEM preset (default)]
{
  // Block Element Modifier: component__part--modifier
  "modifierConvention": "bem",
}
```

```jsonc [RSCSS preset]
{
  // Reasonable System for CSS Structure: component -child -modifier
  "modifierConvention": "rscss",
}
```

```jsonc [Bare preset]
{
  // Minimal convention: component -modifier
  "modifierConvention": "bare",
}
```

:::

</details>

#### Custom conventions

Define custom naming conventions by specifying structure, separators, and prefixes:

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Chained modifiers]
{
  "modifierConvention": {
    "structure": "chained", // Modifiers appear as .component-modifier
    "separator": "-", // Chained modifier separator
    "elementSeparator": "__", // Elements as component__part
    "statePrefixes": ["is-", "has-"], // State prefixes
  },
}
```

```jsonc [Suffix structure]
{
  "modifierConvention": {
    "structure": "suffix", // Modifiers appear as .component--modifier
    "separator": "--", // Suffix separator
    "statePrefixes": ["state-"], // Treat state- prefix as a state
  },
}
```

```jsonc [Property-value modifiers]
{
  "modifierConvention": {
    "structure": "chained",
    "separator": "-",
    "propValue": true, // Split .component-color-blue into color=blue
    "propValueSeparator": ":", // Property and value separated by colon
  },
}
```

:::

</details>

### `inlineComments`

Choose how an ordinary CSS comment on a member rule combines with prose from its doc tag:

- `append` adds the comment after the tag prose (default).
- `prepend` adds it before the tag prose.
- `replace` uses the comment instead of the tag prose.
- `ignore` discards the member comment for documentation.

<details>
<summary>Show examples</summary>

Given this CSS with both a tag and a member comment:

```css
/**
 * @modifier hover
 * Shows on hover.
 */
.button--hover {
  /* Sets the highlight color. */
  color: highlight;
}
```

::: code-group

```jsonc [append (default)]
{
  // Result: "Shows on hover. Sets the highlight color."
  "inlineComments": "append",
}
```

```jsonc [prepend]
{
  // Result: "Sets the highlight color. Shows on hover."
  "inlineComments": "prepend",
}
```

```jsonc [replace]
{
  // Result: "Sets the highlight color."
  "inlineComments": "replace",
}
```

```jsonc [ignore]
{
  // Result: "Shows on hover."
  "inlineComments": "ignore",
}
```

:::

</details>

### `globalPrecedence`

Choose how to resolve a modifier defined both explicitly and with `@global`:

- `base` lets the explicit modifier take precedence (default).
- `global` lets the global modifier take precedence.

<details>
<summary>Show examples</summary>

Given this CSS with both a global and explicit modifier:

```css
/**
 * @component button
 * @global hover Rendered when hovering anywhere on the button.
 */
.button {
}

/**
 * @modifier hover
 * Shows when hovering over the primary variant.
 */
.button--primary:hover {
}
```

::: code-group

```jsonc [base (default)]
{
  // Explicit .button--primary:hover takes precedence over global hover
  "globalPrecedence": "base",
}
```

```jsonc [global]
{
  // Global hover takes precedence; explicit definition flagged as conflict
  "globalPrecedence": "global",
}
```

:::

</details>

## Providers

Each `providers` entry requires `path`. It may point to a source stylesheet or a published `model.json`.
Relative paths beginning with `.` resolve from the config file; package specifiers use Node resolution.

| Property   | Type   | Purpose                                                             |
| ---------- | ------ | ------------------------------------------------------------------- |
| `path`     | string | Source stylesheet or published model.                               |
| `baseHref` | string | URL prefix for links to the provider's rendered pages.              |
| `prefix`   | object | Rewrite the provider's base-class prefix before records are merged. |

`prefix` requires `from` and accepts `to` and `isRegExp`. `from` is a literal prefix unless
`isRegExp` is `true`, in which case it is a regular-expression source anchored at the start of the class
name. `to` is used verbatim; no separator is inserted. Omit it or use an empty string to strip the
prefix.

### Consuming sources

Load documentation from stylesheets or precompiled models in your project or from npm packages:

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Local stylesheet]
{
  "providers": [
    {
      "path": "./styles/base.css", // Relative path from config file
    },
  ],
}
```

```jsonc [Package stylesheet]
{
  "providers": [
    {
      "path": "@company/ui-kit/styles.css", // npm package path
      "baseHref": "https://docs.company.com/ui-kit/", // URL prefix for links
    },
  ],
}
```

```jsonc [Published model]
{
  "providers": [
    {
      "path": "@cssdoc/defaults/model.json", // Precompiled model from package
    },
  ],
}
```

:::

</details>

### Prefix rewriting

Transform class name prefixes before merging documentation from providers:

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Literal prefix rewrite]
{
  "providers": [
    {
      "path": "./vendor/external.css",
      "prefix": {
        "from": "vendor-", // Find this prefix
        "to": "my-", // Replace with this
      },
    },
  ],
}
```

```jsonc [Strip prefix]
{
  "providers": [
    {
      "path": "./vendor/theme.css",
      "prefix": {
        "from": "theme_", // Find this prefix
        // Omit "to" to remove the prefix entirely
      },
    },
  ],
}
```

```jsonc [Regex prefix rewrite]
{
  "providers": [
    {
      "path": "./vendor/icons.css",
      "prefix": {
        "from": "^icon[A-Z]", // Match: iconArrow, iconSearch, etc.
        "to": "icon-", // Replace with: icon-arrow, icon-search
        "isRegExp": true, // Treat "from" as a regex pattern
      },
    },
  ],
}
```

:::

</details>

## Lint rules

### `rules`

Set any supported rule to `off`, `warn`, or `error`. Unspecified rules use their defaults:
`missing-summary` and `unknown-custom-property` default to `off`; most other rules default to `warn`,
while duplicate IDs default to `error`. See [linting](/guide/linting) for each rule's behavior.

| Rule                             | Default | Purpose                                                                                    |
| -------------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `alias-requires-canonical`       | warn    | Aliased modifiers must have a canonical replacement via `{@link}` or alias target          |
| `component-name-case`            | warn    | Component class names must match the configured naming convention                          |
| `conflicting-global-modifier`    | warn    | Component modifiers conflicting with global modifier definitions must be resolved          |
| `cssdoc-directive`               | warn    | Unknown or malformed doc-comment directives                                                |
| `deprecated-modifier`            | warn    | Deprecated modifiers applied in CSS or usage must include deprecation rationale            |
| `deprecated-requires-canonical`  | warn    | Deprecated modifiers/parts must have a canonical replacement via `{@link}` or note         |
| `disallowed-element`             | warn    | Component is applied to HTML elements outside its documented allow-list                    |
| `duplicate-record-id`            | error   | Record identifier is duplicated within the same kind in this scope                         |
| `duplicate-record-id-cross-kind` | error   | Record identifier is shared across different kinds; use typed structure refs               |
| `invalid-default-value`          | warn    | Custom property default value doesn't match declared syntax                                |
| `invalid-fallback-value`         | warn    | Custom property fallback value doesn't match declared syntax                               |
| `invalid-property-value`         | warn    | Custom property value doesn't match declared syntax                                        |
| `missing-summary`                | off     | Record lacks a `@summary` description                                                      |
| `name-not-in-css`                | warn    | Documented modifier or part name is not found in any CSS selector                          |
| `part-name-case`                 | warn    | Part name must match the configured naming convention                                      |
| `readonly-redefinition`          | warn    | Read-only record redefines a property with multiple incompatible values                    |
| `sealed-reset-value`             | warn    | Sealed or frozen record uses disallowed reset-like value keywords                          |
| `structure-ambiguous-record`     | warn    | `@structure` reference is ambiguous across record kinds; use a typed ref like `@component` |
| `structure-unknown-record`       | warn    | `@structure` references a record that doesn't exist or isn't the documented kind           |
| `structure-unknown-selector`     | warn    | `@structure` references a selector that isn't the component class or documented member     |
| `unknown-annotation-ref`         | warn    | `@ref` doesn't match any annotation legend entry in the record                             |
| `unknown-custom-property`        | off     | Usage references a custom property that isn't documented                                   |
| `unknown-modifier`               | warn    | Applied or referenced modifier isn't documented for the component                          |
| `unknown-part`                   | warn    | Applied or referenced part isn't documented for the component                              |
| `unknown-state`                  | warn    | Applied or referenced pseudo-class state isn't documented for the component                |
| `undocumented-css-part`          | warn    | CSS `::part()` selector lacks a corresponding `@csspart` description                       |
| `undocumented-modifier`          | warn    | Modifier selector lacks a corresponding `@modifier` description                            |
| `undocumented-part`              | warn    | Part selector lacks a corresponding `@part` description                                    |

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Basic severity configuration]
{
  "rules": {
    "missing-summary": "off", // Allow components without a summary
    "unknown-custom-property": "warn", // Warn about undefined custom properties
    "duplicate-record-id": "error", // Error on duplicate IDs
  },
}
```

```jsonc [Strict mode: treat warnings as errors]
{
  "rules": {
    "unknown-modifier": "error", // All modifiers must be documented
    "unknown-part": "error", // All parts must be documented
    "structure-unknown-selector": "error", // All structure references must exist
    "undocumented-modifier": "error", // All modifiers must have prose
  },
}
```

:::

</details>

### `overrides`

Each override requires `files` and `rules`. `files` is one glob or an array of globs, all relative to the
config file where the override is declared. Matching overrides apply in order, and later matches win.
The `rules` object accepts the same rule names and severities as the top-level `rules` field.

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Relax rules for vendor code]
{
  "rules": {
    "missing-summary": "error", // Strict by default
  },
  "overrides": [
    {
      "files": "vendor/**/*.css", // But relax for vendor code
      "rules": {
        "missing-summary": "off", // Allow vendor code without summaries
      },
    },
  ],
}
```

```jsonc [Stricter rules for internal components]
{
  "rules": {
    "undocumented-modifier": "warn", // Default to warning
  },
  "overrides": [
    {
      "files": "src/components/**/*.css", // But require docs for internal code
      "rules": {
        "undocumented-modifier": "error", // All modifiers must have prose
        "missing-summary": "error", // All components must have a summary
      },
    },
  ],
}
```

```jsonc [Multiple file patterns with different rules]
{
  "overrides": [
    {
      "files": ["experimental/**/*.css", "deprecated/**/*.css"], // Less strict for experimental
      "rules": {
        "structure-unknown-selector": "warn", // Allow some loose references
      },
    },
    {
      "files": "src/stable/**/*.css", // Strict for stable code
      "rules": {
        "structure-unknown-selector": "error", // All references must resolve
      },
    },
  ],
}
```

:::

</details>

### `ruleOptions`

| Property              | Type                   | Purpose                                                                                 |
| --------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| `values.allowInherit` | boolean                | Allow `inherit` in sealed/frozen value checks (default `false`).                        |
| `sealed.mode`         | `"strict" \| "compat"` | `strict` checks the full reset-keyword set; `compat` checks only `unset` and `initial`. |

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Default: reject inherit in sealed values]
{
  "ruleOptions": {
    "values": {
      "allowInherit": false, // Reject inherit as a reset value
    },
  },
}
```

```jsonc [Allow inherit keyword]
{
  "ruleOptions": {
    "values": {
      "allowInherit": true, // Allow inherit as a reset value
    },
  },
}
```

```jsonc [Strict sealed-value checking]
{
  "ruleOptions": {
    "sealed": {
      "mode": "strict", // Check full CSS reset keyword set
    },
  },
}
```

```jsonc [Lenient sealed-value checking]
{
  "ruleOptions": {
    "sealed": {
      "mode": "compat", // Check only unset and initial
    },
  },
}
```

:::

</details>

## Naming and structure

### `naming`

Set `component` and/or `part` to a naming preset (`pascalCase`, `camelCase`, or `lowercase`) or a custom
regular-expression source. The corresponding name-case rule checks each configured class kind.

#### Naming presets

Use built-in conventions to enforce consistent component and part naming across your stylesheets:

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [PascalCase components, camelCase parts]
{
  "naming": {
    "component": "pascalCase", // e.g., MyButton, AlertDialog
    "part": "camelCase", // e.g., buttonText, dialogTitle
  },
}
```

```jsonc [All lowercase]
{
  "naming": {
    "component": "lowercase", // e.g., mybutton, alertdialog
    "part": "lowercase", // e.g., buttontext, dialogtitle
  },
}
```

```jsonc [All camelCase]
{
  "naming": {
    "component": "camelCase", // e.g., myButton, alertDialog
    "part": "camelCase", // e.g., buttonText, dialogTitle
  },
}
```

:::

</details>

#### Custom naming patterns

Define regular-expression patterns to enforce domain-specific or legacy naming conventions:

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Custom regex for components]
{
  "naming": {
    // Custom pattern: start with uppercase, followed by alphanumerics
    "component": "^[A-Z][a-zA-Z0-9]*$",
  },
}
```

```jsonc [Custom regex allowing underscores]
{
  "naming": {
    // Custom pattern: lowercase words separated by underscores
    "component": "^[a-z]+(_[a-z]+)*$",
  },
}
```

:::

</details>

### `structureIgnore`

List external class names that are valid in `@structure` but aren't documented in the current scope.
Entries can be literal names or simple globs, where `*` matches any run of characters.

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Ignore specific external classes]
{
  "structureIgnore": [
    "external-layout", // Known external component
    "third-party-wrapper", // Known external wrapper
  ],
}
```

```jsonc [Ignore external vendor classes with glob patterns]
{
  "structureIgnore": [
    "bootstrap-*", // All Bootstrap utility classes
    "tailwind-*", // All Tailwind utility classes
    "material-*", // All Material Design classes
  ],
}
```

```jsonc [Mix literal and glob patterns]
{
  "structureIgnore": [
    "legacy-component", // Specific legacy class
    "vendor-*", // All vendor-prefixed classes
    "*-utility", // All utility classes, any prefix
  ],
}
```

:::

</details>

## Render options

The `render` object supplies defaults to consumers. Explicit emitter options override them.

| Property               | Type                            | Purpose                                                                                                   |
| ---------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `includeInternal`      | boolean                         | Include records marked `@visibility internal`; defaults to `false`.                                       |
| `sectionOrder`         | string[]                        | Order and include record-page sections. Omitted section keys are dropped.                                 |
| `headingPrefix`        | string                          | Prefix each record-page title.                                                                            |
| `baseHref`             | string                          | Base URL for `@related` links and index/sidebar links.                                                    |
| `structureView`        | `"text" \| "diagram" \| "both"` | Choose the structure tree, flowchart, or both; defaults to `both`.                                        |
| `structureVariantView` | `"diagram" \| "sections"`       | Render structure variants as one combined diagram or separate variant subsections; defaults to `diagram`. |
| `groups`               | string[]                        | Put named sidebar/index groups first in the listed order; unlisted groups follow the default order.       |
| `exampleFilters`       | object                          | Filter examples independently for Markdown, HTML, and hover.                                              |

### Sections and structure views

Control which sections appear in record documentation and how component structures are rendered:

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Reorder sections]
{
  "render": {
    "sectionOrder": [
      "demo", // Show live demos first
      "examples", // Then code examples
      "usage", // Then usage patterns
      "modifiers", // Then modifier reference
      "states", // Then states
      "cssProperties", // Then CSS properties
      "accessibility", // Then accessibility info
    ],
  },
}
```

```jsonc [Configure structure view]
{
  "render": {
    "structureView": "diagram", // Show component structure as diagram
    "structureVariantView": "sections", // Show variants as separate subsections
  },
}
```

:::

</details>

**Available `sectionOrder` values:** `demo`, `examples`, `usage`, `annotations`, `modifiers`, `parts`, `shadowParts`, `pseudoElements`, `states`, `slots`, `structure`, `subcomponents`, `cssProperties`, `functions`, `animations`, `layers`, `conditions`, `tokensConsumed`, `compat`, `accessibility`, `related`, and `see`.

### Example filtering

Filter examples independently for different output formats (Markdown, HTML, and hover tooltips):

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Filter examples by label for Markdown]
{
  "render": {
    "exampleFilters": {
      "markdown": {
        "labels": ["web-component", "react"], // Show these example types
        "includeUnlabeled": false, // Don't show examples without labels
      },
    },
  },
}
```

```jsonc [Different filters per surface]
{
  "render": {
    "exampleFilters": {
      "markdown": {
        "labels": ["web-component", "react"], // Show web-component and React examples in Markdown
      },
      "html": {
        "labels": ["web-component"], // Show only web-component examples in HTML output
      },
      "hover": null, // No filter for hover; show all examples
    },
  },
}
```

:::

</details>

**Example filter structure:** `exampleFilters` may set `markdown`, `html`, and `hover`. Each surface accepts either `null` or an object with a required `labels` array and optional `includeUnlabeled` boolean. Labels are unique lowercase kebab-case strings. An example is included when any label matches; unlabeled examples are included by default. Set a surface to `null` to clear an inherited filter for that surface. An omitted surface doesn't add a filter.

### General render configuration

Configure display options like internal visibility, base URL, heading prefixes, and sidebar group ordering:

<details>
<summary>Show examples</summary>

::: code-group

```jsonc [Basic render defaults]
{
  "render": {
    "includeInternal": false, // Hide internal-only records
    "baseHref": "https://docs.example.com/", // Base URL for links
  },
}
```

```jsonc [Reorder sidebar groups]
{
  "render": {
    "groups": [
      "Layouts", // Show first
      "Components", // Show second
      "Utilities", // Show third
      // Other groups follow in default order
    ],
  },
}
```

```jsonc [Complete example combining multiple options]
{
  "render": {
    "includeInternal": false, // Hide internal records
    "baseHref": "https://docs.example.com/", // Base URL for links
    "structureView": "diagram", // Show structures as diagrams
    "sectionOrder": ["demo", "examples", "modifiers", "states", "cssProperties", "accessibility"],
    "exampleFilters": {
      "markdown": {
        "labels": ["web-component", "react"], // These frameworks only
        "includeUnlabeled": true, // Also include examples without labels
      },
      "hover": null, // No filter for hover tooltips
    },
  },
}
```

:::

</details>

## Complete JSON Schema

The block below is included from the published schema source, so it stays aligned with editor validation:

<<< @/../schemas/cssdoc.schema.json{json}
