import { type ChildProcessWithoutNullStreams, execFileSync, fork, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { DIGIT_SOURCE } from "@cssdoc/regex";
import { regex as arkRegex } from "arkregex";
import { expect, test } from "vite-plus/test";

// Guards against the whole "the bundled server crashes on load" class of bug (e.g. an ESM dependency
// using `createRequire(import.meta.url)` or a UMD dynamic `require` that esbuild can't follow). Those
// pass every unit test — the server package's tests exercise the source, not the shipped bundle — yet
// the extension is dead in the editor. Here we spawn the *actual* `dist/server.cjs`, speak LSP to it,
// and assert it answers, so a broken bundle fails the gate instead of shipping.

const root = fileURLToPath(new URL("..", import.meta.url));
const serverBundle = join(root, "dist", "server.cjs");
const CONTENT_LENGTH = arkRegex.as(String.raw`Content-Length: (${DIGIT_SOURCE}+)\r\n\r\n`);

/** LSP framing: `Content-Length` header + JSON body. */
const frame = (msg: unknown): string => {
  const body = JSON.stringify(msg);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
};

test("the bundled server.cjs starts and answers LSP diagnostics", async () => {
  // Always rebuild so we test the current source, not a stale artifact: a broken esbuild config throws
  // here (build failure), and a bundle that builds but crashes on load is caught by the process below.
  execFileSync("node", ["scripts/build.mjs"], { cwd: root });

  const server: ChildProcessWithoutNullStreams = spawn("node", [serverBundle, "--stdio"]);
  const send = (msg: unknown): void => {
    server.stdin.write(frame(msg));
  };

  const { resolve, reject, promise } = Promise.withResolvers<string[]>();
  const timer = setTimeout(
    () => reject(new Error("no diagnostics within 10s — server dead?")),
    10_000,
  );
  server.on("error", reject);
  server.on("exit", (code) => reject(new Error(`server exited early (code ${String(code)})`)));

  let buf = Buffer.alloc(0);
  server.stdout.on("data", (chunk: Buffer) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      const header = buf.toString("latin1").match(CONTENT_LENGTH);
      if (!header) break;
      const start = (header.index ?? 0) + header[0].length;
      const len = Number(header[1]);
      if (buf.length < start + len) break;
      const msg: unknown = JSON.parse(buf.subarray(start, start + len).toString("utf8"));
      buf = buf.subarray(start + len);

      if (typeof msg !== "object" || msg === null) {
        reject(new Error("Expected an LSP message object"));
        return;
      }
      if ("id" in msg && msg.id === 1) {
        send({ jsonrpc: "2.0", method: "initialized", params: {} });
        send({
          jsonrpc: "2.0",
          method: "textDocument/didOpen",
          params: {
            textDocument: {
              uri: "file:///smoke.css",
              languageId: "css",
              version: 1,
              text: "/**\n * @component smoke\n */\n.smoke { color: red; }", // no @summary
            },
          },
        });
      }
      if ("method" in msg && msg.method === "textDocument/publishDiagnostics") {
        if (
          !("params" in msg) ||
          typeof msg.params !== "object" ||
          msg.params === null ||
          !("diagnostics" in msg.params) ||
          !Array.isArray(msg.params.diagnostics) ||
          !msg.params.diagnostics.every(
            (diagnostic: unknown): diagnostic is { code: string } =>
              typeof diagnostic === "object" &&
              diagnostic !== null &&
              "code" in diagnostic &&
              typeof diagnostic.code === "string",
          )
        ) {
          reject(new Error("Expected LSP diagnostics with string codes"));
          return;
        }
        clearTimeout(timer);
        resolve(msg.params.diagnostics.map((diagnostic) => diagnostic.code));
      }
    }
  });

  send({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      processId: process.pid,
      rootUri: null,
      capabilities: {},
      initializationOptions: { css: [] },
    },
  });

  const codes = await promise;

  // `missing-summary` is opt-in; the server must not report it with default settings.
  expect(codes).not.toContain("missing-summary");
}, 20_000);

