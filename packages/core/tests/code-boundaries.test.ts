import { fromMarkdown } from "mdast-util-from-markdown";
import { expect, test } from "vite-plus/test";
import { scanCodeBoundaryLine, type CodeBoundaryState } from "../src/code-boundaries.ts";

test.each([
  "# Heading\n    @component code\n\n@component prose",
  "Paragraph\n    @component prose\n\n    @component code",
  "Heading\n=======\n    @component code\n\n@component prose",
  "# Heading\n    @component code\n  @component prose",
  "Paragraph\n---  \n    @component code\n\n@component prose",
  "- - -\n    @component code\n\n@component prose",
  "> # Heading\n>     @component code\n\n@component prose",
  "> - ```css\n>   @component code\n>   ```\n\n@component prose",
  "- item\n\n      @component code\n\n@component prose",
  "- item\n  # Heading\n      @component code\n\n@component prose",
  "Paragraph\n2. item\n    @component prose\n\n@component prose",
  "Paragraph\n1. item\n    @component prose\n\n@component prose",
  "> paragraph\n    @component prose\n\n@component prose",
  ">\t```\n>\t@component code\n>\t```\n\n@component prose",
  "-\t```\n\t@component code\n\t```\n\n@component prose",
  "- ~~~\n\t@component code\n\t~~~\n\n@component prose",
  " -\t~~~\n \t@component code\n \t~~~\n\n@component prose",
  "> -\t```\n>  \t@component code\n>  \t```\n\n@component prose",
  "-\n  ```\n  @component code\n  ```\n\n@component prose",
  "~~~css\n@component code\n~~~\n@component prose",
  "````\n```\n@component code\n````\n@component prose",
  "```foo`bar\n@component prose",
])("code boundaries agree with CommonMark for %s", (source) => {
  const tree = fromMarkdown(source);
  const codeLines = new Set<number>();
  const visit = (node: (typeof tree)["children"][number]): void => {
    if (node.type === "code" && node.position) {
      for (let line = node.position.start.line; line <= node.position.end.line; line++) {
        codeLines.add(line);
      }
    }
    if ("children" in node) {
      for (const child of node.children) {
        if ("children" in child || child.type === "code") visit(child);
      }
    }
  };
  for (const node of tree.children) visit(node);

  const state: CodeBoundaryState = { containers: [], indented: false, paragraph: false };
  const actual: boolean[] = [];
  const expected: boolean[] = [];
  for (const [index, line] of source.split("\n").entries()) {
    const inCode = scanCodeBoundaryLine(line, state);
    if (line.includes("@component")) {
      actual.push(inCode);
      expected.push(codeLines.has(index + 1));
    }
  }
  expect(actual).toEqual(expected);
});
