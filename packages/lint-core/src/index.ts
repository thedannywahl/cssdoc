/**
 * `@cssdoc/lint-core` — the shared doc-comment-hygiene rules for CSS, independent of any linter. Both
 * `@cssdoc/stylelint-plugin` and `@cssdoc/eslint-plugin` call {@link lintCssDocs} and translate its
 * {@link Violation}s into their host's diagnostics, so the checks live in exactly one place.
 *
 * The rules combine the `@cssdoc/core` model (what was documented) with a PostCSS pass over the source
 * (where each record sits, and which modifier/part classes the selectors actually define) — so it can
 * flag documentation that has drifted from the shipping CSS.
 *
 * @module
 */
import { CssDocConfiguration, parseCssDocs, parseDocComment, recordNameOf } from "@cssdoc/core";
import postcss, { type ChildNode } from "postcss";

/** The rules this package provides. */
export type RuleName =
  | "missing-summary"
  | "undocumented-modifier"
  | "undocumented-part"
  | "deprecated-requires-canonical"
  | "name-not-in-css";

/** Every rule name, in a stable order. */
export const RULE_NAMES: readonly RuleName[] = [
  "missing-summary",
  "undocumented-modifier",
  "undocumented-part",
  "deprecated-requires-canonical",
  "name-not-in-css",
];

/** One rule violation. */
export interface Violation {
  /** Which rule fired. */
  rule: RuleName;
  /** A human-readable message. */
  message: string;
  /** The record (component/utility/…) the violation is about. */
  record: string;
  /** The 1-based source line of the record's doc comment. */
  line: number;
}

/** Options for {@link lintCssDocs}. */
export interface LintOptions {
  /** The tag configuration to parse with (custom tags, etc.). */
  configuration?: CssDocConfiguration;
  /** Enable/disable individual rules (all enabled by default). */
  rules?: Partial<Record<RuleName, boolean>>;
}

interface RecordScan {
  name: string;
  line: number;
  commentText: string;
  selectorText: string;
}

/** Walk the CSS once, recording each record's doc-comment line and the selector text that follows it. */
function scanRecords(css: string, configuration: CssDocConfiguration): Map<string, RecordScan> {
  const root = postcss.parse(css);
  const scans = new Map<string, RecordScan>();
  let current: RecordScan | undefined;

  const gatherSelectors = (node: ChildNode): void => {
    if (node.type === "rule") current!.selectorText += ` ${node.selector}`;
    if ((node.type === "rule" || node.type === "atrule") && node.nodes) {
      for (const child of node.nodes) gatherSelectors(child);
    }
  };

  for (const node of root.nodes) {
    if (node.type === "comment") {
      const name = recordNameOf(node.text, configuration);
      if (name) {
        current = {
          name,
          line: node.source?.start?.line ?? 1,
          commentText: node.text,
          selectorText: "",
        };
        scans.set(name, current);
        continue;
      }
    }
    if (current) gatherSelectors(node);
  }
  return scans;
}

/**
 * Check a CSS string for doc-comment-hygiene problems.
 *
 * @param css - The CSS source.
 * @param options - {@link LintOptions}.
 * @returns The violations found, in document order.
 */
export function lintCssDocs(css: string, options: LintOptions = {}): Violation[] {
  const configuration = options.configuration ?? new CssDocConfiguration();
  const enabled = (rule: RuleName): boolean => options.rules?.[rule] !== false;

  const entries = parseCssDocs(css, { configuration });
  const scans = scanRecords(css, configuration);
  const violations: Violation[] = [];
  const at = (name: string): number => scans.get(name)?.line ?? 1;

  for (const entry of entries) {
    const line = at(entry.name);
    const push = (rule: RuleName, message: string): void => {
      if (enabled(rule)) violations.push({ rule, message, record: entry.name, line });
    };

    if (!entry.summary?.trim()) {
      push("missing-summary", `Record "${entry.name}" has no @summary.`);
    }
    for (const modifier of entry.modifiers) {
      if (!modifier.description?.trim() && !modifier.deprecated) {
        push(
          "undocumented-modifier",
          `Modifier ".${modifier.name}" of "${entry.name}" has no @modifier description.`,
        );
      }
      if (
        modifier.deprecated &&
        !modifier.deprecated.canonical &&
        !modifier.deprecated.note?.trim()
      ) {
        push(
          "deprecated-requires-canonical",
          `Deprecated modifier ".${modifier.name}" of "${entry.name}" needs a canonical replacement ({@link -x}) or a note.`,
        );
      }
    }
    for (const part of entry.parts) {
      if (!part.description?.trim()) {
        push(
          "undocumented-part",
          `Part ".${part.name}" of "${entry.name}" has no @part description.`,
        );
      }
    }

    // Drift: an authored @modifier / @part whose class no selector in the record actually defines.
    if (enabled("name-not-in-css")) {
      const scan = scans.get(entry.name);
      if (scan) {
        const doc = parseDocComment(scan.commentText, configuration);
        for (const modName of doc.modifiers.keys()) {
          if (!scan.selectorText.includes(`.${modName}`)) {
            push(
              "name-not-in-css",
              `Documented modifier ".${modName}" of "${entry.name}" is not defined by any selector.`,
            );
          }
        }
        for (const partName of doc.parts.keys()) {
          if (!scan.selectorText.includes(`.${partName}`)) {
            push(
              "name-not-in-css",
              `Documented part ".${partName}" of "${entry.name}" is not defined by any selector.`,
            );
          }
        }
      }
    }
  }
  return violations;
}
