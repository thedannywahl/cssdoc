import { parse as parsePostcss } from "postcss";
import { expect, test } from "vite-plus/test";

import { blockSourceRange, collectDocCommentBlocks } from "../src/blocks.ts";
import { cardinalityFromMatch } from "../src/cardinality.ts";
import { frameCommentLines } from "../src/framing.ts";
import {
  parseDocComment,
  parseStructure,
  recordNameOf,
  splitPartArg,
  stripCommentFraming,
} from "../src/grammar.ts";
import {
  buildCustomMediaDeclarations,
  compileCustomMediaDeclarations,
  CssDocConfiguration,
  CssDocTagDefinition,
  parseCssDocs,
  parseDocComment as parseFullDocComment,
  parseInlineLink,
  parseReference,
  scanInlineTags,
  scanInlineTagsOutsideCode,
  selectExamples,
  structureCustomMediaRefs,
  toJson,
  toMermaid,
  toMermaidVariants,
} from "../src/index.ts";
import { inlineCodeRanges, parseDocComment as parseLiteDocComment } from "../src/lite.ts";
import { ModifierMatcher } from "../src/modifier.ts";
import { safeProseUrl } from "../src/prose-url.ts";
import { projectPrivateLinks } from "../src/prose.ts";
import { scanStructureLine, type StructureBoundaryState } from "../src/structure-boundaries.ts";

test("URL safety handles supplementary characters and rejects control characters", () => {
  expect(safeProseUrl("https://example.com/😀")).toBe(true);
  expect(safeProseUrl("https://example.com/😀\u007F")).toBe(false);
  expect(safeProseUrl("https://example.com/😀\u009F")).toBe(false);
});

test("private-link projection preserves literal labels and protected code", () => {
  const text = [
    String.raw`😀 {@link private-record | *Label*\|safe\}} and {@link private-record}`,
    '{@link public-record} {@link unknown} {@link url("https://example.com") | External}',
    "`{@link private-record}`",
    "```css",
    "{@link private-record}",
    "```",
  ].join("\n\n");
  const projection = projectPrivateLinks(text, "markdown", (reference) =>
    reference.name === "private-record"
      ? "private"
      : reference.name === "public-record"
        ? "public"
        : "unavailable",
  );
  expect(projection.unavailable).toBe(true);
  expect(projection.fragments.filter((fragment) => fragment.kind === "literal")).toEqual([
    { kind: "literal", text: "*Label*|safe}" },
    { kind: "literal", text: "reference" },
  ]);
  expect(
    projection.fragments
      .filter((fragment) => fragment.kind === "prose")
      .map((f) => f.text)
      .join(""),
  ).toContain("`{@link private-record}`");
  expect(
    projection.fragments
      .filter((fragment) => fragment.kind === "prose")
      .map((f) => f.text)
      .join(""),
  ).toContain("```css\n\n{@link private-record}\n\n```");
  expect(text).toContain("{@link private-record |");
});

test("full and lite share prose spans while respecting mode precedence", () => {
  const raw = [
    "/**",
    " * @component button",
    " * @remarks usage - 😀 **important**",
    " * @remarks - ordinary text",
    " * @example docs -",
    " * ```css",
    " * @component hidden",
    " * ```",
    " */",
  ].join("\r\n");
  const config = new CssDocConfiguration();
  config.setProseSettings({
    mode: "auto",
    tags: { "@remarks": "plain" },
    remarkKinds: { usage: "markdown" },
  });
  const full = parseFullDocComment(raw, config);
  const lite = parseLiteDocComment(raw, config);
  expect(full.prose.map((body) => body.mode)).toEqual(["markdown", "plain", "markdown"]);
  expect(lite.prose.map((body) => body.mode)).toEqual(["plain", "plain", "plain"]);
  expect(full.prose.map(({ span }) => span)).toEqual(lite.prose.map(({ span }) => span));
  expect(raw.slice(full.prose[0].span.start, full.prose[0].span.end)).toBe("😀 **important**");
  expect(full.examples).toEqual(["```css\r\n@component hidden\r\n```"]);
  expect(full.prose[2].text).toBe(full.examples[0]);
  expect(full.blocks.map((block) => block.text)).toEqual(lite.blocks.map((block) => block.text));
});

test("auto ignores recognized inline metadata but detects real Markdown", () => {
  const config = new CssDocConfiguration();
  config.setProseSettings({ mode: "auto" });
  const parsed = parseFullDocComment(
    [
      "@remarks - {@link button | **plain label**}",
      "@remarks - ordinary text",
      "@remarks - **strong**",
      "@remarks - one",
      "",
      "two",
    ].join("\n"),
    config,
  );
  expect(parsed.prose.map((body) => body.mode)).toEqual(["plain", "plain", "markdown", "markdown"]);
});

test("auto detects resolved reference and image-reference Markdown", () => {
  const config = new CssDocConfiguration();
  config.setProseSettings({ mode: "auto" });
  const resolvedLink = parseFullDocComment(
    "@remarks - [Guide][ref]\n\n[ref]: https://example.test/guide",
    config,
  );
  const missingLink = parseFullDocComment("@remarks - [Guide][missing]", config);
  const resolvedImage = parseFullDocComment(
    "@remarks - ![Guide][image]\n\n[image]: https://example.test/image.png",
    config,
  );
  const missingImage = parseFullDocComment("@remarks - ![Guide][missing]", config);
  expect(resolvedLink.prose[0].mode).toBe("markdown");
  expect(missingLink.prose[0].mode).toBe("plain");
  expect(resolvedImage.prose[0].mode).toBe("markdown");
  expect(missingImage.prose[0].mode).toBe("plain");
});

test("inline scanner preserves UTF-16 ranges, escapes, nested targets, and incomplete tags", () => {
  const text = String.raw`😀 \{@link escaped} \\{@link source("a|b.css")::component:x | one\} two} {@link unfinished`;
  const tags = scanInlineTags(text);
  expect(tags.map((tag) => text.slice(tag.start, tag.end))).toEqual([
    String.raw`{@link source("a|b.css")::component:x | one\} two}`,
    "{@link unfinished",
  ]);
  expect(tags.map((tag) => tag.closed)).toEqual([true, false]);
  expect(tags.map((tag) => text.slice(tag.start + 1, tag.nameEnd))).toEqual(["@link", "@link"]);
});

test("inline scanner uses the active vocabulary and skips disabled tags", () => {
  const configuration = new CssDocConfiguration();
  configuration.addTagDefinition(
    new CssDocTagDefinition({ tagName: "custom", syntaxKind: "inline", aliasFor: "link" }),
  );
  configuration.setSupportForTag(configuration.tryGetTagDefinition("link")!, false);
  expect(
    scanInlineTags("{@link disabled} {@custom value} {@unknown value}", configuration),
  ).toEqual([{ start: 17, end: 32, nameEnd: 25, tag: "link", closed: true }]);
});

test("inline link labels treat quotes and brackets as plain text", () => {
  const text = '{@link source("a|b.css")::component:x | An "open [label} {@link next}';
  const tags = scanInlineTags(text);
  expect(tags.map((tag) => text.slice(tag.start, tag.end))).toEqual([
    '{@link source("a|b.css")::component:x | An "open [label}',
    "{@link next}",
  ]);
  expect(tags.every((tag) => tag.closed)).toBe(true);
});

test("inline links decode labels and JSON-quoted external URLs", () => {
  const text = String.raw`{@link source("a|b.css")::component:x | One\|two\} \\ three} {@link url("https://example.test/a?x=1") | Website}`;
  const [reference, url] = scanInlineTags(text);
  expect(parseInlineLink(text, reference)).toEqual({
    ok: true,
    target: { kind: "reference", value: 'source("a|b.css")::component:x' },
    label: String.raw`One|two} \ three`,
  });
  expect(parseInlineLink(text, url)).toEqual({
    ok: true,
    target: { kind: "url", value: "https://example.test/a?x=1" },
    label: "Website",
  });
});

test("inline links keep delimiters inside single-quoted CSS selector strings", () => {
  const text = "{@link component:card#part(:has(') | }')) | Label} {@link next}";
  const [first, second] = scanInlineTags(text);
  expect(parseInlineLink(text, first)).toEqual({
    ok: true,
    target: { kind: "reference", value: "component:card#part(:has(') | }'))" },
    label: "Label",
  });
  expect(text.slice(second.start, second.end)).toBe("{@link next}");
});

test("inline target comments can't terminate nested reference syntax", () => {
  const text = "{@link component:card#part(:is(.x /* ) | } */)) | Label}";
  const [tag] = scanInlineTags(text);
  expect(parseInlineLink(text, tag)).toMatchObject({
    ok: true,
    target: { value: "component:card#part(:is(.x /* ) | } */))" },
    label: "Label",
  });
});

test("reference grammar retains scoped identities and nested member subjects", () => {
  expect(parseReference("button")).toEqual({
    ok: true,
    reference: { scope: { kind: "workspace" }, name: "button" },
  });
  expect(parseReference(String.raw`source("src/forms \"legacy\".css")::component:button`)).toEqual({
    ok: true,
    reference: {
      scope: { kind: "source", sourceKey: 'src/forms "legacy".css' },
      kind: "component",
      name: "button",
    },
  });
  expect(
    parseReference(
      `provider(ui, "src/forms.css")::component:button#part(:is([data-x=')'], .icon))`,
    ),
  ).toEqual({
    ok: true,
    reference: {
      scope: { kind: "provider", providerId: "ui", sourceKey: "src/forms.css" },
      kind: "component",
      name: "button",
      member: { kind: "part", subject: ":is([data-x=')'], .icon)" },
    },
  });
  expect(parseReference("component:button#slot()")).toMatchObject({
    ok: true,
    reference: { member: { kind: "slot", subject: "" } },
  });
  expect(parseReference(String.raw`button#part( .name\ )`)).toMatchObject({
    ok: true,
    reference: { member: { kind: "part", subject: String.raw` .name\ ` } },
  });
});

test.each([
  ['source("/etc/passwd")::component:x', "invalid-source-key"],
  ['source("C:/tmp/file.css")::component:x', "invalid-source-key"],
  ['source("src/../file.css")::component:x', "invalid-source-key"],
  ['source("src//file.css")::component:x', "invalid-source-key"],
  [String.raw`source("src/\\\\file.css")::component:x`, "invalid-source-key"],
  [String.raw`source("src/\u000a.css")::component:x`, "invalid-source-key"],
  ['provider(UI, "src/x.css")::component:x', "invalid-provider-id"],
  ['provider(ui, "src/x.css")::x', "invalid-reference"],
  ["component:button#part(:is(.x)", "invalid-reference"],
  ["component:button#part()", "invalid-reference"],
  ["component:button#unknown(x)", "invalid-reference"],
] as const)("rejects invalid structured reference %s", (text, error) => {
  expect(parseReference(text)).toEqual({ ok: false, error });
});

test("inline scanning respects protected ranges and maps label offsets", () => {
  const text = "😀 `{@link hidden}` {@link visible | Label}";
  const start = text.indexOf("`");
  const end = text.indexOf("`", start + 1) + 1;
  const [tag] = scanInlineTagsOutsideCode(text, [{ start, end }]);
  expect(text.slice(tag.start, tag.end)).toBe("{@link visible | Label}");
  expect(text[tag.separator!]).toBe("|");
  expect(parseInlineLink(text, tag)).toEqual({
    ok: true,
    target: { kind: "reference", value: "visible" },
    label: "Label",
  });
  expect(() => scanInlineTagsOutsideCode(text, [{ start: end, end: start }])).toThrow(RangeError);
});

test.each([
  ["{@link}", "missing-target"],
  ["{@link button | }", "invalid-label"],
  [String.raw`{@link button | bad\n}`, "invalid-label"],
  ['{@link url("javascript:alert(1)")}', "invalid-url"],
  ['{@link url("/relative")}', "invalid-url"],
  ['{@link url("//example.test")}', "invalid-url"],
  [String.raw`{@link url("https://example.test/\u000a")}`, "invalid-url"],
  ["{@link url(123)}", "invalid-url"],
  ["{@link unfinished", "incomplete"],
] as const)("inline links report invalid input: %s", (text, error) => {
  const [tag] = scanInlineTags(text);
  expect(parseInlineLink(text, tag)).toEqual({ ok: false, error });
});

test("usage and remarks identify the effective prose occurrence without matching text", () => {
  const raw = `/** @component button
 * @remarks usage - **same**
 * @remarks note - **same**
 * @remarks todo - Private.
 * @usage - First.
 * @usage - Second.
 */`;
  const config = new CssDocConfiguration();
  config.setProseSettings({
    mode: "plain",
    remarkKinds: { usage: "markdown" },
    tags: { usage: "markdown" },
  });
  const full = parseFullDocComment(raw, config);
  const lite = parseLiteDocComment(raw, config);
  expect(full.remarks).toBe("**same**");
  expect(full.usage).toBe("Second.");
  expect(full.prose.map((body) => body.field)).toEqual([
    undefined,
    "remarks",
    undefined,
    undefined,
    "usage",
  ]);
  expect(full.prose.map((body) => body.field)).toEqual(lite.prose.map((body) => body.field));
  expect(full.prose.find((body) => body.field === "remarks")?.mode).toBe("plain");
  expect(full.prose.find((body) => body.field === "usage")?.mode).toBe("markdown");

  const legacy = parseFullDocComment(`${raw.slice(0, -2)} * @usage Legacy.\n */`, config);
  expect(legacy.usage).toBe("Legacy.");
  expect(legacy.prose.some((body) => body.field === "usage")).toBe(false);
});

test("mode settings resolve aliases and clear inherited overrides", () => {
  const config = new CssDocConfiguration();
  config.addTagDefinition(
    new CssDocTagDefinition({ tagName: "@custom-alias", syntaxKind: "block", aliasFor: "custom" }),
  );
  config.setProseSettings({
    mode: "plain",
    tags: { "@name": "auto", "@custom-alias": "markdown" },
    remarkKinds: { usage: "auto" },
  });
  expect(config.proseModeFor("component")).toBe("auto");
  expect(parseFullDocComment("@custom-alias - **test**", config).prose[0].mode).toBe("markdown");
  config.setProseSettings({ tags: { component: null }, remarkKinds: null });
  expect(config.proseModeFor("name")).toBe("plain");
  expect(config.proseModeFor("remarks", "usage")).toBe("plain");
  expect(() => config.setProseSettings({ tags: { "@not-registered": "plain" } })).toThrow(
    "Unknown prose block tag",
  );
});

test.each(["plain", "markdown", "auto"] as const)(
  "unclosed fenced examples retain ownership and spans in %s mode",
  (mode) => {
    const raw = [
      "/**",
      " * @component card",
      " * @example docs -",
      " * ```css",
      " * 😀 @remarks - example content",
      " * {@link missing}",
      " */",
    ].join("\r\n");
    const configuration = new CssDocConfiguration();
    configuration.setProseSettings({ mode });
    const full = parseFullDocComment(raw, configuration);
    const lite = parseLiteDocComment(raw, configuration);
    expect(full.blocks.map((block) => block.text)).toEqual(lite.blocks.map((block) => block.text));
    expect(full.blocks).toHaveLength(2);
    expect(full.examples).toEqual(["```css\r\n😀 @remarks - example content\r\n{@link missing}"]);
    expect(full.exampleSpans).toEqual(lite.exampleSpans);
    const span = full.exampleSpans![0];
    expect(raw.slice(span.start, span.end)).toBe(
      "```css\r\n * 😀 @remarks - example content\r\n * {@link missing}",
    );
    expect(full.prose[0].span).toEqual(span);
    expect(lite.prose[0].span).toEqual(span);
  },
);

test.each(["plain", "markdown", "auto"] as const)(
  "nested CSS scopes and following documentation scopes retain boundaries in %s mode",
  (mode) => {
    const raw = [
      "/**",
      " * @component card",
      " * @structure - Overview.",
      " * @scope (.card) {",
      " *   .card { .label {} }",
      " * }",
      " * @scope (.card) - Documents the CSS scope.",
      " */",
    ].join("\r\n");
    const configuration = new CssDocConfiguration();
    configuration.setProseSettings({ mode });
    const full = parseFullDocComment(raw, configuration, parsePostcss);
    const lite = parseLiteDocComment(raw, configuration, parsePostcss);
    expect(full.blocks.map((block) => raw.slice(block.start, block.end))).toEqual([
      "@component card",
      "@structure - Overview.\r\n * @scope (.card) {\r\n *   .card { .label {} }\r\n * }",
      "@scope (.card) - Documents the CSS scope.",
    ]);
    expect(full.blocks).toEqual(lite.blocks);
    expect(full.prose.map((body) => body.span)).toEqual(lite.prose.map((body) => body.span));
  },
);

test("comment framing preserves source ranges through CRLF and non-BMP text", () => {
  const raw = "/**\r\n * @remarks - 😀 First\r\n *   second\r\n *\r\n */";
  const lines = frameCommentLines(raw, "framed");
  expect(lines.map((line) => line.text)).toEqual([
    "\r",
    "@remarks - 😀 First\r",
    "  second\r",
    "\r",
    " ",
  ]);
  for (const line of lines) {
    expect(raw.slice(line.start, line.end)).toBe(line.text);
  }
  const remark = lines[1];
  expect(remark.start).toBe(raw.indexOf("@remarks"));
  expect(
    raw.slice(
      remark.start + remark.text.indexOf("😀"),
      remark.start + remark.text.indexOf("😀") + 2,
    ),
  ).toBe("😀");
  expect(stripCommentFraming(raw)).toBe("@remarks - 😀 First\r\n  second");
});