function ipcServer<T>(
  configuration?: (items: { scopeUri?: string; section: string }[]) => unknown[],
) {
  const server = fork(serverBundle, ["--node-ipc"], { silent: true });
  type Reply = { id: number; result?: T; method?: string; params?: unknown };
  const pending = new Map<number, (reply: Reply) => void>();
  let id = 0;
  server.on("message", (message) => {
    const reply = message as Reply;
    if (reply.method === "workspace/configuration" && configuration) {
      const params = reply.params as { items: { scopeUri?: string; section: string }[] };
      server.send({ jsonrpc: "2.0", id: reply.id, result: configuration(params.items) });
      return;
    }
    if (
      reply.method === "client/registerCapability" ||
      reply.method === "client/unregisterCapability"
    ) {
      server.send({ jsonrpc: "2.0", id: reply.id, result: null });
      return;
    }
    pending.get(reply.id)?.(reply);
    pending.delete(reply.id);
  });
  const request = (method: string, params: unknown): Promise<Reply> => {
    const { resolve, reject, promise } = Promise.withResolvers<Reply>();
    const next = ++id;
    const timer = setTimeout(() => reject(new Error(`No reply to ${method}`)), 10_000);
    pending.set(next, (reply) => {
      clearTimeout(timer);
      resolve(reply);
    });
    server.send({ jsonrpc: "2.0", id: next, method, params });
    return promise;
  };
  return { server, request };
}

test("the bundled server applies file overrides and reloads them for open documents", async () => {
  execFileSync("node", ["scripts/build.mjs"], { cwd: root });
  const fixture = mkdtempSync(join(tmpdir(), "cssdoc-rule-overrides-"));
  const configPath = join(fixture, "cssdoc.json");
  const writeConfig = (severity: "off" | "warn") =>
    writeFileSync(
      configPath,
      JSON.stringify({
        rules: { "missing-summary": "error", "cssdoc-directive": "error" },
        overrides: [
          {
            files: ["docs/*.css", "docs/*.vue"],
            rules: { "missing-summary": severity, "cssdoc-directive": "warn" },
          },
        ],
      }),
    );
  writeConfig("off");
  const { server, request } = ipcServer();
  type Diagnostic = { code: string; severity: number };
  const nextDiagnostics = (uri: string): Promise<Diagnostic[]> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        server.off("message", onMessage);
        reject(new Error(`No diagnostics for ${uri}`));
      }, 10_000);
      function onMessage(message: unknown): void {
        if (!message || typeof message !== "object" || !("method" in message)) return;
        if (message.method !== "textDocument/publishDiagnostics" || !("params" in message)) return;
        const params = message.params as { uri: string; diagnostics: Diagnostic[] };
        if (params.uri !== uri) return;
        clearTimeout(timer);
        server.off("message", onMessage);
        resolve(params.diagnostics);
      }
      server.on("message", onMessage);
    });
  const source =
    "/* cssdoc-expect-error unknown-annotation-ref */\n/**\n * @component widget\n */\n.widget {}";
  const open = (uri: string, languageId: string, text: string) =>
    server.send({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri,
          languageId,
          version: 1,
          text,
        },
      },
    });
  const srcUri = pathToFileURL(join(fixture, "src", "widget.css")).href;
  const docsUri = pathToFileURL(join(fixture, "docs", "widget.css")).href;
  const embeddedUri = pathToFileURL(join(fixture, "docs", "widget.vue")).href;
  try {
    await request("initialize", {
      processId: process.pid,
      rootUri: pathToFileURL(fixture).href,
      capabilities: {},
      initializationOptions: { css: [] },
    });
    server.send({ jsonrpc: "2.0", method: "initialized", params: {} });

    const srcDiagnostics = nextDiagnostics(srcUri);
    open(srcUri, "css", source);
    await expect(srcDiagnostics).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missing-summary", severity: 1 }),
        expect.objectContaining({ code: "cssdoc-directive", severity: 1 }),
      ]),
    );

    const docsDiagnostics = nextDiagnostics(docsUri);
    open(docsUri, "css", source);
    const before = await docsDiagnostics;
    expect(before.find((d) => d.code === "missing-summary")).toBeUndefined();
    expect(before.find((d) => d.code === "cssdoc-directive")?.severity).toBe(2);

    const embeddedDiagnostics = nextDiagnostics(embeddedUri);
    open(embeddedUri, "vue", `<style>\n${source}\n</style>`);
    const embedded = await embeddedDiagnostics;
    expect(embedded.find((d) => d.code === "missing-summary")).toBeUndefined();
    expect(embedded.find((d) => d.code === "cssdoc-directive")?.severity).toBe(2);

    const reloadedDiagnostics = nextDiagnostics(docsUri);
    writeConfig("warn");
    server.send({
      jsonrpc: "2.0",
      method: "workspace/didChangeWatchedFiles",
      params: { changes: [{ uri: pathToFileURL(configPath).href, type: 2 }] },
    });
    expect((await reloadedDiagnostics).find((d) => d.code === "missing-summary")?.severity).toBe(2);
  } finally {
    server.kill();
    rmSync(fixture, { recursive: true, force: true });
  }
}, 20_000);

