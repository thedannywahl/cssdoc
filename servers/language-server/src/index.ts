#!/usr/bin/env node
/**
 * `@cssdoc/language-server` — an editor-agnostic LSP server for the documented CSS surface: completion,
 * hover, definition, and deprecation quick-fixes over `@cssdoc/providers`. Editors that speak LSP (VS
 * Code, Neovim, JetBrains, Zed) spawn the built `dist/index.mjs` (the `cssdoc-language-server` bin);
 * importing the package instead gives you the pure {@link CssDocLanguageService} to embed.
 *
 * @module
 */
import { pathToFileURL } from "node:url";
import { startLanguageServer } from "./server.ts";

export { CssDocLanguageService } from "./service.ts";
export type {
  LspCodeAction,
  LspCompletion,
  LspDiagnostic,
  LspHover,
  LspLocation,
  LspPosition,
  LspRange,
} from "./service.ts";
export { startLanguageServer } from "./server.ts";

// When executed directly (the bin), start the server. When imported, this is inert.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startLanguageServer();
}