test("tag block ranges map multiline framed text back to UTF-16 source offsets", () => {
  const raw = [
    "/**",
    " * @component button",
    " * @summary 😀 First",
    " *   second",
    " * @example",
    " *   content",
    " */",
  ].join("\r\n");
  const blocks = collectDocCommentBlocks(raw, new CssDocConfiguration());
  expect(blocks.map((block) => raw.slice(block.start, block.end))).toEqual([
    "@component button",
    "@summary 😀 First\r\n *   second",
    "@example\r\n *   content",
  ]);
  expect(blocks.map((block) => block.text)).toEqual([
    "@component button\r",
    "@summary 😀 First\r\n  second\r",
    "@example\r\n  content",
  ]);
});

test("block text ranges map through CRLF framing and UTF-16 characters", () => {
  const raw = "/**\r\n * @remarks 😀 first\r\n *   second\r\n */";
  const [block] = collectDocCommentBlocks(raw, new CssDocConfiguration());
  for (const segment of block.segments) {
    expect(raw.slice(segment.sourceStart, segment.sourceStart + segment.length)).toBe(
      block.text.slice(segment.textStart, segment.textStart + segment.length),
    );
  }
  const emoji = block.text.indexOf("😀");
  const second = block.text.indexOf("second");
  const newline = block.text.indexOf("\r\n");
  const lineBreak = blockSourceRange(block, newline, newline + 2);
  expect(raw.slice(lineBreak.start, lineBreak.end)).toBe("\r\n");
  const span = blockSourceRange(block, emoji, second + "second".length);
  expect(raw.slice(span.start, span.end)).toBe("😀 first\r\n *   second");
  const nextLine = blockSourceRange(block, second, second + "second".length);
  expect(raw.slice(nextLine.start, nextLine.end)).toBe("second");
  expect(blockSourceRange(block, second, second)).toEqual({
    start: raw.indexOf("second"),
    end: raw.indexOf("second"),
  });
  expect(() => blockSourceRange(block, -1, 0)).toThrow(RangeError);
  expect(() => blockSourceRange(block, 0, block.text.length + 1)).toThrow(RangeError);
});

test("CR-only comment lines retain tag boundaries and exact UTF-16 source mappings", () => {
  const raw = [
    "/**",
    " * @example -",
    " * ```css",
    " * 😀 @component hidden",
    " * ```",
    " * @component actual",
    " */",
  ].join("\r");
  const blocks = collectDocCommentBlocks(raw);
  expect(blocks.map((block) => raw.slice(block.start, block.end))).toEqual([
    "@example -\r * ```css\r * 😀 @component hidden\r * ```",
    "@component actual",
  ]);
  expect(blocks[0].text).toBe("@example -\r```css\r😀 @component hidden\r```");
  for (const block of blocks) {
    for (const segment of block.segments) {
      expect(raw.slice(segment.sourceStart, segment.sourceStart + segment.length)).toBe(
        block.text.slice(segment.textStart, segment.textStart + segment.length),
      );
    }
  }
  const start = blocks[0].text.indexOf("😀");
  const end = blocks[0].text.indexOf("@component") + "@component".length;
  const range = blockSourceRange(blocks[0], start, end);
  expect(raw.slice(range.start, range.end)).toBe("😀 @component");
  const acrossLines = blockSourceRange(blocks[0], start, blocks[0].text.length);
  expect(raw.slice(acrossLines.start, acrossLines.end)).toBe("😀 @component hidden\r * ```");
  expect(recordNameOf(raw)).toBe("actual");
});

test("CR-only prose and labeled examples parse across lines", () => {
  const raw = "/**\r * @remarks First\r *   second\r * @example labels=[docs]\r * Example\r */";
  const parsed = parseDocComment(raw);
  expect(stripCommentFraming(raw)).toBe(
    "@remarks First\r  second\r@example labels=[docs]\rExample",
  );
  expect(parsed.remarks).toBe("First second");
  expect(parsed.exampleLabels).toEqual({ 0: ["docs"] });
  expect(parsed.examples).toEqual(["Example"]);
});

test("full and lite expose the same authored blocks and UTF-16 ranges", () => {
  const raw = [
    "/**",
    " * @component card",
    " * @example docs, demo {@private} -",
    " * ```css",
    " * 😀 @component example",
    " * @remarks - code",
    " * ```",
    " * @unknown - preserved",
    " */",
  ].join("\r\n");
  const config = new CssDocConfiguration();
  const enabled = parseLiteDocComment(raw, config).blocks;
  config.setSupportForTag(config.tryGetTagDefinition("example")!, false);
  const lite = parseLiteDocComment(raw, config).blocks;
  const full = parseFullDocComment(raw, config).blocks;

  expect(full).toEqual(lite);
  expect(lite).toEqual(enabled);
  expect(lite.map((block) => raw.slice(block.start, block.end))).toEqual([
    "@component card",
    "@example docs, demo {@private} -\r\n * ```css\r\n * 😀 @component example\r\n * @remarks - code\r\n * ```",
    "@unknown - preserved",
  ]);
  const example = lite[1];
  const start = example.text.indexOf("😀");
  const end = example.text.indexOf("@remarks") + "@remarks".length;
  const span = blockSourceRange(example, start, end);
  expect(raw.slice(span.start, span.end)).toBe("😀 @component example\r\n * @remarks");
});

test("1.0 example bodies, labels, privacy, and spans are shared by lite and full", () => {
  const raw = [
    "/**",
    " * @example docs, demo {@private} -",
    " * 😀 first  ",
    " *   second",
    " *",
    " * @example - Public.",
    " */",
  ].join("\r\n");
  const lite = parseLiteDocComment(raw);
  const full = parseFullDocComment(raw);
  expect(lite.examples).toEqual(["😀 first  \r\n  second\r\n", "Public."]);
  expect(lite.exampleLabels).toEqual({ 0: ["docs", "demo"] });
  expect(lite.privateExamples).toEqual([0]);
  expect(full.examples).toEqual(lite.examples);
  expect(full.exampleSpans).toEqual(lite.exampleSpans);
  expect(full.privateExamples).toEqual(lite.privateExamples);
  const span = lite.exampleSpans![0];
  expect(raw.slice(span.start, span.end)).toBe("😀 first  \r\n *   second\r\n");
});

test.each(["Docs", "docs_demo", "-docs", "docs-", "docs--demo"])(
  "example headers don't accept the invalid label %s",
  (label) => {
    const raw = `/** @example ${label} - Example. */`;
    expect(parseLiteDocComment(raw).exampleLabels).toBeUndefined();
    expect(parseFullDocComment(raw).exampleLabels).toBeUndefined();
  },
);

test("private example metadata is scoped to the header, including malformed headers", () => {
  const [entry] = parseCssDocs(`/** @component card
 * @example docs, {@private} - malformed but private
 * @example - {@private} is prose here
 * @example {@private} - hidden
 */
.card {}`);
  expect(entry.privateExamples).toEqual([0, 2]);
  expect(selectExamples(entry)).toEqual(["{@private} is prose here"]);
  expect(selectExamples(entry, { labels: [] })).toEqual(["{@private} is prose here"]);
  expect(toJson([entry])).not.toContain("malformed but private");
  expect(toJson([entry])).not.toContain("hidden");
  expect(toJson([entry], { includePrivate: true })).toContain("hidden");
});

test.each(["\n", "\r\n", "\r"])(
  "empty and inline example bodies retain accurate ranges with %j endings",
  (ending) => {
    const raw = ["/**", " * @example -", " * @example demo - inline  ", " */"].join(ending);
    const doc = parseLiteDocComment(raw);
    expect(doc.examples).toEqual(["", "inline  "]);
    for (const [index, body] of doc.examples.entries()) {
      const span = doc.exampleSpans![index];
      expect(raw.slice(span.start, span.end)).toBe(body);
    }
  },
);

test("block collection preserves header whitespace before a continuation", () => {
  const raw = "/**\r\n * @remarks - First  \r\n *   second\r\n */";
  const [block] = collectDocCommentBlocks(raw, new CssDocConfiguration());
  expect(block.text).toBe("@remarks - First  \r\n  second");
  const start = block.text.indexOf("First");
  const end = block.text.indexOf("second");
  const range = blockSourceRange(block, start, end);
  expect(raw.slice(range.start, range.end)).toBe("First  \r\n *   ");
});

test("block text preserves authored trailing whitespace and blank example lines", () => {
  const raw = ["/**", " * @example -", " * ```", " * example  ", " * ```", " *", " *", " */"].join(
    "\r\n",
  );
  const [block] = collectDocCommentBlocks(raw);
  expect(block.text).toBe("@example -\r\n```\r\nexample  \r\n```\r\n\r\n");
  const start = block.text.indexOf("example  ");
  const range = blockSourceRange(block, start, block.text.length);
  expect(raw.slice(range.start, range.end)).toBe("example  \r\n * ```\r\n *\r\n");
});

test("unframed and inline comments retain trailing spaces and line endings", () => {
  const body = "@example - example  \r\n\r\n";
  const [unframed] = collectDocCommentBlocks(body);
  expect(unframed.text).toBe(body);
  const range = blockSourceRange(unframed, 0, unframed.text.length);
  expect(body.slice(range.start, range.end)).toBe(body);
  expect(collectDocCommentBlocks("/** @example - example  */")[0]?.text).toBe(
    "@example - example  ",
  );
  const incomplete = "/**\n * @example -\n * ```\n * @component hidden  \n *\n";
  const [block] = collectDocCommentBlocks(incomplete);
  expect(block.text).toBe("@example -\n```\n@component hidden  \n\n");
  expect(recordNameOf(incomplete)).toBeUndefined();
});

test("a blank list continuation doesn't hide a following tag as indented code", () => {
  const raw = "/**\n * @remarks -\n * - item\n *\n *     @component actual\n */";
  expect(recordNameOf(raw)).toBe("actual");
  expect(collectDocCommentBlocks(raw).map((block) => raw.slice(block.start, block.end))).toEqual([
    "@remarks -\n * - item",
    "@component actual",
  ]);
});

test("structure lexical state ignores braces in selectors, strings, escapes, and comments", () => {
  const state: StructureBoundaryState = { stack: [], comment: false, escaped: false };
  expect(scanStructureLine('.card[data-x="}"] {', state)).toBe(true);
  expect(scanStructureLine('  content: "}"; /* { */', state)).toBe(false);
  expect(scanStructureLine(String.raw`  .escaped\{name {`, state)).toBe(false);
  expect(state.stack).toEqual(["{", "{"]);
  scanStructureLine("  }", state);
  scanStructureLine("}", state);
  expect(state.stack).toEqual([]);
});

test("structure lexical state preserves escaped CRLF inside a CSS string", () => {
  const state: StructureBoundaryState = { stack: [], comment: false, escaped: false };
  scanStructureLine('.card { content: "a\\\r', state);
  scanStructureLine('}b";', state);
  expect(state.stack).toEqual(["{"]);
  scanStructureLine("}", state);
  expect(state.stack).toEqual([]);
});

test("nested structure at-rules remain inside the structure regardless of indentation", () => {
  const raw = [
    "/**",
    " * @component card",
    " * @structure",
    " * .card[data-text='}'] {",
    " * @component child {}",
    " * }",
    " * @summary Card.",
    " */",
  ].join("\n");
  const blocks = collectDocCommentBlocks(raw, new CssDocConfiguration());
  expect(blocks.map((block) => block.text)).toEqual([
    "@component card",
    "@structure\n.card[data-text='}'] {\n@component child {}\n}",
    "@summary Card.",
  ]);
  expect(raw.slice(blocks[1].start, blocks[1].end)).toBe(
    "@structure\n * .card[data-text='}'] {\n * @component child {}\n * }",
  );
  expect(parseDocComment(raw, undefined, parsePostcss).component).toBe("card");
});

test("unfinished punctuation in a structure description does not hide the next tag", () => {
  const raw = "/**\n * @structure An unfinished note (\n * @summary Card.\n */";
  expect(parseDocComment(raw).summary).toBe("Card.");
});

test("top-level documentation dividers end structures without splitting nested CSS at-rules", () => {
  const raw = [
    "/**",
    " * @structure",
    ' * @scope ([data-label=" - "]) {',
    " *   .card { .label {} }",
    " * }",
    " * @scope (.card) - Documents the CSS scope.",
    " * @summary - Summary.",
    " */",
  ].join("\r\n");
  const blocks = collectDocCommentBlocks(raw, new CssDocConfiguration());
  expect(blocks.map((block) => raw.slice(block.start, block.end))).toEqual([
    '@structure\r\n * @scope ([data-label=" - "]) {\r\n *   .card { .label {} }\r\n * }',
    "@scope (.card) - Documents the CSS scope.",
    "@summary - Summary.",
  ]);
});

test("a top-level divider in a nested CSS construct does not split a structure", () => {
  const raw = [
    "/**",
    " * @structure",
    " * .card {",
    " * @media (width > 20px) {",
    " * @unknown - Still nested.",
    " * }",
    " * }",
    " * @custom {@private} — Documented.",
    " */",
  ].join("\n");
  const blocks = collectDocCommentBlocks(raw, new CssDocConfiguration());
  expect(blocks).toHaveLength(2);
  expect(blocks[0]?.text).toContain("@unknown - Still nested.");
  expect(blocks[1]?.text).toBe("@custom {@private} — Documented.");
});

test("top-level CSS at-rules with doc-tag names remain part of the structure", () => {
  const raw = [
    "/**",
    " * @structure",
    " * @media (width > 30rem) {",
    " *   .card {}",
    " * }",
    ' * @media (selector([data-text="{@private}"])) {@supports (display: grid) {.card {}}}',
    " * @component child {}",
    " * @component next {@private}",
    " */",
  ].join("\n");
  const blocks = collectDocCommentBlocks(raw, new CssDocConfiguration());
  expect(blocks).toHaveLength(2);
  expect(blocks[0]?.text).toContain("@media (width > 30rem) {");
  expect(blocks[0]?.text).toContain('@media (selector([data-text="{@private}"]))');
  expect(blocks[0]?.text).toContain("@component child {}");
  expect(blocks[1]?.text).toBe("@component next {@private}");
});

test("multiline top-level CSS at-rules stay inside structure before documentation tags", () => {
  const raw = [
    "/**",
    " * @structure",
    " * @media (",
    " *   min-width: 20rem",
    " * )",
    " * {",
    " *   .card { .label {} }",
    " * }",
    " * @media (min-width: 20rem) - Documents the condition.",
    " * @component actual",
    " */",
  ].join("\r\n");
  const blocks = collectDocCommentBlocks(raw);
  expect(blocks.map((block) => raw.slice(block.start, block.end))).toEqual([
    "@structure\r\n * @media (\r\n *   min-width: 20rem\r\n * )\r\n * {\r\n *   .card { .label {} }\r\n * }",
    "@media (min-width: 20rem) - Documents the condition.",
    "@component actual",
  ]);
  expect(recordNameOf(raw)).toBe("actual");
});

test("nested structure parentheses retain tag-shaped lines without swallowing later tags", () => {
  const raw = [
    "/**",
    " * @structure",
    " * @media (",
    " * @component incomplete-css",
    " * ) { .card {} }",
    " * @component actual",
    " */",
  ].join("\n");
  const blocks = collectDocCommentBlocks(raw);
  expect(blocks).toHaveLength(2);
  expect(blocks[0]?.text).toContain("@component incomplete-css");
  expect(blocks[1]?.text).toBe("@component actual");
  expect(recordNameOf(raw)).toBe("actual");
});

test("a documentation at-rule without a CSS block doesn't swallow the next tag", () => {
  const raw = "/**\n * @structure\n * @media (min-width: 20rem)\n * @component actual\n */";
  expect(collectDocCommentBlocks(raw).map((block) => block.text)).toEqual([
    "@structure",
    "@media (min-width: 20rem)",
    "@component actual",
  ]);
});

test("fences protect tag boundaries and record discovery until a matching closer", () => {
  const raw = [
    "/**",
    " * @example - ````css",
    " * @component false-record",
    " * ```",
    " * @remarks - Still code.",
    " * ````",
    " * @component real-record",
    " */",
  ].join("\r\n");
  const blocks = collectDocCommentBlocks(raw, new CssDocConfiguration());
  expect(blocks).toHaveLength(2);
  expect(raw.slice(blocks[0].start, blocks[0].end)).toContain("@remarks - Still code.");
  expect(raw.slice(blocks[1].start, blocks[1].end)).toBe("@component real-record");
  expect(recordNameOf(raw)).toBe("real-record");
});

test("unclosed nested fences protect all remaining tag-shaped lines", () => {
  const raw = [
    "/**",
    " * @example -",
    " * > - ~~~css",
    " * >   @remarks - Code.",
    " * @component not-a-record",
    " * }",
    " */",
  ].join("\n");
  const blocks = collectDocCommentBlocks(raw, new CssDocConfiguration());
  expect(blocks).toHaveLength(1);
  expect(blocks[0]?.text).toContain("@component not-a-record");
  expect(recordNameOf(raw)).toBeUndefined();
});

