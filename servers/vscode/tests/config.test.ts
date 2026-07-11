import { expect, test } from "vite-plus/test";
import { DOCUMENT_SELECTOR, initializationOptions, toGlob } from "../src/config.ts";

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

test("initializationOptions forwards the CSS paths as a fresh array + the hover config", () => {
  const input = ["dist/components.css"];
  const options = initializationOptions(input);
  // full detail + empty per-section map by default.
  expect(options).toEqual({ css: ["dist/components.css"], hoverDetail: "full", hoverSections: {} });
  expect(options.css).not.toBe(input); // copied, not the same reference
  expect(initializationOptions(input, "compact").hoverDetail).toBe("compact");
  expect(initializationOptions(input, "custom", { modifiers: "off" }).hoverSections).toEqual({
    modifiers: "off",
  });
});

test("toGlob brace-expands multiple patterns and is undefined when empty", () => {
  expect(toGlob([])).toBeUndefined();
  expect(toGlob(["**/*.css"])).toBe("**/*.css");
  expect(toGlob(["a.css", "b/**/*.css"])).toBe("{a.css,b/**/*.css}");
});
