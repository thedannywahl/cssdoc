/**
 * Render the checked-in light and dark social-card SVGs to PNG for link-preview scrapers.
 * Regenerate the committed PNGs when the branding changes: `node scripts/gen-og.mjs`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

for (const name of ["og", "og-light"]) {
  const source = fileURLToPath(new URL(`../public/${name}.svg`, import.meta.url));
  const output = fileURLToPath(new URL(`../public/${name}.png`, import.meta.url));
  const png = new Resvg(readFileSync(source, "utf8"), {
    fitTo: { mode: "width", value: 1200 },
    font: { loadSystemFonts: true },
  })
    .render()
    .asPng();

  writeFileSync(output, png);
  console.log(`Wrote docs/public/${name}.png (${(png.length / 1024).toFixed(1)} KB)`);
}
