/**
 * @cssdoc/regex/tests/definitions.test
 *
 * Comprehensive test suite for all pattern definitions.
 * Tests all passes and fails from PATTERN_DEFINITIONS in one place.
 *
 * @module
 */

import { describe, test, expect } from "vite-plus/test";

import { PATTERN_DEFINITIONS, type UnifiedPatternDef } from "../src/definitions.js";
import {
  COMMENT_END,
  COMMENT_END_TEXT,
  DOC_COMMENT_START,
  DOC_COMMENT_START_TEXT,
  MARKDOWN_BACKTICK_FENCE,
  MARKDOWN_BACKTICK_FENCE_TEXT,
  MARKDOWN_BACKTICK_FENCE_LINE_PREFIX,
  HTML_QUOTED_ATTRIBUTE,
  HTML_QUOTED_ATTRIBUTE_VALUE,
  CARRIAGE_RETURN_CHAR,
  LINE_FEED_CHAR,
} from "../src/index.ts";

function requiredRegex(def: UnifiedPatternDef): RegExp {
  if (!def.regex) throw new Error(`Missing compiled regex for ${def.name}`);
  return def.regex;
}

const SINGLE_VALUE_PATTERNS = new Set([
  "CARRIAGE_RETURN_CHAR",
  "LINE_FEED_CHAR",
  "CARRIAGE_RETURN",
  "LINE_FEED",
  "DASH",
  "DOUBLE_DASH",
  "UNDERSCORE_CHAR",
  "FORWARD_SLASH_CHAR",
  "BACKSLASH_CHAR",
  "DOC_COMMENT_START_TEXT",
  "COMMENT_END_TEXT",
  "FORWARD_SLASH",
  "ASTERISK",
  "ASTERISK_CHAR",
  "PLUS_CHAR",
  "CARET_CHAR",
  "DOLLAR_CHAR",
  "TILDE_CHAR",
  "AMPERSAND_CHAR",
  "EQUALS_CHAR",
  "LESS_THAN_CHAR",
  "GREATER_THAN_CHAR",
  "COLON_CHAR",
  "DOT_CHAR",
  "POUND_CHAR",
  "AT_CHAR",
  "PIPE_CHAR",
  "PAREN_OPEN_CHAR",
  "PAREN_CLOSE_CHAR",
  "BRACKET_OPEN_CHAR",
  "BRACKET_CLOSE_CHAR",
  "QUOTE_SINGLE_CHAR",
  "QUOTE_DOUBLE_CHAR",
  "BACKTICK_CHAR",
  "BRACE_OPEN_CHAR",
  "BRACE_CLOSE_CHAR",
  "LESS_THAN",
  "GREATER_THAN",
  "COMMENT_START",
  "DOC_COMMENT_START",
  "COMMENT_END",
  "COMMENT_LINE_MARKER",
  "AT",
  "PIPE",
  "PAREN_OPEN",
  "PAREN_CLOSE",
  "COLON",
  "DOT",
  "POUND",
  "BRACKET_OPEN",
  "BRACKET_CLOSE",
  "QUOTE_SINGLE",
  "QUOTE_DOUBLE",
  "BRACE_OPEN",
  "BRACE_CLOSE",
  "HTML_LIKE_STYLE_CLOSE_PREFIX",
  "MARKDOWN_BACKTICK_FENCE",
  "CSSDOC_STRUCTURE_TAG_KEYWORD",
]);
const TWO_VALUE_PATTERNS = new Set(["SPACE_TAB", "HTML_LIKE_CLASS_ATTRIBUTE_NAME"]);

function matchesFixture(name: string, def: UnifiedPatternDef, input: string): boolean {
  if (def.tier === 0 && (name.endsWith("_CHAR") || name.endsWith("_TEXT"))) {
    return input === def.source;
  }
  if (name === "WORD_BOUNDARY") return new RegExp(def.source, def.flags).test(input);
  return new RegExp(`^(?:${def.source})$`, def.flags).test(input);
}

test("distinguishes literal line characters and splits CRLF as one line ending", () => {
  expect(`${CARRIAGE_RETURN_CHAR}${LINE_FEED_CHAR}`).toBe("\r\n");
  expect("one\r\ntwo\rthree\nfour".split(/\r\n|\r|\n/u)).toEqual(["one", "two", "three", "four"]);
  expect(/^(?:\r\n|\r|\n)$/u.test("\r\n")).toBe(true);
});