test("nested fenced and indented code retain their boundaries", () => {
  const raw = [
    "/**",
    " * @remarks -",
    " * > - ```",
    " * >   @component example",
    " * >   ```",
    " *",
    " *     @component indented",
    " *",
    " * @component actual",
    " */",
  ].join("\n");
  const blocks = collectDocCommentBlocks(raw, new CssDocConfiguration());
  expect(blocks).toHaveLength(2);
  expect(blocks[0]?.text).toContain("@component indented");
  expect(recordNameOf(raw)).toBe("actual");
});

test("headings and lazy blockquote continuations classify indented tag lines correctly", () => {
  const raw = [
    "/**",
    " * @remarks - # Heading",
    " *     @component example",
    " *",
    " * @remarks - > Paragraph",
    " *     @component actual",
    " */",
  ].join("\r\n");
  const blocks = collectDocCommentBlocks(raw, new CssDocConfiguration());
  expect(blocks.map((block) => raw.slice(block.start, block.end))).toEqual([
    "@remarks - # Heading\r\n *     @component example",
    "@remarks - > Paragraph",
    "@component actual",
  ]);
  expect(recordNameOf(raw)).toBe("actual");
});

test("invalid backtick info strings do not open fenced code", () => {
  const raw = "/**\n * @example -\n * ```bad`info\n * @component real\n */";
  expect(recordNameOf(raw)).toBe("real");
});

test("escaped fenced examples keep later tags inside their block and lite/full agree", () => {
  const raw = [
    "/**",
    " * @component card",
    " * @example docs -",
    " * \\`\\`\\`html",
    " * @remarks - escaped fence content",
    " * \\`\\`\\`",
    " * @component phantom",
    " */",
  ].join("\n");
  const configuration = new CssDocConfiguration();
  const full = parseFullDocComment(raw, configuration);
  const lite = parseLiteDocComment(raw, configuration);
  expect(full.blocks.map((block) => block.text)).toEqual(lite.blocks.map((block) => block.text));
  expect(full.examples[0]).toContain("@remarks - escaped fence content");
  expect(full.examples[0]).not.toContain("@component phantom");
  expect(recordNameOf(raw)).toBe("card");
});

test("closed inline backticks do not swallow later tag-shaped lines", () => {
  const raw = [
    "/**",
    " * @component card",
    " * @remarks - Use `@component phantom` literally.",
    " * @summary Still outside code.",
    " */",
  ].join("\n");
  const blocks = collectDocCommentBlocks(raw);
  expect(blocks.map((block) => block.text)).toEqual([
    "@component card",
    "@remarks - Use `@component phantom` literally.",
    "@summary Still outside code.",
  ]);
  expect(recordNameOf(raw)).toBe("card");
});

test("unmatched inline backticks do not own or swallow later tag-shaped lines", () => {
  const raw = [
    "/**",
    " * @component card",
    " * @remarks - Use `unfinished literal",
    " * @summary Still outside code.",
    " */",
  ].join("\n");
  const blocks = collectDocCommentBlocks(raw);
  expect(blocks.map((block) => block.text)).toEqual([
    "@component card",
    "@remarks - Use `unfinished literal",
    "@summary Still outside code.",
  ]);
  expect(recordNameOf(raw)).toBe("card");
});

test("inline code ranges leave unmatched backticks unowned", () => {
  expect(inlineCodeRanges("Use `closed`")).toEqual([{ start: 4, end: 12 }]);
  expect(inlineCodeRanges("Use `unfinished")).toEqual([]);
});

test("collected block headers carry shared argument and prose ranges", () => {
  const raw = "/**\n * @modifier .button--busy {interaction} - Indicates ongoing work.\n */";
  const [block] = collectDocCommentBlocks(raw);
  expect(block.text.slice(block.header!.argumentStart, block.header!.argumentEnd)).toBe(
    ".button--busy {interaction} ",
  );
  expect(block.text.slice(block.header!.dividerStart, block.header!.dividerEnd)).toBe("-");
  expect(block.text.slice(block.header!.proseStart)).toBe("Indicates ongoing work.");
});

test("a partially consumed tab can close a fence in a list", () => {
  const raw = [
    "/**",
    " * @example -",
    " * - ~~~",
    " * \t@component example",
    " * \t~~~",
    " * @component actual",
    " */",
  ].join("\n");
  const blocks = collectDocCommentBlocks(raw, new CssDocConfiguration());
  expect(blocks).toHaveLength(2);
  expect(raw.slice(blocks[1].start, blocks[1].end)).toBe("@component actual");
  expect(recordNameOf(raw)).toBe("actual");
});

test("record boundaries ignore record-shaped text in prose and nested structure", () => {
  const raw = [
    "/**",
    " * @remarks This mentions @component fake.",
    " * @structure",
    " * .card {",
    " * @component child {}",
    " * }",
    " */",
  ].join("\n");
  expect(recordNameOf(raw)).toBeUndefined();
  expect(parseCssDocs(`${raw}\n.card {}`).map((entry) => entry.name)).toEqual([]);
  expect(recordNameOf("/**\n * @component actual\n */")).toBe("actual");
});

test("unframed text retains a leading Markdown list marker when framing is disabled", () => {
  const raw = "* First\n  * Second";
  const lines = frameCommentLines(raw, "none");
  expect(lines.map((line) => line.text)).toEqual(["* First", "  * Second"]);
  expect(lines.map((line) => raw.slice(line.start, line.end))).toEqual(["* First", "  * Second"]);
});

test("the parser preserves list markers in framed and unframed examples", () => {
  const body = "@example\n* First\n  * Second";
  expect(parseDocComment(body).examples).toEqual(["* First\n  * Second"]);
  const css = "/**\n * @component list\n * @example\n * * First\n *   * Second\n */\n.list {}";
  expect(parseCssDocs(css)[0]?.examples).toEqual(["* First\n  * Second"]);
});

test("framing removes only one space after a marker and preserves tabs", () => {
  const raw = "/**\n\t*   spaced\n *\ttabbed\n */";
  const lines = frameCommentLines(raw, "framed");
  expect(lines[1]?.text).toBe("  spaced");
  expect(lines[2]?.text).toBe("\ttabbed");
});

test("the parser preserves tabs and CRLF on framed example lines", () => {
  const raw = "/**\r\n * @example\r\n * First\r\n *\tTabbed\r\n *\r\n *  Spaced\r\n */";
  expect(parseDocComment(raw).examples).toEqual(["First\r\n\tTabbed\r\n\r\n Spaced"]);
});

test("the parser reads example labels from CRLF-framed comments", () => {
  const raw = "/**\r\n * @example labels=[docs]\r\n * Example\r\n */";
  const parsed = parseDocComment(raw);
  expect(parsed.exampleLabels).toEqual({ 0: ["docs"] });
  expect(parsed.examples).toEqual(["Example"]);
});

test.each(["/* text */", "/** text */", " text "])(
  "comment delimiters preserve the source range of %s",
  (raw) => {
    const [line] = frameCommentLines(raw, "none");
    expect(line?.text).toBe(" text ");
    expect(raw.slice(line?.start, line?.end)).toBe(" text ");
  },
);

test("a comment terminator before a final newline is not stripped", () => {
  expect(frameCommentLines("text*/\n", "none").map((line) => line.text)).toEqual(["text*/", ""]);
});

test.each(["—", "-", "--"])("parses %s description separators across tag kinds", (separator) => {
  const doc = parseDocComment(`/**
 * @slot action ${separator} Slot description
 * @media (min-width: 20px) ${separator} Media description
 * @part .label ${separator} Part description
 * @modifier -active ${separator} Modifier description
 * @cssproperty --color <color> ${separator} Property description
 * @cssstate [aria-selected] ${separator} State description
 */`);
  expect(doc.slots.get("action")).toBe("Slot description");
  expect(doc.conditions).toContainEqual({
    type: "media",
    query: "(min-width: 20px)",
    description: "Media description",
  });
  expect(doc.parts.get("label")).toBe("Part description");
  expect(doc.modifiers.get("-active")?.description).toBe("Modifier description");
  expect(doc.cssProperties[0]?.description).toBe("Property description");
  expect(doc.cssStates.get("[aria-selected]")).toBe("State description");
});

test("does not split a slot description on three hyphens", () => {
  const doc = parseDocComment("/**\n * @slot action --- not a separator\n */");
  expect(doc.slots.get("action --- not a separator")).toBe("");
});

test("unknown block tags with underscores and digits don't become summary text", () => {
  const doc = parseDocComment(`/**
 * @summary First.
 * @unknown_tag2 Ignored.
 * Also ignored.
 * @remarks Remaining.
 */`);
  expect(doc.summary).toBe("First.");
  expect(doc.remarks).toBe("Remaining.");
});

test("parses quoted selector tokens and permissive custom-property names in tags", () => {
  const doc = parseDocComment(`/**
 * @selector [data-name="a b"].control
 * @cssstate [data-value='a]b'] — State description.
 * @cssproperty --123 <number> — Property description.
 * @function --_helper — Function description.
 */`);
  expect(doc.className).toBe('[data-name="a b"].control');
  expect(doc.cssStates.get("[data-value='a]b']")).toBe("State description.");
  expect(doc.cssProperties[0]).toEqual({
    name: "--123",
    syntax: "<number>",
    description: "Property description.",
  });
  expect(doc.functions.get("--_helper")).toBe("Function description.");
});

test("parses a functional custom-state selector in a cssstate tag", () => {
  const doc = parseDocComment("/**\n * @cssstate :state(open) — Open state.\n */");
  expect(doc.cssStates.get(":state(open)")).toBe("Open state.");
});

test("legacy property prose doesn't shorten a hyphenated custom-property name", () => {
  const doc = parseDocComment("/** @cssproperty --button-color Button color. */");
  expect(doc.cssProperties).toEqual([
    { name: "--button-color", syntax: undefined, description: "Button color." },
  ]);
});

test("part parsing handles a long whitespace run without a description separator", () => {
  const selector = `.part${" ".repeat(100_000)}!`;
  const start = performance.now();
  expect(splitPartArg(selector).selector).toBe(selector);
  expect(performance.now() - start).toBeLessThan(1000);
});

test("parses canonical modifier references and annotation punctuation", () => {
  const doc = parseDocComment(`/**
 * @modifier -old — @deprecated {@link .replacement} Use instead.
 * @modifier -legacy — @alias [aria-selected=true] Preferred.
 * @modifier -marked — - @alias .active Alias note.
 * @modifier -global — @global Shared.
 */`);
  expect(doc.modifiers.get("-old")).toEqual({
    deprecatedCanonical: "replacement",
    deprecated: "Use instead.",
  });
  expect(doc.modifiers.get("-legacy")).toEqual({
    aliasCanonical: "aria-selected=true",
    alias: "Preferred.",
  });
  expect(doc.modifiers.get("-marked")).toEqual({
    aliasCanonical: "active",
    alias: "Alias note.",
  });
  expect(doc.modifiers.get("-global")).toEqual({ global: true, description: "Shared." });
});

test("example labels are metadata only when explicitly declared on the tag line", () => {
  const doc = parseDocComment(`/**
 * @example [docs](./docs)
 * @example labels=[docs, interactive-demo, docs]
 * ### Primary action
 * \\\`\\\`\\\`html
 * <button>Continue</button>
 * \\\`\\\`\\\`
 * @example labels=[docs]
 * Another example.
 * @example
 * labels=[literal]
 * @example labels=[BAD]
 * Kept as authored.
 */`);
  expect(doc.exampleLabels).toEqual({ 1: ["docs", "interactive-demo"], 2: ["docs"] });
  expect(doc.examples).toEqual([
    "[docs](./docs)",
    "### Primary action\n```html\n<button>Continue</button>\n```",
    "Another example.",
    "labels=[literal]",
    "labels=[BAD]\nKept as authored.",
  ]);
});

// A fixture mirroring the real generated output: authored @component doc comments delimit records; the
// modifiers / parts / tokens / deprecations are all things the parser must derive from the CSS itself.
const FIXTURE = `
/* Component styles */

/**
 * @component button
 * @summary The primary action control.
 * @modifier -color-secondary — A lower-emphasis action.
 * @demo self:button
 */
.button {
  background: var(--color-background-interactive-action-primary-base);
}
.button.-color-secondary {
  background: var(--color-background-interactive-action-secondary-base);
}
.button.-size-sm { font-size: 0.75rem; }
.button.-size-small { font-size: 0.75rem; }

/**
 * @component badge
 * @summary A small count or status dot.
 */
.badge-wrapper { position: relative; }
.badge { background: var(--component-badge-color-primary); }
.badge.-color-danger { background: var(--color-background-danger); }
/* @deprecated → use .-color-danger */
.badge.-variant-error { background: var(--color-background-danger); }

/**
 * @component menu
 */
.menu { min-width: 10rem; }
@scope (.menu) {
  :scope > .item { padding: 0.5rem; }
  :scope > .separator { height: 1px; }
}

/**
 * @component progress-circle
 */
@property --value { syntax: "<number>"; inherits: true; initial-value: 0; }
.progress-circle { --value: 0; }
`;

test("splits records on @component and extracts the base class + summary + demo", () => {
  const model = parseCssDocs(FIXTURE);
  const names = model.map((e) => e.name);
  expect(names).toEqual(["button", "badge", "menu", "progress-circle"]);

  const button = model.find((e) => e.name === "button")!;
  expect(button.className).toBe(".button");
  expect(button.summary).toBe("The primary action control.");
  expect(button.demo).toBe("self:button");
});

test("modifiers are AST-extracted, prop/value split, and annotated with @modifier prose (rscss)", () => {
  const button = parseCssDocs(FIXTURE, { modifierConvention: "rscss" }).find(
    (e) => e.name === "button",
  )!;
  const secondary = button.modifiers.find((m) => m.name === "-color-secondary")!;
  expect(secondary.prop).toBe("color");
  expect(secondary.value).toBe("secondary");
  expect(secondary.description).toBe("A lower-emphasis action.");
  // Both the short and long size spellings surface (withSizeAliases twins).
  expect(button.modifiers.map((m) => m.name)).toEqual(
    expect.arrayContaining(["-color-secondary", "-size-sm", "-size-small"]),
  );
});

test("deprecated-alias comment links the alias modifier to its canonical (rscss)", () => {
  const badge = parseCssDocs(FIXTURE, { modifierConvention: "rscss" }).find(
    (e) => e.name === "badge",
  )!;
  // The base class is the one ending in the record name, not the first bare sibling (.badge-wrapper).
  expect(badge.className).toBe(".badge");
  const alias = badge.modifiers.find((m) => m.name === "-variant-error")!;
  expect(alias.deprecated?.canonical).toBe("-color-danger");
});

test("base class resolves under a masked `${p}` prefix, over a wrapper-first bare rule", () => {
  // As the projection emits it: `${p}` is masked to `aaaa`, so the name abuts the prefix with no `-`
  // (`.aaaabadge`). The base class must still be `.aaaabadge`, not the first bare rule `.aaaabadge-wrapper`.
  const src = [
    "/**",
    " * @component badge",
    " * @summary A badge.",
    " */",
    ".aaaabadge-wrapper { position: relative; }",
    ".aaaabadge { background: red; }",
  ].join("\n");
  const [badge] = parseCssDocs(src, { modifierConvention: "rscss" });
  expect(badge.className).toBe(".aaaabadge");
});

test("base class inference accepts an upper-case-led prefix / PascalCase class, not just lowercase", () => {
  // Inference used to require a lowercase-first bare class, so an upper-case namespace (`.PFX-badge`) or
  // a PascalCase class (`.Card`) was skipped and it fell back to the bare `@name` — silently producing a
  // className that no longer matched the CSS (and a wrong prefix for modifier derivation).
  const prefixed = [
    "/**",
    " * @component badge",
    " * @summary A badge.",
    " * @modifier -color-danger — Danger.",
    " */",
    ".PFX-badge { background: gray; }",
    ".PFX-badge.-color-danger { background: red; }",
  ].join("\n");
  const [badge] = parseCssDocs(prefixed, { modifierConvention: "rscss" });
  expect(badge.className).toBe(".PFX-badge");
  // The `PFX-` prefix boundary is honoured, so the chained class is still the `-color-danger` modifier.
  expect(badge.modifiers.map((m) => m.name)).toContain("-color-danger");

  // A single PascalCase class resolves to itself (previously mis-inferred to `.card`).
  const pascal = [
    "/**",
    " * @component card",
    " * @summary A card.",
    " */",
    ".Card { display: block; }",
  ].join("\n");
  const [card] = parseCssDocs(pascal);
  expect(card.className).toBe(".Card");
});

test("@selector sets className to any CSS selector", () => {
  const attr = parseCssDocs(
    [
      "/**",
      " * @component x-banner",
      " * @summary A dismissible banner.",
      ' * @selector [data-slot="action"][aria-disabled="true"]',
      " */",
    ].join("\n"),
  );
  expect(attr[0].className).toBe('[data-slot="action"][aria-disabled="true"]');

  const id = parseCssDocs(
    ["/**", " * @component root", " * @summary Root.", " * @selector #app", " */"].join("\n"),
  );
  expect(id[0].className).toBe("#app");

  const host = parseCssDocs(
    ["/**", " * @component my-button", " * @summary A button.", " * @selector :host", " */"].join(
      "\n",
    ),
  );
  expect(host[0].className).toBe(":host");
});

