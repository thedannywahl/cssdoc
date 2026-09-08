/**
 * `@cssdoc/cli` — a host-agnostic `cssdoc lint` command: the same `@cssdoc/lint-core` rules the
 * Stylelint and ESLint adapters run, with no host linter required. Auto-loads the nearest
 * `cssdoc.jsonc`/`cssdoc.json` per file (honoring `extends`, `providers`, and `structureIgnore`) exactly
 * as the plugins do, via `@cssdoc/config`.
 *
 * @module @cssdoc/cli
 */
import { globSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { CssDocConfigFile, resolveProviders } from "@cssdoc/config";
import { lintCssDocs, type LintOptions, type Violation } from "@cssdoc/lint-core";

/** One file's lint results. */
export interface FileResult {
  /** Path relative to the current working directory. */
  file: string;
  violations: Violation[];
}

export type OutputFormat = "pretty" | "json" | "github";

export interface LintCliOptions {
  /** Positional glob patterns / file paths. */
  globs: string[];
  format?: OutputFormat;
  /** Suppress warning-severity violations from the report (they never fail the run on their own). */
  quiet?: boolean;
  /** Fail if more than this many warnings are reported (`-1`, the default, means unlimited). */
  maxWarnings?: number;
  cwd?: string;
}

/** Cache loaded `cssdoc.json` per start folder — reused across every linted stylesheet. */
const configCache = new Map<string, CssDocConfigFile>();
function loadConfig(folder: string): CssDocConfigFile {
  let cached = configCache.get(folder);
  if (!cached) {
    cached = CssDocConfigFile.loadForFolder(folder);
    configCache.set(folder, cached);
  }
  return cached;
}

/** Resolve globs to a de-duplicated, sorted list of absolute `.css`-like file paths. */
export function resolveFiles(globs: string[], cwd: string): string[] {
  const found = new Set<string>();
  for (const pattern of globs) {
    for (const match of globSync(pattern, {
      cwd,
      exclude: (p: string) => p.includes("node_modules"),
    })) {
      found.add(resolve(cwd, match));
    }
  }
  return [...found].sort();
}

/** Lint every file the globs resolve to, using each file's own nearest `cssdoc.jsonc`. */
export function lintFiles(globs: string[], cwd: string): FileResult[] {
  return resolveFiles(globs, cwd).map((file) => {
    const configFile = loadConfig(dirname(file));
    const violations = lintCssDocs(readFileSync(file, "utf8"), {
      configuration: configFile.toConfiguration(),
      rules: configFile.ruleSeverities as LintOptions["rules"],
      modifierConvention: configFile.modifierConvention,
      naming: configFile.naming,
      structureIgnore: configFile.structureIgnore,
      providerEntries: resolveProviders(configFile).entries,
    });
    return { file: relative(cwd, file), violations };
  });
}

function formatPretty(results: FileResult[]): string {
  const lines: string[] = [];
  let errors = 0;
  let warnings = 0;
  for (const { file, violations } of results) {
    if (!violations.length) continue;
    lines.push(file);
    for (const v of violations) {
      if (v.severity === "error") errors++;
      else warnings++;
      lines.push(`  ${v.line}:0  ${v.severity}  [${v.rule}] ${v.message}`);
    }
  }
  if (errors || warnings) {
    lines.push("", `${errors + warnings} problems (${errors} errors, ${warnings} warnings)`);
  }
  return lines.join("\n");
}

function formatGithub(results: FileResult[]): string {
  const lines: string[] = [];
  for (const { file, violations } of results) {
    for (const v of violations) {
      const level = v.severity === "error" ? "error" : "warning";
      lines.push(`::${level} file=${file},line=${v.line}::[${v.rule}] ${v.message}`);
    }
  }
  return lines.join("\n");
}

/** Format lint results for the given output format. Empty string when there's nothing to print. */
export function formatResults(results: FileResult[], format: OutputFormat): string {
  if (format === "json") return JSON.stringify(results);
  if (format === "github") return formatGithub(results);
  return formatPretty(results);
}

/** Run `cssdoc lint`. Returns the process exit code (`0` clean, `1` on error-severity violations or a
 * `--max-warnings` overage). */
export function runLint(options: LintCliOptions): { exitCode: number; output: string } {
  const cwd = options.cwd ?? process.cwd();
  const format = options.format ?? "pretty";
  let results = lintFiles(options.globs, cwd);
  if (options.quiet) {
    results = results.map((r) => ({
      file: r.file,
      violations: r.violations.filter((v) => v.severity === "error"),
    }));
  }
  const errorCount = results.reduce(
    (n, r) => n + r.violations.filter((v) => v.severity === "error").length,
    0,
  );
  const warningCount = results.reduce(
    (n, r) => n + r.violations.filter((v) => v.severity === "warning").length,
    0,
  );
  const maxWarnings = options.maxWarnings ?? -1;
  const exitCode = errorCount > 0 || (maxWarnings >= 0 && warningCount > maxWarnings) ? 1 : 0;
  return { exitCode, output: formatResults(results, format) };
}
