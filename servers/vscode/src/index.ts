/**
 * `@cssdoc/vscode` — a thin VS Code extension that starts `@cssdoc/language-server` (bundled alongside
 * as `dist/server.cjs`) and points it at the workspace's documented CSS. By default it auto-detects CSS
 * (`cssdoc.include` / `cssdoc.exclude` globs); an explicit `cssdoc.css` list overrides that. All the
 * intelligence lives in the server and the providers; this is just the client wiring.
 *
 * @module
 */
import { isAbsolute, join } from "node:path";
import { type ExtensionContext, workspace } from "vscode";
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import {
  DEFAULT_EXCLUDE,
  DEFAULT_INCLUDE,
  DOCUMENT_SELECTOR,
  initializationOptions,
  toGlob,
} from "./config.ts";

export {
  DEFAULT_EXCLUDE,
  DEFAULT_INCLUDE,
  DOCUMENT_SELECTOR,
  initializationOptions,
  toGlob,
} from "./config.ts";

let client: LanguageClient | undefined;

/**
 * Resolve the documented CSS file paths: an explicit `cssdoc.css` list (resolved against the workspace
 * root) when set, otherwise auto-detected from the `cssdoc.include` / `cssdoc.exclude` globs.
 */
async function resolveCssPaths(): Promise<string[]> {
  const cfg = workspace.getConfiguration("cssdoc");
  const root = workspace.workspaceFolders?.[0]?.uri.fsPath;

  const explicit = cfg.get<string[]>("css", []);
  if (explicit.length > 0) {
    return explicit.map((p) => (root && !isAbsolute(p) ? join(root, p) : p));
  }

  const include = toGlob(cfg.get<string[]>("include", [...DEFAULT_INCLUDE]));
  if (!include) return [];
  const exclude = toGlob(cfg.get<string[]>("exclude", [...DEFAULT_EXCLUDE]));
  const uris = await workspace.findFiles(include, exclude);
  return uris.map((u) => u.fsPath).sort();
}

/** Build a language client wired to the bundled server for the given CSS paths. */
function createClient(context: ExtensionContext, cssPaths: string[]): LanguageClient {
  const serverModule = context.asAbsolutePath("dist/server.cjs");
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [...DOCUMENT_SELECTOR],
    initializationOptions: initializationOptions(cssPaths),
  };
  return new LanguageClient("cssdoc", "cssdoc", serverOptions, clientOptions);
}

/** (Re)start the client, re-resolving the CSS paths first. */
async function restart(context: ExtensionContext): Promise<void> {
  await client?.stop();
  client = createClient(context, await resolveCssPaths());
  await client.start();
}

/** VS Code entry point: launch the language client and keep the CSS set current. */
export async function activate(context: ExtensionContext): Promise<void> {
  await restart(context);

  // Re-resolve when a cssdoc setting changes...
  context.subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("cssdoc")) void restart(context);
    }),
  );

  // ...and when auto-detected CSS files are added or removed, so the set stays current without a reload.
  const include = toGlob(
    workspace.getConfiguration("cssdoc").get<string[]>("include", [...DEFAULT_INCLUDE]),
  );
  if (include) {
    const watcher = workspace.createFileSystemWatcher(include, false, true, false);
    watcher.onDidCreate(() => void restart(context));
    watcher.onDidDelete(() => void restart(context));
    context.subscriptions.push(watcher);
  }

  context.subscriptions.push({ dispose: () => void client?.stop() });
}

/** VS Code entry point: stop the language client. */
export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
