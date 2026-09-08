/**
 * Shared conformance suite for the two `valid-doc-comments` adapters (see #34): asserts that
 * `@cssdoc/stylelint-plugin` and `@cssdoc/eslint-plugin` report the same `(rule, line, message)`
 * diagnostics for the same `(css, cssdoc.jsonc)` input — normalizing only for each host's column base
 * and message decoration (ESLint's raw `[rule] message`; Stylelint's `[rule] (line N) message.`).
 */
import { resolve } from "node:path";
import { Linter } from "eslint";
import stylelint from "stylelint";
import { expect, test } from "vite-plus/test";
import stylelintPlugin, { ruleName } from "../../stylelint/src/index.ts";
import eslintPlugin from "../src/index.ts";

interface Fixture {
  name: string;
  css: string;
  /** Absolute path a real `cssdoc.jsonc` should be discovered from; defaults to this test file's folder. */
  filename?: string;
  modifierConvention?: "bem" | "rscss" | "bare";
}

const FIXTURES_DIR = resolve(import.meta.dirname, "fixtures");

// One fixture per rule `#34` calls out "at minimum", plus config-scoping fixtures (provider
// resolution, `structureIgnore`, a rule off-list, and `extends`) in nested `cssdoc.jsonc` scopes.
const FIXTURES: Fixture[] = [
  {
    name: "missing-summary",
    css: "/**\n * @component button\n */\n.button { color: red; }",
  },
  {
    name: "undocumented-modifier",
    modifierConvention: "rscss",
    css: [
      "/**",
      " * @component button",
      " * @summary A button.",
      " */",
      ".button {}",
      ".button.-size-sm {}",
    ].join("\n"),
  },
  {
    name: "undocumented-part",
    css: [
      "/**",
      " * @component menu",
      " * @summary A menu.",
      " */",
      ".menu { min-width: 10rem; }",
      "@scope (.menu) {",
      "  :scope > .item { padding: 0.5rem; }",
      "}",
    ].join("\n"),
  },
  {
    name: "undocumented-css-part",
    css: [
      "/**",
      " * @component switch",
      " * @summary A toggle.",
      " * @csspart thumb",
      " */",
      ".switch {}",
      ".switch::part(thumb) {}",
    ].join("\n"),
  },
  {
    name: "deprecated-requires-canonical",
    modifierConvention: "rscss",
    css: [
      "/**",
      " * @component button",
      " * @summary A button.",
      " * @modifier -variant-old — @deprecated",
      " */",
      ".button {}",
      ".button.-variant-old {}",
    ].join("\n"),
  },
  {
    name: "alias-requires-canonical",
    modifierConvention: "rscss",
    css: [
      "/**",
      " * @component breadcrumb",
      " * @summary Breadcrumb navigation.",
      " * @modifier -size-small — @alias (a canonical name isn't picked yet)",
      " */",
      ".breadcrumb {}",
      ".breadcrumb.-size-small {}",
    ].join("\n"),
  },
  {
    name: "name-not-in-css",
    css: [
      "/**",
      " * @component chip",
      " * @summary A small labelled tag.",
      " * @modifier -color-nope — Doesn't exist in any selector.",
      " */",
      ".chip { color: green; }",
    ].join("\n"),
    modifierConvention: "rscss",
  },
  {
    name: "structure-unknown-selector",
    css: [
      "/**",
      " * @component tabs",
      " * @summary Tabs.",
      " * @part .list — The row.",
      " * @structure",
      " * .tabs {",
      " *   .list.bogus {}",
      " * }",
      " */",
      ".tabs {}",
      "@scope (.tabs) { :scope .list {} }",
    ].join("\n"),
  },
  {
    name: "structure-unknown-record",
    css: [
      "/**",
      " * @component shell",
      " * @summary A shell.",
      " * @structure",
      " * .shell {",
      " *   .tabs-list:optional:is(.unknown-card) {}",
      " * }",
      " */",
      ".shell {}",
    ].join("\n"),
  },
  {
    name: "unknown-annotation-ref",
    css: [
      "/**",
      " * @component card",
      " * @summary A card.",
      " * @annotations",
      " * 1. Keep focus ring.",
      " * @ref 2",
      " */",
      ".card {}",
    ].join("\n"),
  },
  {
    name: "member-of-unknown-component",
    css: [
      "/**",
      " * @component table-cell",
      " * @summary A table cell.",
      " * @memberOf ghost-table",
      " */",
      ".table-cell {}",
    ].join("\n"),
  },
  {
    name: "members-unknown-component",
    css: [
      "/**",
      " * @component tabs",
      " * @summary Tabs.",
      " * @members tab, ghost-panel",
      " */",
      ".tabs {}",
      "/**",
      " * @component tab",
      " * @summary A tab.",
      " */",
      ".tab {}",
    ].join("\n"),
  },
  {
    name: "affects-unknown-component",
    modifierConvention: "rscss",
    css: [
      "/**",
      " * @component table",
      " * @summary A data table.",
      " * @modifier -layout-stacked — @affects ghost-cell.before — Adds a label.",
      " */",
      ".table {}",
      ".table.-layout-stacked {}",
    ].join("\n"),
  },
  {
    name: "invalid-default-value",
    css: [
      "/**",
      " * @component slider",
      " * @summary A slider.",
      " * @cssproperty --track — the rail.",
      " */",
      "@property --track {",
      '  syntax: "<length>";',
      "  inherits: false;",
      "  initial-value: red;",
      "}",
      ".slider { --track: 8px; }",
    ].join("\n"),
  },
  {
    name: "invalid-property-value",
    css: [
      "/**",
      " * @component slider",
      " * @summary A slider.",
      " * @cssproperty --track — the rail.",
      " */",
      "@property --track {",
      '  syntax: "<length>";',
      "  inherits: false;",
      "  initial-value: 4px;",
      "}",
      ".slider { --track: blue; }",
    ].join("\n"),
  },
  {
    name: "invalid-fallback-value",
    css: [
      "/**",
      " * @component slider",
      " * @summary A slider.",
      " * @cssproperty --track — the rail.",
      " */",
      "@property --track {",
      '  syntax: "<length>";',
      "  inherits: false;",
      "  initial-value: 4px;",
      "}",
      ".slider { width: var(--track, green); }",
    ].join("\n"),
  },
];

