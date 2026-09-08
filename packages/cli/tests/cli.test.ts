import { resolve } from "node:path";
import { expect, test } from "vite-plus/test";
import { formatResults, lintFiles, resolveFiles, runLint } from "../src/index.ts";

const FIXTURES = resolve(import.meta.dirname, "fixtures");

test("resolveFiles expands a glob relative to cwd", () => {
  const files = resolveFiles(["dirty/*.css"], FIXTURES);
  expect(files).toEqual([resolve(FIXTURES, "dirty/a.css")]);
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
