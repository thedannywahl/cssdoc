import { expect, test } from "vite-plus/test";
import { CssDocConfiguration, CssDocTagDefinition } from "@cssdoc/core/lite";
import { tokenizeComment } from "../src/index.ts";

const label = (src: string) =>
  tokenizeComment(src).map((t) => ({ type: t.type, text: src.slice(t.from, t.to) }));

test.each(["disable", "enable", "disable-line", "disable-next-line", "expect-error"])(
  "highlights the cssdoc-%s directive and its rule names",
  (kind) => {
    const src = `/* cssdoc-${kind} missing-summary, undocumented-modifier - reason @component */`;
    expect(label(src)).toEqual([
      { type: "keyword", text: `cssdoc-${kind}` },
      { type: "rule", text: "missing-summary" },
      { type: "rule", text: "undocumented-modifier" },
    ]);
  },
);

test("handles multiline and unscoped directives without highlighting prose", () => {
  expect(label("/*\ncssdoc-enable\nmissing-summary, undocumented-modifier\n- reason\n*/")).toEqual([
    { type: "keyword", text: "cssdoc-enable" },
    { type: "rule", text: "missing-summary" },
    { type: "rule", text: "undocumented-modifier" },
  ]);
  expect(label("/* cssdoc-disable */")).toEqual([{ type: "keyword", text: "cssdoc-disable" }]);
  expect(label("/* prose cssdoc-disable missing-summary */")).toEqual([]);
  expect(label("/* cssdoc-enabled missing-summary */")).toEqual([]);
});

test("categorizes cssdoc doc-comment tags", () => {
  const src =
    "@component tabs\n@part .list\n@slot label\n@cssproperty --tabs-gap\n@modifier -x\n@a11y ok";
  const toks = label(src);
  expect(toks).toContainEqual({ type: "tag", text: "@component" });
  expect(toks).toContainEqual({ type: "record", text: "tabs" });
  expect(toks).toContainEqual({ type: "tag", text: "@part" });
  expect(toks).toContainEqual({ type: "part", text: ".list" });
  expect(toks).toContainEqual({ type: "part", text: "label" });
  expect(toks).toContainEqual({ type: "tag", text: "@cssproperty" });
  expect(toks).toContainEqual({ type: "property", text: "--tabs-gap" });
  expect(toks).toContainEqual({ type: "modifier", text: "-x" });
  expect(toks).toContainEqual({ type: "tag", text: "@a11y" });
});

test("uses configured block boundaries and doesn't mark fenced tags as active", () => {
  const config = new CssDocConfiguration();
  config.addTagDefinition(new CssDocTagDefinition({ tagName: "custom", syntaxKind: "block" }));
  config.setSupportForTag(config.tryGetTagDefinition("summary")!, false);
  const src = [
    "/**",
    " * @custom - Text",
    " * @summary - Disabled",
    " * @example -",
    " * ```css",
    " * @component hidden",
    " * {@link missing} --hidden-token",
    " * ```",
    " */",
  ].join("\r\n");
  const tags = tokenizeComment(src, config)
    .filter((token) => token.type === "tag")
    .map((token) => src.slice(token.from, token.to));
  expect(tags).toEqual(["@custom", "@example"]);
  expect(
    tokenizeComment(src, config).some((token) =>
      src.slice(token.from, token.to).includes("missing"),
    ),
  ).toBe(false);
  expect(
    tokenizeComment(src, config).some(
      (token) => src.slice(token.from, token.to) === "--hidden-token",
    ),
  ).toBe(false);
});

test("fences on an example header leave the block tag visible and hide incomplete code", () => {
  const src = "/** @example - ```css\n * {@link hidden}\n * @component hidden";
  expect(label(src).filter((token) => token.type === "tag")).toEqual([
    { type: "tag", text: "@example" },
  ]);
});

test("keeps structure highlighting inside nested CSS at-rules", () => {
  const src = [
    "/**",
    " * @structure",
    " * @scope (.card) {",
    " *   .card { .label {} }",
    " * }",
    " * @summary Card.",
    " */",
  ].join("\n");
  const tokens = label(src);
  expect(tokens).toContainEqual({ type: "part", text: ".label" });
  expect(tokens).toContainEqual({ type: "tag", text: "@summary" });
});

test("highlights @selector but not the removed @class tag", () => {
  expect(label("@selector .chosen")).toContainEqual({ type: "tag", text: "@selector" });
  expect(label("@selector .chosen")).toContainEqual({ type: "part", text: ".chosen" });
  expect(label("@class .ignored")).toEqual([]);
});

test("does not highlight a removed record tag", () => {
  expect(label("@layout shell")).toEqual([]);
});

test("highlights a dotted @component name as one qualified record token", () => {
  const toks = label("@component menu.item\n@memberOf menu");
  expect(toks).toContainEqual({ type: "record", text: "menu.item" });
});

test.each(["memberOf", "member"])("highlights @%s names and private keywords", (tag) => {
  expect(label(`@${tag} side-nav-bar private`)).toEqual([
    { type: "tag", text: `@${tag}` },
    { type: "record", text: "side-nav-bar" },
    { type: "keyword", text: "private" },
  ]);
  expect(label(`@${tag} panel`)).toEqual([
    { type: "tag", text: `@${tag}` },
    { type: "record", text: "panel" },
  ]);
  expect(label(`@${tag} panel private-extra`)).not.toContainEqual({
    type: "keyword",
    text: "private",
  });
});

test("does not highlight private in prose or treat @members as @member", () => {
  expect(label("private")).toEqual([]);
  expect(label("@members tab, panel")).toEqual([{ type: "tag", text: "@members" }]);
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

test("highlights @annotations and @ref payload", () => {
  const src = "@annotations\n1. Focus ring\n@ref 1.";
  const toks = label(src);
  expect(toks).toContainEqual({ type: "tag", text: "@annotations" });
  expect(toks).toContainEqual({ type: "tag", text: "@ref" });
  expect(toks).toContainEqual({ type: "ref", text: "1." });
});
