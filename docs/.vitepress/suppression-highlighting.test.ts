import { expect, test } from "vite-plus/test";
import { createMarkdownRenderer } from "vitepress";

import cssdocGrammar from "../../syntaxes/cssdoc/tmlanguage/src/index.ts";

test("highlights suppression directives and rules without highlighting reasons or prose", async () => {
  const markdown = await createMarkdownRenderer(process.cwd(), { languages: [cssdocGrammar] });
  const source = [
    "```css",
    "/* cssdoc-disable-next-line undocumented-modifier - documented upstream */",
    "/*",
    "cssdoc-enable missing-summary, undocumented-modifier",
    "- reason",
    "*/",
    "/* prose cssdoc-disable missing-summary */",
    "```",
  ].join("\n");
  const html = await markdown.renderAsync(source);
  const color = (text: string) =>
    html.match(new RegExp(`<span style="([^"]+)">${text}</span>`, "u"))?.[1];

  expect(color("cssdoc-disable-next-line")).toBeDefined();
  expect(color("cssdoc-enable")).toBe(color("cssdoc-disable-next-line"));
  expect(color("undocumented-modifier")).toBeDefined();
  expect(color("undocumented-modifier")).not.toBe(color("cssdoc-disable-next-line"));
  expect(color("- reason")).toBeDefined();
  expect(color("- reason")).not.toBe(color("undocumented-modifier"));
  expect(html).toContain("prose cssdoc-disable missing-summary");
  expect(html).not.toContain('">cssdoc-disable</span>');
});
