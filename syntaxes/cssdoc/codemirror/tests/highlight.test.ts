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

test("highlights a bare custom property", () => {
  expect(label("uses --tabs-gap internally")).toContainEqual({
    type: "property",
    text: "--tabs-gap",
  });
});
