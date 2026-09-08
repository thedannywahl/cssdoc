import { expect, test } from "vite-plus/test";
import { cssDocEdits, type CssDocEdit } from "../src/comment-format.ts";

const apply = (text: string, edits: CssDocEdit[]): string =>
  [...edits]
    .sort((a, b) => b.start - a.start)
    .reduce(
      (value, edit) => value.slice(0, edit.start) + edit.newText + value.slice(edit.end),
      text,
    );

test("adds a closing line only after a CSSDoc record tag", () => {
  expect(apply("/**\n * @component button", cssDocEdits("/**\n * @component button", false))).toBe(
    "/**\n * @component button\n */",
  );
  expect(cssDocEdits("/**\n * @param value string", false)).toEqual([]);
  expect(cssDocEdits("/*\n * @component button", false)).toEqual([]);
});

test("recognizes every built-in CSSDoc record tag", () => {
  for (const tag of ["component", "name", "utility", "rule", "declaration", "layout"]) {
    expect(cssDocEdits(`/**\n * @${tag} value`, false)).not.toEqual([]);
  }
});

test("formats blank lines before an existing closer", () => {
  const text = "/**\n * @component button\n\n */";
  expect(apply(text, cssDocEdits(text, true))).toBe("/**\n * @component button\n * \n */");
});

test("preserves the comment indentation and line ending", () => {
  const text = "  /**\r\n   * @name button";
  expect(apply(text, cssDocEdits(text, false))).toBe("  /**\r\n   * @name button\r\n   */");
});
