// The playground's convention presets. Each is a self-contained, valid bundle — component CSS, its
// cssdoc.json, and sample consumer HTML — so switching preset swaps to an idiomatic example for that
// convention. The BEM bundle reuses the authored example files under docs/examples (one source).
import bemCss from "../../examples/tabs.css?raw";
import bemConfig from "../../examples/cssdoc.json?raw";
import bareCss from "../../examples/tabs.bare.css?raw";
import bareConfig from "../../examples/cssdoc.bare.jsonc?raw";
import rscssCss from "../../examples/tabs.rscss.css?raw";
import rscssConfig from "../../examples/cssdoc.rscss.json?raw";

export interface Preset {
  label: string;
  css: string;
  config: string;
  html: string;
}

// A sandbox appended to each editor: every snippet is commented out (the model stays clean on load),
// with a one-line note on what uncommenting it does. Description and code are separate comments so you
// can drop the code's own delimiters to run it without un-commenting the prose. Convention-agnostic —
// these all hang off the base `.tabs` class and its `--tabs-gap` property, which every preset shares.
const CSS_SANDBOX = `

/* ─── Sandbox — uncomment a snippet to change the resolved model. ─── */

/* Extend → a new custom property shows under "Custom properties" (no @cssproperty tag needed). */
/* @property --tabs-radius { syntax: "<length>"; inherits: false; initial-value: 4px; } */

/* Extend → a new state, read straight from the selector, shows under "States". */
/* .tabs:state(loading) { opacity: 0.5; } */

/* Break → "invalid-property-value": #F00 isn't a <length>. */
/* .tabs { --tabs-gap: #F00; } */
`;

/** Consumer-side sandbox for the HTML editor, spelled for one convention's modifiers. */
const htmlSandbox = (
  valid: string,
  unknown: string,
  deprecated: string,
  unknownNote = "",
): string =>
  `

<!-- ─── Sandbox — uncomment a snippet to see a usage finding. ─── -->
<!-- Valid usage, no findings: -->
<!-- <div class="tabs ${valid}"></div> -->
<!-- Break → "unknown-modifier"${unknownNote}: -->
<!-- <div class="tabs ${unknown}"></div> -->
<!-- Break → "deprecated-modifier": -->
<!-- <div class="tabs ${deprecated}"></div> -->
`;

const bemHtml = `<div class="tabs tabs--vertical">
  <ul class="list">
    <li class="tab">One</li>
  </ul>
  <div class="panel">Panel one</div>
</div>

<div class="tabs tabs--jumbo tabs--boxed">
  <ul class="list">
    <li class="tab">A</li>
  </ul>
  <div class="panel">Panel A</div>
</div>`;

const rscssHtml = `<div class="tabs -orientation-vertical">
  <ul class="list">
    <li class="tab">One</li>
  </ul>
  <div class="panel">Panel one</div>
</div>

<div class="tabs -orientation-jumbo -variant-boxed">
  <ul class="list">
    <li class="tab">A</li>
  </ul>
  <div class="panel">Panel A</div>
</div>`;

const bareHtml = `<div class="tabs vertical">
  <ul class="list">
    <li class="tab">One</li>
  </ul>
  <div class="panel">Panel one</div>
</div>

<div class="tabs boxed">
  <ul class="list">
    <li class="tab">A</li>
  </ul>
  <div class="panel">Panel A</div>
</div>`;

export const presets: Record<string, Preset> = {
  bem: {
    label: "BEM",
    css: bemCss + CSS_SANDBOX,
    config: bemConfig,
    html: bemHtml + htmlSandbox("tabs--vertical", "tabs--huge", "tabs--boxed"),
  },
  rscss: {
    label: "rscss",
    css: rscssCss + CSS_SANDBOX,
    config: rscssConfig,
    html: rscssHtml + htmlSandbox("-orientation-vertical", "-orientation-huge", "-variant-boxed"),
  },
  bare: {
    label: "bare",
    css: bareCss + CSS_SANDBOX,
    config: bareConfig,
    html:
      bareHtml +
      htmlSandbox(
        "vertical",
        "huge",
        "boxed",
        ' (off for bare — set "unknown-modifier" to "warn" in the config to see it)',
      ),
  },
};
