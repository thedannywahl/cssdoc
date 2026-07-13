/**
 * Generate the social card served at https://cssdoc.dev/og.png — the image link scrapers (Slack,
 * iMessage, X, LinkedIn, Discord, Facebook) show when a cssdoc.dev URL unfurls. Renders a 1200×630
 * PNG from an inline SVG using the cssdoc mark and brand teal. Committed output (not generated at
 * build time), so regenerate and commit when the branding changes: `node scripts/gen-og.mjs`.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const WIDTH = 1200;
const HEIGHT = 630;
const TEAL = "#1DC4B6"; // dark-mode brand teal — reads brightest on the dark card

// The cssdoc mark: a rounded square with `{*}` punched out as a transparent cutout (from icon.svg),
// as a self-contained nested SVG so it can be placed and scaled by its viewBox.
const mark = (x, y, size, fill) => `
  <svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 128 128">
    <mask id="cut">
      <rect x="8" y="8" width="112" height="112" rx="24" fill="white" />
      <g fill="none" stroke="black" stroke-linecap="round" stroke-linejoin="round">
        <g stroke-width="7">
          <path d="M 84 64 q -6 0 -6 6 l 0 11 q 0 6 -6 6 q 6 0 6 6 l 0 11 q 0 6 6 6" />
          <path d="M 100 64 q 6 0 6 6 l 0 11 q 0 6 6 6 q -6 0 -6 6 l 0 11 q 0 6 -6 6" />
        </g>
        <g stroke-width="5">
          <path d="M 92 80 L 92 94" />
          <path d="M 86 83.5 L 98 90.5" />
          <path d="M 86 90.5 L 98 83.5" />
        </g>
      </g>
    </mask>
    <rect x="8" y="8" width="112" height="112" rx="24" fill="${fill}" mask="url(#cut)" />
  </svg>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0c1a1a" />
      <stop offset="1" stop-color="#04100f" />
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />

  <!-- Oversized watermark mark bleeding off the right edge. -->
  <g opacity="0.06">${mark(760, 90, 520, TEAL)}</g>

  <!-- Teal top accent rule. -->
  <rect x="0" y="0" width="${WIDTH}" height="10" fill="${TEAL}" />

  <!-- Logo tile + wordmark. -->
  ${mark(96, 150, 150, TEAL)}
  <text x="270" y="272" font-family="Helvetica Neue, Arial, sans-serif" font-size="132" font-weight="700" fill="#ffffff" letter-spacing="-4">cssdoc</text>

  <!-- Tagline. -->
  <text x="100" y="400" font-family="Helvetica Neue, Arial, sans-serif" font-size="64" font-weight="600" fill="${TEAL}">TSDoc, for CSS</text>

  <!-- Supporting line. -->
  <text x="100" y="470" font-family="Helvetica Neue, Arial, sans-serif" font-size="34" font-weight="400" fill="#9db3b1">Document plain CSS with structured comments.</text>

  <!-- Footer URL. -->
  <text x="100" y="560" font-family="ui-monospace, Menlo, monospace" font-size="30" font-weight="500" fill="#e6f2f0">cssdoc.dev</text>
</svg>`;

const png = new Resvg(svg, {
  fitTo: { mode: "width", value: WIDTH },
  font: { loadSystemFonts: true },
})
  .render()
  .asPng();

const out = fileURLToPath(new URL("../public/og.png", import.meta.url));
writeFileSync(out, png);
console.log(
  `Wrote social card → docs/public/og.png (${WIDTH}×${HEIGHT}, ${(png.length / 1024).toFixed(1)} KB)`,
);