test("@class is ignored unless registered as a custom tag", () => {
  const css = `/**\n * @component badge\n * @selector #chosen\n * @class .ignored\n */\n.badge { color: red; }`;
  const [entry] = parseCssDocs(css);
  expect(entry.className).toBe("#chosen");
  expect(entry.customBlocks).toBeUndefined();

  const inferred = `/**\n * @component badge\n * @class .ignored\n */\n.badge { color: red; }`;
  expect(parseCssDocs(inferred)[0].className).toBe(".badge");

  const configuration = new CssDocConfiguration();
  configuration.addTagDefinition(
    new CssDocTagDefinition({ tagName: "@class", syntaxKind: "block" }),
  );
  const [custom] = parseCssDocs(css, { configuration });
  expect(custom.className).toBe("#chosen");
  expect(custom.customBlocks).toEqual({ class: [".ignored"] });
});

test("@part derives name from selector type and stores selector on the part when non-class", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component x-banner",
      " * @summary A dismissible banner.",
      ' * @part [data-slot="action"] — The action area.',
      " * @part #dismiss — The dismiss button.",
      " * @part :host — The shadow host.",
      " * @part .content — The message body.",
      ' * @part [data-slot="action"] cta — Aliased.',
      " */",
    ].join("\n"),
  );

  // Attribute selector: derived name is the first attribute key; selector stored on part.
  const attrPart = entry.parts.find((p) => p.name === "data-slot");
  expect(attrPart).toBeDefined();
  expect(attrPart!.selector).toBe('[data-slot="action"]');

  // ID selector: name strips #; selector stored.
  const idPart = entry.parts.find((p) => p.name === "dismiss");
  expect(idPart?.selector).toBe("#dismiss");

  // :host: name is "host"; selector stored.
  const hostPart = entry.parts.find((p) => p.name === "host");
  expect(hostPart?.selector).toBe(":host");

  // Class selector: name strips dot; no selector stored (falls back to .content).
  const classPart = entry.parts.find((p) => p.name === "content");
  expect(classPart?.selector).toBeUndefined();

  // Alias overrides derived name; selector still stored.
  const aliasPart = entry.parts.find((p) => p.name === "cta");
  expect(aliasPart?.selector).toBe('[data-slot="action"]');
  expect(aliasPart?.description).toBe("Aliased.");
});

test("@part with descendant chain: full selector stored, alias or final-compound names the part", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component x-banner",
      ' * @part [class$="-section"] > ._inner > .label poll-label — The poll label.',
      ' * @part [class$="-section"] > ._inner — No alias; name from final compound.',
      " */",
    ].join("\n"),
  );

  // Alias form: full chain stored as selector, alias is the name.
  const aliased = entry.parts.find((p) => p.name === "poll-label");
  expect(aliased).toBeDefined();
  expect(aliased!.selector).toBe('[class$="-section"] > ._inner > .label');
  expect(aliased!.description).toBe("The poll label.");

  // No-alias form: name derived from final compound (._inner → _inner).
  const noAlias = entry.parts.find((p) => p.name === "_inner");
  expect(noAlias).toBeDefined();
  expect(noAlias!.selector).toBe('[class$="-section"] > ._inner');

  // No spurious part named "class" from the attribute key of the chain's first segment.
  expect(entry.parts.find((p) => p.name === "class")).toBeUndefined();
});

test.each([">", "~", "+"])(
  "part selectors distinguish %s combinators from aliases",
  (combinator) => {
    const selector = `.parent ${combinator} button`;
    expect(splitPartArg(selector)).toEqual({ selector, name: "button", description: undefined });
    expect(splitPartArg(`${selector} alias_2-x — Description`)).toEqual({
      selector,
      name: "alias_2-x",
      description: "Description",
    });
  },
);

test("inScope scan only derives parts from the final compound of a descendant chain", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component menu",
      " * @summary A menu.",
      " */",
      ".menu {}",
      "@scope (.menu) {",
      "  :scope > .group > .item { padding: 0.5rem; }",
      "}",
    ].join("\n"),
  );
  // .item is the final compound — it is a part.
  expect(entry.parts.map((p) => p.name)).toContain("item");
  // .group is an intermediate scoping ancestor — it must NOT become a spurious part.
  expect(entry.parts.map((p) => p.name)).not.toContain("group");
});

test("@modifier derives key from selector: attribute stores inner content, ID/host strip prefix", () => {
  // @modifier handles the same selector forms as @part for authoring consistency. The stored key
  // matches what the AST extractor produces for each convention (inner content for attribute).
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component x-banner",
      ' * @modifier [data-size="compact"] — Compressed layout.',
      " * @modifier #dismiss — Dismiss-button active state.",
      " * @modifier :host — Host-level modifier.",
      " * @modifier .content — A class modifier.",
      " * @modifier -without-action — Flag: no action slot.",
      " */",
    ].join("\n"),
  );

  // Attribute: key is inner content (no brackets), matching the AST convention.
  const attr = entry.modifiers.find((m) => m.name === 'data-size="compact"')!;
  expect(attr).toBeDefined();
  expect(attr.description).toBe("Compressed layout.");

  // ID: name strips #.
  const id = entry.modifiers.find((m) => m.name === "dismiss")!;
  expect(id.description).toBe("Dismiss-button active state.");

  // :host: name is "host".
  const host = entry.modifiers.find((m) => m.name === "host")!;
  expect(host.description).toBe("Host-level modifier.");

  // Class: name strips dot; no selector stored.
  const cls = entry.modifiers.find((m) => m.name === "content")!;
  expect(cls.description).toBe("A class modifier.");
  expect(cls.selector).toBeUndefined();

  // Bare name: unchanged, no selector stored.
  const bare = entry.modifiers.find((m) => m.name === "-without-action")!;
  expect(bare.description).toBe("Flag: no action slot.");
  expect(bare.selector).toBeUndefined();
});

test("@modifier with alias stores alias as key and original selector on the modifier", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component x-banner",
      ' * @modifier [data-size="compact"] compact — Alias for the attribute modifier.',
      " */",
    ].join("\n"),
  );
  const mod = entry.modifiers.find((m) => m.name === "compact")!;
  expect(mod).toBeDefined();
  expect(mod.description).toBe("Alias for the attribute modifier.");
  expect(mod.selector).toBe('[data-size="compact"]');
});

test("@wrapper with non-class selector matches @structure node by derived name", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component x-banner",
      " * @wrapper #dismiss — The dismiss button wrapper.",
      " * @structure",
      " * :host {}",
      " * #dismiss:optional {}",
      " */",
      ":host {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  const dismissNode = entry.structure?.find((n) => n.selector === "#dismiss");
  expect(dismissNode?.description).toBe("The dismiss button wrapper.");
});

test("@wrapper with alias matches @structure node via wrapperSelectors", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component x-banner",
      " * @wrapper #dismiss close-area — Aliased dismiss wrapper.",
      " * @structure",
      " * :host {}",
      " * #dismiss:optional {}",
      " */",
      ":host {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  const dismissNode = entry.structure?.find((n) => n.selector === "#dismiss");
  expect(dismissNode?.description).toBe("Aliased dismiss wrapper.");
});

test("an authored `@deprecated {@link -x}` sets the modifier's canonical", () => {
  const [comp] = parseCssDocs(
    `/**\n * @component alert\n * @modifier -variant-error — @deprecated {@link -color-danger}\n */\n` +
      `.alert.-variant-error { color: red; }`,
    { modifierConvention: "rscss" },
  );
  const alias = comp.modifiers.find((m) => m.name === "-variant-error")!;
  expect(alias.deprecated?.canonical).toBe("-color-danger");
});

test("an authored `@alias {@link -x}` sets the modifier's alias canonical", () => {
  const [comp] = parseCssDocs(
    `/**\n * @component breadcrumb\n * @modifier -size-small — @alias {@link -size-sm}\n */\n` +
      `.breadcrumb.-size-sm { font-size: 0.875rem; }`,
    { modifierConvention: "rscss" },
  );
  const alias = comp.modifiers.find((m) => m.name === "-size-small")!;
  expect(alias.alias?.canonical).toBe("-size-sm");
});

test("an authored `@alias` also parses under the default convention", () => {
  const [comp] = parseCssDocs(
    `/**\n * @component breadcrumb\n * @modifier -size-small — @alias {@link -size-sm}\n */\n` +
      `.breadcrumb.-size-sm { font-size: 0.875rem; }`,
  );
  const alias = comp.modifiers.find((m) => m.name === "-size-small")!;
  expect(alias.alias?.canonical).toBe("-size-sm");
});

test("an authored `@interaction` marker flags a JS-toggled modifier, even with no CSS rule at all", () => {
  const [comp] = parseCssDocs(
    `/**\n * @component progress-circle\n` +
      ` * @modifier -should-animate — @interaction Toggled by JS while the ring grows.\n */\n` +
      `.progress-circle {}`,
    { modifierConvention: "rscss" },
  );
  const mod = comp.modifiers.find((m) => m.name === "-should-animate")!;
  expect(mod.interaction).toBe(true);
  expect(mod.description).toBe("Toggled by JS while the ring grows.");
});

test("an `@interaction` marker also merges onto an AST-matched modifier", () => {
  const [comp] = parseCssDocs(
    `/**\n * @component progress-circle\n` +
      ` * @modifier -should-animate — @interaction Toggled while the ring grows.\n */\n` +
      `.progress-circle {}\n.progress-circle.-should-animate {}`,
    { modifierConvention: "rscss" },
  );
  const mod = comp.modifiers.find((m) => m.name === "-should-animate")!;
  expect(mod.interaction).toBe(true);
});

test("an authored `@affects` marker names the descendant record + target this modifier changes", () => {
  const [comp] = parseCssDocs(
    `/**\n * @component table\n` +
      ` * @modifier -layout-stacked — @affects table-cell.before — Adds a label via ::before.\n */\n` +
      `.table {}\n.table.-layout-stacked {}`,
    { modifierConvention: "rscss" },
  );
  const mod = comp.modifiers.find((m) => m.name === "-layout-stacked")!;
  expect(mod.affects).toEqual([
    { component: "table-cell", target: "before", description: "Adds a label via ::before." },
  ]);
});

test("@structure parses @scope at-rules as scope-boundary StructureNodes", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component menu",
      " * @summary A menu.",
      " * @structure",
      " * @scope (.menu) {",
      " *   :scope > .item {}",
      " * }",
      " */",
      ".menu {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );

  expect(entry.structure).toHaveLength(1);
  const scopeNode = entry.structure![0];
  expect(scopeNode.scope).toBe("(.menu)");
  expect(scopeNode.selector).toBe("");
  expect(scopeNode.children).toHaveLength(1);
  expect(scopeNode.children[0].selector).toBe(":scope > .item");
});

test("@structure @variant blocks split into structureVariants, with structure holding the first for back-compat", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component progress",
      " * @summary An upload progress control.",
      " * @structure",
      " * @variant wrapped {",
      " *   label {",
      " *     progress {}",
      " *   }",
      " * }",
      " * @variant labelled {",
      " *   label {}",
      " *   progress {}",
      " * }",
      " */",
      ".progress {}",
    ].join("\n"),
  );

  expect(entry.structureVariants).toHaveLength(2);
  expect(entry.structureVariants![0].name).toBe("wrapped");
  expect(entry.structureVariants![0].nodes[0].selector).toBe("label");
  expect(entry.structureVariants![0].nodes[0].children[0].selector).toBe("progress");
  expect(entry.structureVariants![1].name).toBe("labelled");
  expect(entry.structureVariants![1].nodes).toHaveLength(2);

  // Back-compat: `structure` is the first variant's nodes only.
  expect(entry.structure).toBe(entry.structureVariants![0].nodes);
});

test("@structure without @variant leaves structureVariants undefined", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component tabs",
      " * @summary Tabs.",
      " * @structure",
      " * .tabs {}",
      " */",
      ".tabs {}",
    ].join("\n"),
  );

  expect(entry.structureVariants).toBeUndefined();
  expect(entry.structure).toHaveLength(1);
});

test("@structure @variant: an unlabeled @variant block is a variant with no name", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component progress",
      " * @summary An upload progress control.",
      " * @structure",
      " * @variant {",
      " *   .modern {}",
      " * }",
      " * @variant labelled {",
      " *   .legacy {}",
      " * }",
      " */",
      ".progress {}",
    ].join("\n"),
  );

  expect(entry.structureVariants).toHaveLength(2);
  expect(entry.structureVariants![0].name).toBeUndefined();
  expect(entry.structureVariants![0].nodes[0].selector).toBe(".modern");
  expect(entry.structureVariants![1].name).toBe("labelled");
});

test("toMermaidVariants renders each variant as a labelled subgraph, falling back to positional names", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component progress",
      " * @summary An upload progress control.",
      " * @structure",
      " * @variant {",
      " *   .modern {}",
      " * }",
      " * @variant labelled {",
      " *   .legacy {}",
      " * }",
      " */",
      ".progress {}",
    ].join("\n"),
  );

  const mermaid = toMermaidVariants(entry.structureVariants!);
  expect(mermaid.startsWith("flowchart TD")).toBe(true);
  expect(mermaid).toContain(`subgraph sg0 ["Variant 1"]`);
  expect(mermaid).toContain(`"labelled"]`);
  expect(mermaid).toContain(`".modern"]:::cssdoc-root`);
  expect(mermaid).toContain(`".legacy"]:::cssdoc-root`);
});

test("@example unescapes `\\`` so a fence authored inside a css template becomes a real fence", () => {
  // As it reaches the parser from a projected `css` template: the fence backticks are escaped.
  const src = [
    "/**",
    " * @component alert",
    " * @summary An alert.",
    " * @example",
    " * Prose before.",
    " * \\`\\`\\`html",
    ' * <div class="alert"></div>',
    " * \\`\\`\\`",
    " */",
    ".alert {}",
  ].join("\n");
  const [alert] = parseCssDocs(src, { modifierConvention: "rscss" });
  expect(alert.examples[0]).toContain("```html");
  expect(alert.examples[0]).not.toContain("\\`"); // the escape is gone; the fence is real
  expect(alert.examples[0].startsWith("Prose before.")).toBe(true);
});