test("captures only a trailing lowercase ASCII filename extension", () => {
  const pattern = requiredRegex(PATTERN_DEFINITIONS.FILE_EXTENSION);
  expect("dir/file.scss".match(pattern)?.[1]).toBe("scss");
  expect("file.scss1".match(pattern)).toBeNull();
  expect("file.".match(pattern)).toBeNull();
});

test("matches the same doc-comment opener as the literal form without consuming extra stars", () => {
  expect(DOC_COMMENT_START.exec("/*** text")?.[0]).toBe(DOC_COMMENT_START_TEXT);
  expect(DOC_COMMENT_START.exec("/* text")).toBeNull();
});

test("matches the literal comment closer without consuming extra stars", () => {
  expect(COMMENT_END.exec("**/")?.[0]).toBe(COMMENT_END_TEXT);
  expect(COMMENT_END.exec("/*")).toBeNull();
});

test("keeps the literal fence distinct from its regex source and detects indented line prefixes", () => {
  expect(MARKDOWN_BACKTICK_FENCE.exec("````")?.[0]).toBe(MARKDOWN_BACKTICK_FENCE_TEXT);
  expect(MARKDOWN_BACKTICK_FENCE_LINE_PREFIX.exec("text\n \t```css")?.[0]).toBe("\n \t```");
  expect(MARKDOWN_BACKTICK_FENCE_LINE_PREFIX.exec("text ```css")).toBeNull();
});

