// @ts-nocheck — a demo fixture; `lit` isn't a dependency of this repo.
// A Lit-style web component. cssdoc documents shadow-DOM parts (@csspart, targeted from outside the
// shadow tree with ::part()) and custom states (@cssstate :state(...)) the same way it documents
// class parts and modifiers — here inside a Lit `css` template (the JS/TS embedded host). The doc
// comment sits above the class; the projection keeps it in place. Clean by default. TRY:
//   - Delete the `@summary` line ............... "missing-summary" on .switch
//   - Remove the "— The rail…" text after ..... "undocumented-css-part" on the
//     `@csspart track` ..........................  track part (a part needs a description)
//   - Hover <x-switch> ......................... See all examples in hover card
//   - Delete an @example line .................. "incomplete-example" diagnostic appears
import { LitElement, css, html } from "lit";

/**
 * @component switch
 * @summary An on/off toggle web component with custom part styling and state tracking.
 * @csspart track — The rail the thumb slides along, targetable with ::part(track).
 * @csspart thumb — The sliding knob, targetable with ::part(thumb).
 * @cssstate :state(on) — Set on the host while the switch is on.
 * @cssstate :state(disabled) — Set on the host while the switch is disabled.
 * @sealed
 * @example Off State: Default toggle position
 * <x-switch></x-switch>
 * @example On State: Toggle activated
 * <x-switch class="on"></x-switch>
 * @example Styled Parts: Customizing with ::part()
 * ```html
 * <style>
 *   x-switch::part(track) {
 *     background: linear-gradient(90deg, #ef4444, #f97316);
 *     border-radius: 999px;
 *   }
 *   x-switch::part(thumb) {
 *     box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
 *   }
 * </style>
 * <x-switch class="on"></x-switch>
 * ```
 * @example With Label: Toggle with descriptive label
 * <label>
 *   <x-switch></x-switch>
 *   <span>Enable notifications</span>
 * </label>
 * @example Disabled State: Non-interactive toggle
 * <x-switch class="disabled" aria-disabled="true"></x-switch>
 * @example Grouped Toggles: Multiple switches in settings
 * <fieldset>
 *   <legend>Preferences</legend>
 *   <div>
 *     <label><x-switch class="on"></x-switch> Dark mode</label>
 *   </div>
 *   <div>
 *     <label><x-switch></x-switch> Notifications</label>
 *   </div>
 *   <div>
 *     <label><x-switch></x-switch> Analytics</label>
 *   </div>
 * </fieldset>
 * @example Sizes: Different scale variations
 * <div class="switch-sizes">
 *   <x-switch style="--scale: 0.75;"></x-switch>
 *   <x-switch class="on"></x-switch>
 *   <x-switch style="--scale: 1.25;"></x-switch>
 * </div>
 */
export class Switch extends LitElement {
  static styles: string = css`
    .switch {
      display: inline-flex;
      cursor: pointer;
    }
    .switch::part(track) {
      background: #ccc;
      border-radius: 999px;
      transition: background 0.2s;
    }
    .switch::part(thumb) {
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
    .switch:state(on)::part(track) {
      background: #2ecc71;
    }
    .switch:state(on)::part(thumb) {
      transform: translateX(20px);
    }
    .switch:state(disabled) {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  render() {
    return html`<div class="switch" part="track"><span part="thumb"></span></div>` as string;
  }
}

customElements.define("x-switch", Switch);