test("the bundled server returns an explicit replacement for doc-tag completions", async () => {
  execFileSync("node", ["scripts/build.mjs"], { cwd: root });
  const { server, request } =
    ipcServer<{ label: string; kind?: number; textEdit?: { range: unknown; newText: string } }[]>();
  const uri = "file:///completion.css";
  try {
    await request("initialize", {
      processId: process.pid,
      rootUri: null,
      capabilities: {},
      initializationOptions: { css: [] },
    });
    server.send({ jsonrpc: "2.0", method: "initialized", params: {} });
    server.send({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri,
          languageId: "css",
          version: 1,
          text: "/**\n * \n */\n.button {}",
        },
      },
    });
    server.send({
      jsonrpc: "2.0",
      method: "textDocument/didChange",
      params: {
        textDocument: { uri, version: 2 },
        contentChanges: [
          {
            range: { start: { line: 1, character: 3 }, end: { line: 1, character: 3 } },
            text: "@pa",
          },
        ],
      },
    });
    const reply = await request("textDocument/completion", {
      textDocument: { uri },
      position: { line: 1, character: 6 },
      context: { triggerKind: 1 },
    });
    const part = reply.result?.find((item) => item.label === "@part");
    expect(part?.kind).toBe(14);
    expect(part?.textEdit).toEqual({
      range: { start: { line: 1, character: 3 }, end: { line: 1, character: 6 } },
      newText: "@part",
    });
  } finally {
    server.kill();
  }
}, 20_000);

test("hover presentation follows client format and VS Code opt-in", async () => {
  execFileSync("node", ["scripts/build.mjs"], { cwd: root });
  for (const [format, presentation] of [
    ["markdown", undefined],
    ["markdown", "vscode"],
    ["plaintext", "vscode"],
  ] as const) {
    const { server, request } = ipcServer<{ contents: { kind: string; value: string } }>();
    const uri = "file:///hover.css";
    try {
      await request("initialize", {
        processId: process.pid,
        rootUri: null,
        capabilities: { textDocument: { hover: { contentFormat: [format] } } },
        initializationOptions: { css: [], hoverPresentation: presentation },
      });
      server.send({ jsonrpc: "2.0", method: "initialized", params: {} });
      server.send({
        jsonrpc: "2.0",
        method: "textDocument/didOpen",
        params: {
          textDocument: {
            uri,
            languageId: "css",
            version: 1,
            text: '/** @component widget\n * @summary A widget.\n * @example\n * <button class="widget">Save</button>\n */\n.widget {}',
          },
        },
      });
      const contents = (
        await request("textDocument/hover", {
          textDocument: { uri },
          position: { line: 5, character: 2 },
        })
      ).result?.contents;
      expect(contents?.kind).toBe(format);
      expect(contents?.value).toContain("A widget.");
      expect(contents?.value).toContain('<button class="widget">Save</button>');
      expect(contents?.value.includes("$(symbol-class)")).toBe(
        format === "markdown" && presentation === "vscode",
      );
      expect(contents?.value.includes("```")).toBe(format === "markdown");
      expect(contents?.value.includes("**")).toBe(format === "markdown");
    } finally {
      server.kill();
    }
  }
}, 30_000);

