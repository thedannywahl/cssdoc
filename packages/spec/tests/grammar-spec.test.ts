import { fileURLToPath } from "node:url";
import { Grammar, Nonterminal, Production, TerminalLiteral } from "grammarkdown";
import type { Node } from "grammarkdown";
import { expect, test } from "vite-plus/test";
import { CSSDOC_TAGS } from "../src/index.ts";
import { PATTERN_DEFINITIONS } from "../../regex/src/definitions.ts";

// The grammar spec is the source of truth for the doc-comment shape (grammar/CssDoc.grammarkdown); the
// runtime parser in grammar.ts conforms to it. This test keeps the spec honest: it must be valid
// grammarkdown with no error-level diagnostics. (grammarkdown message templates aren't substituted in
// getDiagnosticInfos, so surface the line + raw template on failure — enough to locate the problem.)
const SPEC = fileURLToPath(new URL("../grammar/CssDoc.grammarkdown", import.meta.url));

test("CssDoc.grammarkdown is a valid grammarkdown spec", async () => {
  const grammar = new Grammar([SPEC]);
  await grammar.check();
  const errors = grammar.diagnostics
    .getDiagnosticInfos()
    .filter((info) => !info.warning)
    .map((info) => `line ${(info.range?.start?.line ?? -1) + 1}: ${info.message}`);
  expect(errors).toEqual([]);
});

test("the grammar includes every standard tag in its reachable block or inline productions", async () => {
  const grammar = new Grammar([SPEC]);
  await grammar.parse();
  const productions = new Map(
    grammar.rootFiles[0].elements
      .filter((element): element is Production => element instanceof Production)
      .map((production) => [production.name.text, production]),
  );
  const reachable = new Set<string>();
  const terminals = new Set<string>();
  const visit = (node: Node): void => {
    if (node instanceof TerminalLiteral && node.text) terminals.add(node.text);
    if (node instanceof Nonterminal && node.name.text && !reachable.has(node.name.text)) {
      reachable.add(node.name.text);
      const target = productions.get(node.name.text);
      if (target) visit(target);
    }
    for (const child of node.children()) visit(child);
  };
  const block = productions.get("BlockTag");
  const inline = productions.get("InlineTag");
  expect(block).toBeDefined();
  expect(inline).toBeDefined();
  if (!block || !inline) throw new Error("Missing tag productions");
  visit(block);
  visit(inline);

  const missing = CSSDOC_TAGS.filter((tag) =>
    tag.kind === "inline" ? !terminals.has(tag.name) : !terminals.has(`@${tag.name}`),
  ).map((tag) => tag.name);
  expect(missing).toEqual([]);
});

test("the grammar includes each supported description separator", async () => {
  const grammar = new Grammar([SPEC]);
  await grammar.parse();
  const separator = grammar.rootFiles[0].elements.find(
    (element): element is Production =>
      element instanceof Production && element.name.text === "Separator",
  );
  expect(separator).toBeDefined();
  if (!separator) throw new Error("Missing Separator production");
  const terminals: string[] = [];
  const visit = (node: Node): void => {
    if (node instanceof TerminalLiteral && node.text) terminals.push(node.text);
    for (const child of node.children()) visit(child);
  };
  visit(separator);
  expect(terminals).toEqual(["—", "-", "--"]);
});

test("pattern associations identify an existing cssdoc production and their relationship", async () => {
  const grammar = new Grammar([SPEC]);
  await grammar.parse();
  const productions = new Set(
    grammar.rootFiles[0].elements
      .filter((element): element is Production => element instanceof Production)
      .map((production) => production.name.text),
  );
  const errors: string[] = [];
  for (const [name, pattern] of Object.entries(PATTERN_DEFINITIONS)) {
    if (!pattern.grammarRule) {
      if (pattern.grammarSource || pattern.grammarRelation) errors.push(`${name}: missing rule`);
      continue;
    }
    if (!pattern.grammarSource || !pattern.grammarRelation) errors.push(`${name}: incomplete link`);
    if (pattern.grammarSource === "cssdoc" && !productions.has(pattern.grammarRule)) {
      errors.push(`${name}: unknown production ${pattern.grammarRule}`);
    }
  }
  expect(errors).toEqual([]);
});

test("the separator pattern matches the grammar's terminal alternatives", async () => {
  const grammar = new Grammar([SPEC]);
  await grammar.parse();
  const production = grammar.rootFiles[0].elements.find(
    (element): element is Production =>
      element instanceof Production && element.name.text === "Separator",
  );
  if (!production) throw new Error("Missing Separator production");
  const terminals: string[] = [];
  const visit = (node: Node): void => {
    if (node instanceof TerminalLiteral && node.text) terminals.push(node.text);
    for (const child of node.children()) visit(child);
  };
  visit(production);
  const { source, flags } = PATTERN_DEFINITIONS.CSSDOC_DESCRIPTION_SEPARATOR;
  const pattern = new RegExp(`^(?:${source})$`, flags);
  expect(terminals.filter((terminal) => !pattern.test(terminal))).toEqual([]);
  expect(["", "–", "---"].filter((invalid) => pattern.test(invalid))).toEqual([]);
});
