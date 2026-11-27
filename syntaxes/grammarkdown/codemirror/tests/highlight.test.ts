import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { expect, test } from "vite-plus/test";

import { grammarkdownHighlight, tokenizeGrammarkdown } from "../src/index.ts";

const label = (src: string) =>
  tokenizeGrammarkdown(src).map((token) => ({
    type: token.type,
    text: src.slice(token.from, token.to),
  }));

test("highlights grammarkdown productions, parameters, terminals, and other tokens", () => {
  const tokens = label(
    "@define Strict\r\nSource[Yield, Await] ::: Item? `if` <letter> U+0041 one of\n// comment\n> prose",
  );
  expect(tokens).toContainEqual({ type: "directive", text: "@define" });
  expect(tokens).toContainEqual({ type: "production", text: "Source" });
  expect(tokens).toContainEqual({ type: "parameter", text: "Yield" });
  expect(tokens).toContainEqual({ type: "parameter", text: "Await" });
  expect(tokens).toContainEqual({ type: "operator", text: ":::" });
  expect(tokens).toContainEqual({ type: "nonterminal", text: "Item" });
  expect(tokens).toContainEqual({ type: "operator", text: "?" });
  expect(tokens).toContainEqual({ type: "terminal", text: "`if`" });
  expect(tokens).toContainEqual({ type: "character-class", text: "<letter>" });
  expect(tokens).toContainEqual({ type: "codepoint", text: "U+0041" });
  expect(tokens).toContainEqual({ type: "keyword", text: "one of" });
  expect(tokens).toContainEqual({ type: "comment", text: "// comment" });
  expect(tokens).toContainEqual({ type: "prose", text: "> prose" });
});

test("keeps constraints across lines and doesn't highlight tokens inside comments or terminals", () => {
  const src = "Rule : [lookahead !=\n `@define`]\n// Other : `x`\nNext : Thing";
  const tokens = label(src);
  expect(tokens).toContainEqual({ type: "keyword", text: "lookahead" });
  expect(tokens).toContainEqual({ type: "operator", text: "!=" });
  expect(tokens).toContainEqual({ type: "punct", text: "[" });
  expect(tokens).toContainEqual({ type: "punct", text: "]" });
  expect(tokens).toContainEqual({ type: "terminal", text: "`@define`" });
  expect(tokens).toContainEqual({ type: "comment", text: "// Other : `x`" });
  expect(tokens).toContainEqual({ type: "production", text: "Next" });
  expect(tokens).not.toContainEqual({ type: "directive", text: "@define" });
  expect(tokens).not.toContainEqual({ type: "nonterminal", text: "Other" });

  const spans = tokenizeGrammarkdown(src);
  expect(spans.every((token, i) => i === 0 || spans[i - 1].to <= token.from)).toBe(true);
});

test("updates editor decorations when an edit changes multiline context", () => {
  const state = EditorState.create({
    doc: "Rule : [lookahead\nNext : Thing",
    extensions: [grammarkdownHighlight()],
  });
  const read = (editor: EditorState) => {
    const sets = editor.facet(EditorView.decorations);
    const spans: { from: number; to: number; className: string }[] = [];
    for (const set of sets) {
      if (typeof set === "function") throw new TypeError("Expected state-provided decorations");
      set.between(0, editor.doc.length, (from, to, decoration) => {
        const spec: unknown = decoration.spec;
        if (typeof spec !== "object" || spec === null || !("class" in spec)) {
          throw new Error("Expected a decoration spec");
        }
        const className = spec.class;
        if (typeof className !== "string") throw new TypeError("Expected a decoration class");
        spans.push({ from, to, className });
      });
    }
    return spans.map((span) => ({
      text: editor.doc.sliceString(span.from, span.to),
      className: span.className,
    }));
  };
  expect(read(state)).toContainEqual({ text: "Next", className: "cm-grammarkdown-parameter" });
  const next = state.update({ changes: { from: 17, insert: "]" } }).state;
  expect(read(next)).toContainEqual({ text: "Next", className: "cm-grammarkdown-production" });
});
