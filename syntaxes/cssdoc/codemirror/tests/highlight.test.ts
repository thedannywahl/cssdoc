import { expect, test } from "vite-plus/test";
import { tokenizeComment } from "../src/index.ts";

const label = (src: string) =>
  tokenizeComment(src).map((t) => ({ type: t.type, text: src.slice(t.from, t.to) }));

test("categorizes cssdoc doc-comment tags", () => {
  const src =
    "@component tabs\n@part .list\n@slot label\n@cssproperty --tabs-gap\n@modifier -x\n@a11y ok";
  const toks = label(src);
  expect(toks).toContainEqual({ type: "tag", text: "@component" });
  expect(toks).toContainEqual({ type: "tag", text: "@part" });
  expect(toks).toContainEqual({ type: "part", text: ".list" });
  expect(toks).toContainEqual({ type: "part", text: "label" });
  expect(toks).toContainEqual({ type: "tag", text: "@cssproperty" });
  expect(toks).toContainEqual({ type: "property", text: "--tabs-gap" });
  expect(toks).toContainEqual({ type: "modifier", text: "-x" });
  expect(toks).toContainEqual({ type: "tag", text: "@a11y" });
});

test("splits an inline {@link …} into punctuation, tag, and link text", () => {
  const toks = label("see {@link -orientation-vertical}");
  expect(toks).toContainEqual({ type: "punct", text: "{" });
  expect(toks).toContainEqual({ type: "tag", text: "@link" });
  expect(toks).toContainEqual({ type: "link", text: "-orientation-vertical" });
  expect(toks).toContainEqual({ type: "punct", text: "}" });
});

test("lightly highlights an @structure body — class selectors and braces, nothing else", () => {
  const toks = label("@structure Caption.\n.tabs {\n  .list:has(.tab) {}\n}\n@a11y ok");
  // The parts (class selectors) light up, including one inside :has().
  expect(toks).toContainEqual({ type: "part", text: ".tabs" });
  expect(toks).toContainEqual({ type: "part", text: ".list" });
  expect(toks).toContainEqual({ type: "part", text: ".tab" });
  // Braces read as punctuation.
  expect(toks.filter((t) => t.type === "punct" && t.text === "{").length).toBe(2);
  // The region stops at the next tag — @a11y is still a tag, not swallowed.
  expect(toks).toContainEqual({ type: "tag", text: "@a11y" });
  // The pseudo-class itself stays plain (no CSS grammar): `:has` isn't tokenized.
  expect(toks.some((t) => t.text.includes("has"))).toBe(false);
});

test("highlights a bare custom property", () => {
  expect(label("uses --tabs-gap internally")).toContainEqual({
    type: "property",
    text: "--tabs-gap",
  });
});
