# Configure cssdoc

Start with a `cssdoc.json` file when your project needs different parsing or lint settings. Put it
beside your `package.json` so it applies to the stylesheets under that directory.

## Match your project's modifier classes

If your project uses rscss classes such as `.button.-color-secondary`, add this to `cssdoc.json`:

```json
{
  "$schema": "https://cssdoc.dev/cssdoc.schema.json",
  "modifierConvention": "rscss"
}
```

The cssdoc [CLI](/guide/linting) and [editor integration](/guide/editor) pick up the config when
they read your CSS. Check a record with `.button.-color-secondary`. cssdoc now recognizes
`-color-secondary` as a modifier of `button`.

The nearest config applies to each stylesheet. In a monorepo, this lets packages use different
conventions. Use [extends](/guide/config-reference#inheritance) to share defaults between them.

## Where to go next

- [Set rule severity](/guide/linting#set-rule-severity) to change what gets reported.
- [Connect another project's CSS or model](/guide/config-reference#providers) to reuse its documented components.
- [Load config from a script](/reference/@cssdoc/config/classes/CssDocConfigFile) when using the parser directly.
- [Look up a field or its default](/guide/config-reference) in the configuration reference.
