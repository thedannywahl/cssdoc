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
 * Any directive may carry a trailing ` - <reason>` explaining why the rule(s) are disabled, e.g.
 * `/* cssdoc-disable-line missing-summary - generated file, documented upstream *\/`. The reason is
 * captured on the {@link Directive} and otherwise ignored, so it never counts as a rule name.
 *
 * @module
 */

import {
  COMMENT_END_SOURCE,
  COMMENT_START_SOURCE,
  CSSDOC_DIRECTIVE_KIND_SOURCE,
  DASH_SOURCE,
} from "@cssdoc/regex";
import { regex as arkRegex } from "arkregex";

import { tokenize, tokenTypes } from "./css-tokenizer.ts";
import { DEFAULT_RULE_SEVERITIES, type Diagnostic, type RuleSeverity } from "./types.ts";

type DirectiveKind = "disable" | "enable" | "disable-line" | "disable-next-line" | "expect-error";

interface Directive {
  kind: DirectiveKind;
  /** Rule ids the directive scopes to, or `null` for every rule. */
  rules: string[] | null;
  /** The author's justification, from a trailing ` - <reason>` on the directive, when present. */
  reason?: string;
  /** 1-based line the comment starts / ends on. */
  startLine: number;
  endLine: number;
}

const DIRECTIVE = arkRegex.as(
  String.raw`${COMMENT_START_SOURCE}\s*cssdoc-(${CSSDOC_DIRECTIVE_KIND_SOURCE})([^*]*?)${COMMENT_END_SOURCE}`,
  "dgu",
);
const REASON_SEPARATOR = arkRegex.as(String.raw`\s${DASH_SOURCE}\s`, "u");
const RULE_SEPARATOR = arkRegex.as(String.raw`[\s,]+`, "u");
const RULE = arkRegex.as(String.raw`[^\s,]+`, "gu");

function directiveMatches(source: string): { start: number; match: RegExpMatchArray }[] {
  const matches: { start: number; match: RegExpMatchArray }[] = [];
  tokenize(source, (type, start, end) => {
    if (type !== tokenTypes.Comment) return;
    const match = [...source.slice(start, end).matchAll(DIRECTIVE)][0];
    if (match?.index === 0) matches.push({ start, match });
  });
  return matches;
}

/** Source range of a directive keyword or rule name. */
export interface DirectiveHighlight {
  /** Inclusive UTF-16 offset in the supplied CSS. */
  start: number;
  /** Exclusive UTF-16 offset in the supplied CSS. */
  end: number;
  /** Whether the range is the directive keyword or one rule name. */
  role: "directive" | "directiveRule";
}

/**
 * Find directive syntax using the same recognition and reason boundary as diagnostics.
 *
 * @param source - CSS text or an individual CSS comment.
 * @returns Non-overlapping source-relative ranges in order.
 */
export function highlightDirectives(source: string): DirectiveHighlight[] {
  const result: DirectiveHighlight[] = [];
  for (const { start, match } of directiveMatches(source)) {
    const kind = match.indices?.[1];
    const rules = match.indices?.[2];
    if (!kind || !rules) throw new Error("Missing directive source offsets");
    result.push({
      start: start + kind[0] - "cssdoc-".length,
      end: start + kind[1],
      role: "directive",
    });
    const reasonAt = match[2].search(REASON_SEPARATOR);
    const ruleText = reasonAt < 0 ? match[2] : match[2].slice(0, reasonAt);
    for (const rule of ruleText.matchAll(RULE)) {
      result.push({
        start: start + rules[0] + rule.index,
        end: start + rules[0] + rule.index + rule[0].length,
        role: "directiveRule",
      });
    }
  }
  return result;
}

const lineAt = (source: string, index: number): number => {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) if (source[i] === "\n") line += 1;
  return line;
};

/** Parse every `cssdoc-*` directive comment out of a CSS source. */
export function parseDirectives(source: string): Directive[] {
  const out: Directive[] = [];
  for (const { start: at, match: m } of directiveMatches(source)) {
    // A ` - <reason>` suffix (space-hyphen-space) splits the justification off the rule list. Rule ids
    // never contain a standalone ` - `, so this can't swallow one (e.g. `missing-summary` is untouched).
    const reasonAt = m[2].search(REASON_SEPARATOR);
    const rulesPart = (reasonAt === -1 ? m[2] : m[2].slice(0, reasonAt)).trim();
    const reason = reasonAt === -1 ? undefined : m[2].slice(reasonAt + 3).trim();
    out.push({
      kind: m[1] as DirectiveKind,
      rules: rulesPart ? rulesPart.split(RULE_SEPARATOR).filter(Boolean) : null,
      reason: reason || undefined,
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
 * @param directiveSeverity - The configured severity for unused expectations.
 * @returns The surviving diagnostics.
 */
export function applyDirectives(
  diagnostics: Diagnostic[],
  source: string,
  directiveSeverity: RuleSeverity = DEFAULT_RULE_SEVERITIES["cssdoc-directive"],
): Diagnostic[] {
  const directives = parseDirectives(source);
  if (directives.length === 0) return diagnostics;

  const block = directives
    .filter((d) => d.kind === "disable" || d.kind === "enable")
    .toSorted((a, b) => a.startLine - b.startLine);
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

  const directiveDiagnostics: Diagnostic[] = [];
  for (const d of perLine.toReversed()) {
    if (d.kind === "expect-error" && !satisfied.has(d) && directiveSeverity !== "off") {
      const hit = lineDirectiveFor(d.startLine, "cssdoc-directive");
      if (hit) {
        satisfied.add(hit);
        continue;
      }
      if (blockDisabled(d.startLine, "cssdoc-directive")) continue;
      directiveDiagnostics.push({
        aspect: "directive",
        rule: "cssdoc-directive",
        message:
          "Unused cssdoc-expect-error: no cssdoc problem was reported on the following line.",
        span: {
          start: { line: d.startLine, column: 1 },
          end: { line: d.endLine, column: 2 },
        },
        severity: directiveSeverity === "error" ? "error" : "warning",
      });
    }
  }
  kept.push(...directiveDiagnostics.reverse());
  return kept;
}
