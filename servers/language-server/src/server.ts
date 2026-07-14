/**
 * The LSP wiring: connect the {@link CssDocLanguageService} to a `vscode-languageserver` connection
 * over stdio. Kept thin — every request handler just translates to/from the service. The `css` file
 * paths come from the client's `initializationOptions`.
 *
 * @module
 */
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CssDocConfigFile, resolveProviders } from "@cssdoc/config";
import { dialectForFilename, resolveParser } from "@cssdoc/dialects";
import { detectEmbeddedHost, projectCss } from "@cssdoc/embedded";
import { createIndex, indexFromEntries } from "@cssdoc/index";
import { type HoverSectionOrder, resolveNaming, resolveRuleSeverities } from "@cssdoc/providers";
import {
  CompletionItemTag,
  DiagnosticSeverity,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { type ConfigScope, CssDocLanguageService, type LspDiagnostic } from "./service.ts";

/** The absolute file path for a document URI, or `undefined` for non-file URIs. */
const fsPathOf = (uri: string): string | undefined => {
  try {
    return fileURLToPath(uri);
  } catch {
    return undefined;
  }
};

/** Start the language server on the Node stdio connection. */
export function startLanguageServer(): void {
  const connection = createConnection(ProposedFeatures.all);
  const documents = new TextDocuments(TextDocument);
  const service = new CssDocLanguageService(createIndex(""));
  let cssPaths: string[] = [];

  const readSafe = (p: string): string => {
    try {
      return readFileSync(p, "utf8");
    } catch {
      return "";
    }
  };

  // Read a file for indexing: plain stylesheets pass through; host files (`.vue`/`.ts`/`.md` …) are
  // projected to CSS first so their embedded, documented components enter the index.
  const readIndexable = (p: string): string => {
    const host = detectEmbeddedHost(p);
    const raw = readSafe(p);
    return host ? projectCss(raw, { host }) : raw;
  };

  const rebuild = (): void => {
    // Group the documented CSS by the nearest `cssdoc.json` (walking up per file), so a monorepo with
    // a config per package gets one scope per config — each with its own convention/severities/naming.
    const groups = new Map<
      string,
      { dir: string; configFile: CssDocConfigFile; files: string[] }
    >();
    const add = (configFile: CssDocConfigFile, file?: string): void => {
      const dir = configFile.fileNotFound ? "" : dirname(configFile.filePath);
      const g = groups.get(dir) ?? { dir, configFile, files: [] };
      if (file) g.files.push(file);
      groups.set(dir, g);
    };
    for (const p of cssPaths) add(CssDocConfigFile.loadForFolder(dirname(p)), p);
    if (groups.size === 0) add(CssDocConfigFile.loadForFolder(process.cwd())); // no CSS yet

    const scopes: ConfigScope[] = [...groups.values()].map((g) => {
      const configuration = g.configFile.toConfiguration();
      const index = createIndex(g.files.map(readIndexable).join("\n"), {
        file: g.files.length === 1 ? g.files[0] : undefined,
        configuration,
        // Pick a dialect parser for the group: SCSS wins over Less wins over plain CSS. (Host files
        // carry their dialect internally; the projection is parsed as CSS here — best-effort.)
        parse: resolveParser(
          g.files.some((f) => dialectForFilename(f) === "scss")
            ? "scss"
            : g.files.some((f) => dialectForFilename(f) === "less")
              ? "less"
              : "css",
        ),
      });
      // Declared providers add their components to the sibling set (lint + cross-component hover) — the
      // real, span-carrying `index` stays the source for `var()` resolution.
      const providers = resolveProviders(g.configFile);
      const siblingIndex = providers.entries.length
        ? indexFromEntries([...index.entries, ...providers.entries])
        : index;
      return {
        dir: g.dir,
        configuration,
        index,
        siblingIndex,
        providerHref: providers.href,
        severities: resolveRuleSeverities(
          g.configFile.ruleSeverities as Parameters<typeof resolveRuleSeverities>[0],
        ),
        naming: resolveNaming(g.configFile.naming),
        structureIgnore: g.configFile.structureIgnore,
      };
    });
    service.setScopes(scopes);
  };

  connection.onInitialize((params) => {
    const options = params.initializationOptions as
      | {
          css?: string[];
          hoverDetail?: "compact" | "full" | "custom";
          hoverSections?: Record<string, "on" | "off" | "auto">;
          hoverSectionOrder?: string[];
        }
      | undefined;
    cssPaths = options?.css ?? [];
    if (options?.hoverDetail)
      service.setHoverDetail(
        options.hoverDetail,
        options.hoverSections ?? {},
        options.hoverSectionOrder as HoverSectionOrder | undefined,
      );
    rebuild();
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: { triggerCharacters: ["-", '"', "'", "(", " ", "@"] },
        hoverProvider: true,
        definitionProvider: true,
        codeActionProvider: true,
      },
    };
  });

  const validate = (doc: TextDocument): void => {
    const diagnostics = service
      .diagnostics(doc.getText(), doc.languageId, fsPathOf(doc.uri))
      .map((d) => ({
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
    return service
      .completions(
        doc.getText(),
        params.position,
        fsPathOf(params.textDocument.uri),
        doc.languageId,
      )
      .map((c) => ({
        label: c.label,
        detail: c.detail,
        documentation: c.documentation,
        tags: c.deprecated ? [CompletionItemTag.Deprecated] : undefined,
      }));
  });

  connection.onHover((params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    const hover = service.hover(
      doc.getText(),
      params.position,
      fsPathOf(params.textDocument.uri),
      doc.languageId,
    );
    return hover ? { contents: { kind: "markdown" as const, value: hover.contents } } : null;
  });

  connection.onDefinition((params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    const location = service.definition(
      doc.getText(),
      params.position,
      fsPathOf(params.textDocument.uri),
      doc.languageId,
    );
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
    return service.codeActions(diagnostics, fsPathOf(params.textDocument.uri)).map((a) => ({
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
