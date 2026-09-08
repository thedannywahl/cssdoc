/**
 * `@cssdoc/cli` — a host-agnostic `cssdoc lint` command: the same `@cssdoc/lint-core` rules the
 * Stylelint and ESLint adapters run, with no host linter required. Auto-loads the nearest
 * `cssdoc.jsonc`/`cssdoc.json` per file (honoring `extends`, `providers`, and `structureIgnore`) exactly
 * as the plugins do, via `@cssdoc/config`.
 *
 * @module @cssdoc/cli
 */
import { existsSync, globSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, matchesGlob, parse as parsePath, relative, resolve, sep } from "node:path";
import { CssDocConfigFile, resolveProviders } from "@cssdoc/config";
import type { SourceSpan } from "@cssdoc/index";
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
  /** Apply deterministic autofixes before reporting. */
  fix?: boolean;
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

interface IgnorePattern {
  pattern: string;
  negated: boolean;
}

function posixRelative(from: string, to: string): string {
  return relative(from, to).split(sep).join("/");
}

function findIgnoreRoot(cwd: string): string {
  let current = resolve(cwd);
  const root = parsePath(current).root;
  for (;;) {
    if (existsSync(resolve(current, ".git"))) return current;
    if (current === root) return resolve(cwd);
    current = dirname(current);
  }
}

function readIgnorePatterns(root: string): IgnorePattern[] {
  const file = resolve(root, ".gitignore");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const negated = line.startsWith("!");
      return { pattern: negated ? line.slice(1) : line, negated };
    })
    .filter((entry) => entry.pattern.length > 0);
}

function ignorePatternMatches(file: string, pattern: string): boolean {
  const directoryOnly = pattern.endsWith("/");
  let glob = pattern.replace(/^\//u, "").replace(/\/$/u, "");
  if (!glob) return false;
  if (!glob.includes("/")) glob = `**/${glob}`;
  if (directoryOnly) glob = `${glob}/**`;
  return matchesGlob(file, glob) || matchesGlob(file, glob.replace(/^\*\*\//u, ""));
}

function isIgnored(file: string, ignoreRoot: string, patterns: readonly IgnorePattern[]): boolean {
  const relativeFile = posixRelative(ignoreRoot, file);
  if (relativeFile === "node_modules" || relativeFile.startsWith("node_modules/")) return true;
  if (relativeFile.includes("/node_modules/")) return true;
  let ignored = false;
  for (const { pattern, negated } of patterns) {
    if (ignorePatternMatches(relativeFile, pattern)) ignored = !negated;
  }
  return ignored;
}

/** Resolve globs to a de-duplicated, sorted list of absolute `.css`-like file paths. */
export function resolveFiles(globs: string[], cwd: string): string[] {
  const found = new Set<string>();
  const ignoreRoot = findIgnoreRoot(cwd);
  const ignorePatterns = readIgnorePatterns(ignoreRoot);
  for (const pattern of globs) {
    for (const match of globSync(pattern, { cwd })) {
      const file = resolve(cwd, match);
      if (!isIgnored(file, ignoreRoot, ignorePatterns)) found.add(file);
    }
  }
  return [...found].sort();
}

function offsetAt(source: string, position: SourceSpan["start"]): number {
  const lineStarts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\n") lineStarts.push(i + 1);
  }
  const lineStart = lineStarts[position.line - 1] ?? source.length;
  const nextLineStart = lineStarts[position.line] ?? source.length + 1;
  return Math.min(lineStart + position.column - 1, nextLineStart - 1);
}

function applyFixes(source: string, violations: readonly Violation[]): string {
  const edits = violations.flatMap((violation) => violation.fix?.edits ?? []);
  if (!edits.length) return source;
  const ordered = edits
    .map((edit, index) => ({
      edit,
      index,
      start: offsetAt(source, edit.span.start),
      end: offsetAt(source, edit.span.end),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end || a.index - b.index);
  const accepted: { edit: (typeof edits)[number]; start: number; end: number }[] = [];
  let lastEnd = -1;
  for (const candidate of ordered) {
    if (candidate.start < lastEnd) continue;
    accepted.push(candidate);
    lastEnd = candidate.end;
  }
  let fixed = source;
  for (let i = accepted.length - 1; i >= 0; i--) {
    const { edit, start, end } = accepted[i];
    fixed = `${fixed.slice(0, start)}${edit.text}${fixed.slice(end)}`;
  }
  return fixed;
}

/** Lint every file the globs resolve to, using each file's own nearest `cssdoc.jsonc`. */
export function lintFiles(
  globs: string[],
  cwd: string,
  options: Pick<LintCliOptions, "fix"> = {},
): FileResult[] {
  return resolveFiles(globs, cwd).map((file) => {
    const configFile = loadConfig(dirname(file));
    const lintOptions: LintOptions = {
      configuration: configFile.toConfiguration(),
      rules: configFile.ruleSeveritiesForFile(file) as LintOptions["rules"],
      modifierConvention: configFile.modifierConvention,
      naming: configFile.naming,
      structureIgnore: configFile.structureIgnore,
      providerEntries: resolveProviders(configFile).entries,
    };
    let source = readFileSync(file, "utf8");
    let violations = lintCssDocs(source, lintOptions);
    if (options.fix) {
      const fixed = applyFixes(source, violations);
      if (fixed !== source) {
        writeFileSync(file, fixed);
        source = fixed;
        violations = lintCssDocs(source, lintOptions);
      }
    }
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
  let results = lintFiles(options.globs, cwd, { fix: options.fix });
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
