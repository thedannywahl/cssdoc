import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildGrammar } from "../dist/index.mjs";

const out = fileURLToPath(new URL("../grammarkdown.tmLanguage.json", import.meta.url));
writeFileSync(out, `${JSON.stringify(buildGrammar(), null, 2)}\n`);
console.log(`Wrote ${out}`);
