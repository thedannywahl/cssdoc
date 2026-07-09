#!/usr/bin/env node
// The `cssdoc-language-server` executable: start the LSP server on stdio. The library entry
// (dist/index.mjs) stays side-effect-free so it can be imported or bundled without auto-starting.
import { startLanguageServer } from "../dist/index.mjs";

startLanguageServer();