test("captures simple code spans when splitting Markdown prose", () => {
  const pattern = /(`[^`]*`)/gu;
  expect("a `x` b `` c `y\nz`".split(pattern)).toEqual([
    "a ",
    "`x`",
    " b ",
    "``",
    " c ",
    "`y\nz`",
    "",
  ]);
});

test("preserves HTML attribute value captures for either quote style", () => {
  expect(HTML_QUOTED_ATTRIBUTE_VALUE.exec('"double"')?.slice(1)).toEqual(["double", undefined]);
  expect(HTML_QUOTED_ATTRIBUTE_VALUE.exec("'single'")?.slice(1)).toEqual([undefined, "single"]);
  expect(HTML_QUOTED_ATTRIBUTE.exec('data-state = "open"')?.slice(1)).toEqual([
    "data-state",
    "open",
    undefined,
  ]);
});

test("matches HTML comments separately, including multiline comments", () => {
  const comments = /<!--[\s\S]*?-->/gu;
  expect([..."<!-- a\nb --> text <!-- c -->".matchAll(comments)].map((match) => match[0])).toEqual([
    "<!-- a\nb -->",
    "<!-- c -->",
  ]);
});

test.each([
  ['[class*="-icon-"]', ["*", "-icon-", undefined, undefined]],
  ["[ class ~= 'active' ]", ["~", undefined, "active", undefined]],
  ["[class=active]", ["", undefined, undefined, "active"]],
  ["[class$=]", ["$", undefined, undefined, ""]],
  ["[class$=   ]", ["$", undefined, undefined, ""]],
])("captures the operator and value in %s", (selector, captures) => {
  const pattern = requiredRegex(PATTERN_DEFINITIONS.CSS_CLASS_ATTRIBUTE_SELECTOR);
  expect(selector.match(pattern)?.slice(1)).toEqual(captures);
});

test("attribute patterns reject long unterminated whitespace without backtracking", () => {
  const whitespace = " ".repeat(100_000);
  const start = performance.now();
  expect(
    requiredRegex(PATTERN_DEFINITIONS.CSS_CLASS_ATTRIBUTE_SELECTOR).test(`[class=${whitespace}`),
  ).toBe(false);
  expect(
    requiredRegex(PATTERN_DEFINITIONS.CSSDOC_MODIFIER_ATTRIBUTE).test(`[type=${whitespace}`),
  ).toBe(false);
  expect(performance.now() - start).toBeLessThan(1000);
});

test.each(["div", "<div>", "< div", "div >"])("captures the element name from %s", (token) => {
  const pattern = /^<?\s*([a-z][a-z0-9-]*)\s*>?$/u;
  expect(pattern.exec(token)?.[1]).toBe("div");
});

test("captures base-class references without admitting modifier or digit prefixes", () => {
  const pattern = /\.([A-Za-z_][\w-]*)/gu;
  expect(
    [...".Card ._part-1 .-modifier .1part".matchAll(pattern)].map((match) => match[1]),
  ).toEqual(["Card", "_part-1"]);
});

test("captures permissive class references, including modifiers and digit prefixes", () => {
  const pattern = /\.([\w-]+)/gu;
  expect(
    [...".Card ._part-1 .-modifier .1part".matchAll(pattern)].map((match) => match[1]),
  ).toEqual(["Card", "_part-1", "-modifier", "1part"]);
});

test("preserves selector scanning captures and strips functional pseudo selectors", () => {
  const state = /:state\(\s*([\w-]+)\s*\)/gu;
  const part = /::part\(\s*([\w-]+)\s*\)/gu;
  const pseudo = /::?[\w-]+(\([^)]*\))?/gu;
  const selector = ".card:state( -open )::part(label):not(.hidden):hover";
  expect([...selector.matchAll(state)].map((match) => match[1])).toEqual(["-open"]);
  expect([...selector.matchAll(part)].map((match) => match[1])).toEqual(["label"]);
  expect(selector.replaceAll(pseudo, "")).toBe(".card");
});

test("preserves typed and shorthand structure reference captures", () => {
  const typed =
    /^(component|name|utility|declaration)\s+([\w-]+(?:\.[\w-]+)*)(?::([\w-]+))?(?:\s+(private))?$/u;
  const shorthand = /^([\w-]+(?:\.[\w-]+)*)(?::([\w-]+))?(?:\s+(private))?$/u;
  expect(typed.exec("component menu.item:compact private")?.slice(1)).toEqual([
    "component",
    "menu.item",
    "compact",
    "private",
  ]);
  expect(shorthand.exec("menu.item:compact private")?.slice(1)).toEqual([
    "menu.item",
    "compact",
    "private",
  ]);
});

describe("Pattern Definitions", () => {
  test("exports at least 40 patterns", () => {
    expect(Object.keys(PATTERN_DEFINITIONS).length).toBeGreaterThanOrEqual(40);
  });

  Object.entries(PATTERN_DEFINITIONS).forEach(([name, def]) => {
    describe(`${name} (Tier ${def.tier})`, () => {
      test("has a source string", () => {
        expect(def.source).toBeDefined();
        expect(def.source).toBeTypeOf("string");
        expect(def.source.length).toBeGreaterThan(0);
      });

      test("has a canonical native regex or is a literal primitive", () => {
        const literal = name.endsWith("_CHAR") || name.endsWith("_TEXT");
        expect(def.regex === undefined).toBe(literal);
        const source = literal ? def.source : requiredRegex(def).source;
        expect(source).toBeTypeOf("string");
        expect(source.length).toBeGreaterThan(0);
      });

      test("has a description", () => {
        expect(def.description).toBeDefined();
        expect(def.description.length).toBeGreaterThan(0);
      });

      test("has the required distinct passing and nonempty failing examples", () => {
        const passes = new Set(def.fixtures.passes.map(({ input }) => input));
        const fails = new Set(def.fixtures.fails.map(({ input }) => input).filter(Boolean));
        const minimumPasses = SINGLE_VALUE_PATTERNS.has(name)
          ? 1
          : TWO_VALUE_PATTERNS.has(name)
            ? 2
            : 3;
        expect(passes.size).toBeGreaterThanOrEqual(minimumPasses);
        expect(fails.size).toBeGreaterThanOrEqual(2);
      });

      def.fixtures.passes.forEach((testCase) => {
        const note = testCase.note ? ` (${testCase.note})` : "";

        test(`matches "${testCase.input}"${note}`, () => {
          expect(matchesFixture(name, def, testCase.input)).toBe(true);
        });
      });

      def.fixtures.fails.forEach((testCase) => {
        test(`rejects "${testCase.input}" - ${testCase.reason}`, () => {
          expect(matchesFixture(name, def, testCase.input)).toBe(false);
        });
      });
    });
  });
});
