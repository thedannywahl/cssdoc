/**
 * Publish the `cssdoc.json` schema to the docs site: copy the config package's shipped
 * `cssdoc.schema.json` into VitePress's `public/` dir so it's served at
 * https://cssdoc.dev/cssdoc.schema.json — the `$schema` URL used in every `cssdoc.json` example and
 * the schema's own `$id`. Runs before `vitepress build`/`dev`; the copy is git-ignored (generated).
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const from = fileURLToPath(new URL("../../packages/config/cssdoc.schema.json", import.meta.url));
const toDir = fileURLToPath(new URL("../public/", import.meta.url));

mkdirSync(toDir, { recursive: true });
copyFileSync(from, `${toDir}cssdoc.schema.json`);
console.log("Published cssdoc.schema.json → docs/public/");