test("the server applies per-folder client settings and reloads them on change", async () => {
  execFileSync("node", ["scripts/build.mjs"], { cwd: root });
  const fixture = mkdtempSync(join(tmpdir(), "cssdoc-settings-"));
  const first = join(fixture, "first");
  const second = join(fixture, "second");
  mkdirSync(first);
  mkdirSync(second);
  for (const dir of [first, second]) {
    writeFileSync(
      join(dir, "widget.scss"),
      "/**\n * @component widget\n * @summary Scoped settings\n */\n.widget {}\n",
    );
  }
  const enabled = new Set([pathToFileURL(first).href]);
  const { server, request } = ipcServer<{ contents: { value: string } } | null>((items) =>
    items.map((item) => ({
      include: enabled.has(item.scopeUri ?? "") ? ["**/*.scss"] : ["**/*.css"],
    })),
  );
  const hover = async (dir: string): Promise<string | undefined> =>
    (
      await request("textDocument/hover", {
        textDocument: { uri: pathToFileURL(join(dir, "page.html")).href },
        position: { line: 0, character: 13 },
      })
    ).result?.contents.value;
  try {
    await request("initialize", {
      processId: process.pid,
      rootUri: pathToFileURL(first).href,
      workspaceFolders: [first, second].map((dir) => ({
        uri: pathToFileURL(dir).href,
        name: dir,
      })),
      capabilities: {
        workspace: { configuration: true, didChangeWatchedFiles: { dynamicRegistration: true } },
      },
    });
    server.send({ jsonrpc: "2.0", method: "initialized", params: {} });
    for (const dir of [first, second]) {
      server.send({
        jsonrpc: "2.0",
        method: "textDocument/didOpen",
        params: {
          textDocument: {
            uri: pathToFileURL(join(dir, "page.html")).href,
            languageId: "html",
            version: 1,
            text: '<div class="widget"></div>',
          },
        },
      });
    }
    const deadline = Date.now() + 5000;
    while (!(await hover(first))?.includes("Scoped settings") && Date.now() < deadline) {
      await delay(50);
    }
    await expect(hover(first)).resolves.toContain("Scoped settings");
    await expect(hover(second)).resolves.toBeUndefined();
    enabled.delete(pathToFileURL(first).href);
    enabled.add(pathToFileURL(second).href);
    server.send({
      jsonrpc: "2.0",
      method: "workspace/didChangeConfiguration",
      params: { settings: null },
    });
    const changedDeadline = Date.now() + 5000;
    while (!(await hover(second))?.includes("Scoped settings") && Date.now() < changedDeadline) {
      await delay(50);
    }
    await expect(hover(first)).resolves.toBeUndefined();
    await expect(hover(second)).resolves.toContain("Scoped settings");
  } finally {
    server.kill();
    rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

test("the server discovers CSS and keeps workspace folders independent", async () => {
  execFileSync("node", ["scripts/build.mjs"], { cwd: root });
  const fixture = mkdtempSync(join(tmpdir(), "cssdoc-workspaces-"));
  const first = join(fixture, "first");
  const second = join(fixture, "second");
  mkdirSync(first);
  mkdirSync(second);
  for (const [dir, summary] of [
    [first, "First workspace"],
    [second, "Second workspace"],
  ]) {
    writeFileSync(
      join(dir, "widget.css"),
      `/**\n * @component widget\n * @summary ${summary}\n */\n.widget {}\n`,
    );
  }
  const { server, request } = ipcServer<{ contents: { value: string } }>();
  try {
    await request("initialize", {
      processId: process.pid,
      rootUri: pathToFileURL(first).href,
      workspaceFolders: [first, second].map((dir) => ({
        uri: pathToFileURL(dir).href,
        name: dir,
      })),
      capabilities: {},
    });
    server.send({ jsonrpc: "2.0", method: "initialized", params: {} });
    for (const [dir, expected, other] of [
      [first, "First workspace", "Second workspace"],
      [second, "Second workspace", "First workspace"],
    ]) {
      const uri = pathToFileURL(join(dir, "page.html")).href;
      server.send({
        jsonrpc: "2.0",
        method: "textDocument/didOpen",
        params: {
          textDocument: { uri, languageId: "html", version: 1, text: '<div class="widget"></div>' },
        },
      });
      const reply = await request("textDocument/hover", {
        textDocument: { uri },
        position: { line: 0, character: 13 },
      });
      expect(reply.result?.contents.value).toContain(expected);
      expect(reply.result?.contents.value).not.toContain(other);
    }
  } finally {
    server.kill();
    rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

test("the server refreshes discovered files and unsaved stylesheet changes", async () => {
  execFileSync("node", ["scripts/build.mjs"], { cwd: root });
  const fixture = mkdtempSync(join(tmpdir(), "cssdoc-refresh-"));
  const css = join(fixture, "widget.css");
  const cssUri = pathToFileURL(css).href;
  const htmlUri = pathToFileURL(join(fixture, "page.html")).href;
  const text = (summary: string): string =>
    `/**\n * @component widget\n * @summary ${summary}\n */\n.widget {}\n`;
  const { server, request } = ipcServer<{ contents: { value: string } } | null>();
  const hover = async (): Promise<string | undefined> =>
    (
      await request("textDocument/hover", {
        textDocument: { uri: htmlUri },
        position: { line: 0, character: 13 },
      })
    ).result?.contents.value;
  const waitForHover = async (expected: string | undefined): Promise<void> => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if ((await hover()) === expected) return;
      await delay(50);
    }
    await expect(hover()).resolves.toBe(expected);
  };
  try {
    await request("initialize", {
      processId: process.pid,
      rootUri: pathToFileURL(fixture).href,
      capabilities: {},
    });
    server.send({ jsonrpc: "2.0", method: "initialized", params: {} });
    server.send({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri: htmlUri,
          languageId: "html",
          version: 1,
          text: '<div class="widget"></div>',
        },
      },
    });
    await expect(hover()).resolves.toBeUndefined();
    writeFileSync(css, text("Disk"));
    server.send({
      jsonrpc: "2.0",
      method: "workspace/didChangeWatchedFiles",
      params: { changes: [{ uri: cssUri, type: 1 }] },
    });
    const deadline = Date.now() + 5000;
    while (!(await hover())?.includes("Disk") && Date.now() < deadline) {
      await delay(50);
    }
    await expect(hover()).resolves.toContain("Disk");
    server.send({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: { uri: cssUri, languageId: "css", version: 1, text: text("Unsaved") },
      },
    });
    const unsavedDeadline = Date.now() + 5000;
    while (!(await hover())?.includes("Unsaved") && Date.now() < unsavedDeadline) {
      await delay(50);
    }
    await expect(hover()).resolves.toContain("Unsaved");
    server.send({
      jsonrpc: "2.0",
      method: "textDocument/didClose",
      params: { textDocument: { uri: cssUri } },
    });
    unlinkSync(css);
    server.send({
      jsonrpc: "2.0",
      method: "workspace/didChangeWatchedFiles",
      params: { changes: [{ uri: cssUri, type: 3 }] },
    });
    await waitForHover(undefined);
    writeFileSync(join(fixture, "widget.scss"), text("Pushed settings"));
    server.send({
      jsonrpc: "2.0",
      method: "workspace/didChangeConfiguration",
      params: { settings: { cssdoc: { include: ["**/*.scss"] } } },
    });
    const configDeadline = Date.now() + 5000;
    while (!(await hover())?.includes("Pushed settings") && Date.now() < configDeadline) {
      await delay(50);
    }
    await expect(hover()).resolves.toContain("Pushed settings");
  } finally {
    server.kill();
    rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

test("the server indexes workspace folders added after initialization", async () => {
  execFileSync("node", ["scripts/build.mjs"], { cwd: root });
  const fixture = mkdtempSync(join(tmpdir(), "cssdoc-folders-"));
  const added = join(fixture, "added");
  const other = join(fixture, "other");
  mkdirSync(added);
  mkdirSync(other);
  writeFileSync(
    join(added, "widget.css"),
    "/**\n * @component widget\n * @summary Added workspace\n */\n.widget {}\n",
  );
  writeFileSync(
    join(other, "widget.css"),
    "/**\n * @component widget\n * @summary Other workspace\n */\n.widget {}\n",
  );
  const { server, request } = ipcServer<{ contents: { value: string } } | null>();
  const uri = pathToFileURL(join(added, "page.html")).href;
  const hover = async (): Promise<string | undefined> =>
    (
      await request("textDocument/hover", {
        textDocument: { uri },
        position: { line: 0, character: 13 },
      })
    ).result?.contents.value;
  try {
    await request("initialize", {
      processId: process.pid,
      rootUri: pathToFileURL(other).href,
      workspaceFolders: [{ uri: pathToFileURL(other).href, name: "other" }],
      capabilities: { workspace: { workspaceFolders: true } },
    });
    server.send({ jsonrpc: "2.0", method: "initialized", params: {} });
    server.send({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: { uri, languageId: "html", version: 1, text: '<div class="widget"></div>' },
      },
    });
    await expect(hover()).resolves.toBeUndefined();
    server.send({
      jsonrpc: "2.0",
      method: "workspace/didChangeWorkspaceFolders",
      params: {
        event: { added: [{ uri: pathToFileURL(added).href, name: "added" }], removed: [] },
      },
    });
    const deadline = Date.now() + 5000;
    while (!(await hover())?.includes("Added workspace") && Date.now() < deadline) {
      await delay(50);
    }
    await expect(hover()).resolves.toContain("Added workspace");
    server.send({
      jsonrpc: "2.0",
      method: "workspace/didChangeWorkspaceFolders",
      params: {
        event: { added: [], removed: [{ uri: pathToFileURL(added).href, name: "added" }] },
      },
    });
    const removedDeadline = Date.now() + 5000;
    while ((await hover()) !== undefined && Date.now() < removedDeadline) {
      await delay(50);
    }
    await expect(hover()).resolves.toBeUndefined();
  } finally {
    server.kill();
    rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

test("the server discovers nested provider configs without a local stylesheet", async () => {
  execFileSync("node", ["scripts/build.mjs"], { cwd: root });
  const fixture = mkdtempSync(join(tmpdir(), "cssdoc-provider-scope-"));
  const consumer = join(fixture, "consumer");
  const vendor = join(fixture, "vendor");
  mkdirSync(consumer);
  mkdirSync(vendor);
  writeFileSync(
    join(vendor, "widget.css"),
    "/**\n * @component widget\n * @summary Provider widget\n */\n.widget {}\n",
  );
  writeFileSync(
    join(consumer, "cssdoc.json"),
    JSON.stringify({ providers: [{ path: "../vendor/*.css" }] }),
  );
  const { server, request } = ipcServer<{ contents: { value: string } } | null>();
  const uri = pathToFileURL(join(consumer, "page.html")).href;
  const hover = async (): Promise<string | undefined> =>
    (
      await request("textDocument/hover", {
        textDocument: { uri },
        position: { line: 0, character: 13 },
      })
    ).result?.contents.value;
  try {
    await request("initialize", {
      processId: process.pid,
      rootUri: pathToFileURL(fixture).href,
      capabilities: {},
      initializationOptions: { exclude: ["**/vendor/**"], providerScanDepth: 0 },
    });
    server.send({ jsonrpc: "2.0", method: "initialized", params: {} });
    server.send({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: { uri, languageId: "html", version: 1, text: '<div class="widget"></div>' },
      },
    });
    await expect(hover()).resolves.toBeUndefined();
    server.send({
      jsonrpc: "2.0",
      method: "workspace/didChangeConfiguration",
      params: { settings: { cssdoc: { editor: { providerScanDepth: 1 } } } },
    });
    const deadline = Date.now() + 5000;
    while (!(await hover())?.includes("Provider widget") && Date.now() < deadline) {
      await delay(50);
    }
    await expect(hover()).resolves.toContain("Provider widget");
  } finally {
    server.kill();
    rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

test("inlay hint requests return only hints within the requested range", async () => {
  execFileSync("node", ["scripts/build.mjs"], { cwd: root });
  const fixture = mkdtempSync(join(tmpdir(), "cssdoc-inlay-range-"));
  writeFileSync(
    join(fixture, "button.css"),
    "/**\n * @component button\n * @cssproperty --button-color Button color.\n */\n.button { color: var(--button-color); }\n",
  );
  const uri = pathToFileURL(join(fixture, "page.html")).href;
  const { server, request } = ipcServer<{ position: { line: number } }[]>();
  try {
    await request("initialize", {
      processId: process.pid,
      rootUri: pathToFileURL(fixture).href,
      capabilities: {},
    });
    server.send({ jsonrpc: "2.0", method: "initialized", params: {} });
    server.send({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri,
          languageId: "html",
          version: 1,
          text: "var(--button-color)\nvar(--button-color)\n",
        },
      },
    });
    const reply = await request("textDocument/inlayHint", {
      textDocument: { uri },
      range: { start: { line: 1, character: 0 }, end: { line: 2, character: 0 } },
    });
    expect(reply.result?.map((hint) => hint.position.line)).toEqual([1]);
  } finally {
    server.kill();
    rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

test("definitions from a multi-file index retain their source URI and local line", async () => {
  execFileSync("node", ["scripts/build.mjs"], { cwd: root });
  const fixture = mkdtempSync(join(tmpdir(), "cssdoc-definitions-"));
  const alpha = join(fixture, "alpha.css");
  const beta = join(fixture, "beta.css");
  writeFileSync(
    alpha,
    "/**\n * @component alpha\n * @summary First component.\n */\n.alpha { color: red; }\n",
  );
  writeFileSync(
    beta,
    "/**\n * @component beta\n * @summary Second component.\n */\n.beta { color: blue; }\n",
  );
  const { server, request } = ipcServer<{ uri: string; range: { start: { line: number } } }>();
  try {
    await request("initialize", {
      processId: process.pid,
      rootUri: pathToFileURL(fixture).href,
      capabilities: {},
      initializationOptions: { css: [alpha, beta] },
    });
    server.send({ jsonrpc: "2.0", method: "initialized", params: {} });
    for (const [name, file] of [
      ["alpha", alpha],
      ["beta", beta],
    ]) {
      const uri = pathToFileURL(join(fixture, `${name}.html`)).href;
      server.send({
        jsonrpc: "2.0",
        method: "textDocument/didOpen",
        params: {
          textDocument: {
            uri,
            languageId: "html",
            version: 1,
            text: `<div class="${name}"></div>`,
          },
        },
      });
      const reply = await request("textDocument/definition", {
        textDocument: { uri },
        position: { line: 0, character: 13 },
      });
      expect(reply.result?.uri).toBe(pathToFileURL(file).href);
      expect(reply.result?.range.start.line).toBe(4);
    }
  } finally {
    server.kill();
    rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

test("the bundled server uses the nearest config for example filtering in hover", async () => {
  execFileSync("node", ["scripts/build.mjs"], { cwd: root });
  const fixture = mkdtempSync(join(tmpdir(), "cssdoc-hover-"));
  const nested = join(fixture, "nested");
  mkdirSync(nested);
  for (const [dir, label] of [
    [fixture, "docs"],
    [nested, "demo"],
  ]) {
    writeFileSync(
      join(dir, "cssdoc.json"),
      JSON.stringify({
        render: { exampleFilters: { hover: { labels: [label] } } },
      }),
    );
  }
  const css = join(fixture, "widget.css");
  writeFileSync(
    css,
    `/** @component widget
 * @example labels=[docs, demo]
 * Shared example
 * @example labels=[demo]
 * Interactive example
 * @example labels=[a11y]
 * Audit fixture
 */
.widget {}
`,
  );
  const { server, request } = ipcServer<{ contents: { value: string } }>();
  try {
    await request("initialize", {
      processId: process.pid,
      rootUri: pathToFileURL(fixture).href,
      capabilities: {},
      initializationOptions: { css: [css] },
    });
    server.send({ jsonrpc: "2.0", method: "initialized", params: {} });
    for (const dir of [fixture, nested]) {
      const uri = pathToFileURL(join(dir, "page.html")).href;
      server.send({
        jsonrpc: "2.0",
        method: "textDocument/didOpen",
        params: {
          textDocument: { uri, languageId: "html", version: 1, text: '<div class="widget"></div>' },
        },
      });
      const reply = await request("textDocument/hover", {
        textDocument: { uri },
        position: { line: 0, character: 13 },
      });
      const contents = reply.result?.contents.value;
      expect(contents).toContain("Shared example");
      expect(contents).not.toContain("Audit fixture");
      expect(contents?.includes("Interactive example")).toBe(dir === nested);
    }
  } finally {
    server.kill();
    rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);
