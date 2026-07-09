/**
 * `@cssdoc/config` — load a `cssdoc.json` file into an `@cssdoc/core` `CssDocConfiguration`, the way
 * `@microsoft/tsdoc-config` loads `tsdoc.json` into a `TSDocConfiguration`. Kept a separate package
 * because it pulls in Node (fs/path) and ajv, whereas `@cssdoc/core` is self-contained.
 *
 * @example
 * ```ts
 * import { CssDocConfigFile } from "@cssdoc/config";
 * import { parseCssDocs } from "@cssdoc/core";
 *
 * const configFile = CssDocConfigFile.loadForFolder(process.cwd());
 * const model = parseCssDocs(css, { configuration: configFile.toConfiguration() });
 * ```
 *
 * @module @cssdoc/config
 */
export { CssDocConfigFile, CSSDOC_CONFIG_FILENAME } from "./CssDocConfigFile.ts";
export { cssDocSchema } from "./schema.ts";
