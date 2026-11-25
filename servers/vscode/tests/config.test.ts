import { expect, test } from "vite-plus/test";
import { DOCUMENT_SELECTOR } from "../src/config.ts";

test("the document selector covers stylesheets, markup hosts, and JS/TS flavors", () => {
  const languages = DOCUMENT_SELECTOR.map((s) => s.language);
  expect(languages).toEqual([
    "css",
    "scss",
    "less",
    "html",
    "vue",
    "svelte",
    "astro",
    "markdown",
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
  ]);
  // Every entry is a file-scheme selector (the server only reads on-disk documents).
  expect(DOCUMENT_SELECTOR.every((s) => s.scheme === "file")).toBe(true);
});
