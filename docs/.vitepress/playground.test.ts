import { html } from "@codemirror/lang-html";
import { syntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { expect, test } from "vite-plus/test";

test("parses playground HTML with embedded CSS and JavaScript", () => {
  const state = EditorState.create({
    doc: '<style>.tabs { color: red; }</style><div class="tabs">One</div><script>const tab = 1;</script>',
    extensions: [html()],
  });
  const nodes: string[] = [];
  syntaxTree(state).iterate({
    enter: (node) => {
      nodes.push(node.name);
    },
  });

  expect(nodes).toContain("StyleSheet");
  expect(nodes).toContain("Script");
  expect(nodes).toContain("AttributeValue");
});
