// RSCSS (Reasonable System for CSS) modifier convention demonstration. RSCSS uses chained
// classes with hyphenated separators and explicit prop/value pairs: `.component.-prop-value`.
// Use `"rscss"` preset in cssdoc.json or define custom ModifierConvention with:
//   { structure: "chained", separator: "-", propValue: true, propValueSeparator: "-" }
//
// FEATURES TO TRY:
//   - Hover .form-field ..................... See modifiers split into prop/value pairs
//   - Add `.form-field.-size-small.form-field.-variant-outline` ... chained modifiers work
//   - Hover .form-field.-size-large ........ Modifier detail shows size=large
//   - Try removing a @modifier description .. "undocumented-modifier" appears
//   - Examine how prop names and values are extracted from the selector

const css = String.raw;

/** Form field stylesheet demonstrating rscss modifiers. */
export const formField: string = css`
  /**
   * @component form-field
   * @summary A flexible form input container with size and variant modifiers.
   * @modifier form-field.-size-small — Compact form field for tight layouts
   * @modifier form-field.-size-medium — Standard form field size (default)
   * @modifier form-field.-size-large — Spacious form field for prominence
   * @modifier form-field.-variant-outline — Outlined border style
   * @modifier form-field.-variant-filled — Filled background style
   * @modifier form-field.-variant-flat — Flat (minimal) style
   * @modifier form-field.-state-error — Error state with red styling
   * @modifier form-field.-state-success — Success state with green styling
   * @modifier form-field.-state-disabled — Disabled state (non-interactive)
   * @example Basic Input: Default form field
   * <input class="form-field" type="text" placeholder="Enter text"/>
   * @example Size Small: Compact spacing
   * <input class="form-field -size-small" type="text" placeholder="Small"/>
   * @example Size Large: Prominent field
   * <input class="form-field -size-large" type="text" placeholder="Large"/>
   * @example Variant Outline: Outlined border
   * <input class="form-field -variant-outline" type="text" placeholder="Outlined"/>
   * @example Variant Filled: Filled background
   * <input class="form-field -variant-filled" type="text" placeholder="Filled"/>
   * @example Variant Flat: Minimal styling
   * <input class="form-field -variant-flat" type="text" placeholder="Flat"/>
   * @example Error State: Validation error styling
   * <input class="form-field -state-error" type="text" value="Invalid input"/>
   * @example Success State: Valid input confirmation
   * <input class="form-field -state-success" type="text" value="✓ Valid"/>
   * @example Disabled State: Non-interactive field
   * <input class="form-field -state-disabled" type="text" value="Disabled" disabled/>
   * @example Combined: Multiple modifiers on one element
   * <input class="form-field -size-large -variant-outline" type="text" placeholder="Large outlined"/>
   * @example With Label: Complete form control
   * <div class="form-field-wrapper">
   *   <label for="name">Full Name</label>
   *   <input class="form-field -size-medium -variant-outline" id="name" type="text" placeholder="John Doe"/>
   * </div>
   * @example Focus State: Interactive demonstration
   * <input class="form-field -variant-outline" type="text" placeholder="Click to focus" autofocus/>
   */
  .form-field {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-family: system-ui, sans-serif;
    transition: all 0.2s;
  }

  .form-field:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* Size modifiers */
  .form-field.-size-small {
    padding: 0.25rem 0.375rem;
    font-size: 0.75rem;
  }

  .form-field.-size-medium {
    padding: 0.5rem;
    font-size: 0.875rem;
  }

  .form-field.-size-large {
    padding: 0.75rem;
    font-size: 1rem;
  }

  /* Variant modifiers */
  .form-field.-variant-outline {
    background: white;
    border: 1px solid #d1d5db;
  }

  .form-field.-variant-outline:focus {
    border-color: #3b82f6;
  }

  .form-field.-variant-filled {
    background: #f3f4f6;
    border: 1px solid transparent;
  }

  .form-field.-variant-filled:focus {
    background: #e5e7eb;
  }

  .form-field.-variant-flat {
    background: transparent;
    border: none;
    border-bottom: 1px solid #d1d5db;
    border-radius: 0;
  }

  .form-field.-variant-flat:focus {
    border-bottom-color: #3b82f6;
  }

  /* State modifiers */
  .form-field.-state-error {
    border-color: #ef4444;
    color: #991b1b;
  }

  .form-field.-state-error:focus {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }

  .form-field.-state-success {
    border-color: #10b981;
    color: #065f46;
  }

  .form-field.-state-success:focus {
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  .form-field.-state-disabled {
    background-color: #f3f4f6;
    color: #9ca3af;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .form-field.-state-disabled:focus {
    border-color: #d1d5db;
    box-shadow: none;
  }
`;

