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
  type HoverDetail,
  type HoverSectionOrder,
  type HoverSections,
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
 * Serializes restarts: each one waits for the previous stop → create → start to finish before it
 * begins. Without this, concurrent triggers race on the module-level `client` — two overlapping
 * `restart()` calls each reassign it, so the first-started client is dropped without ever being
 * stopped and its server child process leaks (the memory-leak culprit: orphaned servers pile up,
 * each holding a full index, until the host runs out of memory).
 */
let restartChain: Promise<void> = Promise.resolve();
/** Pending debounce timer, coalescing a burst of file/config events into a single restart. */
let restartTimer: ReturnType<typeof setTimeout> | undefined;

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
  const cfg = workspace.getConfiguration("cssdoc");
  const hoverDetail = cfg.get<HoverDetail>("hover.detail", "full");
  const hoverSections = cfg.get<HoverSections>("hover.sections", {});
  const hoverSectionOrder = cfg.get<HoverSectionOrder>("hover.sectionOrder", []);
  const clientOptions: LanguageClientOptions = {
    documentSelector: [...DOCUMENT_SELECTOR],
    initializationOptions: initializationOptions(
      cssPaths,
      hoverDetail,
      hoverSections,
      hoverSectionOrder,
    ),
    // Let the hover cards use codicons (`$(icon)`) and a little inline HTML (a themed deprecation
    // accent) — the server emits both; these flags tell the client to render rather than escape them.
    markdown: { supportHtml: true, supportThemeIcons: true },
  };
  return new LanguageClient("cssdoc", "cssdoc", serverOptions, clientOptions);
}

/**
 * (Re)start the client, re-resolving the CSS paths first. Serialized through `restartChain` so the
 * old client is always fully stopped before a new one starts — a burst of watcher events can never
 * leave a started-but-unreferenced server process running.
 */
function restart(context: ExtensionContext): Promise<void> {
  restartChain = restartChain
    .then(async () => {
      const previous = client;
      client = undefined;
      if (previous) {
        try {
          await previous.stop();
        } catch {
          // A stop can reject (e.g. the server was still mid-start); dispose to make sure the child
          // process is torn down rather than orphaned.
          await previous.dispose().catch(() => {});
        }
      }
      const next = createClient(context, await resolveCssPaths());
      client = next;
      await next.start();
    })
    .catch(() => {
      // Swallow so one failed restart doesn't wedge the chain for every later one.
    });
  return restartChain;
}

/** Coalesce a burst of file-system / configuration events into a single restart. */
function scheduleRestart(context: ExtensionContext): void {
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    restartTimer = undefined;
    void restart(context);
  }, 300);
}

/** VS Code entry point: launch the language client and keep the CSS set current. */
export async function activate(context: ExtensionContext): Promise<void> {
  await restart(context);

  // Re-resolve when a cssdoc setting changes...
  context.subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("cssdoc")) scheduleRestart(context);
    }),
  );

  // ...and when auto-detected CSS files are added or removed, so the set stays current without a reload.
  const include = toGlob(
    workspace.getConfiguration("cssdoc").get<string[]>("include", [...DEFAULT_INCLUDE]),
  );
  if (include) {
    const watcher = workspace.createFileSystemWatcher(include, false, true, false);
    watcher.onDidCreate(() => scheduleRestart(context));
    watcher.onDidDelete(() => scheduleRestart(context));
    context.subscriptions.push(watcher);
  }

  // ...and when any cssdoc.json / cssdoc.jsonc changes, so edited conventions/severities/naming reload live.
  const configWatcher = workspace.createFileSystemWatcher("**/cssdoc.{json,jsonc}");
  configWatcher.onDidCreate(() => scheduleRestart(context));
  configWatcher.onDidChange(() => scheduleRestart(context));
  configWatcher.onDidDelete(() => scheduleRestart(context));
  context.subscriptions.push(configWatcher);

  context.subscriptions.push({
    dispose: () => {
      if (restartTimer) clearTimeout(restartTimer);
      void client?.stop();
    },
  });
}

/** VS Code entry point: stop the language client. */
export function deactivate(): Thenable<void> | undefined {
  if (restartTimer) clearTimeout(restartTimer);
  return client?.stop();
}
