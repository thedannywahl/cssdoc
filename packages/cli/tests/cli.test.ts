import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vite-plus/test";
import { formatResults, lintFiles, resolveFiles, runLint } from "../src/index.ts";

const FIXTURES = resolve(import.meta.dirname, "fixtures");

test("resolveFiles expands a glob relative to cwd", () => {
  const files = resolveFiles(["dirty/*.css"], FIXTURES);
  expect(files).toEqual([resolve(FIXTURES, "dirty/a.css")]);
});

test("resolveFiles honors root .gitignore patterns and negations", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-cli-ignore-"));
  mkdirSync(join(dir, ".git"));
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, ".gitignore"), "ignored.css\n!keep.css\nbuild/\n");
  writeFileSync(join(dir, "ignored.css"), "");
  writeFileSync(join(dir, "keep.css"), "");
  writeFileSync(join(dir, "src", "ignored.css"), "");
  writeFileSync(join(dir, "src", "keep.css"), "");
  mkdirSync(join(dir, "build"));
  writeFileSync(join(dir, "build", "a.css"), "");
  const files = resolveFiles(["**/*.css"], dir).map((file) => file.slice(dir.length + 1));
  expect(files).toEqual(["keep.css", "src/keep.css"]);
});

test("resolveFiles always excludes node_modules", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-cli-node-modules-"));
  mkdirSync(join(dir, "node_modules"));
  writeFileSync(join(dir, "a.css"), "");
  writeFileSync(join(dir, "node_modules", "a.css"), "");
  const files = resolveFiles(["**/*.css"], dir).map((file) => file.slice(dir.length + 1));
  expect(files).toEqual(["a.css"]);
});

test("lintFiles reports a missing-summary violation", () => {
  const [result] = lintFiles(["dirty/*.css"], FIXTURES);
  expect(result?.file).toBe("dirty/a.css");
  expect(result?.violations.some((v) => v.rule === "missing-summary")).toBe(true);
});

test("lintFiles honors the nearest cssdoc.jsonc's rule off-list", () => {
  const [result] = lintFiles(["clean/*.css"], FIXTURES);
  expect(result?.violations).toEqual([]);
});

test("lintFiles applies per-glob rule overrides from cssdoc.jsonc", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-cli-overrides-"));
  mkdirSync(join(dir, "src"));
  mkdirSync(join(dir, "docs"));
  writeFileSync(
    join(dir, "cssdoc.jsonc"),
    JSON.stringify({
      rules: { "missing-summary": "error" },
      overrides: [{ files: "docs/*.css", rules: { "missing-summary": "off" } }],
    }),
  );
  writeFileSync(join(dir, "src", "a.css"), "/**\n * @component button\n */\n.button {}\n");
  writeFileSync(join(dir, "docs", "a.css"), "/**\n * @component card\n */\n.card {}\n");

  const results = lintFiles(["**/*.css"], dir);
  expect(results.find((r) => r.file === "src/a.css")?.violations[0]?.severity).toBe("error");
  expect(results.find((r) => r.file === "docs/a.css")?.violations).toEqual([]);
});

test("runLint exits 0 on a clean tree", () => {
  const { exitCode } = runLint({ globs: ["clean/*.css"], cwd: FIXTURES });
  expect(exitCode).toBe(0);
});

test("runLint exits 1 when a warning is present and severities default to warn", () => {
  // missing-summary defaults to "warn", so a plain run still exits 0...
  expect(runLint({ globs: ["dirty/*.css"], cwd: FIXTURES }).exitCode).toBe(0);
  // ...but --max-warnings 0 turns any warning into a failure.
  expect(runLint({ globs: ["dirty/*.css"], cwd: FIXTURES, maxWarnings: 0 }).exitCode).toBe(1);
});

test("--quiet drops warnings from the report and from the warning count", () => {
  const { output } = runLint({ globs: ["dirty/*.css"], cwd: FIXTURES, quiet: true });
  expect(output).toBe("");
});

test("--fix writes deterministic doc-comment scaffolds before reporting", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-cli-fix-"));
  writeFileSync(join(dir, "cssdoc.jsonc"), JSON.stringify({ modifierConvention: "rscss" }));
  writeFileSync(
    join(dir, "a.css"),
    "/**\n * @component button\n */\n.button {}\n.button.-size-sm {}\n",
  );
  const result = runLint({ globs: ["*.css"], cwd: dir, fix: true, maxWarnings: 0 });
  const fixed = readFileSync(join(dir, "a.css"), "utf8");
  expect(fixed).toContain(" * @summary TODO.\n");
  expect(fixed).toContain(" * @modifier -size-sm — TODO.\n");
  expect(result.output).toBe("");
  expect(result.exitCode).toBe(0);
});

test("formatResults: json includes the rule and file", () => {
  const results = lintFiles(["dirty/*.css"], FIXTURES);
  const json = JSON.parse(formatResults(results, "json")) as { file: string }[];
  expect(json[0]?.file).toBe("dirty/a.css");
});

test("formatResults: github emits an annotation per violation", () => {
  const results = lintFiles(["dirty/*.css"], FIXTURES);
  const output = formatResults(results, "github");
  expect(output).toContain("::warning file=dirty/a.css");
  expect(output).toContain("[missing-summary]");
});