test("native pseudo-elements derive from selectors (allow-list), @pseudo adds prose, ::part stays a shadow part", () => {
  const [alert] = parseCssDocs(
    [
      "/**",
      " * @component alert",
      " * @summary An alert.",
      " * @pseudo ::before — The status bar.",
      " */",
      ".alert {}",
      ".alert::before {}",
      ".alert::after {}",
      ".alert::-webkit-scrollbar {}", // vendor: not in the allow-list → ignored
      ".alert::part(thumb) {}", // a shadow part, not a native pseudo-element
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  expect(alert.pseudoElements.map((p) => p.name)).toEqual(["after", "before"]); // sorted; vendor excluded
  expect(alert.pseudoElements.find((p) => p.name === "before")?.description).toBe(
    "The status bar.",
  );
  expect(alert.shadowParts.map((p) => p.name)).toEqual(["thumb"]); // ::part() is still a shadow part
});

test("an inline /* */ comment above a rule becomes the modifier's description (default append)", () => {
  const [alert] = parseCssDocs(
    [
      "/**",
      " * @component alert",
      " * @summary An alert.",
      " */",
      ".alert {}",
      "/* Opt out of the default elevation. */",
      ".alert.-without-shadow {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  expect(alert.modifiers.find((m) => m.name === "-without-shadow")?.description).toBe(
    "Opt out of the default elevation.",
  );
});

test("inlineComments mode controls how an inline comment combines with @modifier prose", () => {
  const css = [
    "/**",
    " * @component alert",
    " * @summary An alert.",
    " * @modifier -x — Tag prose.",
    " */",
    ".alert {}",
    "/* Inline note. */",
    ".alert.-x {}",
  ].join("\n");
  const desc = (mode: "append" | "prepend" | "replace" | "ignore") => {
    const cfg = new CssDocConfiguration();
    cfg.setModifierConvention("rscss");
    cfg.setInlineComments(mode);
    return parseCssDocs(css, { configuration: cfg })[0].modifiers.find((m) => m.name === "-x")
      ?.description;
  };
  expect(desc("append")).toBe("Tag prose.\n\nInline note.");
  expect(desc("prepend")).toBe("Inline note.\n\nTag prose.");
  expect(desc("replace")).toBe("Inline note.");
  expect(desc("ignore")).toBe("Tag prose.");
});

test("inlineComments: ignore still parses explicit-gated inline legends (@annotations)", () => {
  const cfg = new CssDocConfiguration();
  cfg.setInlineComments("ignore");
  const [card] = parseCssDocs(
    [
      "/**",
      " * @component card",
      " * @summary A card.",
      " * @ref 2",
      " */",
      ".card {}",
      "/* @annotations",
      "1. Reserved for future use",
      "2. Focus ring must be visible",
      "*/",
      ".card.-x {}",
      "/* @annotations",
      "3. Legacy reset path",
      "@ref 3",
      "*/",
      ".card.-y {}",
      "/* Plain comment ignored for prose. */",
      ".card.-z {}",
    ].join("\n"),
    { configuration: cfg, modifierConvention: "rscss" },
  );
  expect(card.annotations).toEqual([
    { ref: 1, text: "Reserved for future use" },
    { ref: 2, text: "Focus ring must be visible" },
    { ref: 3, text: "Legacy reset path" },
  ]);
  expect(card.refs).toEqual([2, 3]);
  expect(card.modifiers.find((m) => m.name === "-z")?.description).toBeUndefined();
});

test("@todo (block tag + inline comment) collects record to-dos, distinct from descriptions", () => {
  const [alert] = parseCssDocs(
    [
      "/**",
      " * @component alert",
      " * @summary An alert.",
      " * @todo migrate to logical properties",
      " */",
      "/* Describes nothing — the base rule defines no member. */",
      ".alert {}",
      "/* @todo make -x responsive */",
      ".alert.-x {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  expect(alert.todos).toEqual(["migrate to logical properties", "make -x responsive"]);
  // A `@todo` comment is a note, not the member's description; the base-rule comment attaches to nothing.
  expect(alert.modifiers.find((m) => m.name === "-x")?.description).toBeUndefined();
});

test("@structure optional-ancestor wrapper: root cardinality + @wrapper prose, in the model and mermaid", () => {
  const [badge] = parseCssDocs(
    [
      "/**",
      " * @component badge",
      " * @summary A small status dot.",
      " * @slot — The target being badged.",
      " * @wrapper .badge-wrapper — Optional; anchors the badge over a target.",
      " * @structure",
      " * .badge-wrapper:opt {",
      " *   slot {}",
      " *   .badge {}",
      " * }",
      " */",
      ".badge {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  const [root] = badge.structure!;
  expect(root.selector).toBe(".badge-wrapper");
  expect(root.cardinality).toBe("optional");
  expect(root.description).toBe("Optional; anchors the badge over a target."); // @wrapper prose
  // Mermaid: a root has no incoming edge, so its cardinality rides the label, and the @wrapper prose
  // trails it (matching the text tree).
  expect(toMermaid(badge.structure!, { self: "badge" })).toContain(
    ".badge-wrapper (0..1) — Optional; anchors the badge over a target.",
  );
});

const CONVENTION_FIXTURE = `
/**
 * @component card
 * @summary A surface.
 */
.card { display: block; }
.card--featured { box-shadow: 0 0 1px; }
.card.is-loading { opacity: 0.5; }
.card.featured { border: 1px solid; }
.card[data-variant="ghost"] { background: none; }
.card[data-loading] { opacity: 0.5; }
@scope (.card) {
  :scope .title { font-weight: 700; }
}
`;

test("the default convention is BEM (suffix --), and parts never overlap modifiers", () => {
  const card = parseCssDocs(CONVENTION_FIXTURE).find((e) => e.name === "card")!;
  const featured = card.modifiers.find((m) => m.name === "card--featured")!;
  expect(featured.prop).toBe("featured");
  expect(featured.value).toBeUndefined();
  // Only the BEM modifier is extracted; the chained/attribute ones are not, under the default.
  expect(card.modifiers.map((m) => m.name)).toEqual(["card--featured"]);
  expect(card.parts.map((p) => p.name)).toEqual(["title"]);
});

test("bare/OOCSS convention: any chained class is a modifier, distinct from descendant parts", () => {
  const card = parseCssDocs(CONVENTION_FIXTURE, { modifierConvention: "bare" }).find(
    (e) => e.name === "card",
  )!;
  expect(card.modifiers.map((m) => m.name).sort()).toEqual(["featured", "is-loading"]);
  expect(card.parts.map((p) => p.name)).toEqual(["title"]);
});

test("`&` inside @scope is recognized as the base class, purely from the AST (chained)", () => {
  const [card] = parseCssDocs(
    `/**\n * @component card\n */\n.card {}\n@scope (.card) { &.-color-danger {} }`,
    { modifierConvention: "rscss" },
  );
  // No authored @modifier doc backs this — it's recognized from `&.-color-danger` alone, the same way
  // `:scope .-color-danger` already is.
  expect(card.modifiers.map((m) => m.name)).toEqual(["-color-danger"]);
});

test("`&` inside @scope is recognized as the base class for attribute/state selectors too", () => {
  const [card] = parseCssDocs(
    `/**\n * @component card\n */\n.card {}\n` +
      `@scope (.card) { &[data-variant="ghost"] {} &.is-open {} }`,
    { modifierConvention: { structure: "attribute", separator: "data-" } },
  );
  expect(card.modifiers.map((m) => m.name)).toEqual(['data-variant="ghost"']);

  const [withState] = parseCssDocs(
    `/**\n * @component card\n */\n.card {}\n@scope (.card) { &.is-open {} }`,
    { modifierConvention: { structure: "chained", separator: "", statePrefixes: ["is-"] } },
  );
  expect(withState.states.map((s) => s.name)).toContain("is-open");
});

test("`&` is NOT recognized for BEM suffix concatenation (`&--mod` isn't valid CSS)", () => {
  // Unlike `.card--mod`, `&--mod` doesn't parse as "the base class with a --mod suffix" — `&` can only
  // be followed by a proper simple selector (class/id/attribute/pseudo), not a bare identifier tail. We
  // deliberately don't try to recognize it: this selector contributes no modifier under BEM.
  const [card] = parseCssDocs(`/**\n * @component card\n */\n.card {}\n&--mod {}`);
  expect(card.modifiers.map((m) => m.name)).not.toContain("card--mod");
});

test("`&` inside a PARENT's @scope is NOT attributed to a child member record", () => {
  // A member record's own file/doc-comment can carry a rule block that reaches UP into a parent's
  // @scope to restyle the member (e.g. `modal.body`'s file styling `.body` from inside
  // `@scope (.pfx-modal)`) — a real-world pattern. `&` there means the PARENT's base
  // (`.pfx-modal`), not this record's own base (`.body`), so it must not be picked up as this record's
  // modifier — even though it's a direct child of @scope, same as the positive case above.
  const [body] = parseCssDocs(
    `/**\n * @component modal.body\n * @memberOf modal\n * @selector .body\n */\n` +
      `@scope (.pfx-modal) {\n  :scope {\n    &.-density-compact > .body {}\n  }\n}`,
    { modifierConvention: "rscss" },
  );
  expect(body.modifiers.map((m) => m.name)).not.toContain("-density-compact");
});

test("`&` stops meaning the scope root once a combinator introduces a new compound (nested part)", () => {
  // Real-world tooltip pattern: `@scope (.pfx-tooltip) { :scope { > .tip { &.-placement-bottom {} } } }`.
  // The outer `@scope` DOES match this record's own base, but `&.-placement-bottom` is nested inside
  // `> .tip` — a combinator that moves `&`'s meaning to the `.tip` part, not the tooltip's own base —
  // so it must not be picked up as a tooltip modifier.
  const [tooltip] = parseCssDocs(
    `/**\n * @component tooltip\n * @selector .pfx-tooltip\n */\n` +
      `@scope (.pfx-tooltip) {\n  :scope {\n    > .tip {\n      &.-placement-bottom {}\n    }\n  }\n}`,
    { modifierConvention: "rscss" },
  );
  expect(tooltip.modifiers.map((m) => m.name)).not.toContain("-placement-bottom");
});

test("`&` stops meaning the scope root inside a bare nested class selector, not just after a combinator", () => {
  // Real-world range-input pattern: `.pfx-range-input-value { & {} &.-size-sm {} }`, nested
  // directly inside `@scope (.pfx-range-input)` — no `&`/`:scope` prefix (and so no combinator either)
  // on the `.pfx-range-input-value` rule itself, just a bare class selector. `&`/`:scope` inside IT
  // mean that nested part, not the outer `range-input` scope root.
  const [rangeInput] = parseCssDocs(
    `/**\n * @component range-input\n * @selector .pfx-range-input\n */\n` +
      `@scope (.pfx-range-input) {\n  & {}\n  .pfx-range-input-value {\n    & {}\n    &.-size-sm {}\n  }\n}`,
    { modifierConvention: "rscss" },
  );
  expect(rangeInput.modifiers.map((m) => m.name)).not.toContain("-size-sm");
});

test("`&` is not attributed when an `@selector` descendant compound truncates to the parent's own base", () => {
  // Real-world `list.item` pattern: `@selector .pfx-list > li` truncates to `.pfx-list` (the
  // `@selector` grammar only captures the leading token) — identical to the PARENT `list` record's own
  // base. Without tracking this, `&.-size-sm > li` (list's own modifier, reaching into its `.item`
  // member) would look exactly like `list.item`'s own base matching its own `@scope`.
  const [listItem] = parseCssDocs(
    `/**\n * @component list.item\n * @memberOf list\n * @selector .pfx-list > li\n */\n` +
      `@scope (.pfx-list) {\n  :scope {\n    > li {}\n    &.-size-sm > li {}\n  }\n}`,
    { modifierConvention: "rscss" },
  );
  expect(listItem.className).toBe(".pfx-list");
  expect(listItem.modifiers.map((m) => m.name)).not.toContain("-size-sm");
});

test("`&` still resolves at scope depth when the base is an authored compound built on the prelude", () => {
  // Real-world `transition` utility pattern: its `@selector` is the compound
  // `.pfx-transition.-transition-fade-entering`, built ON TOP of the `@scope`'s own `.pfx-transition`
  // prelude — a prefix match, not exact equality — so `&`-based modifiers there still resolve.
  const [transition] = parseCssDocs(
    `/**\n * @utility transition\n * @selector .pfx-transition.-transition-fade-entering\n */\n` +
      `@scope (.pfx-transition) {\n  & {}\n  &.-transition-fade-exiting {}\n}`,
    { modifierConvention: "rscss" },
  );
  expect(transition.modifiers.map((m) => m.name)).toContain("-transition-fade-exiting");
});

test("attribute (CUBE) convention: data attributes map to prop/value; parts unaffected", () => {
  const card = parseCssDocs(CONVENTION_FIXTURE, {
    modifierConvention: { structure: "attribute", separator: "data-" },
  }).find((e) => e.name === "card")!;
  const variant = card.modifiers.find((m) => m.name === 'data-variant="ghost"')!;
  expect(variant.prop).toBe("variant");
  expect(variant.value).toBe("ghost");
  const loading = card.modifiers.find((m) => m.name === "data-loading")!;
  expect(loading.prop).toBe("loading");
  expect(loading.value).toBeUndefined();
  expect(card.parts.map((p) => p.name)).toEqual(["title"]);
});

test.each([".card", ":scope", "&"])(
  "attribute modifiers are extracted from chained selectors on %s",
  (base) => {
    const matcher = new ModifierMatcher({ structure: "attribute", separator: "data-" });
    const hits = matcher.modifiersIn(
      `${base}[data-variant='ghost'][data-loading][role=button]`,
      "card",
    );
    expect(hits.map((hit) => hit.name)).toEqual(['data-variant="ghost"', "data-loading"]);
  },
);

test("a separator array matches several chained prefixes (is-/has-)", () => {
  const css =
    `/**\n * @component card\n */\n.card {}\n` +
    `.card.is-open {}\n.card.has-icon {}\n.card.featured {}`;
  const [card] = parseCssDocs(css, {
    modifierConvention: { structure: "chained", separator: ["is-", "has-"] },
  });
  // Only the is-/has- prefixed classes are modifiers; `.featured` is neither.
  expect(card.modifiers.map((m) => m.name).sort()).toEqual(["has-icon", "is-open"]);
  expect(card.modifiers.find((m) => m.name === "is-open")?.prop).toBe("open");
});

test("chained modifiers are extracted from each base while state classes are excluded", () => {
  const matcher = new ModifierMatcher({
    structure: "chained",
    separator: "",
    statePrefixes: ["is-"],
  });
  const hits = matcher.modifiersIn(
    ".card.primary.is-open.small, :scope.secondary, &.tertiary",
    "card",
  );
  expect(hits.map((hit) => hit.name)).toEqual(["primary", "small", "secondary", "tertiary"]);
});

test("state classes are deduplicated across chained selectors", () => {
  const matcher = new ModifierMatcher({
    structure: "chained",
    separator: "",
    statePrefixes: ["is-", "has-"],
  });
  expect(matcher.statesIn(".card.is-open.primary, :scope.has-icon, &.is-open.is-", "card")).toEqual(
    [{ name: "is-open" }, { name: "has-icon" }],
  );
});

test("pseudo states ignore pseudo-elements and deduplicate matches", () => {
  const matcher = new ModifierMatcher({
    structure: "chained",
    separator: "",
    statePseudoClasses: ["disabled", "before"],
  });
  expect(matcher.pseudoStatesIn(".card:disabled::before:disabled")).toEqual([{ name: "disabled" }]);
});

test("modifier matching treats regex metacharacters in separators and families literally", () => {
  const matcher = new ModifierMatcher({ structure: "suffix", separator: "." });
  expect(matcher.modifiersIn(".card.primary", "card").map((hit) => hit.name)).toEqual([
    "card.primary",
  ]);
  expect(matcher.modifiersIn(".cardXprimary", "card")).toEqual([]);
  expect(matcher.matchesModifier("icon.*", "icon.home")).toBe(true);
  expect(matcher.matchesModifier("icon.*", "icon.")).toBe(true);
  expect(matcher.matchesModifier("icon.*", "iconXhome")).toBe(false);
  expect(matcher.matchesModifier("icon.*", "icon.é")).toBe(false);
});

test("attribute modifier values strip only matching quote pairs", () => {
  const matcher = new ModifierMatcher({ structure: "attribute", separator: "data-" });
  expect(matcher.analyze("data-size='wide'")).toEqual({ prop: "size", value: "wide" });
  expect(matcher.analyze('data-size="wide"')).toEqual({ prop: "size", value: "wide" });
  expect(matcher.analyze("data-size='wide\"")).toEqual({ prop: "size", value: "'wide\"" });
});

test("attribute usage ignores a trailing comparison operator when checking the name", () => {
  const matcher = new ModifierMatcher({ structure: "attribute", separator: "" });
  for (const operator of ["~", "|", "^", "$", "*"]) {
    expect(matcher.looksLikeUsage(`${operator}=value`)).toBe(false);
    expect(matcher.looksLikeUsage(`data-size${operator}=value`)).toBe(true);
  }
  expect(matcher.looksLikeUsage("=value")).toBe(false);
  expect(matcher.looksLikeUsage("data-size=value")).toBe(true);
});

test("member normalization removes each outer bracket independently and only one leading dot", () => {
  const attributes = new ModifierMatcher({ structure: "attribute", separator: "data-" });
  expect(attributes.normalizeMember("[data-size=wide")).toBe('data-size="wide"');
  expect(attributes.normalizeMember("data-size=wide]")).toBe('data-size="wide"');
  const classes = new ModifierMatcher({ structure: "chained", separator: "" });
  expect(classes.normalizeMember("..active")).toBe(".active");
});

test("a custom is- convention picks up state classes", () => {
  const card = parseCssDocs(CONVENTION_FIXTURE, {
    modifierConvention: { structure: "chained", separator: "is-" },
  }).find((e) => e.name === "card")!;
  expect(card.modifiers.map((m) => m.name)).toEqual(["is-loading"]);
  expect(card.modifiers[0].prop).toBe("loading");
});

test("BEM elements (.block__element) are recorded as parts, distinct from modifiers", () => {
  const [tabs] = parseCssDocs(
    `/**\n * @component tabs\n */\n` +
      `.tabs {}\n.tabs__list {}\n.tabs__tab {}\n.tabs--vertical {}`,
  );
  expect(tabs.modifiers.map((m) => m.name)).toEqual(["tabs--vertical"]);
  expect(tabs.parts.map((p) => p.name).sort()).toEqual(["tabs__list", "tabs__tab"]);
});

test("a class attribute selector on the base derives a `*` family modifier (rscss)", () => {
  const [alert] = parseCssDocs(
    `/**\n * @component alert\n */\n.alert {}\n.alert[class*="-icon-"] { background: var(--g); }`,
    { modifierConvention: "rscss" },
  );
  const icon = alert.modifiers.find((m) => m.name === "-icon-*")!;
  expect(icon).toMatchObject({ name: "-icon-*", prop: "icon", pattern: true });
});

test("an authored @modifier merges with the AST-derived family (one entry, with prose)", () => {
  const [alert] = parseCssDocs(
    `/**\n * @component alert\n * @modifier -icon-* — Swap the glyph.\n */\n` +
      `.alert {}\n.alert[class*="-icon-"] {}`,
    { modifierConvention: "rscss" },
  );
  const families = alert.modifiers.filter((m) => m.name === "-icon-*");
  expect(families).toHaveLength(1);
  expect(families[0]).toMatchObject({ pattern: true, description: "Swap the glyph." });
});

test("attribute-family derivation respects the operator and ignores non-modifier values", () => {
  const fam = (rule: string) =>
    parseCssDocs(`/**\n * @component c\n */\n.c {}\n${rule}`, {
      modifierConvention: "rscss",
    })[0].modifiers.map((m) => m.name);
  expect(fam('.c[class$="-icon"] {}')).toEqual(["*-icon"]); // ends-with → suffix family
  expect(fam('.c[class~="-icon-x"] {}')).toEqual(["-icon-x"]); // exact word → concrete
  expect(fam('.c[class^="-icon-"] {}')).toEqual([]); // ^= anchors to the base class → not a modifier
  expect(fam('.c[class*="grid"] {}')).toEqual([]); // value isn't a chained modifier (no `-` prefix)
  expect(fam('.c[class*="-"] {}')).toEqual([]); // no literal core beyond the separator
});

test("a BEM element's own modifier (.block__element--mod) nests on the part", () => {
  const [tabs] = parseCssDocs(
    `/**\n * @component tabs\n */\n.tabs {}\n.tabs__tab {}\n.tabs__tab--active { font-weight: 700; }`,
  );
  const tab = tabs.parts.find((p) => p.name === "tabs__tab")!;
  expect(tab.modifiers?.map((m) => ({ name: m.name, prop: m.prop }))).toEqual([
    { name: "tabs__tab--active", prop: "active" },
  ]);
  // The element name is not polluted by the modifier tail.
  expect(tabs.parts.map((p) => p.name)).not.toContain("tabs__tab--active");
});

test("statePrefixes route chained classes to states, excluding them from modifiers", () => {
  const card = parseCssDocs(CONVENTION_FIXTURE, {
    modifierConvention: { structure: "chained", separator: "", statePrefixes: ["is-"] },
  }).find((e) => e.name === "card")!;
  expect(card.states.map((s) => s.name)).toContain("is-loading");
  expect(card.modifiers.map((m) => m.name)).not.toContain("is-loading");
  // A non-state chained class is still a modifier.
  expect(card.modifiers.map((m) => m.name)).toContain("featured");
});

test("BEM: authored @modifier merges, and {@link} canonical needs no dash", () => {
  const [card] = parseCssDocs(
    `/**\n * @component card\n * @modifier card--featured — A promoted card.\n` +
      ` * @modifier card--old — @deprecated {@link card--featured}\n */\n` +
      `.card { color: red; }\n.card--featured { color: blue; }\n.card--old { color: green; }`,
  );
  const featured = card.modifiers.find((m) => m.name === "card--featured")!;
  expect(featured.description).toBe("A promoted card.");
  const old = card.modifiers.find((m) => m.name === "card--old")!;
  expect(old.deprecated?.canonical).toBe("card--featured");
});

test("parts come from scoped child selectors; consumed + declared custom properties are captured", () => {
  const model = parseCssDocs(FIXTURE);
  const menu = model.find((e) => e.name === "menu")!;
  expect(menu.parts.map((p) => p.name)).toEqual(["item", "separator"]);

  const button = model.find((e) => e.name === "button")!;
  expect(button.cssPropertiesConsumed.map((t) => t.name)).toContain(
    "--color-background-interactive-action-secondary-base",
  );

  const circle = model.find((e) => e.name === "progress-circle")!;
  // Declared custom properties now carry the full @property registration (syntax, inherits, default).
  expect(circle.cssPropertiesDeclared).toEqual([
    { name: "--value", syntax: "<number>", inherits: true, defaultValue: "0" },
  ]);
});

test("parseDocComment reads the grammar, ignoring unknown tags and comment framing", () => {
  const doc = parseDocComment(`/**
 * @component alert
 * @summary An inline message.
 * @modifier -color-info — Informational.
 * @modifier -render-icon — @deprecated Use the \`-icon-<name>\` glyph form.
 * @modifier -size-small — @alias {@link -size-sm}
 * @cssproperty --alert-icon-bg <color> — The glyph fill.
 * @bogus this tag is ignored
 */`);
  expect(doc.component).toBe("alert");
  expect(doc.summary).toBe("An inline message.");
  expect(doc.modifiers.get("-color-info")).toEqual({ description: "Informational." });
  expect(doc.modifiers.get("-render-icon")).toEqual({
    deprecated: "Use the `-icon-<name>` glyph form.",
  });
  expect(doc.modifiers.get("-size-small")).toEqual({
    aliasCanonical: "-size-sm",
  });
  expect(doc.cssProperties[0]).toEqual({
    name: "--alert-icon-bg",
    syntax: "<color>",
    description: "The glyph fill.",
  });
});

test("parseDocComment parses @annotations, @ref, and record decorators", () => {
  const doc = parseDocComment(`/**
 * @component card
 * @annotations
 * 1. Prevent shrinking
 * Continuation line.
 * 2. Full bleed artwork
 * @ref 1.
 * @ref 2
 * @readonly
 * @preventExtensions
 * @sealed
 * @frozen
 */`);
  expect([...doc.annotations]).toEqual([
    [1, "Prevent shrinking\nContinuation line."],
    [2, "Full bleed artwork"],
  ]);
  expect(doc.refs).toEqual([1, 2]);
  expect(doc.decorators).toEqual({
    isReadonly: true,
    preventExtensions: true,
    sealed: true,
    frozen: true,
  });
});

test("parseCssDocs surfaces annotations, refs, and decorators on entries", () => {
  const [entry] = parseCssDocs(`/**
 * @component card
 * @annotations
 * 1. Prevent shrinking
 * @ref 1
 * @readonly
 * @noextend
 */
.card {}`);
  expect(entry.annotations).toEqual([{ ref: 1, text: "Prevent shrinking" }]);
  expect(entry.refs).toEqual([1]);
  expect(entry.decorators).toEqual(["readonly", "preventExtensions"]);
});

test("@ref with inline prose stores the annotation without @annotations block", () => {
  const [entry] = parseCssDocs(`/**
 * @component card
 * @ref 1. Prevent shrinking when used in a flex row.
 * @ref 2. Focus ring must remain visible.
 */
.card {}`);
  expect(entry.refs).toEqual([1, 2]);
  expect(entry.annotations).toEqual([
    { ref: 1, text: "Prevent shrinking when used in a flex row." },
    { ref: 2, text: "Focus ring must remain visible." },
  ]);
});

test("annotation and ref parsing preserves punctuation and Unicode prose", () => {
  const doc = parseDocComment(`/**
 * @annotation badge.icon-1 - Accent 🎨
 * @ref 3. — Focus 🧭
 * @ref badge.icon-1 - Details 🎨
 */`);
  expect(doc.namedAnnotations.get("badge.icon-1")).toEqual({ text: "Details 🎨" });
  expect(doc.annotations.get(3)).toBe("Focus 🧭");
  expect(doc.namedRefs).toEqual([
    { ref: "badge.icon-1", text: "Details 🎨", attachment: "record" },
  ]);
});

test("@ref inline prose and @annotations block merge; block row wins on collision", () => {
  const [entry] = parseCssDocs(`/**
 * @component card
 * @annotations
 * 1. Block prose wins.
 * @ref 1. Inline prose ignored for ref 1.
 * @ref 2. Inline prose kept for ref 2.
 */
.card {}`);
  expect(entry.annotations).toEqual([
    { ref: 1, text: "Block prose wins." },
    { ref: 2, text: "Inline prose kept for ref 2." },
  ]);
});

test("record-opening tags set the kind; @name remains a component alias", () => {
  const [comp] = parseCssDocs(`/**\n * @component button\n */\n.button { color: red; }`);
  expect(comp.kind).toBe("component");
  const [named] = parseCssDocs(`/**\n * @name button\n */\n.button { color: red; }`);
  expect(named.kind).toBe("component");
  const [util] = parseCssDocs(`/**\n * @utility spacing\n */\n.m-sm { margin: 0.5rem; }`);
  expect(util.kind).toBe("utility");
  expect(parseCssDocs(`/**\n * @rule base\n */\nbody { margin: 0; }`)).toEqual([]);
  const [decl] = parseCssDocs(`/**\n * @declaration tokens\n */\n:root { --x: 1; }`);
  expect(decl.kind).toBe("declaration");
  expect(parseCssDocs(`/**\n * @layout template\n */\n.wrapper {}`)).toEqual([]);
});

test("an unknown record tag does not split a documented record", () => {
  const entries = parseCssDocs(
    "/** @component shell */\n.shell {}\n/** @layout ignored */\n.child {}\n/** @component next */\n.next {}",
  );
  expect(entries.map((entry) => entry.name)).toEqual(["shell", "next"]);
});

test("@structure keeps record references authored as CSS at-rules", () => {
  const tree = parseStructure(
    ".wrapper {\n  @nav:primary {}\n  @nav (--nav) {}\n  @component top-navigation:primary {}\n  @component top-navigation (--top-nav) {}\n}",
    parsePostcss,
  );
  expect(tree).toEqual([
    {
      selector: ".wrapper",
      children: [
        { selector: "@nav:primary", children: [] },
        { selector: "@nav (--nav)", children: [] },
        { selector: "@component top-navigation:primary", children: [] },
        { selector: "@component top-navigation (--top-nav)", children: [] },
      ],
    },
  ]);
});

test("@structure record refs do not redefine the record", () => {
  const [layout] = parseCssDocs(
    [
      "/**",
      " * @component app-shell",
      " * @summary App shell layout.",
      " * @structure",
      " * .app-shell {",
      " *   @component top-nav {}",
      " *   @component filter-chip {}",
      " * }",
      " */",
      ".app-shell {}",
    ].join("\n"),
  );

  expect(layout.name).toBe("app-shell");
  expect(layout.kind).toBe("component");
  expect(layout.summary).toBe("App shell layout.");
  expect(layout.structure).toEqual([
    {
      selector: ".app-shell",
      children: [
        { selector: "@component top-nav", children: [] },
        { selector: "@component filter-chip", children: [] },
      ],
    },
  ]);
});

test("@structure resolves @member against the immediate parent scope", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component foo",
      " * @structure",
      " * .foo {",
      " *   @member bar:optional {}",
      " * }",
      " */",
      ".foo {}",
    ].join("\n"),
  );

  expect(entry.structure).toEqual([
    {
      selector: ".foo",
      children: [{ selector: "@component foo.bar", cardinality: "optional", children: [] }],
    },
  ]);
});

test("@structure parses cardinality pseudos on @component refs", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component tray",
      " * @structure",
      " * .tray {",
      " *   @component close-button:optional {}",
      " * }",
      " */",
      ".tray {}",
    ].join("\n"),
  );

  expect(entry.structure).toEqual([
    {
      selector: ".tray",
      children: [{ selector: "@component close-button", cardinality: "optional", children: [] }],
    },
  ]);
});

test("@structure @member uses the closest parent record ref when nested", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component app-shell",
      " * @structure",
      " * .app-shell {",
      " *   @component nav.menu {",
      " *     @member item {}",
      " *   }",
      " * }",
      " */",
      ".app-shell {}",
    ].join("\n"),
  );

  expect(entry.structure).toEqual([
    {
      selector: ".app-shell",
      children: [
        {
          selector: "@component nav.menu",
          children: [{ selector: "@component nav.menu.item", children: [] }],
        },
      ],
    },
  ]);
});

