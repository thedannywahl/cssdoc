/**
 * `@cssdoc/language-server` — an editor-agnostic LSP server for the documented CSS surface: completion,
 * hover, definition, and deprecation quick-fixes over `@cssdoc/providers`. Editors that speak LSP (VS
 * Code, Neovim, JetBrains, Zed) spawn the `cssdoc-language-server` bin; importing the package gives you
 * the pure {@link CssDocLanguageService} to embed or `startLanguageServer()` to run it yourself.
 *
 * @module
 */
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
