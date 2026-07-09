// Rasterize the shared icons to the 128×128 PNGs the VS Code Marketplace requires. The braces are
// vector paths (no fonts), so the output is deterministic. Run with `vp run icon` after editing an SVG.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const icons = [
  ["../../../icon.svg", "../icon.png"],
  ["../../../icon-dark.svg", "../icon-dark.png"],
];

for (const [svg, png] of icons) {
  const svgPath = fileURLToPath(new URL(svg, import.meta.url));
  const outPath = fileURLToPath(new URL(png, import.meta.url));
  const resvg = new Resvg(readFileSync(svgPath, "utf8"), { fitTo: { mode: "width", value: 128 } });
  writeFileSync(outPath, resvg.render().asPng());
  console.log(`✓ wrote ${outPath} (128×128)`);
}
