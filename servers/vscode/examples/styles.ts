// A CSS-in-JS *authoring* example. cssdoc reads doc comments inside a `css` (or
// `styled`, Lit, …) tagged template exactly like a .css file — the same diagnostics
// run here. Clean by default. Things to TRY inside the template below:
//   - Delete the `@summary` line ............... "missing-summary" on .badge
//   - Remove "— A positive status." after ..... "undocumented-modifier" on
//     `@modifier badge--success` ...............  badge--success
//   - Add a `@modifier badge--danger — Bad.` .. badge--danger gains hover and
//     plus a matching ".badge--danger {}" rule .  completion docs (no warning)

const css = String.raw; // any tag named `css`/`styled`/… is treated as a CSS template

export const badge = css`
  /**
   * @component badge
   * @summary A small inline status label.
   * @modifier badge--success — A positive status.
   * @modifier badge--warning — A cautionary status.
   */
  .badge {
    display: inline-block;
    padding: 0.1em 0.4em;
  }
  .badge--success {
    color: #2ecc71;
  }
  .badge--warning {
    color: #f39c12;
  }
`;

// A single JSDoc block can be BOTH TSDoc and cssdoc: TSDoc tools read `@param`/`@returns` for the
// function, while cssdoc reads `@component`/`@modifier` for the CSS the function emits. Unknown tags are
// ignored by each side, so they coexist — hover the function name for the TS signature, and the classes
// inside the template for their cssdoc cards.
/**
 * Build the chip stylesheet at a given scale.
 *
 * @param scale - Padding multiplier for the chip.
 * @returns The chip's CSS as a string.
 *
 * @component chip
 * @summary A compact, inline label or tag.
 * @modifier chip--removable — Leaves room for a dismiss button.
 */
export function chipStyles(scale = 1): string {
  return css`
    .chip {
      display: inline-flex;
      padding: ${0.25 * scale}em ${0.5 * scale}em;
    }
    .chip--removable {
      padding-inline-end: ${scale}em;
    }
  `;
}
