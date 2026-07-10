/**
 * Inline suppression via CSS comment directives, in the spirit of `eslint-disable` / `stylelint-disable`.
 * Authors write them as CSS comments, so they ride along in embedded CSS too (the projection keeps
 * comments in place):
 *
 * - `/* cssdoc-disable [rules] *\/` … `/* cssdoc-enable [rules] *\/` — disable a block (all rules, or a list).
 * - `/* cssdoc-disable-line [rules] *\/` — the line the comment sits on.
 * - `/* cssdoc-disable-next-line [rules] *\/` — the following line.
 * - `/* cssdoc-expect-error [rules] *\/` — like disable-next-line, but a problem is *required*; if none
 *   appears, an `cssdoc-directive` diagnostic is raised (an unused expectation, like ts-expect-error).
 *
 * @module
 */
import type { Diagnostic } from "./types.ts";

type DirectiveKind = "disable" | "enable" | "disable-line" | "disable-next-line" | "expect-error";

interface Directive {
  kind: DirectiveKind;
  /** Rule ids the directive scopes to, or `null` for every rule. */
  rules: string[] | null;
  /** 1-based line the comment starts / ends on. */
  startLine: number;
  endLine: number;
}

// `disable-next-line` before `disable-line` before `disable` so the longer keyword wins the alternation.
const DIRECTIVE_RE =
  /\/\*\s*cssdoc-(disable-next-line|disable-line|disable|enable|expect-error)\b([^*]*?)\*\//gu;

const lineAt = (source: string, index: number): number => {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) if (source[i] === "\n") line += 1;
  return line;
};

/** Parse every `cssdoc-*` directive comment out of a CSS source. */
export function parseDirectives(source: string): Directive[] {
  const out: Directive[] = [];
  for (const m of source.matchAll(DIRECTIVE_RE)) {
    const at = m.index ?? 0;
    const rest = m[2].trim();
    out.push({
      kind: m[1] as DirectiveKind,
      rules: rest ? rest.split(/[\s,]+/u).filter(Boolean) : null,
      startLine: lineAt(source, at),
      endLine: lineAt(source, at + m[0].length - 1),
    });
  }
  return out;
}

const scopesRule = (d: Directive, rule: string): boolean =>
  d.rules === null || d.rules.includes(rule);

/**
 * Drop diagnostics suppressed by directive comments in `source`, and add a `cssdoc-directive`
 * diagnostic for any `cssdoc-expect-error` that matched nothing.
 *
 * @param diagnostics - The diagnostics to filter (author-side, with CSS spans).
 * @param source - The CSS the diagnostics came from (the same text passed to the linter).
 * @returns The surviving diagnostics.
 */
export function applyDirectives(diagnostics: Diagnostic[], source: string): Diagnostic[] {
  const directives = parseDirectives(source);
  if (directives.length === 0) return diagnostics;

  const block = directives
    .filter((d) => d.kind === "disable" || d.kind === "enable")
    .sort((a, b) => a.startLine - b.startLine);
  const perLine = directives.filter((d) => d.kind !== "disable" && d.kind !== "enable");

  // Fold block disable/enable up to `line`, tracking a disabled set plus an "all except …" mode.
  const blockDisabled = (line: number, rule: string): boolean => {
    let all = false;
    const disabled = new Set<string>();
    const exceptions = new Set<string>();
    for (const d of block) {
      if (d.startLine > line) break;
      if (d.kind === "disable" && d.rules === null) {
        all = true;
        exceptions.clear();
      } else if (d.kind === "disable") {
        for (const r of d.rules ?? []) {
          if (all) exceptions.delete(r);
          else disabled.add(r);
        }
      } else if (d.rules === null) {
        all = false;
        disabled.clear();
        exceptions.clear();
      } else {
        for (const r of d.rules) {
          if (all) exceptions.add(r);
          else disabled.delete(r);
        }
      }
    }
    return all ? !exceptions.has(rule) : disabled.has(rule);
  };

  const lineDirectiveFor = (line: number, rule: string): Directive | undefined =>
    perLine.find(
      (d) =>
        scopesRule(d, rule) &&
        (d.kind === "disable-line"
          ? line >= d.startLine && line <= d.endLine
          : line === d.endLine + 1),
    );

  const satisfied = new Set<Directive>();
  const kept: Diagnostic[] = [];
  for (const diag of diagnostics) {
    const line = diag.span?.start.line;
    if (line === undefined) {
      kept.push(diag); // no span → nothing to anchor a directive to
      continue;
    }
    const hit = lineDirectiveFor(line, diag.rule);
    if (hit) {
      satisfied.add(hit);
      continue;
    }
    if (!blockDisabled(line, diag.rule)) kept.push(diag);
  }

  for (const d of perLine) {
    if (d.kind === "expect-error" && !satisfied.has(d)) {
      kept.push({
        aspect: "directive",
        rule: "cssdoc-directive",
        message:
          "Unused cssdoc-expect-error: no cssdoc problem was reported on the following line.",
        span: {
          start: { line: d.startLine, column: 1 },
          end: { line: d.endLine, column: 2 },
        },
        severity: "warning",
      });
    }
  }
  return kept;
}
