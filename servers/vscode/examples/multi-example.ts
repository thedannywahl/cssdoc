// A comprehensive demonstration of cssdoc's multi-example feature with labeled examples.
// The @example tag now supports labels (Markdown links: `@example Label: description`)
// to organize and distinguish between multiple use cases. When configured with exampleFilters,
// different output surfaces (Markdown, HTML, etc.) can render different subsets of examples.
//
// FEATURES TO TRY:
//   - Hover any .alert class ................... See all labeled examples in the tooltip
//   - Delete an @example line ............. "incomplete-example" diagnostic appears
//   - Add @example with no label (old style)... Still works; mixed style is supported
//   - Modify cssdoc.json exampleFilters ....... See which examples render in Markdown vs HTML

const css = String.raw;

export const alertComponent: string = css`
  /**
   * @component alert
   * @summary A dismissable notification message.
   * @modifier alert--success — Positive confirmation or success message.
   * @modifier alert--warning — Cautionary message requiring user attention.
   * @modifier alert--error — Error or critical state requiring action.
   * @modifier alert--info — Neutral informational message.
   * @example Basic: Default informational alert
   * <div class="alert">
   *   <p>This is an informational alert.</p>
   * </div>
   * @example Success: Positive confirmation
   * <div class="alert alert--success">
   *   <p>✓ Operation completed successfully!</p>
   * </div>
   * @example Warning: Cautionary state
   * <div class="alert alert--warning">
   *   <p>⚠ This action cannot be undone.</p>
   * </div>
   * @example Error: Critical state
   * <div class="alert alert--error">
   *   <p>✗ Unable to process your request.</p>
   * </div>
   * @example With Icon: Alert with leading icon
   * <div class="alert alert--warning">
   *   <span class="alert__icon">⚠</span>
   *   <p>Warning: Please review before continuing.</p>
   * </div>
   * @example With Close Button: Dismissable variant
   * <div class="alert alert--info">
   *   <p>Notification message</p>
   *   <button class="alert__close" aria-label="Close alert">×</button>
   * </div>
   * @example Compact: Minimal space usage
   * <div class="alert alert--success" data-compact="true">
   *   <p>Saved!</p>
   * </div>
   * @example Full Width: Spans entire container
   * <div class="alert alert--error" style="width: 100%;">
   *   <p>Critical: System error detected.</p>
   * </div>
   */
  .alert {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 0.375rem;
    background-color: #e0e7ff;
    border: 1px solid #c7d2fe;
    color: #312e81;
    font-size: 0.875rem;
  }

  .alert--success {
    background-color: #dcfce7;
    border-color: #bbf7d0;
    color: #166534;
  }

  .alert--warning {
    background-color: #fef08a;
    border-color: #fde047;
    color: #713f12;
  }

  .alert--error {
    background-color: #fee2e2;
    border-color: #fecaca;
    color: #991b1b;
  }

  .alert--info {
    background-color: #cffafe;
    border-color: #a5f3fc;
    color: #164e63;
  }

  .alert__icon {
    flex-shrink: 0;
    width: 1.25rem;
    text-align: center;
    line-height: 1.5rem;
  }

  .alert__close {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 1.25rem;
    color: inherit;
  }

  .alert__close:hover {
    opacity: 0.7;
  }
`;

export const badgeComponent: string = css`
  /**
   * @component badge
   * @summary A small inline label for status, tags, or categories.
   * @modifier badge--primary — Primary brand color badge.
   * @modifier badge--secondary — Secondary neutral badge.
   * @modifier badge--success — Positive/success state badge.
   * @modifier badge--warning — Warning/caution state badge.
   * @modifier badge--error — Error/critical state badge.
   * @example Tag: Default neutral badge
   * <span class="badge">New</span>
   * @example Primary: Brand-colored badge
   * <span class="badge badge--primary">Featured</span>
   * @example Status: Status indicator badge
   * <span class="badge badge--success">Active</span>
   * @example With Count: Numerical badge (like notification count)
   * <span class="badge badge--error">5</span>
   * @example Category: Multiple badges for categorization
   * <span class="badge badge--primary">CSS</span>
   * <span class="badge badge--primary">Components</span>
   * <span class="badge badge--primary">Docs</span>
   * @example Outlined: Subtle badge styling
   * <span class="badge badge--secondary">Optional</span>
   * @example Large: Prominent badge
   * <span class="badge badge--warning" data-size="lg">Warning</span>
   */
  .badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    background-color: #e5e7eb;
    color: #374151;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .badge--primary {
    background-color: #3b82f6;
    color: #ffffff;
  }

  .badge--secondary {
    background-color: #d1d5db;
    color: #374151;
  }

  .badge--success {
    background-color: #10b981;
    color: #ffffff;
  }

  .badge--warning {
    background-color: #f59e0b;
    color: #ffffff;
  }

  .badge--error {
    background-color: #ef4444;
    color: #ffffff;
  }
`;

export const buttonComponent: string = css`
  /**
   * @component button
   * @summary A clickable button for user interactions.
   * @modifier button--primary — Primary action button.
   * @modifier button--secondary — Secondary action button.
   * @modifier button--large — Large button for prominence.
   * @modifier button--small — Small button for compact layouts.
   * @modifier button--disabled — Disabled state button.
   * @example Primary Action: Default primary button
   * <button class="button button--primary">Click me</button>
   * @example Secondary Action: Alternative action button
   * <button class="button button--secondary">Learn more</button>
   * @example Size Variants: Different sizes
   * <button class="button button--small">Small</button>
   * <button class="button">Regular</button>
   * <button class="button button--large">Large</button>
   * @example With Icon: Button with leading icon
   * <button class="button button--primary">
   *   <span class="button__icon">→</span>
   *   Next
   * </button>
   * @example Group: Multiple buttons in context
   * <div class="button-group">
   *   <button class="button button--secondary">Cancel</button>
   *   <button class="button button--primary">Submit</button>
   * </div>
   * @example Loading State: Disabled with spinner
   * <button class="button button--primary" disabled>
   *   <span class="button__spinner"></span>
   *   Loading...
   * </button>
   * @example Link Style: Semantic button styled as link
   * <button class="button button--link">Forgot password?</button>
   */
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    background-color: #6b7280;
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .button:hover {
    background-color: #4b5563;
  }

  .button--primary {
    background-color: #3b82f6;
  }

  .button--primary:hover {
    background-color: #2563eb;
  }

  .button--secondary {
    background-color: #e5e7eb;
    color: #374151;
  }

  .button--secondary:hover {
    background-color: #d1d5db;
  }

  .button--large {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }

  .button--small {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }

  .button--disabled,
  .button:disabled {
    background-color: #d1d5db;
    color: #9ca3af;
    cursor: not-allowed;
  }

  .button__icon {
    display: inline-block;
    width: 1em;
    height: 1em;
  }

  .button__spinner {
    display: inline-block;
    width: 1em;
    height: 1em;
    border: 2px solid currentColor;
    border-radius: 50%;
    border-right-color: transparent;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
