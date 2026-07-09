/**
 * Match a CSS value against a registered custom property's `@property` `syntax` descriptor, using
 * css-tree's lexer. This is what lets the value rules reject `--gap: red` when `--gap` is declared
 * `<length>`. Values that are runtime-substituted (`var()`, `env()`) or CSS-wide keywords can't be
 * validated statically, so they're skipped rather than flagged (we never warn on what we can't check).
 *
 * @module
 */
import { type Lexer, fork } from "css-tree";

// css-tree matches values against *property* grammars, so we register the syntax under a throwaway
// property name and match against that. Forked lexers are cached per syntax string.
const PROBE = "-cssdoc-syntax-probe";
const CSS_WIDE = /^(?:initial|inherit|unset|revert|revert-layer)$/iu;
const SUBSTITUTION = /\b(?:var|env)\(/iu;

const lexerCache = new Map<string, Lexer | null>();

function lexerFor(syntax: string): Lexer | null {
  const cached = lexerCache.get(syntax);
  if (cached !== undefined) return cached;
  let lexer: Lexer | null = null;
  try {
    lexer = fork({ properties: { [PROBE]: syntax } }).lexer;
  } catch {
    lexer = null; // unparseable syntax — treat as "can't check"
  }
  lexerCache.set(syntax, lexer);
  return lexer;
}

/** The result of matching a value against a syntax. */
export interface SyntaxMatch {
  /** Whether the value conforms. True when skipped — we don't flag what we can't check. */
  ok: boolean;
  /** True when the value couldn't be checked statically (universal `*`, `var()`/`env()`, CSS-wide keyword). */
  skipped: boolean;
}

/**
 * Whether `value` conforms to a `@property` `syntax` string (e.g. `<length>`, `<color> | none`,
 * `<length>+`). Universal syntax (`*`), substitution values, and CSS-wide keywords are skipped.
 *
 * @param syntax - The `@property` `syntax` descriptor.
 * @param value - The CSS value to check.
 * @returns Whether it matches, and whether the check was skipped.
 */
export function matchesSyntax(syntax: string, value: string): SyntaxMatch {
  const s = syntax.trim();
  const v = value.trim();
  if (!s || s === "*") return { ok: true, skipped: true };
  if (!v || CSS_WIDE.test(v) || SUBSTITUTION.test(v)) return { ok: true, skipped: true };
  const lexer = lexerFor(s);
  if (!lexer) return { ok: true, skipped: true };
  // css-tree reports a match by leaving `error` null.
  const result = lexer.matchProperty(PROBE, v);
  return { ok: result.error === null, skipped: false };
}
