import { readdirSync, readFileSync } from "node:fs";

import { regex as arkRegex } from "arkregex";
import ts from "typescript";
import { createMarkdownRenderer } from "vitepress";

import { PATTERN_DEFINITIONS } from "../../packages/regex/src/definitions.ts";
import type { UnifiedPatternDef } from "../../packages/regex/src/definitions.ts";

/** One serializable pattern for the grammar reference. */
export interface PatternReferenceRow {
  name: string;
  description: string;
  source: string;
  codeGroupHtml: string;
  flags: string;
  grammarRule?: string;
  grammarRelation?: "exact" | "fragment" | "related";
  fixtures: UnifiedPatternDef["fixtures"];
}

/** Patterns grouped by grammar association or registry tier. */
export interface PatternReferenceGroup {
  id: string;
  name: string;
  description: string;
  patterns: PatternReferenceRow[];
}

/** Data supplied to the reference page by VitePress. */
declare const data: PatternReferenceGroup[];
export { data };

const definitions = new URL("../../packages/regex/src/definitions/", import.meta.url);
const CODE_GROUP_TAG = arkRegex.as(String.raw`<(?:input|label) [^>]+>`, "gu");
const CODE_GROUP_ATTRIBUTE = arkRegex.as(
  String.raw`(?<attribute>name|id|for)="(?<identifier>(?:group|tab)-\d+)"`,
  "gu",
);
const tierSections: Record<
  UnifiedPatternDef["tier"],
  Pick<PatternReferenceGroup, "name" | "description">
> = {
  0: {
    name: "Characters and character classes",
    description:
      "These are the building blocks for larger patterns. They cover literal punctuation, letter and digit ranges, whitespace, and boundaries between words.",
  },
  1: {
    name: "Web languages and common syntax",
    description:
      "These patterns recognize syntax around embedded CSS, including HTML tags and attributes, JavaScript tagged templates, and Markdown fences. They also cover shared syntax such as comment markers and file extensions.",
  },
  2: {
    name: "Doc-comment tags and selectors",
    description:
      "These patterns recognize doc-comment tag names and the references they can contain, including component classes, pseudo-selectors, and record kinds used in structure trees.",
  },
  3: {
    name: "Tokenizer patterns",
    description:
      "These patterns break doc comments into tokens such as tag names, selectors, custom properties, and reference numbers. They also identify media profiles on structure references.",
  },
  4: {
    name: "Composite patterns",
    description: "These patterns combine multiple rules to recognize larger constructs.",
  },
};

function readAuthoredPatterns(): Map<string, string> {
  const authored = new Map<string, string>();
  for (const filename of readdirSync(definitions)) {
    if (!filename.startsWith("tier-") || !filename.endsWith(".ts")) continue;
    const file = ts.createSourceFile(
      filename,
      readFileSync(new URL(filename, definitions), "utf8"),
      ts.ScriptTarget.Latest,
    );
    const visit = (node: ts.Node): void => {
      if (ts.isObjectLiteralExpression(node)) {
        const properties = node.properties.filter(ts.isPropertyAssignment);
        const name = properties.find(
          (property) => property.name.getText(file) === "name",
        )?.initializer;
        const sourceProperty = properties.find((property) => {
          const key = property.name.getText(file);
          return key === "pattern" || key === "source";
        });
        if (name && ts.isStringLiteral(name) && sourceProperty) {
          const start = sourceProperty.getStart(file);
          const { line } = file.getLineAndCharacterOfPosition(start);
          const indent = file.text.slice(file.getLineStarts()[line], start);
          const expression = sourceProperty.initializer.getText(file);
          authored.set(name.text, expression.replaceAll(`\n${indent}`, "\n"));
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return authored;
}

function codeFence(language: string, title: string, source: string): string {
  // A fence longer than any run of tildes keeps the code literal.
  const fenceLength = Math.max(
    3,
    ...Array.from(source.matchAll(/~+/gu), ([run]) => run.length + 1),
  );
  const fence = "~".repeat(fenceLength);
  return `${fence}${language} [${title}]\n${source}\n${fence}`;
}

/** Load the registry at build time for the pattern reference. */
const loader: { watch: string; load: () => Promise<PatternReferenceGroup[]> } = {
  watch: "../packages/regex/src/**/*.ts",
  async load(): Promise<PatternReferenceGroup[]> {
    const markdown = await createMarkdownRenderer(process.cwd());
    const authored = readAuthoredPatterns();
    const cssdoc: PatternReferenceGroup = {
      id: "cssdoc-grammar",
      name: "cssdoc grammar",
      description:
        "Each pattern here links to a production in the formal grammar. The patterns recognize pieces of a doc comment, from comment delimiters and tag names through selectors and structure references.",
      patterns: [],
    };
    const css: PatternReferenceGroup = {
      id: "css-grammar",
      name: "CSS grammar",
      description:
        "These patterns correspond to productions in CSS specifications. Use this section to look up patterns for identifiers, numbers, dimensions, hashes, and other CSS tokens.",
      patterns: [],
    };
    const tiers = new Map<number, PatternReferenceGroup>();
    for (const pattern of Object.values(PATTERN_DEFINITIONS)) {
      const actual = authored.get(pattern.name);
      if (actual === undefined) throw new Error(`Missing authored regex pattern: ${pattern.name}`);
      const codeGroup = await markdown.renderAsync(
        [
          "::: code-group",
          codeFence("ts", "Actual", actual),
          codeFence("regex", "Resolved", pattern.source),
          ":::",
        ].join("\n\n"),
      );
      // VitePress numbers tabs within each render. Scope the radio IDs and names to each card.
      const codeGroupHtml = codeGroup.replaceAll(CODE_GROUP_TAG, (tag) =>
        tag.replace(CODE_GROUP_ATTRIBUTE, `$<attribute>="regex-${pattern.name}-$<identifier>"`),
      );
      let group =
        pattern.grammarSource === "cssdoc"
          ? cssdoc
          : pattern.grammarSource === "css"
            ? css
            : tiers.get(pattern.tier);
      if (!group) {
        group = { id: `tier-${pattern.tier}`, ...tierSections[pattern.tier], patterns: [] };
        tiers.set(pattern.tier, group);
      }
      group.patterns.push({
        name: pattern.name,
        description: pattern.description,
        source: pattern.source,
        codeGroupHtml,
        flags: pattern.flags ?? "",
        grammarRule: pattern.grammarRule,
        grammarRelation: pattern.grammarRelation,
        fixtures: pattern.fixtures,
      });
    }
    const groups = [
      cssdoc,
      css,
      ...Array.from(tiers)
        .sort(([a], [b]) => b - a)
        .map(([, group]) => group),
    ];
    for (const group of groups) group.patterns.sort((a, b) => a.name.localeCompare(b.name, "en"));
    return groups;
  },
};

export default loader;
