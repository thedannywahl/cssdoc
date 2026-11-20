// A CSS-in-JS *authoring* example. cssdoc reads doc comments inside a `css` (or
// `styled`, Lit, …) tagged template exactly like a .css file — the same diagnostics
// run here. Clean by default. Things to TRY inside the template below:
//   - Delete the `@summary` line ............... "missing-summary" on .badge
//   - Remove an @example line .............. "incomplete-example" diagnostic
//   - Hover .badge { padding } to see the ..... ref annotation prose in the tooltip
//   - Hover .chip to see labeled examples .... multi-example feature in action

const css = String.raw; // any tag named `css`/`styled`/… is treated as a CSS template

export const badge: string = css`
  /**
   * @component badge
   * @summary A small inline status label.
   * @modifier badge--success — A positive status.
   * @modifier badge--warning — A cautionary status.
   * @ref 1. Matching browser default so badges align with surrounding text.
   * @example Default: Neutral status badge
   * <span class="badge">New</span>
   * @example Success: Positive status indicator
   * <span class="badge badge--success">✓ Active</span>
   * @example Warning: Cautionary status indicator
   * <span class="badge badge--warning">⚠ Pending</span>
   * @example With Count: Numerical status (like unread count)
   * <span class="badge badge--success">42</span>
   * @example Inline: Badge next to content
   * <p>
   *   Topic: Machine Learning
   *   <span class="badge badge--success">Featured</span>
   * </p>
   */
  .badge {
    display: inline-block;
    padding: 0.1em 0.4em; /* @ref 1 */
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
 * @example Default: Compact label chip
 * <span class="chip">CSS</span>
 * @example With Icon: Chip with leading icon
 * <span class="chip">
 *   <span class="chip__icon">📌</span>
 *   Featured Topic
 * </span>
 * @example Removable: Chip with dismiss button
 * <div class="chip chip--removable">
 *   <span>Selected option</span>
 *   <button class="chip__remove" aria-label="Remove">×</button>
 * </div>
 * @example List of Tags: Multiple chips for categorization
 * <div class="chip-list">
 *   <span class="chip">React</span>
 *   <span class="chip">Vue</span>
 *   <span class="chip">Angular</span>
 * </div>
 * @example Clickable: Chip as button for filtering
 * <button class="chip" onclick="filter('docs')">Documentation</button>
 */
export function chipStyles(scale = 1): string {
  return css`
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5em;
      padding: ${0.25 * scale}em ${0.5 * scale}em;
      border-radius: ${0.25 * scale}em;
      background-color: #e5e7eb;
      font-size: 0.875em;
      font-weight: 500;
    }
    .chip--removable {
      padding-inline-end: ${scale}em;
    }
    .chip__icon {
      display: inline-block;
      width: 1em;
      height: 1em;
    }
    .chip__remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.2em;
      height: 1.2em;
      margin: 0;
      padding: 0;
      border: none;
      background: none;
      cursor: pointer;
      font-size: inherit;
      color: inherit;
    }
  `;
}
