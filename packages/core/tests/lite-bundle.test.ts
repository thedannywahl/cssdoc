import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { build } from "esbuild";
import { expect, test } from "vite-plus/test";

const root = fileURLToPath(new URL("../../..", import.meta.url));

function isMarkdownEngine(path: string): boolean {
  const packages = [
    "cmark",
    "commonmark",
    "markdown",
    "markdoc",
    "marked",
    "mdast",
    "micromark",
    "rehype",
    "remark",
    "showdown",
    "snarkdown",
    "unified",
  ];
  return path
    .replaceAll("\\", "/")
    .split("/")
    .some((part) =>
      packages.some(
        (name) => part === name || part.startsWith(`${name}-`) || part.startsWith(`${name}@`),
      ),
    );
}

function sourceMapPaths(mapPath: string): string[] {
  const value: unknown = JSON.parse(readFileSync(mapPath, "utf8"));
  if (
    typeof value !== "object" ||
    value === null ||
    !("sources" in value) ||
    !Array.isArray(value.sources) ||
    !value.sources.every((source: unknown) => typeof source === "string") ||
    ("sourceRoot" in value && typeof value.sourceRoot !== "string")
  ) {
    throw new Error(`Invalid source map: ${mapPath}`);
  }
  const sourceRoot =
    "sourceRoot" in value && typeof value.sourceRoot === "string" ? value.sourceRoot : "";
  return value.sources.map((source: string) => resolve(dirname(mapPath), sourceRoot, source));
}

test("packed lite and its transitive module graph contain no Markdown engine", async () => {
  const outDir = mkdtempSync(join(tmpdir(), "cssdoc-lite-audit-"));
  try {
    execFileSync(
      "vp",
      [
        "pack",
        "packages/core/src/lite.ts",
        "--no-config",
        "--no-dts",
        "--platform",
        "browser",
        "--minify",
        "--sourcemap",
        "--out-dir",
        outDir,
      ],
      { cwd: root, stdio: "pipe" },
    );
    const output = readdirSync(outDir).find((file) => file === "lite.js" || file === "lite.mjs");
    if (!output) throw new Error("The lite pack didn't produce an entry module");
    const packed = join(outDir, output);
    const options = {
      bundle: true,
      platform: "browser",
      format: "esm",
      write: false,
      metafile: true,
    } as const;
    const sourceGraph = await build({
      ...options,
      absWorkingDir: root,
      entryPoints: ["packages/core/src/lite.ts"],
    });
    const packedGraph = await build({ ...options, absWorkingDir: root, entryPoints: [packed] });
    const paths = [
      ...Object.keys(sourceGraph.metafile.inputs),
      ...Object.keys(packedGraph.metafile.inputs),
    ];
    const workspaceMaps = Object.keys(sourceGraph.metafile.inputs)
      .filter((path) => path.startsWith("packages/") && path.includes("/dist/"))
      .map((path) => resolve(root, `${path}.map`));
    const maps = [`${packed}.map`, ...workspaceMaps];
    const visited = new Set<string>();
    while (maps.length > 0) {
      const map = maps.pop()!;
      if (visited.has(map)) continue;
      visited.add(map);
      const sources = sourceMapPaths(map);
      paths.push(...sources);
      for (const source of sources) {
        if (
          source.startsWith(join(root, "packages") + sep) &&
          source.includes(`${sep}dist${sep}`) &&
          (source.endsWith(".js") || source.endsWith(".mjs"))
        ) {
          maps.push(`${source}.map`);
        }
      }
    }
    const externals = Object.values(packedGraph.metafile.outputs).flatMap((bundleOutput) =>
      bundleOutput.imports.filter((entry) => entry.external).map((entry) => entry.path),
    );
    expect(externals).toEqual([]);
    const markdownPaths = paths.filter(isMarkdownEngine);
    expect(markdownPaths).toEqual([]);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}, 20_000);

test("phase two bundle gate reports lite, full core, and highlighter sizes", async () => {
  const metrics = [] as { name: string; bytes: number; gzip: number }[];
  for (const [name, entry] of [
    ["lite", "packages/core/src/lite.ts"],
    ["full-core", "packages/core/src/index.ts"],
    ["highlighter", "packages/providers/src/highlighting.ts"],
  ] as const) {
    const result = await build({
      absWorkingDir: root,
      entryPoints: [entry],
      bundle: true,
      platform: "browser",
      format: "esm",
      minify: true,
      sourcemap: true,
      write: false,
    });
    const output = result.outputFiles.find(
      (file) => !file.path.endsWith(".map") && file.contents.byteLength > 0,
    );
    if (!output) throw new Error(`No JavaScript output for ${name}`);
    metrics.push({
      name,
      bytes: output.contents.byteLength,
      gzip: gzipSync(output.contents).byteLength,
    });
  }
  for (const metric of metrics) expect(metric.bytes).toBeGreaterThan(0);
  expect(metrics.find((metric) => metric.name === "full-core")!.bytes).toBeGreaterThan(
    metrics.find((metric) => metric.name === "lite")!.bytes,
  );
  expect(metrics.find((metric) => metric.name === "highlighter")!.bytes).toBeGreaterThan(
    metrics.find((metric) => metric.name === "lite")!.bytes,
  );
  console.log(
    `phase2-bundle-gate ${metrics
      .map((metric) => `${metric.name}=${metric.bytes}/${metric.gzip}`)
      .join(" ")}`,
  );
});

test("the lite dependency audit recognizes a transitive Markdown engine", async () => {
  const graph = await build({
    absWorkingDir: root,
    stdin: {
      contents: 'export { fromMarkdown } from "mdast-util-from-markdown";',
      resolveDir: resolve(root, "packages/core"),
    },
    bundle: true,
    platform: "browser",
    format: "esm",
    write: false,
    metafile: true,
  });
  expect(Object.keys(graph.metafile.inputs).some(isMarkdownEngine)).toBe(true);
});
