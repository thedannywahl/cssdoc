/**
 * The bundled server entry. esbuild bundles this (and all of `@cssdoc/language-server` + its deps) into
 * `dist/server.cjs`, which the extension spawns as a child process. Kept separate from the extension
 * bundle so the client and server are two self-contained files inside the VSIX.
 *
 * @module
 */
import { startLanguageServer } from "@cssdoc/language-server";

startLanguageServer();
