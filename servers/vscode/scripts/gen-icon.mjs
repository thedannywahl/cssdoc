// Rasterize the shared icon.svg to the 128×128 PNG the VS Code Marketplace requires. The braces are
// vector paths (no fonts), so the output is deterministic. Run with `vp run icon` after editing the SVG.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const svgPath = fileURLToPath(new URL("../../../icon.svg", import.meta.url));
const outPath = fileURLToPath(new URL("../icon.png", import.meta.url));

const resvg = new Resvg(readFileSync(svgPath, "utf8"), { fitTo: { mode: "width", value: 128 } });
writeFileSync(outPath, resvg.render().asPng());
console.log(`✓ wrote ${outPath} (128×128)`);
