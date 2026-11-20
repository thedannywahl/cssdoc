import { type ChildProcessWithoutNullStreams, execFileSync, fork, spawn } from "node:child_process";
import { join } from "node:path";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { expect, test } from "vite-plus/test";

// Guards against the whole "the bundled server crashes on load" class of bug (e.g. an ESM dependency
// using `createRequire(import.meta.url)` or a UMD dynamic `require` that esbuild can't follow). Those
// pass every unit test — the server package's tests exercise the source, not the shipped bundle — yet
// the extension is dead in the editor. Here we spawn the *actual* `dist/server.cjs`, speak LSP to it,
// and assert it answers, so a broken bundle fails the gate instead of shipping.

const root = fileURLToPath(new URL("..", import.meta.url));
const serverBundle = join(root, "dist", "server.cjs");

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
  const send = (msg: unknown): void => void server.stdin.write(frame(msg));

  const { resolve, reject, promise } = Promise.withResolvers<string[]>();
  const timer = setTimeout(
    () => reject(new Error("no diagnostics within 10s — server dead?")),
    10_000,
  );
  server.on("error", reject);
  server.on("exit", (code) => reject(new Error(`server exited early (code ${code})`)));

  let buf = Buffer.alloc(0);
  server.stdout.on("data", (chunk: Buffer) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      const header = buf.toString("latin1").match(/Content-Length: (\d+)\r\n\r\n/);
      if (!header) break;
      const start = (header.index ?? 0) + header[0].length;
      const len = Number(header[1]);
      if (buf.length < start + len) break;
      const msg = JSON.parse(buf.subarray(start, start + len).toString("utf8"));
      buf = buf.subarray(start + len);

      if (msg.id === 1) {
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
      if (msg.method === "textDocument/publishDiagnostics") {
        clearTimeout(timer);
        resolve(msg.params.diagnostics.map((d: { code: string }) => d.code));
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

  // A `@component` with no `@summary` must round-trip to a `missing-summary` diagnostic.
  expect(codes).toContain("missing-summary");
}, 20_000);

function ipcServer<T>() {
  const server = fork(serverBundle, ["--node-ipc"], { silent: true });
  type Reply = { id: number; result?: T };
  const pending = new Map<number, (reply: Reply) => void>();
  let id = 0;
  server.on("message", (message) => {
    const reply = message as Reply;
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
