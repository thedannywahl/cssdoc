import { randomBytes } from "node:crypto";

import { expect, test } from "vite-plus/test";

import { assertDocsChunkBudget } from "./bundle-budget.js";

test("enforces the ordinary chunk limit in bytes, including at the exact boundary", () => {
  const chunk = { fileName: "app.js", moduleIds: ["/docs/.vitepress/theme/index.ts"] };
  expect(() => assertDocsChunkBudget({ ...chunk, code: "x".repeat(500_000) })).not.toThrow();
  expect(() => assertDocsChunkBudget({ ...chunk, code: "x".repeat(500_001) })).toThrow(
    "500001/500000 bytes",
  );
  expect(() => assertDocsChunkBudget({ ...chunk, code: "é".repeat(250_001) })).toThrow(
    "500002/500000 bytes",
  );
});

test("doesn't let ordinary code borrow an indivisible payload's larger budget", () => {
  const chunk = {
    fileName: "layout.js",
    code: "x".repeat(600_000),
    moduleIds: ["/node_modules/elkjs/lib/elk.bundled.js"],
  };
  expect(() => assertDocsChunkBudget(chunk)).not.toThrow();
  expect(() =>
    assertDocsChunkBudget({ ...chunk, moduleIds: [...chunk.moduleIds, "/docs/app.ts"] }),
  ).toThrow("ordinary code");
  expect(() => assertDocsChunkBudget({ ...chunk, moduleIds: [] })).toThrow("ordinary code");
});

test("enforces raw and transfer limits even for a recognized vendor payload", () => {
  const chunk = {
    fileName: "layout.js",
    moduleIds: ["/node_modules/elkjs/lib/elk.bundled.js"],
  };
  expect(() => assertDocsChunkBudget({ ...chunk, code: "x".repeat(1_600_001) })).toThrow(
    "1600001/1600000 bytes",
  );
  expect(() =>
    assertDocsChunkBudget({ ...chunk, code: randomBytes(550_000).toString("hex") }),
  ).toThrow("gzip bytes");
});
