import { expect, test } from "vite-plus/test";
import { DOCUMENT_SELECTOR, initializationOptions, toGlob } from "../src/config.ts";

test("the document selector covers CSS, HTML, and JSX/TSX", () => {
  const languages = DOCUMENT_SELECTOR.map((s) => s.language);
  expect(languages).toEqual(["css", "html", "javascriptreact", "typescriptreact"]);
});

test("initializationOptions forwards the CSS paths as a fresh array", () => {
  const input = ["dist/components.css"];
  const options = initializationOptions(input);
  expect(options).toEqual({ css: ["dist/components.css"] });
  expect(options.css).not.toBe(input); // copied, not the same reference
});

test("toGlob brace-expands multiple patterns and is undefined when empty", () => {
  expect(toGlob([])).toBeUndefined();
  expect(toGlob(["**/*.css"])).toBe("**/*.css");
  expect(toGlob(["a.css", "b/**/*.css"])).toBe("{a.css,b/**/*.css}");
});
