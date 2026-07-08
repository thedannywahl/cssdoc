/**
 * `@cssdoc/vscode` — a thin VS Code extension that starts `@cssdoc/language-server` and points it at the
 * workspace's documented CSS (the `cssdoc.css` setting). All the intelligence lives in the server and
 * the providers; this is just the client wiring.
 *
 * @module
 */
import { createRequire } from "node:module";
import { type ExtensionContext, workspace } from "vscode";
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { DOCUMENT_SELECTOR, initializationOptions } from "./config.ts";

export { DOCUMENT_SELECTOR, initializationOptions } from "./config.ts";

let client: LanguageClient | undefined;

/** VS Code entry point: launch the language client. */
export function activate(context: ExtensionContext): void {
  const require = createRequire(import.meta.url);
  const serverModule = require.resolve("@cssdoc/language-server");
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  };
  const cssPaths = workspace.getConfiguration("cssdoc").get<string[]>("css", []);
  const clientOptions: LanguageClientOptions = {
    documentSelector: [...DOCUMENT_SELECTOR],
    initializationOptions: initializationOptions(cssPaths),
  };
  client = new LanguageClient("cssdoc", "cssdoc", serverOptions, clientOptions);
  context.subscriptions.push({ dispose: () => void client?.stop() });
  void client.start();
}

/** VS Code entry point: stop the language client. */
export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