// A nested `cssdoc.jsonc` scope (`fixtures/scoped/`) turns `name-not-in-css` off, resolves a sibling
// `.widget` via `providers`, and suppresses `.legacy-thing` via `structureIgnore` — all three of which
// would otherwise fire on this CSS. Both adapters must honor the scope identically.
const SCOPED_FIXTURE: Fixture = {
  name: "nested cssdoc.jsonc scope (rules off-list, providers, structureIgnore)",
  filename: resolve(FIXTURES_DIR, "scoped/consumer.css"),
  css: [
    "/**",
    " * @component panel",
    " * @summary A panel.",
    " * @part .ghost — A part no selector defines.",
    " * @structure",
    " * .panel {",
    " *   .widget {}",
    " *   .legacy-thing {}",
    " * }",
    " */",
    ".panel {}",
  ].join("\n"),
};

// A nested `cssdoc.jsonc` with `extends` inherits the base's rule off-list.
const EXTENDS_FIXTURE: Fixture = {
  name: "nested cssdoc.jsonc scope (extends)",
  filename: resolve(FIXTURES_DIR, "extends-scope/consumer.css"),
  css: "/**\n * @component button\n */\n.button { color: red; }",
};

const OVERRIDES_FIXTURE: Fixture = {
  name: "nested cssdoc.jsonc scope (overrides)",
  filename: resolve(FIXTURES_DIR, "overrides/consumer.css"),
  css: "/**\n * @component button\n */\n.button { color: red; }",
};

interface Diagnostic {
  rule: string;
  line: number;
  message: string;
  severity: "error" | "warning";
}

/** Strip each host's column base and message decoration down to `{ rule, line, message }`. */
function normalize(raw: string, line: number, severity: "error" | "warning"): Diagnostic {
  const m = raw.match(/^\[([\w-]+)\]\s*(?:\(line \d+\)\s*)?(.*)$/u);
  const rule = m?.[1] ?? "";
  const message = (m?.[2] ?? raw)
    .trim()
    .replace(/\s*\(cssdoc\/valid-doc-comments\)$/u, "") // stylelint's auto-appended rule-name suffix
    .replace(/\.$/u, "");
  return { rule, line, message, severity };
}

function runEslint(fixture: Fixture): Diagnostic[] {
  const filename = fixture.filename ?? resolve(FIXTURES_DIR, "unscoped.css");
  const recommended = eslintPlugin.configs.recommended[0] as { plugins: Record<string, unknown> };
  const config = [
    {
      files: ["**/*.css"],
      plugins: { ...recommended.plugins },
      language: "css/css",
      rules: {
        "cssdoc/valid-doc-comments": [
          "warn",
          fixture.modifierConvention ? { modifierConvention: fixture.modifierConvention } : {},
        ],
      },
    },
  ];
  const linter = new Linter();
  return linter
    .verify(fixture.css, config as Parameters<Linter["verify"]>[1], filename)
    .map((m) => normalize(m.message, m.line, m.severity === 2 ? "error" : "warning"));
}

async function runStylelint(fixture: Fixture): Promise<Diagnostic[]> {
  const result = await stylelint.lint({
    code: fixture.css,
    codeFilename: fixture.filename ?? resolve(FIXTURES_DIR, "unscoped.css"),
    config: {
      plugins: [stylelintPlugin],
      rules: {
        [ruleName]: [
          true,
          fixture.modifierConvention ? { modifierConvention: fixture.modifierConvention } : {},
        ],
      },
    },
  });
  return result.results[0].warnings.map((w) => normalize(w.text, w.line, w.severity));
}

const sortDiagnostics = (diagnostics: Diagnostic[]): Diagnostic[] =>
  [...diagnostics].sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));

for (const fixture of [...FIXTURES, SCOPED_FIXTURE, EXTENDS_FIXTURE, OVERRIDES_FIXTURE]) {
  test(`stylelint and eslint agree on: ${fixture.name}`, async () => {
    const eslintDiagnostics = sortDiagnostics(runEslint(fixture));
    const stylelintDiagnostics = sortDiagnostics(await runStylelint(fixture));
    expect(stylelintDiagnostics).toEqual(eslintDiagnostics);
  });
}

test("every listed rule fixture actually fires its named rule", async () => {
  for (const fixture of FIXTURES) {
    const diagnostics = await runStylelint(fixture);
    expect(
      diagnostics.some((d) => d.rule === fixture.name),
      fixture.name,
    ).toBe(true);
  }
});

test("the scoped fixture's off-list, providers, and structureIgnore all suppress their target rule", async () => {
  const diagnostics = await runStylelint(SCOPED_FIXTURE);
  expect(diagnostics).toEqual([]);
});

test("the extends fixture inherits the base's rule off-list", async () => {
  const diagnostics = await runStylelint(EXTENDS_FIXTURE);
  expect(diagnostics.some((d) => d.rule === "missing-summary")).toBe(false);
});

test("the overrides fixture applies its matching rule off-list", async () => {
  const diagnostics = await runStylelint(OVERRIDES_FIXTURE);
  expect(diagnostics.some((d) => d.rule === "missing-summary")).toBe(false);
});
