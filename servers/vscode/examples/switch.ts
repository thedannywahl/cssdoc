// @ts-nocheck — a demo fixture; `lit` isn't a dependency of this repo.
// A Lit-style web component. cssdoc documents shadow-DOM parts (@csspart, targeted from outside the
// shadow tree with ::part()) and custom states (@cssstate :state(...)) the same way it documents
// class parts and modifiers — here inside a Lit `css` template (the JS/TS embedded host). The doc
// comment sits above the class; the projection keeps it in place. Clean by default. TRY:
//   - Delete the `@summary` line ............... "missing-summary" on .switch
//   - Remove the "— The rail…" text after ..... "undocumented-css-part" on the
//     `@csspart track` ..........................  track part (a part needs a description)
import { LitElement, css, html } from "lit";

/**
 * @component switch
 * @summary An on/off toggle web component.
 * @csspart track — The rail the thumb slides along, targetable with ::part(track).
 * @csspart thumb — The sliding knob, targetable with ::part(thumb).
 * @cssstate :state(on) — Set on the host while the switch is on.
 */
export class Switch extends LitElement {
  static styles = css`
    .switch {
      display: inline-flex;
      cursor: pointer;
    }
    .switch::part(track) {
      background: #ccc;
      border-radius: 999px;
    }
    .switch::part(thumb) {
      background: #fff;
      border-radius: 50%;
    }
    .switch:state(on)::part(track) {
      background: #2ecc71;
    }
  `;

  render() {
    return html`<div class="switch" part="track"><span part="thumb"></span></div>`;
  }
}

customElements.define("x-switch", Switch);
