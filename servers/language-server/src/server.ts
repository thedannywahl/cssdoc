/**
 * The LSP wiring: connect the {@link CssDocLanguageService} to a `vscode-languageserver` connection
 * over stdio. Kept thin — every request handler just translates to/from the service. The `css` file
 * paths come from the client's `initializationOptions`.
 *
 * @module
 */
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CssDocConfigFile, resolveProviders } from "@cssdoc/config";
import type { ExampleFilter } from "@cssdoc/core";
import { dialectForFilename, resolveParser } from "@cssdoc/dialects";
import { detectEmbeddedHost, projectCss } from "@cssdoc/embedded";
import { createIndex, indexFromEntries } from "@cssdoc/index";
import { type HoverSectionOrder, resolveNaming, resolveRuleSeverities } from "@cssdoc/providers";
import {
  CompletionItemTag,
  DiagnosticSeverity,
  DidChangeWatchedFilesNotification,
  type InlayHintParams,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { type ConfigScope, CssDocLanguageService, type LspDiagnostic } from "./service.ts";
import {
  type ClientSettings,
  discoverConfigDirectories,
  discoverStylesheets,
  parseClientSettings,
  parseInitializationOptions,
} from "./workspace.ts";

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
  const hoverFilters = new Map<string, ExampleFilter | null>();
  let cssPaths: string[] = [];
  let workspaceRoots: string[] = [];
  let initialOptions: ClientSettings = {};
  let clientSettings: ClientSettings = {};
  let folderSettings = new Map<string, ClientSettings>();
  let watchFiles = false;
  let watchWorkspaceFolders = false;
  let supportsConfiguration = false;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let watcher: { dispose(): void } | undefined;
  let watcherGeneration = 0;
  let configurationGeneration = 0;

  const rootFor = (path: string): string | undefined =>
    workspaceRoots
      .filter((root) => {
        const rel = relative(root, path);
        return !rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel);
      })
      .toSorted((a, b) => b.length - a.length)[0];

  const optionsFor = (root?: string): ClientSettings => ({
    ...initialOptions,
    ...clientSettings,
    ...(root ? folderSettings.get(root) : undefined),
  });

  const hoverFilterFor = (uri: string, path: string | undefined): ExampleFilter | null => {
    if (!path) return null;
    if (hoverFilters.has(uri)) return hoverFilters.get(uri) ?? null;
    const config = CssDocConfigFile.loadForFolder(dirname(path));
    if (config.hasErrors) connection.console.warn(config.getErrorSummary());
    const filter = config.render.exampleFilters?.hover ?? null;
    hoverFilters.set(uri, filter);
    return filter;
  };

  const readSafe = (p: string): string => {
    try {
      return readFileSync(p, "utf8");
    } catch (error) {
      connection.console.warn(`Cannot read ${p}: ${String(error)}`);
      return "";
    }
  };

  // Read a file for indexing: plain stylesheets pass through; host files (`.vue`/`.ts`/`.md` …) are
  // projected to CSS first so their embedded, documented components enter the index.
  const readIndexable = (p: string): string => {
    const host = detectEmbeddedHost(p);
    const raw = documents.get(pathToFileURL(p).href)?.getText() ?? readSafe(p);
    return host ? projectCss(raw, { host }) : raw;
  };

  const rebuild = (): void => {
    // Group the documented CSS by the nearest `cssdoc.json` (walking up per file), so a monorepo with
    // a config per package gets one scope per config — each with its own convention/severities/naming.
    const groups = new Map<
      string,
      { dir: string; workspaceRoot?: string; configFile: CssDocConfigFile; files: string[] }
    >();
    const add = (configFile: CssDocConfigFile, root?: string, file?: string): void => {
      const dir = configFile.fileNotFound ? (root ?? "") : dirname(configFile.filePath);
      const key = `${root ?? ""}\0${dir}`;
      const g = groups.get(key) ?? { dir, workspaceRoot: root, configFile, files: [] };
      if (file) g.files.push(file);
      groups.set(key, g);
    };
    for (const root of workspaceRoots) {
      add(CssDocConfigFile.loadForFolder(root), root);
      const options = optionsFor(root);
      if (options.providerDiscovery !== false) {
        try {
          for (const dir of discoverConfigDirectories(root, options.providerScanDepth ?? 3)) {
            add(CssDocConfigFile.loadForFolder(dir), root);
          }
        } catch (error) {
          connection.console.warn(`Cannot discover configs in ${root}: ${String(error)}`);
        }
      }
    }
    for (const p of cssPaths) add(CssDocConfigFile.loadForFolder(dirname(p)), rootFor(p), p);
    if (groups.size === 0) add(CssDocConfigFile.loadForFolder(process.cwd()));

    const scopes: ConfigScope[] = [...groups.values()].map((g) => {
      if (g.configFile.hasErrors) connection.console.warn(g.configFile.getErrorSummary());
      const configuration = g.configFile.toConfiguration();
      const parse = resolveParser(
        g.files.some((f) => dialectForFilename(f) === "scss")
          ? "scss"
          : g.files.some((f) => dialectForFilename(f) === "less")
            ? "less"
            : "css",
      );
      // Fall back to an empty index on parse errors so the server stays alive.
      let index: ReturnType<typeof createIndex>;
      try {
        index = createIndex(g.files.map(readIndexable).join("\n"), {
          file: g.files.length === 1 ? g.files[0] : undefined,
          configuration,
          parse,
        });
      } catch (error) {
        connection.console.warn(`Cannot index CSS in ${g.dir || "workspace"}: ${String(error)}`);
        index = createIndex("", { configuration });
      }
      // Declared providers add their components to the sibling set (lint + cross-component hover) — the
      // real, span-carrying `index` stays the source for `var()` resolution. Pass this scope's own
      // matcher so a non-BEM convention (rscss, attribute, …) still applies to the merged index.
      const options = optionsFor(g.workspaceRoot);
      let providers: ReturnType<typeof resolveProviders>;
      try {
        providers = resolveProviders(g.configFile, {
          expandGlobs: options.providerGlobs,
          circularReferenceMode: options.circularReferenceMode,
        });
      } catch (error) {
        connection.console.error(`Cannot resolve providers for ${g.dir}: ${String(error)}`);
        providers = { entries: [], messages: [], href: () => undefined };
      }
      for (const message of providers.messages) connection.console.warn(message);
      const siblingIndex = providers.entries.length
        ? indexFromEntries(
            [...index.entries, ...providers.entries],
            undefined,
            undefined,
            index.matcher,
          )
        : index;
      // Keep the combined index for cross-file value resolution, but resolve definitions against
      // individual source files: concatenation loses file URIs and shifts every later file's spans.
      const definitionCache = new Map<string, ReturnType<typeof createIndex>>();
      const definitionIndexes = function* (): Iterable<ReturnType<typeof createIndex>> {
        for (const file of g.files) {
          let sourceIndex = definitionCache.get(file);
          if (!sourceIndex) {
            try {
              sourceIndex = createIndex(readIndexable(file), {
                file,
                configuration,
                parse: resolveParser(dialectForFilename(file)),
              });
              definitionCache.set(file, sourceIndex);
            } catch (error) {
              connection.console.warn(`Cannot index ${file}: ${String(error)}`);
              continue;
            }
          }
          yield sourceIndex;
        }
      };
      return {
        dir: g.dir,
        workspaceRoot: g.workspaceRoot,
        configuration,
        index,
        definitionIndexes,
        siblingIndex,
        providerHref: providers.href,
        severities: resolveRuleSeverities(
          g.configFile.ruleSeverities as Parameters<typeof resolveRuleSeverities>[0],
        ),
        ruleOptions: g.configFile.ruleOptions,
        naming: resolveNaming(g.configFile.naming),
        structureIgnore: g.configFile.structureIgnore,
      };
    });
    service.setScopes(scopes);
  };

  const discover = (): void => {
    try {
      cssPaths = workspaceRoots.length
        ? [
            ...new Set(
              workspaceRoots.flatMap((root) => discoverStylesheets([root], optionsFor(root))),
            ),
          ].toSorted()
        : discoverStylesheets([], optionsFor());
    } catch (error) {
      connection.console.error(`Cannot discover workspace stylesheets: ${String(error)}`);
    }
  };

  connection.onInitialize((params) => {
    const options = parseInitializationOptions(params.initializationOptions);
    const folders =
      params.workspaceFolders?.map((folder) => folder.uri) ??
      (params.rootUri ? [params.rootUri] : []);
    workspaceRoots = folders.flatMap((uri) => {
      const path = fsPathOf(uri);
      if (!path) connection.console.warn(`Cannot discover CSS in non-file workspace ${uri}`);
      return path ? [path] : [];
    });
    initialOptions = options;
    watchFiles = params.capabilities.workspace?.didChangeWatchedFiles?.dynamicRegistration === true;
    watchWorkspaceFolders = params.capabilities.workspace?.workspaceFolders === true;
    supportsConfiguration = params.capabilities.workspace?.configuration === true;
    discover();
    if (options?.hoverDetail)
      service.setHoverDetail(
        options.hoverDetail,
        options.hoverSections ?? {},
        options.hoverSectionOrder as HoverSectionOrder | undefined,
      );
    rebuild();
    return {
      capabilities: {
        textDocumentSync: {
          openClose: true,
          change: TextDocumentSyncKind.Incremental,
          save: { includeText: false },
        },
        completionProvider: { triggerCharacters: ["-", '"', "'", "(", " ", "@"] },
        hoverProvider: true,
        definitionProvider: true,
        codeActionProvider: true,
        semanticTokensProvider: {
          legend: {
            tokenTypes: ["keyword", "variable", "type", "comment", "decorator"],
            tokenModifiers: ["deprecated", "modification", "optional"],
          },
          full: true,
        },
        inlayHintProvider: true,
        workspace: { workspaceFolders: { supported: true, changeNotifications: true } },
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
  const scheduleRefresh = (): void => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      discover();
      hoverFilters.clear();
      rebuild();
      for (const doc of documents.all()) validate(doc);
    }, 200);
  };

  const registerWatchers = (): void => {
    if (!watchFiles) return;
    const generation = ++watcherGeneration;
    const patterns = new Set([
      "**/*.{css,scss,less,vue,svelte,astro,html,js,jsx,ts,tsx,md,mdx,json,jsonc}",
      ...(optionsFor().include ?? []),
      ...workspaceRoots.flatMap((root) => optionsFor(root).include ?? []),
    ]);
    void connection.client
      .register(DidChangeWatchedFilesNotification.type, {
        watchers: [...patterns].map((globPattern) => ({ globPattern })),
      })
      .then((registration) => {
        if (generation !== watcherGeneration) {
          registration.dispose();
          return;
        }
        watcher?.dispose();
        watcher = registration;
      })
      .catch((error: unknown) =>
        connection.console.warn(`Cannot register file watchers: ${String(error)}`),
      );
  };

  const requestConfiguration = (): void => {
    if (!supportsConfiguration) return;
    const generation = ++configurationGeneration;
    const roots = [...workspaceRoots];
    const items = roots.length
      ? roots.map((root) => ({ scopeUri: pathToFileURL(root).href, section: "cssdoc" }))
      : [{ section: "cssdoc" }];
    void connection.workspace
      .getConfiguration(items)
      .then((values: unknown[]) => {
        if (generation !== configurationGeneration) return;
        if (roots.length) {
          folderSettings = new Map(
            roots.map((root, index) => [root, parseClientSettings(values[index])]),
          );
          clientSettings = {};
        } else {
          clientSettings = parseClientSettings(values[0]);
          folderSettings.clear();
        }
        registerWatchers();
        scheduleRefresh();
      })
      .catch((error: unknown) =>
        connection.console.warn(`Cannot load cssdoc client settings: ${String(error)}`),
      );
  };

  connection.onInitialized(() => {
    if (watchWorkspaceFolders) {
      connection.workspace.onDidChangeWorkspaceFolders((event) => {
        const removed = new Set(event.removed.map((folder) => fsPathOf(folder.uri)));
        workspaceRoots = workspaceRoots.filter((root) => !removed.has(root));
        for (const folder of event.added) {
          const path = fsPathOf(folder.uri);
          if (path && !workspaceRoots.includes(path)) workspaceRoots.push(path);
          else if (!path) {
            connection.console.warn(`Cannot discover CSS in non-file workspace ${folder.uri}`);
          }
        }
        requestConfiguration();
        registerWatchers();
        scheduleRefresh();
      });
    }
    registerWatchers();
    requestConfiguration();
  });

  connection.onDidChangeConfiguration((params) => {
    if (supportsConfiguration) {
      requestConfiguration();
      return;
    }
    try {
      const settings = params.settings as { cssdoc?: unknown } | null;
      clientSettings = parseClientSettings(settings?.cssdoc);
      registerWatchers();
      scheduleRefresh();
    } catch (error) {
      connection.console.warn(`Cannot load cssdoc client settings: ${String(error)}`);
    }
  });

  documents.onDidChangeContent((e) => {
    validate(e.document);
    const path = fsPathOf(e.document.uri);
    if (path && cssPaths.includes(path)) scheduleRefresh();
  });
  documents.onDidSave(() => {
    scheduleRefresh();
  });
  documents.onDidClose((e) => {
    hoverFilters.delete(e.document.uri);
    void connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
    const path = fsPathOf(e.document.uri);
    if (path && cssPaths.includes(path)) scheduleRefresh();
  });
  connection.onDidChangeWatchedFiles(() => {
    scheduleRefresh();
  });
  connection.onShutdown(() => {
    if (refreshTimer) clearTimeout(refreshTimer);
    watcherGeneration++;
    configurationGeneration++;
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
        sortText: c.sortText,
      }));
  });

  connection.onHover((params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    const path = fsPathOf(doc.uri);
    const settings = optionsFor(path ? rootFor(path) : undefined);
    service.setHoverDetail(
      settings.hoverDetail ?? "full",
      settings.hoverSections ?? {},
      settings.hoverSectionOrder as HoverSectionOrder | undefined,
    );
    const hover = service.hover(
      doc.getText(),
      params.position,
      path,
      doc.languageId,
      hoverFilterFor(doc.uri, path),
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

  connection.onRequest(
    "textDocument/semanticTokens/full",
    (params: { textDocument: { uri: string } }) => {
      const doc = documents.get(params.textDocument.uri);
      if (!doc) return { data: [] };
      const tokens = service.semanticTokens(doc.getText(), fsPathOf(doc.uri));

      // Encode tokens in LSP format: build a delta array
      const data: number[] = [];
      let lastLine = 0;
      let lastStart = 0;

      for (const token of tokens.toSorted(
        (a, b) => a.line - b.line || a.startCharacter - b.startCharacter,
      )) {
        data.push(
          token.line - lastLine, // deltaLine
          token.line === lastLine ? token.startCharacter - lastStart : token.startCharacter, // deltaStart
          token.length, // length
          token.tokenType, // tokenType
          token.tokenModifiers, // tokenModifiers
        );
        lastLine = token.line;
        lastStart = token.startCharacter;
      }

      return { data };
    },
  );

  connection.onRequest("textDocument/inlayHint", (params: InlayHintParams) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    const hints = service.inlayHints(doc.getText(), fsPathOf(doc.uri));
    const offset = (position: { line: number; character: number }): number =>
      doc.offsetAt(position);
    const start = offset(params.range.start);
    const end = offset(params.range.end);
    return hints
      .filter((hint) => offset(hint.position) >= start && offset(hint.position) < end)
      .map((h) => ({
        position: h.position,
        label: h.label,
        kind: h.kind,
        tooltip: h.tooltip,
      }));
  });

  documents.listen(connection);
  connection.listen();
}
