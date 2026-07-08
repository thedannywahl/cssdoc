/**
 * The provider vocabulary — the host-neutral diagnostic, completion, and hover shapes every aspect
 * produces and every adapter (ESLint, Stylelint, the language server) translates into its own API.
 *
 * @module
 */
import type { SourceSpan } from "@cssdoc/index";

export type { Location, SourceSpan } from "@cssdoc/index";

/** Diagnostic severity. */
export type Severity = "error" | "warning";

/** One diagnostic from an aspect. */
export interface Diagnostic {
  /** The aspect that produced it (e.g. `modifier`). */
  aspect: string;
  /** The rule name (e.g. `unknown-modifier`). */
  rule: string;
  /** A human-readable message. */
  message: string;
  /** The record it concerns, when applicable. */
  record?: string;
  /** The source span, when known (author-side comes from the index; usage-side from the usage). */
  span?: SourceSpan;
  /** Severity (defaults to `warning`). */
  severity: Severity;
}

/** What kind of thing a completion inserts. */
export type CompletionKind = "component" | "modifier" | "part" | "property" | "function" | "state";

/** One completion item. */
export interface Completion {
  /** The text to insert (e.g. `-color-secondary`, `--value`). */
  label: string;
  kind: CompletionKind;
  /** A short type/hint shown beside the label. */
  detail?: string;
  /** Markdown documentation. */
  documentation?: string;
  /** Whether the item is deprecated. */
  deprecated?: boolean;
}

/** Hover content (markdown). */
export interface Hover {
  contents: string;
}

/** Options that tune usage checks. */
export interface UsageOptions {
  /**
   * When set, a `var(--name)` whose name starts with this prefix but isn't a declared custom property
   * is flagged as unknown. Off by default, since consumed properties are often external tokens.
   */
  propertyPrefix?: string;
}