test("@element resolves implicit any, explicit any, and negation", () => {
  const [implicit] = parseCssDocs(`/**\n * @component top-navigation\n */\n.topNav {}`);
  expect(implicit.elements?.default.any).toBe(true);
  expect(implicit.elements?.default.allowed).toEqual([]);

  const [explicitAny] = parseCssDocs(
    `/**\n * @component top-navigation\n * @element any\n */\n.topNav {}`,
  );
  expect(explicitAny.elements?.default.any).toBe(true);

  const [explicitStar] = parseCssDocs(
    `/**\n * @component top-navigation\n * @element *\n */\n.topNav {}`,
  );
  expect(explicitStar.elements?.default.any).toBe(true);

  const [constrained] = parseCssDocs(
    `/**\n * @component top-navigation\n * @element <nav>, <div>, !<div>\n */\n.topNav {}`,
  );
  expect(constrained.elements?.default.any).toBe(false);
  expect(constrained.elements?.default.include).toEqual(["div", "nav"]);
  expect(constrained.elements?.default.exclude).toEqual(["div"]);
  expect(constrained.elements?.default.allowed).toEqual(["nav"]);
});

test("@element supports named profiles and MDN-style groups", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component top-navigation",
      " * @element forms, !<input>",
      " * @element nav: any, !sectioning-root, !<form>",
      " */",
      ".topNav {}",
    ].join("\n"),
  );
  expect(entry.elements?.default.groups).toEqual(["forms"]);
  expect(entry.elements?.default.allowed).toContain("button");
  expect(entry.elements?.default.allowed).not.toContain("input");
  expect(entry.elements?.profiles.nav.any).toBe(true);
  expect(entry.elements?.profiles.nav.excludedGroups).toEqual(["sectioning-root"]);
  expect(entry.elements?.profiles.nav.allowed).toContain("html");
  expect(entry.elements?.profiles.nav.allowed).not.toContain("body");
  expect(entry.elements?.profiles.nav.allowed).not.toContain("form");
});

test("structureCustomMediaRefs: collects custom-media profile references", () => {
  const entries = parseCssDocs(
    [
      "/**",
      " * @component app-shell",
      " * @structure",
      " * .app-shell {",
      " *   @nav (--nav) {}",
      " *   @component nav (--top-nav) {}",
      " * }",
      " */",
      ".app-shell {}",
      "",
      "/**",
      " * @component nav",
      " */",
      ".nav {}",
    ].join("\n"),
  );

  expect(structureCustomMediaRefs(entries)).toEqual([
    {
      sourceRecord: "app-shell",
      sourceKind: "component",
      selector: "@nav (--nav)",
      record: "nav",
      recordKind: undefined,
      profile: "--nav",
    },
    {
      sourceRecord: "app-shell",
      sourceKind: "component",
      selector: "@component nav (--top-nav)",
      record: "nav",
      recordKind: "component",
      profile: "--top-nav",
    },
  ]);
});

test("buildCustomMediaDeclarations: emits deduped @custom-media declarations", () => {
  const entries = parseCssDocs(
    [
      "/**",
      " * @component app-shell",
      " * @structure",
      " * .app-shell {",
      " *   @nav (--nav) {}",
      " *   @component nav (--top-nav) {}",
      " * }",
      " */",
      ".app-shell {}",
      "",
      "/**",
      " * @component header",
      " * @structure",
      " * .header {",
      " *   @nav (--nav) {}",
      " * }",
      " */",
      ".header {}",
      "",
      "/**",
      " * @component nav",
      " */",
      ".nav {}",
    ].join("\n"),
  );

  expect(buildCustomMediaDeclarations(entries)).toBe(
    "@custom-media --nav true;\n@custom-media --top-nav true;\n",
  );
});

test("buildCustomMediaDeclarations: uses resolveValue output", () => {
  const entries = parseCssDocs(
    [
      "/**",
      " * @component app-shell",
      " * @structure",
      " * .app-shell {",
      " *   @component nav (--top-nav) {}",
      " * }",
      " */",
      ".app-shell {}",
      "",
      "/**",
      " * @component nav",
      " */",
      ".nav {}",
    ].join("\n"),
  );

  expect(
    buildCustomMediaDeclarations(entries, {
      resolveValue: (profile) => (profile === "--top-nav" ? "(width >= 64rem)" : true),
    }),
  ).toBe("@custom-media --top-nav (width >= 64rem);\n");
});

test("compileCustomMediaDeclarations: compiles declarations directly from CSS", () => {
  const css = [
    "/**",
    " * @component app-shell",
    " * @structure",
    " * .app-shell {",
    " *   @nav (--nav) {}",
    " *   @component nav (--top-nav) {}",
    " * }",
    " */",
    ".app-shell {}",
    "",
    "/**",
    " * @component nav",
    " */",
    ".nav {}",
  ].join("\n");

  expect(compileCustomMediaDeclarations(css)).toBe(
    "@custom-media --nav true;\n@custom-media --top-nav true;\n",
  );
});

test("compileCustomMediaDeclarations: passes parse and resolver options", () => {
  const css = [
    "/**",
    " * @component app-shell",
    " * @structure",
    " * .app-shell {",
    " *   @component nav (--top-nav) {}",
    " * }",
    " */",
    ".app-shell {}",
    "",
    "/**",
    " * @component nav",
    " */",
    ".nav {}",
  ].join("\n");

  expect(
    compileCustomMediaDeclarations(css, {
      resolveValue: (profile) => (profile === "--top-nav" ? "(width >= 64rem)" : true),
      modifierConvention: "rscss",
    }),
  ).toBe("@custom-media --top-nav (width >= 64rem);\n");
});

test("compileCustomMediaDeclarations: absorbs inline @custom-media declarations", () => {
  const css = [
    "@custom-media --desktop-nav (width >= 64rem);",
    "@custom-media --desktop-filters (width >= 64rem);",
    "",
    "/**",
    " * @component app-shell",
    " * @structure",
    " * .app-shell {",
    " *   @component top-nav (--desktop-nav) {}",
    " *   @component filter-chip (--desktop-filters) {}",
    " * }",
    " */",
    ".app-shell {}",
    "",
    "/**",
    " * @component top-nav",
    " */",
    ".top-nav {}",
    "",
    "/**",
    " * @component filter-chip",
    " */",
    ".filter-chip {}",
  ].join("\n");

  expect(compileCustomMediaDeclarations(css)).toBe(
    "@custom-media --desktop-filters (width >= 64rem);\n@custom-media --desktop-nav (width >= 64rem);\n",
  );
});

test("compileCustomMediaDeclarations: resolver overrides absorbed inline declarations", () => {
  const css = [
    "@custom-media --desktop-nav (width >= 48rem);",
    "",
    "/**",
    " * @component app-shell",
    " * @structure",
    " * .app-shell {",
    " *   @component top-nav (--desktop-nav) {}",
    " * }",
    " */",
    ".app-shell {}",
    "",
    "/**",
    " * @component top-nav",
    " */",
    ".top-nav {}",
  ].join("\n");

  expect(
    compileCustomMediaDeclarations(css, {
      resolveValue: (profile) => (profile === "--desktop-nav" ? "(width >= 64rem)" : undefined),
    }),
  ).toBe("@custom-media --desktop-nav (width >= 64rem);\n");
});

