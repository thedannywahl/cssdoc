// The playground's convention presets. Each is a self-contained, valid bundle — component CSS, its
// cssdoc.json, and sample consumer HTML — so switching preset swaps to an idiomatic example for that
// convention. The BEM bundle reuses the files the Example page embeds (one source, no drift).
import bemCss from "../../examples/tabs.css?raw";
import bemConfig from "../../examples/cssdoc.json?raw";
import bareCss from "../../examples/tabs.bare.css?raw";
import bareConfig from "../../examples/cssdoc.bare.json?raw";
import rscssCss from "../../examples/tabs.rscss.css?raw";
import rscssConfig from "../../examples/cssdoc.rscss.json?raw";

export interface Preset {
  label: string;
  css: string;
  config: string;
  html: string;
}

export const presets: Record<string, Preset> = {
  bem: {
    label: "BEM",
    css: bemCss,
    config: bemConfig,
    html: `<div class="tabs tabs--vertical">
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
</div>`,
  },
  rscss: {
    label: "rscss",
    css: rscssCss,
    config: rscssConfig,
    html: `<div class="tabs -orientation-vertical">
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
</div>`,
  },
  bare: {
    label: "bare",
    css: bareCss,
    config: bareConfig,
    html: `<div class="tabs vertical">
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
</div>`,
  },
};
