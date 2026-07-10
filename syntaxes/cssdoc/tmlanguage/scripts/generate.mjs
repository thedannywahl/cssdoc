// Regenerate cssdoc.injection.tmLanguage.json from the built grammar builder. VS Code's
// contributes.grammars needs a physical file, so we emit one from @cssdoc/spec's vocabulary; the
// tests assert the committed file stays in sync. Run after building: `pnpm --filter @cssdoc/tmlanguage build && … generate`.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildInjectionGrammar } from "../dist/index.mjs";

const out = fileURLToPath(new URL("../cssdoc.injection.tmLanguage.json", import.meta.url));
writeFileSync(out, `${JSON.stringify(buildInjectionGrammar(), null, 2)}\n`);
console.log(`Wrote ${out}`);
