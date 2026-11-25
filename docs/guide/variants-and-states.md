# Describe variants and states

Use a modifier for a choice someone makes when using the component, such as a quiet button. Use a
state to describe how the component behaves under a condition, such as when a button is disabled.

## Add usage guidance

Add the quiet modifier and disabled state to your button stylesheet:

```css
/**
 * @component button
 * @summary Triggers an action.
 * @modifier button--quiet — Use for secondary actions.
 * @cssstate :disabled — Shown when the action is unavailable.
 */
.button {
  padding: 0.5rem 1rem;
}

.button--quiet {
  background: transparent;
}

.button:disabled {
  opacity: 0.5;
}
```

Use `class="button button--quiet"` for the quiet appearance. Set the `disabled` attribute on the
`<button>` when the action is unavailable.

cssdoc discovers `.button--quiet` and `:disabled` from the CSS. The comments attach usage guidance
to the discovered names. [Generate documentation](/guide/emitters) to see the descriptions in the
Modifiers and CSS States tables.

If your project uses a different class pattern or state classes such as `is-loading`, see
[modifier and state conventions](/guide/config-reference#modifierconvention).
