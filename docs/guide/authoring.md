# Document a component

Give people enough information to use and customize a CSS component. Start with a summary, then
describe the modifiers and custom properties you expect people to use.

## Start a record

Put a `/** … */` comment above the component's base rule. Use `@component` to give the record a
stable name. Here, `button` is the record name and cssdoc finds `.button` in the CSS.

Add a short `@summary` that says what the component does. Each record covers the CSS up to the next
record or the end of the file.

## Explain how to use it

If you followed [Getting started](/guide/getting-started), replace your `button.css` with this example:

```css
/**
 * @component button
 * @summary Triggers an action.
 * @modifier button--quiet — Use for secondary actions next to a
 *   primary button.
 * @tokens --button-radius — Adjusts the rounding of the corners.
 */
.button {
  padding: 0.5rem 1rem;
  border-radius: var(--button-radius, 0.25rem);
}

.button--quiet {
  background: transparent;
}
```

cssdoc finds the quiet modifier in the selector and the custom property in the `var()` call.
`@modifier` adds usage guidance to the modifier, and `@tokens` describes the custom property the
component reads. Both descriptions appear alongside their names in the generated docs.

## Next steps

- [Generate documentation](/guide/emitters) to see the published component page.
- [Describe variants and states](/guide/variants-and-states) to document the quiet and disabled buttons.
- [Document how components fit together](/guide/layouts) or [document styles in a host file](/guide/embedded-css).

- Look up more forms in [Doc-comment tags](/guide/doc-comment-tags).
