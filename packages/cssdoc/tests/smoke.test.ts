import { expect, test } from "vite-plus/test";
import { createIndex, lintModel, parseCssDocs, toMermaid } from "../src/index.ts";

test("re-exports the core + index + providers API from one entry", () => {
  expect(typeof parseCssDocs).toBe("function");
  expect(typeof createIndex).toBe("function");
  expect(typeof lintModel).toBe("function");
  expect(typeof toMermaid).toBe("function");
});

test("the umbrella round-trips a small component", () => {
  const css = "/**\n * @component card\n */\n.card {}\n.card--featured {}";
  const [card] = parseCssDocs(css);
  expect(card.name).toBe("card");
  expect(card.modifiers.map((m) => m.name)).toEqual(["card--featured"]);
  expect(lintModel(createIndex(css))).toBeInstanceOf(Array);
});
