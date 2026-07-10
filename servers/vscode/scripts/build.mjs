// Bundle the extension for VS Code: two self-contained CommonJS files — the client (extension.cjs,
// with `vscode` external) and the language server (server.cjs, with @cssdoc/language-server and its
// deps inlined). VS Code loads extensions as CommonJS, so the format is cjs.
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { build } from "esbuild";

rmSync("dist", { recursive: true, force: true });

// Vendor the cssdoc injection grammar into the extension. vsce packages with --no-dependencies, so the
// grammar can't come from node_modules; copy the single source of truth from @cssdoc/tmlanguage.
mkdirSync("syntaxes", { recursive: true });
copyFileSync(
  new URL("../../../syntaxes/cssdoc/tmlanguage/cssdoc.injection.tmLanguage.json", import.meta.url),
  "syntaxes/cssdoc.injection.tmLanguage.json",
);

// Vendor the config JSON schema so the editor validates/completes cssdoc.json + cssdoc.jsonc.
mkdirSync("schemas", { recursive: true });
copyFileSync(
  new URL("../../../packages/config/cssdoc.schema.json", import.meta.url),
  "schemas/cssdoc.schema.json",
);

const common = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  logLevel: "info",
};

await build({
  ...common,
  entryPoints: ["src/index.ts"],
  external: ["vscode"],
  outfile: "dist/extension.cjs",
});
await build({ ...common, entryPoints: ["src/server-main.ts"], outfile: "dist/server.cjs" });
