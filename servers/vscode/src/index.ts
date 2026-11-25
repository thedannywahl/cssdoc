/**
 * `@cssdoc/vscode` — a thin VS Code extension that starts `@cssdoc/language-server` (bundled alongside
 * as `dist/server.cjs`). Workspace discovery, configuration, and language features live in the
 * server and providers; this extension supplies client wiring and comment formatting.
 *
 * @module
 */
import { Range, type ExtensionContext, window, workspace } from "vscode";
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { DOCUMENT_SELECTOR } from "./config.ts";
import { cssDocEdits } from "./comment-format.ts";

export { DOCUMENT_SELECTOR } from "./config.ts";

let client: LanguageClient | undefined;

/** Build a language client wired to the bundled server. */
function createClient(context: ExtensionContext): LanguageClient {
  const serverModule = context.asAbsolutePath("dist/server.cjs");
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [...DOCUMENT_SELECTOR],
    synchronize: { configurationSection: "cssdoc" },
    // Let the hover cards use codicons (`$(icon)`) and a little inline HTML (a themed deprecation
    // accent) — the server emits both; these flags tell the client to render rather than escape them.
    markdown: { supportHtml: true, supportThemeIcons: true },
  };
  return new LanguageClient("cssdoc", "cssdoc", serverOptions, clientOptions);
}

/** VS Code entry point: launch the language client. */
export async function activate(context: ExtensionContext): Promise<void> {
  client = createClient(context);
  await client.start();

  let applyingCommentEdits = false;
  context.subscriptions.push(
    workspace.onDidChangeTextDocument((event) => {
      if (applyingCommentEdits || !new Set(["css", "scss", "less"]).has(event.document.languageId))
        return;
      const editor = window.visibleTextEditors.find(
        (candidate) => candidate.document === event.document,
      );
      if (!editor) return;
      const hasNewline = event.contentChanges.some((change) => change.text.includes("\n"));
      const edits = cssDocEdits(event.document.getText(), hasNewline);
      if (edits.length === 0) return;
      applyingCommentEdits = true;
      void editor
        .edit(
          (builder) => {
            for (const edit of [...edits].toSorted((a, b) => b.start - a.start)) {
              builder.replace(
                new Range(
                  event.document.positionAt(edit.start),
                  event.document.positionAt(edit.end),
                ),
                edit.newText,
              );
            }
          },
          { undoStopBefore: false, undoStopAfter: false },
        )
        .then(
          () => {
            applyingCommentEdits = false;
          },
          () => {
            applyingCommentEdits = false;
          },
        );
    }),
  );
}

/** VS Code entry point: stop the language client. */
export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
