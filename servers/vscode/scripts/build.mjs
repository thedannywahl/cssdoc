// Bundle the extension for VS Code: two self-contained CommonJS files — the client (extension.cjs,
// with `vscode` external) and the language server (server.cjs, with @cssdoc/language-server and its
// deps inlined). VS Code loads extensions as CommonJS, so the format is cjs.
import { rmSync } from "node:fs";
import { build } from "esbuild";

rmSync("dist", { recursive: true, force: true });

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
