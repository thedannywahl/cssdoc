/**
 * The LSP wiring: connect the {@link CssDocLanguageService} to a `vscode-languageserver` connection
 * over stdio. Kept thin — every request handler just translates to/from the service. The `css` file
 * paths come from the client's `initializationOptions`.
 *
 * @module
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createIndex } from "@cssdoc/index";
import {
  CompletionItemTag,
  DiagnosticSeverity,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CssDocLanguageService, type LspDiagnostic } from "./service.ts";

/** Start the language server on the Node stdio connection. */
export function startLanguageServer(): void {
  const connection = createConnection(ProposedFeatures.all);
  const documents = new TextDocuments(TextDocument);
  const service = new CssDocLanguageService(createIndex(""));
  let cssPaths: string[] = [];

  const rebuild = (): void => {
    const css = cssPaths
      .map((p) => {
        try {
          return readFileSync(p, "utf8");
        } catch {
          return "";
        }
      })
      .join("\n");
    service.setIndex(createIndex(css, { file: cssPaths.length === 1 ? cssPaths[0] : undefined }));
  };

  connection.onInitialize((params) => {
    const options = params.initializationOptions as { css?: string[] } | undefined;
    cssPaths = options?.css ?? [];
    rebuild();
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: { triggerCharacters: ["-", '"', "'", "(", " "] },
        hoverProvider: true,
        definitionProvider: true,
        codeActionProvider: true,
      },
    };
  });

  const validate = (doc: TextDocument): void => {
    const diagnostics = service.diagnostics(doc.getText()).map((d) => ({
      range: d.range,
      message: d.message,
      severity: d.severity === 1 ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
      code: d.code,
      data: d.data,
    }));
    void connection.sendDiagnostics({ uri: doc.uri, diagnostics });
  };
  documents.onDidChangeContent((e) => {
    validate(e.document);
  });

  connection.onCompletion((params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    return service.completions(doc.getText(), params.position).map((c) => ({
      label: c.label,
      detail: c.detail,
      documentation: c.documentation,
      tags: c.deprecated ? [CompletionItemTag.Deprecated] : undefined,
    }));
  });

  connection.onHover((params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    const hover = service.hover(doc.getText(), params.position);
    return hover ? { contents: { kind: "markdown" as const, value: hover.contents } } : null;
  });

  connection.onDefinition((params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    const location = service.definition(doc.getText(), params.position);
    if (!location?.uri) return null;
    return { uri: pathToFileURL(location.uri).href, range: location.range };
  });

  connection.onCodeAction((params) => {
    const diagnostics: LspDiagnostic[] = params.context.diagnostics.map((d) => ({
      range: d.range,
      message: typeof d.message === "string" ? d.message : "",
      severity: 2,
      code: typeof d.code === "string" ? d.code : undefined,
      data: d.data as LspDiagnostic["data"],
    }));
    return service.codeActions(diagnostics).map((a) => ({
      title: a.title,
      kind: "quickfix" as const,
      edit: {
        changes: { [params.textDocument.uri]: [{ range: a.edit.range, newText: a.edit.newText }] },
      },
    }));
  });

  documents.listen(connection);
  connection.listen();
}