test("@structure parses nested CSS into a tree, and toMermaid renders it", () => {
  const tree = parseStructure(".tabs {\n  .list {\n    .tab {}\n  }\n  .panel {}\n}", parsePostcss);
  expect(tree).toEqual([
    {
      selector: ".tabs",
      children: [
        { selector: ".list", children: [{ selector: ".tab", children: [] }] },
        { selector: ".panel", children: [] },
      ],
    },
  ]);
  const mermaid = toMermaid(tree);
  expect(mermaid.startsWith("flowchart TD")).toBe(true);
  expect(mermaid).toContain(`n0[".tabs"]:::cssdoc-root`); // root → rectangle
  expect(mermaid).toContain(`n1(".list"):::cssdoc-part`); // part → rounded
  expect(mermaid).toContain("n0 --> n1"); // tabs → list (required)
  expect(mermaid).toContain("classDef cssdoc-root");
});

test("toMermaid shapes/classes each node by kind, with cardinality on the edge", () => {
  const tree = parseStructure(
    '.alert {\n  slot {}\n  slot[name="icon"] {}\n  .body {}\n  .tag:many {}\n  .item:more {}\n  .close-button:optional {}\n}',
    parsePostcss,
  );
  // A `resolveComponent` marks `.close-button` as a sibling component (linked); `.body`/`.tag` are parts.
  const mermaid = toMermaid(tree, {
    self: "alert",
    resolveComponent: (c) =>
      c === "close-button" ? { name: "close-button", href: "/api/css/close-button.md" } : undefined,
  });
  // Slots → parallelogram, ‹content› / ‹content: name›.
  expect(mermaid).toContain(`[/"‹content›"/]:::cssdoc-slot`);
  expect(mermaid).toContain(`[/"‹content: icon›"/]:::cssdoc-slot`);
  // Sibling component → stadium, labelled by component name, with a click link.
  expect(mermaid).toContain(`(["close-button"]):::cssdoc-component`);
  expect(mermaid).toMatch(/click n\d+ "\/api\/css\/close-button\.md"/u);
  // Plain part → rounded.
  expect(mermaid).toContain(`(".body"):::cssdoc-part`);
  // Cardinality rides the edge: many `0..n`, one-or-more `1..n`, optional dashed `0..1`.
  expect(mermaid).toMatch(/n0 -->\|0\.\.n\| n\d+/u); // .tag:many
  expect(mermaid).toMatch(/n0 -->\|1\.\.n\| n\d+/u); // .item:more
  expect(mermaid).toMatch(/n0 -\.->\|0\.\.1\| n\d+/u); // .close-button:optional
});

test.each([
  ["slot", "‹content›"],
  ["slot[name=icon]", "‹content: icon›"],
  ["slot[ name = 'header_1' ]", "‹content: header_1›"],
  ["slot[name=\"icon']", "‹content: icon›"],
])("toMermaid classifies %s as a slot", (selector, label) => {
  const mermaid = toMermaid([{ selector, children: [] }]);
  expect(mermaid).toContain(`[/"${label}"/]:::cssdoc-slot`);
});

test("toMermaid renders a co-located node as a component node with a compound label", () => {
  const tree = parseStructure(".shell {\n  .tabs-list:is(.pfx-card):optional {}\n}", parsePostcss);
  const mermaid = toMermaid(tree, {
    self: "shell",
    resolveComponent: (c) =>
      c === "pfx-card" ? { name: "card", href: "/api/card.md" } : undefined,
  });
  expect(mermaid).toContain(".tabs-list + card");
  expect(mermaid).toContain("cssdoc-component");
  expect(mermaid).toMatch(/click n\d+ "\/api\/card\.md"/u);
});

test("toMermaid renders @component refs as component nodes with cardinality", () => {
  const tree = parseStructure(".tray {\n  @component close-button:optional {}\n}", parsePostcss);
  const mermaid = toMermaid(tree, {
    self: "tray",
    resolveComponent: (c) =>
      c === "close-button" ? { name: "close-button", href: "/api/close-button.md" } : undefined,
  });
  expect(mermaid).toContain(`(["close-button"]):::cssdoc-component`);
  expect(mermaid).toMatch(/n0 -\.->\|0\.\.1\| n\d+/u);
  expect(mermaid).toMatch(/click n\d+ "\/api\/close-button\.md"/u);
});

test("toMermaid renders a comma-separated alternation slot as every resolved sibling, joined, without a click link", () => {
  const tree = parseStructure(
    ".header-row {\n  .col-header, .row-header:one-or-more {}\n}",
    parsePostcss,
  );
  const mermaid = toMermaid(tree, {
    self: "header-row",
    resolveComponent: (c) =>
      c === "col-header"
        ? { name: "col-header", href: "/api/col-header.md" }
        : c === "row-header"
          ? { name: "row-header", href: "/api/row-header.md" }
          : undefined,
  });
  // Both alternatives resolve and are joined; the shared cardinality rides the edge as usual.
  expect(mermaid).toContain(`(["col-header | row-header"]):::cssdoc-component`);
  expect(mermaid).toMatch(/-->\|1\.\.n\| n\d+/u);
  // Ambiguous target (two resolved components) — no click link is emitted.
  expect(mermaid).not.toContain("click");
});

test("@structure cardinality pseudos (full + `:opt`/`:more` shorthands) parse and strip", () => {
  const tree = parseStructure(
    ".alert {\n  slot {}\n  .close-button:optional {}\n  .icon:opt {}\n  .item:one-or-more {}\n  .tag:more {}\n  .badge:many {}\n  .body {}\n}",
    parsePostcss,
  );
  const [alert] = tree;
  const card = Object.fromEntries(alert.children.map((c) => [c.selector, c.cardinality]));
  expect(card).toEqual({
    slot: undefined, // no marker → required (present when used)
    ".close-button": "optional",
    ".icon": "optional", // `:opt` shorthand
    ".item": "one-or-more",
    ".tag": "one-or-more", // `:more` shorthand
    ".badge": "many",
    ".body": undefined,
  });
});

test("@structure bounded `:max-<n>` and chained `:one-or-more:max-<n>` cardinalities parse and strip", () => {
  const tree = parseStructure(
    ".button-group {\n  button:max-2 {}\n  .item:one-or-more:max-3 {}\n  .tag:more:max-4 {}\n}",
    parsePostcss,
  );
  const [group] = tree;
  const card = Object.fromEntries(group.children.map((c) => [c.selector, c.cardinality]));
  expect(card).toEqual({
    button: "max-2",
    ".item": "one-or-more-max-3",
    ".tag": "one-or-more-max-4", // `:more` shorthand chains the same as `:one-or-more`
  });
});

test("cardinality captures preserve numeric spelling and reject invalid bounds", () => {
  expect(cardinalityFromMatch({ max: "002" })).toBe("max-002");
  expect(cardinalityFromMatch({ oomMax: "9007199254740993" })).toBe(
    "one-or-more-max-9007199254740993",
  );
  expect(cardinalityFromMatch({ max: "2px" })).toBeUndefined();
  expect(cardinalityFromMatch({ oomMax: "-2" })).toBeUndefined();
});

test("@structure bounded cardinality also parses on `@component` at-rule refs", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component button-group",
      " * @summary A row of buttons.",
      " * @structure",
      " * .button-group {",
      " *   @component button:one-or-more:max-2 {}",
      " * }",
      " */",
      ".button-group {}",
    ].join("\n"),
  );
  expect(entry.structure).toEqual([
    {
      selector: ".button-group",
      children: [{ selector: "@component button", cardinality: "one-or-more-max-2", children: [] }],
    },
  ]);
});

test.each([
  ["optional", "optional"],
  ["opt", "optional"],
  ["many", "many"],
  ["one-or-more", "one-or-more"],
  ["more", "one-or-more"],
  ["max-5", "max-5"],
  ["one-or-more:max-3", "one-or-more-max-3"],
  ["more:max-4", "one-or-more-max-4"],
])("explicit structure parses :%s", (suffix, cardinality) => {
  const css = `.root { .item:${suffix} {} @component button:${suffix} {} }`;
  const explicit = parseStructure(css, parsePostcss);
  const expected = [
    {
      selector: ".root",
      children: [
        { selector: ".item", cardinality, children: [] },
        { selector: "@component button", cardinality, children: [] },
      ],
    },
  ];
  expect(explicit).toEqual(expected);
});

test("@structure preserves private member flags after cardinality", () => {
  expect(
    parseStructure(".root { @member button:more:max-4 private {} }", parsePostcss, "root"),
  ).toEqual([
    {
      selector: ".root",
      children: [
        {
          selector: "@component root.button private",
          cardinality: "one-or-more-max-4",
          children: [],
        },
      ],
    },
  ]);
});

test("@structure a nested `@variant` group is a local choice between alternative subtrees", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component action-row",
      " * @summary A single action, or a small group of them.",
      " * @structure",
      " * .action-row {",
      " *   slot {}",
      " *   @variant single {",
      " *     @component button:optional {}",
      " *   }",
      " *   @variant group {",
      " *     .button-group:optional {",
      " *       @component button:one-or-more:max-2 {}",
      " *     }",
      " *   }",
      " * }",
      " */",
      ".action-row {}",
    ].join("\n"),
  );
  const [root] = entry.structure!;
  expect(root.children).toHaveLength(2);
  const [slot, variantGroup] = root.children;
  expect(slot).toEqual({ selector: "slot", children: [] });
  expect(variantGroup.selector).toBe("");
  expect(variantGroup.children).toEqual([]);
  expect(variantGroup.variants).toEqual([
    {
      name: "single",
      nodes: [{ selector: "@component button", cardinality: "optional", children: [] }],
    },
    {
      name: "group",
      nodes: [
        {
          selector: ".button-group",
          cardinality: "optional",
          children: [
            { selector: "@component button", cardinality: "one-or-more-max-2", children: [] },
          ],
        },
      ],
    },
  ]);
});

test("@structure a nested `@variant` group renders as a nested subgraph in Mermaid", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component action-row",
      " * @summary A single action, or a small group of them.",
      " * @structure",
      " * .action-row {",
      " *   @variant single {",
      " *     .action:optional {}",
      " *   }",
      " *   @variant group {",
      " *     .action-group:optional {}",
      " *   }",
      " * }",
      " */",
      ".action-row {}",
    ].join("\n"),
  );
  const mermaid = toMermaid(entry.structure!);
  expect(mermaid).toContain(`subgraph sg2 ["single"]`);
  expect(mermaid).toContain(`subgraph sg4 ["group"]`);
  expect(mermaid).toContain(`[".action (0..1)"]:::cssdoc-root`);
  expect(mermaid).toContain(`[".action-group (0..1)"]:::cssdoc-root`);
});

test("@structure captures an optional leading description without disturbing the tree", () => {
  const [withDesc] = parseCssDocs(
    `/**\n * @component tabs\n * @summary Tabs.\n` +
      ` * @structure How the parts nest.\n * .tabs {\n *   .panel {}\n * }\n */\n.tabs {}`,
  );
  expect(withDesc.structureDescription).toBe("How the parts nest.");
  expect(withDesc.structure).toEqual([
    { selector: ".tabs", children: [{ selector: ".panel", children: [] }] },
  ]);
  // A body that opens with a selector has no description.
  const [noDesc] = parseCssDocs(
    `/**\n * @component tabs\n * @summary Tabs.\n * @structure\n * .tabs {\n *   .panel {}\n * }\n */\n.tabs {}`,
  );
  expect(noDesc.structureDescription).toBeUndefined();
  expect(noDesc.structure).toHaveLength(1);
});

test.each([".tabs", "#tabs", ":host", "[data-tabs]", "*", "&", "> .tabs", "+ .tabs", "~ .tabs"])(
  "@structure doesn't treat a multiline selector starting with %s as a description",
  (selector) => {
    const doc = parseDocComment(
      `/**\n * @structure ${selector}\n * {}\n */`,
      new CssDocConfiguration(),
      parsePostcss,
    );
    expect(doc.structureDescription).toBeUndefined();
    expect(doc.structure).toEqual([{ selector, children: [] }]);
  },
);

test("@structure keeps compound selectors verbatim and never throws on a malformed body", () => {
  // A compound node — `:has()`/`:is()`/`:not()` express relationships between parts.
  const compound = parseStructure(".tabs {\n  .list:has(.tab) {}\n}", parsePostcss);
  expect(compound).toEqual([
    {
      selector: ".tabs",
      children: [{ selector: ".list:has(.tab)", children: [] }],
    },
  ]);
  // A malformed (unclosed) body parses to an empty tree rather than throwing.
  expect(parseStructure(".tabs {\n  .list {", parsePostcss)).toEqual([]);
  // With no parser injected, the tree is empty (the grammar module carries no CSS-parser dependency).
  expect(parseStructure(".tabs {\n  .panel {}\n}")).toEqual([]);
});

test("@structure :is(.<class>) extracts a co-located component class from the selector", () => {
  const basic = parseStructure(".tabs-list:is(.pfx-card) {}", parsePostcss);
  expect(basic).toEqual([{ selector: ".tabs-list", colocated: ".pfx-card", children: [] }]);

  // Both orderings of cardinality + co-location produce the same result.
  const cardFirst = parseStructure(".tabs-list:optional:is(.pfx-card) {}", parsePostcss);
  expect(cardFirst).toEqual([
    { selector: ".tabs-list", cardinality: "optional", colocated: ".pfx-card", children: [] },
  ]);
  const colocFirst = parseStructure(".tabs-list:is(.pfx-card):optional {}", parsePostcss);
  expect(colocFirst).toEqual([
    { selector: ".tabs-list", cardinality: "optional", colocated: ".pfx-card", children: [] },
  ]);

  // Element selector.
  const elem = parseStructure("button:one-or-more:is(.pfx-button) {}", parsePostcss);
  expect(elem).toEqual([
    { selector: "button", cardinality: "one-or-more", colocated: ".pfx-button", children: [] },
  ]);

  // Bare element type in :is() (co-locating an element-typed component).
  const elemType = parseStructure(".wrapper:is(nav) {}", parsePostcss);
  expect(elemType).toEqual([{ selector: ".wrapper", colocated: "nav", children: [] }]);

  // ID selector in :is().
  const id = parseStructure(".wrapper:is(#dialog) {}", parsePostcss);
  expect(id).toEqual([{ selector: ".wrapper", colocated: "#dialog", children: [] }]);

  // Attribute selector in :is().
  const attr = parseStructure('.wrapper:is([data-role="card"]) {}', parsePostcss);
  expect(attr).toEqual([{ selector: ".wrapper", colocated: '[data-role="card"]', children: [] }]);

  // Complex compound: attribute + class + co-location + cardinality.
  const complex = parseStructure(
    'slot[name="trailing"].trailing-content:is(.pfx-card):optional {}',
    parsePostcss,
  );
  expect(complex).toEqual([
    {
      selector: 'slot[name="trailing"].trailing-content',
      cardinality: "optional",
      colocated: ".pfx-card",
      children: [],
    },
  ]);

  // Multi-selector :is() is NOT treated as co-location — stays verbatim, no colocated set.
  const multi = parseStructure(".foo:is(.a, .b) {}", parsePostcss);
  expect(multi[0].selector).toBe(".foo:is(.a, .b)");
  expect(multi[0].colocated).toBeUndefined();
});

test("prose tags surface on the entry, including stage and visibility", () => {
  const [entry] = parseCssDocs(
    `/**\n * @component switch\n * @remarks A longer explanation.\n * @since 2.1.0\n` +
      ` * @group Forms\n * @a11y Announce state changes with aria-checked.\n` +
      ` * @stage beta\n * @visibility internal\n */\n` +
      `.switch { display: inline-flex; }`,
  );
  expect(entry.remarks).toBe("A longer explanation.");
  expect(entry.since).toBe("2.1.0");
  expect(entry.group).toBe("Forms");
  expect(entry.accessibility).toBe("Announce state changes with aria-checked.");
  expect(entry.releaseStage).toBe("beta");
  expect(entry.visibility).toBe("internal");
});

test("legacy release-stage and visibility flags are ignored", () => {
  const [entry] = parseCssDocs(
    `/**\n * @component legacy\n * @alpha\n * @beta\n * @experimental\n * @stable\n * @internal\n * @public\n */\n.legacy {}`,
  );
  expect(entry.releaseStage).toBeUndefined();
  expect(entry.visibility).toBeUndefined();
});

test("multiline @remarks and @accessibility preserve newlines through the parser", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component wrapper",
      " * @remarks",
      " * ✅ Use when:",
      " * - Building a full product page",
      " * - The page uses GlobalNav",
      " * @accessibility",
      " * Guidance:",
      " * - Map the main area to a landmark",
      " * - Give the nav a label",
      " */",
      ".wrapper {}",
    ].join("\n"),
  );
  expect(entry.remarks).toBe(
    "✅ Use when:\n- Building a full product page\n- The page uses GlobalNav",
  );
  expect(entry.accessibility).toBe(
    "Guidance:\n- Map the main area to a landmark\n- Give the nav a label",
  );
});

