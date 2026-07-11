// Bundle the extension for VS Code: two self-contained CommonJS files — the client (extension.cjs,
// with `vscode` external) and the language server (server.cjs, with @cssdoc/language-server and its
// deps inlined). VS Code loads extensions as CommonJS, so the format is cjs.
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const require = createRequire(import.meta.url);

// css-tree's ESM entry loads its data with `createRequire(import.meta.url)`, which is `undefined` in a
// CJS bundle — so the naive bundle throws at load and the language server never starts. Point esbuild at
// css-tree's prebuilt, self-contained bundle instead (data inlined, no `createRequire`). It's a
// transitive dep, so resolve it through the dependency chain.
const languageServer = require.resolve("@cssdoc/language-server");
const cssTreeBundle = (() => {
  const providers = createRequire(languageServer).resolve("@cssdoc/providers");
  return createRequire(providers).resolve("css-tree/dist/csstree");
})();
const cssTreeForkShim = fileURLToPath(new URL("../src/shims/css-tree.ts", import.meta.url));

// jsonc-parser (via @cssdoc/config) resolves to its UMD build by default, whose factory does a runtime
// `require("./impl/format")` esbuild can't follow. Point at its ESM build, which uses static imports.
const jsoncParserEsm = (() => {
  const config = createRequire(languageServer).resolve("@cssdoc/config");
  const umd = createRequire(config).resolve("jsonc-parser"); // …/lib/umd/main.js
  return umd.replace(`${sep}umd${sep}`, `${sep}esm${sep}`);
})();

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
await build({
  ...common,
  entryPoints: ["src/server-main.ts"],
  alias: {
    "css-tree": cssTreeForkShim,
    "css-tree-bundle": cssTreeBundle,
    "jsonc-parser": jsoncParserEsm,
  },
  outfile: "dist/server.cjs",
});