/** Select control stylesheet demonstrating rscss modifiers. */
export const selectControl: string = css`
  /**
   * @component select-control
   * @summary A custom select/dropdown component.
   * @modifier select-control.-size-small — Compact select control
   * @modifier select-control.-size-large — Spacious select control
   * @modifier select-control.-search-enabled — Searchable select (with filter input)
   * @modifier select-control.-multi-select — Multiple selection mode
   * @modifier select-control.-open — Expanded dropdown state (via pseudo-class or data attr)
   * @example Basic Select: Default dropdown
   * <select class="select-control">
   *   <option>Option 1</option>
   *   <option>Option 2</option>
   *   <option>Option 3</option>
   * </select>
   * @example Searchable: With built-in search
   * <input class="select-control -search-enabled" type="text" placeholder="Search options..."/>
   * @example Multi-Select: Multiple selection
   * <select class="select-control -multi-select" multiple>
   *   <option>CSS</option>
   *   <option>JavaScript</option>
   *   <option>HTML</option>
   * </select>
   * @example Sizes: Small to large variants
   * <select class="select-control -size-small">
   *   <option>Small</option>
   * </select>
   * <select class="select-control">
   *   <option>Medium (default)</option>
   * </select>
   * <select class="select-control -size-large">
   *   <option>Large</option>
   * </select>
   * @example Open State: Expanded dropdown
   * <select class="select-control -open">
   *   <option selected>Expanded</option>
   *   <option>Option A</option>
   *   <option>Option B</option>
   * </select>
   */
  .select-control {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .select-control:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .select-control.-size-small {
    padding: 0.25rem 0.375rem;
    font-size: 0.75rem;
  }

  .select-control.-size-large {
    padding: 0.75rem;
    font-size: 1rem;
  }

  .select-control.-search-enabled {
    appearance: none;
    padding-right: 1.5rem;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23374151' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    background-size: 1.2em 1.2em;
  }

  .select-control.-multi-select {
    min-height: 100px;
  }

  .select-control.-open {
    border-color: #3b82f6;
  }
`;

/** Textarea stylesheet demonstrating rscss modifiers. */
export const textareaControl: string = css`
  /**
   * @component textarea-control
   * @summary A multi-line text input field.
   * @modifier textarea-control.-size-small — Compact textarea (3 rows)
   * @modifier textarea-control.-size-large — Large textarea (10 rows)
   * @modifier textarea-control.-variant-resize-none — Prevent resizing
   * @modifier textarea-control.-variant-resize-vertical — Only vertical resize
   * @example Default Textarea: Standard multi-line input
   * <textarea class="textarea-control" placeholder="Enter text..."></textarea>
   * @example With Rows: Specified height
   * <textarea class="textarea-control" rows="6" placeholder="Multi-line input..."></textarea>
   * @example Size Small: Compact variant
   * <textarea class="textarea-control -size-small" placeholder="Small textarea..."></textarea>
   * @example Size Large: Spacious variant
   * <textarea class="textarea-control -size-large" placeholder="Large textarea..."></textarea>
   * @example No Resize: Fixed dimensions
   * <textarea class="textarea-control -variant-resize-none" placeholder="Cannot resize..."></textarea>
   * @example Monospace: Code input variant
   * <textarea class="textarea-control" style="font-family: monospace;" placeholder="Enter code..."></textarea>
   */
  .textarea-control {
    display: block;
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-family: system-ui, sans-serif;
    resize: vertical;
    transition: all 0.2s;
  }

  .textarea-control:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .textarea-control.-size-small {
    padding: 0.25rem 0.375rem;
    font-size: 0.75rem;
    min-height: 60px;
  }

  .textarea-control.-size-large {
    padding: 0.75rem;
    font-size: 1rem;
    min-height: 150px;
  }

  .textarea-control.-variant-resize-none {
    resize: none;
  }

  .textarea-control.-variant-resize-vertical {
    resize: vertical;
  }
`;
