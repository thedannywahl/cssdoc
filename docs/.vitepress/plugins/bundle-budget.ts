import { gzipSync } from "node:zlib";

import type { Plugin } from "vite-plus";

const ordinaryBudget = { bytes: 500_000, gzipBytes: 200_000 };
const payloadBudgets = [
  {
    name: "ELK layout engine",
    matches: (id: string) => id.includes("/node_modules/elkjs/"),
    bytes: 1_600_000,
    gzipBytes: 500_000,
  },
  {
    name: "Mermaid grammar",
    matches: (id: string) => id.includes("/node_modules/@mermaid-js/parser/"),
    bytes: 700_000,
    gzipBytes: 150_000,
  },
  {
    name: "local search index",
    matches: (id: string) => id.startsWith("/@localSearchIndex"),
    bytes: 1_350_000,
    gzipBytes: 270_000,
  },
  {
    name: "pattern reference",
    matches: (id: string) =>
      id.includes("/guide/patterns.md") || id.includes("/.vitepress/pattern-reference.data."),
    bytes: 750_000,
    gzipBytes: 45_000,
  },
];

/** Reject oversized client chunks, with bounded exceptions for indivisible documentation payloads. */
export function assertDocsChunkBudget(chunk: {
  fileName: string;
  code: string;
  moduleIds: readonly string[];
}): void {
  const payload =
    chunk.moduleIds.length > 0
      ? payloadBudgets.find((budget) => chunk.moduleIds.every(budget.matches))
      : undefined;
  const budget = payload ?? ordinaryBudget;
  const bytes = Buffer.byteLength(chunk.code);
  const gzipBytes = gzipSync(chunk.code).byteLength;
  if (bytes > budget.bytes || gzipBytes > budget.gzipBytes) {
    throw new Error(
      `${chunk.fileName} exceeds the ${payload?.name ?? "ordinary code"} budget: ` +
        `${bytes}/${budget.bytes} bytes, ${gzipBytes}/${budget.gzipBytes} gzip bytes`,
    );
  }
}

/** Split client dependencies and enforce payload budgets without changing VitePress's SSR graph. */
export function docsBundleBudget(): Plugin {
  return {
    name: "cssdoc-docs-bundle-budget",
    config(_config, { isSsrBuild }) {
      if (isSsrBuild) return undefined;
      return {
        build: {
          // The per-chunk gate below replaces Vite's blanket advisory, not its ordinary-code limit.
          chunkSizeWarningLimit: Math.max(...payloadBudgets.map(({ bytes }) => bytes)) / 1000,
          rolldownOptions: {
            output: {
              strictExecutionOrder: true,
              codeSplitting: {
                groups: [
                  {
                    name: (id) => {
                      const dependency = id.split("/node_modules/").at(-1);
                      if (dependency === undefined || dependency === id) return null;
                      const segments = dependency.split("/");
                      return segments[0].startsWith("@")
                        ? `${segments[0].slice(1)}-${segments[1]}`
                        : segments[0];
                    },
                    maxSize: 450_000,
                    includeDependenciesRecursively: false,
                  },
                ],
              },
            },
          },
        },
      };
    },
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        if (this.environment.name !== "client") return;
        for (const output of Object.values(bundle)) {
          if (output.type === "chunk") assertDocsChunkBudget(output);
        }
      },
    },
  };
}