test("shadow parts and pseudo-class states are captured distinctly from class parts and :state()", () => {
  const [sw] = parseCssDocs(
    `/**\n * @component switch\n * @part .track — The rail.\n * @csspart thumb — The knob.\n */\n` +
      `.switch {}\n@scope (.switch) { :scope .track {} }\n` +
      `.switch::part(thumb) {}\n.switch:disabled {}\n.switch:state(on) {}`,
  );
  // Class-based `@part` → parts; shadow `@csspart` / `::part()` → shadowParts (no longer aliased).
  expect(sw.parts.map((p) => p.name)).toEqual(["track"]);
  expect(sw.shadowParts.map((p) => p.name)).toEqual(["thumb"]);
  expect(sw.shadowParts[0].description).toBe("The knob.");
  // `:disabled` is a pseudo-class state; `:state(on)` is a custom state.
  expect(sw.states.find((s) => s.name === "disabled")?.kind).toBe("pseudo-class");
  expect(sw.states.find((s) => s.name === "on")?.kind).toBe("custom");
});

test("attribute-reflected cssstate is derived from CSS and merges with authored prose", () => {
  const [entry] = parseCssDocs(
    `/**\n * @component col-header\n * @cssstate [aria-sort="ascending"] — Column sorted ascending.\n */\n` +
      `.col-header {}\n.col-header[aria-sort="ascending"] { color: blue; }\n` +
      `.col-header[aria-sort="descending"] { color: red; }\n` +
      `.col-header[data-testid="x"] { outline: none; }`,
  );
  const asc = entry.states.find((s) => s.name === "aria-sort=ascending");
  expect(asc?.kind).toBe("attribute");
  expect(asc?.selector).toBe('[aria-sort="ascending"]');
  expect(asc?.description).toBe("Column sorted ascending.");
  // Derived purely from CSS (no authored tag) still becomes a documented state.
  const desc = entry.states.find((s) => s.name === "aria-sort=descending");
  expect(desc?.kind).toBe("attribute");
  expect(desc?.description).toBeUndefined();
  // Not on the ARIA/data-state allow-list — not auto-derived as a state.
  expect(entry.states.some((s) => s.name.startsWith("data-testid"))).toBe(false);
});

test("CSSOM at-rule surfaces are AST-derived (function, keyframes, layer, media, state)", () => {
  const [entry] = parseCssDocs(
    `/**\n * @component spinner\n * @function --spin — Rotation helper.\n */\n` +
      `@layer components;\n` +
      `@function --spin(--turns <number>) returns <angle> { result: calc(var(--turns) * 360deg); }\n` +
      `@keyframes spin { from { rotate: 0deg; } to { rotate: 360deg; } }\n` +
      `@media (prefers-reduced-motion: reduce) {\n  .spinner { animation: none; }\n}\n` +
      `.spinner:state(paused) { animation-play-state: paused; }`,
  );
  const fn = entry.functions.find((f) => f.name === "--spin")!;
  expect(fn.parameters).toEqual(["--turns"]);
  expect(fn.result).toBe("<angle>");
  expect(fn.description).toBe("Rotation helper.");
  expect(entry.animations.map((a) => a.name)).toContain("spin");
  expect(entry.layers.map((l) => l.name)).toContain("components");
  expect(entry.conditions).toContainEqual({
    type: "media",
    query: "(prefers-reduced-motion: reduce)",
    description: undefined,
  });
  expect(entry.states.map((s) => s.name)).toContain("paused");
});

test("a custom tag is captured only when registered in the configuration", () => {
  const configuration = new CssDocConfiguration();
  const token = new CssDocTagDefinition({ tagName: "@token", syntaxKind: "block" });
  configuration.addTagDefinition(token);
  const css = `/**\n * @component chip\n * @token --chip-bg\n */\n.chip { color: red; }`;

  // Unregistered: the tag is ignored (graceful degradation).
  expect(parseCssDocs(css)[0].customBlocks).toBeUndefined();
  // Registered: captured under customBlocks, keyed by tag name.
  expect(parseCssDocs(css, { configuration })[0].customBlocks).toEqual({
    token: ["--chip-bg"],
  });
});

test("setSupportForTag(false) disables a standard tag", () => {
  const configuration = new CssDocConfiguration();
  const summary = configuration.tryGetTagDefinition("summary")!;
  configuration.setSupportForTag(summary, false);
  const [entry] = parseCssDocs(
    `/**\n * @component note\n * @summary Ignored now.\n */\n.note { color: red; }`,
    { configuration },
  );
  expect(entry.summary).toBeUndefined();
});

test("a record tag added via configuration opens a record", () => {
  const configuration = new CssDocConfiguration();
  configuration.addTagDefinition(
    new CssDocTagDefinition({ tagName: "@pattern", syntaxKind: "record", recordKind: "component" }),
  );
  const [entry] = parseCssDocs(`/**\n * @pattern card\n */\n.card { display: block; }`, {
    configuration,
  });
  expect(entry?.name).toBe("card");
  expect(entry?.kind).toBe("component");
});

test("only /** doc comments open records — a plain comment mentioning @component is ignored", () => {
  const css = [
    "/* TODO: revisit the @component button spacing */",
    "/**",
    " * @component button",
    " * @summary The primary action control.",
    " */",
    ".button { color: red; }",
    "/* banner: @component ghost must NOT become a record */",
    ".button--secondary { color: blue; }",
  ].join("\n");
  const entries = parseCssDocs(css);
  expect(entries.map((e) => e.name)).toEqual(["button"]);
  // The button record still owns its modifier, even though a plain comment sits between the rules.
  expect(entries[0]?.modifiers.map((m) => m.name)).toContain("button--secondary");
});

test("@tokens annotates an AST-discovered token and unions a token not found via var()", () => {
  const css = [
    "/**",
    " * @component card",
    " * @tokens --color-bg — The surface background.",
    " * @tokens --color-fg-indirect — Set on the element by script.",
    " */",
    ".card { background: var(--color-bg); color: var(--color-fg); }",
  ].join("\n");
  const [card] = parseCssDocs(css);
  const consumed = card.cssPropertiesConsumed;
  const byName = new Map(consumed.map((t) => [t.name, t.description]));
  // AST-discovered var() tokens are present; the authored one carries its description.
  expect(byName.get("--color-bg")).toBe("The surface background.");
  // A var() token with no @tokens prose is present without a description.
  expect(byName.has("--color-fg")).toBe(true);
  expect(byName.get("--color-fg")).toBeUndefined();
  // A @tokens-declared token never seen in var() is unioned in.
  expect(byName.get("--color-fg-indirect")).toBe("Set on the element by script.");
});

test("@usage, @compat, and @related populate their fields", () => {
  const css = [
    "/**",
    " * @component card",
    " * @usage Include the sheet, then apply the class.",
    " * @compat Uses @scope.",
    " * @compat Anchor positioning enhanced.",
    " * @related button — The action inside a card.",
    " * @related dialog",
    " */",
    ".card { color: red; }",
  ].join("\n");
  const [card] = parseCssDocs(css);
  expect(card.usage).toBe("Include the sheet, then apply the class.");
  expect(card.compat).toEqual(["Uses @scope.", "Anchor positioning enhanced."]);
  expect(card.related).toEqual([
    { name: "button", description: "The action inside a card." },
    { name: "dialog", description: undefined },
  ]);
});

test("@memberOf parses the bare and private forms", () => {
  const [cell] = parseCssDocs(
    `/**\n * @component table-cell\n * @memberOf table\n */\n.table-cell {}`,
  );
  expect(cell.memberOf).toEqual({ component: "table", private: false });

  const [item] = parseCssDocs(
    `/**\n * @component side-nav-bar-item\n * @memberOf side-nav-bar private\n */\n.side-nav-bar-item {}`,
  );
  expect(item.memberOf).toEqual({ component: "side-nav-bar", private: true });

  const [plain] = parseCssDocs(`/**\n * @component alert\n */\n.alert {}`);
  expect(plain.memberOf).toBeUndefined();
});

test("@members declares a parent's members directly, comma-separated", () => {
  const [tabs] = parseCssDocs(
    `/**\n * @component tabs\n * @members tab, panel, item\n */\n.tabs {}`,
  );
  expect(tabs.members).toEqual(["tab", "panel", "item"]);

  const [plain] = parseCssDocs(`/**\n * @component alert\n */\n.alert {}`);
  expect(plain.members).toBeUndefined();
});

test("@member appends repeatable parent-side member declarations", () => {
  const [tabs] = parseCssDocs(
    `/**\n * @component tabs\n * @member tab\n * @member panel private\n */\n.tabs {}`,
  );
  expect(tabs.members).toEqual(["tab", "panel"]);
  expect(tabs.memberDeclarations).toEqual([
    { name: "tab", private: false },
    { name: "panel", private: true },
  ]);
});

test("@members and @member merge in stable order with de-duplication", () => {
  const [tabs] = parseCssDocs(
    `/**\n * @component tabs\n * @members tab, panel\n * @member panel private\n * @member item\n */\n.tabs {}`,
  );
  expect(tabs.members).toEqual(["tab", "panel", "item"]);
  expect(tabs.memberDeclarations).toEqual([
    { name: "tab", private: false },
    { name: "panel", private: true },
    { name: "item", private: false },
  ]);
});

test("a dotted @component name implies @memberOf its immediate parent", () => {
  const [item] = parseCssDocs(`/**\n * @component foo.bar\n */\n.bar {}`);
  expect(item.memberOf).toEqual({ component: "foo", private: false });

  const [nested] = parseCssDocs(`/**\n * @component a.b.c\n */\n.c {}`);
  expect(nested.memberOf).toEqual({ component: "a.b", private: false });

  // An explicit @memberOf still wins over the inference.
  const [explicit] = parseCssDocs(
    `/**\n * @component foo.bar\n * @memberOf other private\n */\n.bar {}`,
  );
  expect(explicit.memberOf).toEqual({ component: "other", private: true });
});

test("issue #30: a memberOf record scoped under its parent's @scope doesn't flag its own base class as an undocumented part", () => {
  const css = [
    "/**",
    " * @component menu.item",
    " * @memberOf menu",
    " * @selector .item",
    " * @summary A menu entry.",
    " */",
    "@scope (.pfx-menu) {",
    "  :scope > .item {",
    "    display: block;",
    "  }",
    "}",
  ].join("\n");
  const [item] = parseCssDocs(css);
  expect(item.parts.map((p) => p.name)).not.toContain("item");
});

test("entry.source records line/column, and file when fileName is supplied", () => {
  const css = ["", "/**", " * @component card", " */", ".card { color: red; }"].join("\n");
  const [withFile] = parseCssDocs(css, { fileName: "cards.css" });
  expect(withFile.source).toEqual({ file: "cards.css", line: 2, column: 1 });

  const [withoutFile] = parseCssDocs(css);
  expect(withoutFile.source?.file).toBeUndefined();
  expect(withoutFile.source?.line).toBe(2);
});

test("multi-line tag descriptions: @modifier with wrapped description", () => {
  const src = [
    "/**",
    " * @component progress-circle",
    " * @modifier -should-animate — @interaction Toggled by JS",
    " *   while the ring's growth animation runs.",
    " */",
    ".progress-circle {}",
    ".progress-circle.-should-animate {}",
  ].join("\n");
  const [circle] = parseCssDocs(src);
  const modifier = circle.modifiers.find((m) => m.name === "-should-animate");
  expect(modifier?.description).toBe("Toggled by JS while the ring's growth animation runs.");
  expect(modifier?.interaction).toBe(true);
});

test("multi-line tag descriptions: @part with wrapped description", () => {
  const src = [
    "/**",
    " * @component widget",
    ' * @part [data-slot="content"] — The main content area.',
    " *   Supports nested components and complex layouts.",
    " */",
    ".widget {}",
    ".widget [data-slot='content'] {}",
  ].join("\n");
  const [widget] = parseCssDocs(src);
  const part = widget.parts.find((p) => p.name === "data-slot");
  expect(part?.description).toBe(
    "The main content area. Supports nested components and complex layouts.",
  );
});

test("multi-line tag descriptions: @cssproperty with wrapped description", () => {
  const src = [
    "/**",
    " * @component x-banner",
    " * @cssproperty --banner-bg <color> — Background color for the banner.",
    " *   Accepts any valid CSS color value.",
    " */",
    ".x-banner {}",
  ].join("\n");
  const [banner] = parseCssDocs(src);
  const prop = banner.cssPropertiesDeclared.find((p) => p.name === "--banner-bg");
  expect(prop?.description).toBe(
    "Background color for the banner. Accepts any valid CSS color value.",
  );
});

test("multi-line tag descriptions: @cssstate with wrapped description", () => {
  const src = [
    "/**",
    " * @component button",
    " * @cssstate :disabled — The button is disabled and",
    " *   cannot be interacted with.",
    " */",
    ".button {}",
    ".button:disabled {}",
  ].join("\n");
  const [button] = parseCssDocs(src);
  const state = button.states.find((s) => s.name === "disabled");
  expect(state?.description).toBe("The button is disabled and cannot be interacted with.");
});

test("multi-line tag descriptions: @csspart with wrapped description", () => {
  const src = [
    "/**",
    " * @component x-widget",
    " * @csspart handle — The drag handle, exposing the full",
    " *   surface area for user interaction.",
    " */",
    ".x-widget {}",
  ].join("\n");
  const [widget] = parseCssDocs(src);
  const part = widget.shadowParts.find((p) => p.name === "handle");
  expect(part?.description).toBe(
    "The drag handle, exposing the full surface area for user interaction.",
  );
});

test("multi-line tag descriptions: preserve Markdown list structure in @remarks", () => {
  const src = [
    "/**",
    " * @component wrapper",
    " * @remarks",
    " * ✅ Use when:",
    " * - Building a full product page",
    " * - The page uses GlobalNav",
    " */",
    ".wrapper {}",
  ].join("\n");
  const [wrapper] = parseCssDocs(src);
  expect(wrapper.remarks).toBe(
    "✅ Use when:\n- Building a full product page\n- The page uses GlobalNav",
  );
});

test("multi-line tag descriptions: preserve Markdown paragraph structure in @accessibility", () => {
  const src = [
    "/**",
    " * @component button",
    " * @accessibility",
    " * Map this element to a button role.",
    " *",
    " * - Use aria-label for icon-only buttons.",
    " * - Ensure sufficient color contrast.",
    " */",
    ".button {}",
  ].join("\n");
  const [button] = parseCssDocs(src);
  expect(button.accessibility).toContain("\n- Use aria-label");
  expect(button.accessibility).toContain("\n- Ensure sufficient");
});

test("multi-line tag descriptions: collapse extra indentation in continuation lines", () => {
  const src = [
    "/**",
    " * @component button",
    " * @modifier -large — Makes the button large.",
    " *            Great for call-to-action sections.",
    " */",
    ".button {}",
    ".button.-large {}",
  ].join("\n");
  const [button] = parseCssDocs(src);
  const mod = button.modifiers.find((m) => m.name === "-large");
  expect(mod?.description).toBe("Makes the button large. Great for call-to-action sections.");
});

test("multi-line tag descriptions: single-line tags remain unchanged", () => {
  const src = [
    "/**",
    " * @component simple-widget",
    " * @modifier -compact — A single-line description with no wrapping.",
    " * @part .header — Also a single line.",
    " */",
    ".simple-widget {}",
    ".simple-widget.-compact {}",
    ".simple-widget .header {}",
  ].join("\n");
  const [widget] = parseCssDocs(src);
  const modifier = widget.modifiers.find((m) => m.name === "-compact");
  expect(modifier?.description).toBe("A single-line description with no wrapping.");
  const part = widget.parts.find((p) => p.name === "header");
  expect(part?.description).toBe("Also a single line.");
});

test("multi-line tag descriptions: empty continuation lines are ignored at edges", () => {
  const src = [
    "/**",
    " * @component test-widget",
    " * @summary This is a summary.",
    " * ",
    " * @modifier -test — First line.",
    " *   ",
    " *   Second line.",
    " */",
    ".test-widget {}",
    ".test-widget.-test {}",
  ].join("\n");
  const [widget] = parseCssDocs(src);
  const mod = widget.modifiers.find((m) => m.name === "-test");
  expect(mod?.description).toBe("First line. Second line.");
});

test("multi-line tag descriptions: numbered and header structures are preserved", () => {
  const src = [
    "/**",
    " * @component steps",
    " * @remarks",
    " * Follow these steps:",
    " * 1. Click the button",
    " * 2. Wait for confirmation",
    " * 3. Proceed to the next page",
    " */",
    ".steps {}",
  ].join("\n");
  const [steps] = parseCssDocs(src);
  expect(steps.remarks).toContain("1. Click");
  expect(steps.remarks).toContain("2. Wait");
  expect(steps.remarks).toContain("3. Proceed");
});

test("multi-line descriptions preserve heading prefixes only with one to six hashes and whitespace", () => {
  const remarks = (heading: string) =>
    parseDocComment(`/**\n * @remarks Intro\n * ${heading}\n * More text\n */`).remarks;
  expect(remarks("# Title")).toBe("Intro\n# Title\nMore text");
  expect(remarks("###### Title")).toBe("Intro\n###### Title\nMore text");
  expect(remarks("####### Title")).toBe("Intro ####### Title More text");
  expect(remarks("#Title")).toBe("Intro #Title More text");
});

test("multi-line descriptions retain the existing list and blockquote structure heuristic", () => {
  const remarks = (body: string) =>
    parseDocComment(`/**\n * @remarks Intro\n * ${body}\n * Tail\n */`).remarks;
  for (const marker of ["- ", "* ", "+ ", "> ", "12.\t", "Version 1. "]) {
    expect(remarks(`${marker}item`)).toBe(`Intro\n${marker}item\nTail`);
  }
  expect(remarks("1) item")).toBe("Intro 1) item Tail");
});
