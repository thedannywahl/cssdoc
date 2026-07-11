import { type ChildProcessWithoutNullStreams, execFileSync, spawn } from "node:child_process";
import { join } from "node:path";
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

  const codes = await new Promise<string[]>((resolve, reject) => {
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
  }).finally(() => server.kill());

  // A `@component` with no `@summary` must round-trip to a `missing-summary` diagnostic.
  expect(codes).toContain("missing-summary");
}, 20_000);
