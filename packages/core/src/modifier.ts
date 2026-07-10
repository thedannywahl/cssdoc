/**
 * The modifier convention — how a component's modifier variations are spelled in CSS, and the one
 * place that spelling is turned into (and back out of) selectors. cssdoc is framework-agnostic, so it
 * doesn't assume any single scheme: BEM (`.button--primary`, the default), rscss (`.button.-color-x`),
 * bare/OOCSS chained classes (`.button.primary`), CUBE data-attribute exceptions
 * (`.card[data-variant="ghost"]`), and anything expressible as the three structural forms below.
 *
 * {@link ModifierMatcher} is the single owner of modifier matching, prop/value analysis, and
 * selector rendering — both `parse.ts` and `index.ts` route through it, so their notions of "what is a
 * modifier" can't drift.
 *
 * @module
 */

/**
 * How a modifier attaches to a component's base class.
 *
 * - `chained` — a separate class on the base element: `.base.primary` (bare/OOCSS), `.base.-mod`
 *   (rscss), `.base.is-open` (state). `separator` is the required class prefix (`""` = any chained
 *   class, `-`, `is-`).
 * - `suffix` — appended into the base class name itself: `.button--primary` (BEM/SUIT). `separator` is
 *   the delimiter between the base and the modifier body (`--`).
 * - `attribute` — an attribute selector on the base element: `.card[data-variant="ghost"]` (CUBE).
 *   `separator` is the required attribute-name prefix (`data-`; `""` = any attribute).
 */
export interface ModifierConvention {
  /** The structural form. An open union — further forms may be added without a breaking change. */
  structure: "chained" | "suffix" | "attribute";
  /**
   * The prefix/delimiter, interpreted per {@link ModifierConvention.structure}. May be a single
   * string or several — any one of which marks a modifier (e.g. `["is-", "has-"]` for state
   * classes, or `["--", "__"]`). Separators are matched literally (never as a regex).
   */
  separator: string | string[];
  /**
   * Split the modifier body into `prop`/`value` on {@link ModifierConvention.propValueSeparator}?
   * Defaults to `false`. Ignored for `attribute` (which always derives `prop` from the attribute name
   * and `value` from the attribute value).
   */
  propValue?: boolean;
  /** The separator for the `prop`/`value` split. Defaults to `-`. */
  propValueSeparator?: string;
}

/** The built-in convention presets. Other schemes use the custom object (see the docs). */
export const MODIFIER_PRESETS = {
  /** BEM / SUIT — `.button--primary`. The default. */
  bem: { structure: "suffix", separator: "--", propValue: false },
  /** rscss — `.button.-color-secondary`, split into `prop`/`value`. */
  rscss: { structure: "chained", separator: "-", propValue: true, propValueSeparator: "-" },
  /** OOCSS / bare chained classes — `.button.primary` (any class chained to the base). */
  bare: { structure: "chained", separator: "", propValue: false },
} as const satisfies Record<string, ModifierConvention>;

/** A preset name, or a full custom {@link ModifierConvention}. */
export type ModifierConventionInput = keyof typeof MODIFIER_PRESETS | ModifierConvention;

/** The default convention: BEM. */
export const DEFAULT_MODIFIER_CONVENTION: ModifierConvention = MODIFIER_PRESETS.bem;

/**
 * Resolve a preset name or custom object into a fully-populated {@link ModifierConvention} (defaults
 * filled in). No argument resolves to the {@link DEFAULT_MODIFIER_CONVENTION} (BEM).
 *
 * @throws If given an unknown preset name.
 */
export function resolveModifierConvention(input?: ModifierConventionInput): ModifierConvention {
  let base: ModifierConvention | undefined;
  if (input === undefined) base = DEFAULT_MODIFIER_CONVENTION;
  else if (typeof input === "string") base = MODIFIER_PRESETS[input];
  else base = input;
  if (!base) throw new Error(`Unknown modifier convention preset: ${JSON.stringify(input)}`);
  return {
    structure: base.structure,
    separator: base.separator,
    propValue: base.propValue ?? false,
    propValueSeparator: base.propValueSeparator ?? "-",
  };
}

/** One modifier found on a selector: its canonical name plus the derived `prop`/`value`. */
export interface ModifierHit {
  /** The modifier as written, minus outer punctuation — `button--primary`, `-color-secondary`,
   *  `primary`, or `data-variant="ghost"`. Render it back with {@link ModifierMatcher.selectorFor}. */
  name: string;
  /** The property segment (a grouping key). */
  prop: string;
  /** The value segment; absent for boolean modifiers. */
  value?: string;
}

/** Escape a string for literal use inside a `RegExp`. */
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

/** Strip one layer of matching quotes from an attribute value. */
const unquote = (v: string): string => v.trim().replace(/^(["'])([\s\S]*)\1$/u, "$2");

/**
 * The single owner of modifier recognition for one convention: finds modifiers on selectors, derives
 * `prop`/`value`, renders a modifier name back to a selector fragment, and answers "does this host-doc
 * token look like a modifier usage?". Constructed once per parse from the resolved convention.
 */
export class ModifierMatcher {
  readonly convention: ModifierConvention;
  /** The separator(s), longest-first so overlapping prefixes (e.g. `--` before `-`) match greedily. */
  private readonly separators: string[];
  /** The separators as a non-capturing regex alternation, e.g. `(?:is-|has-)` (or `(?:)` when empty). */
  private readonly sepAlt: string;

  constructor(convention: ModifierConvention) {
    this.convention = convention;
    this.separators = (
      Array.isArray(convention.separator) ? convention.separator : [convention.separator]
    )
      .slice()
      .sort((a, b) => b.length - a.length);
    this.sepAlt = `(?:${this.separators.map(escapeRe).join("|")})`;
  }

  /** Strip a leading chained-class separator from `name` (the longest that matches), else return it. */
  private stripPrefix(name: string): string {
    for (const s of this.separators) if (name.startsWith(s)) return name.slice(s.length);
    return name;
  }

  /** Return the suffix body — the part after the first (longest) non-empty separator occurrence. */
  private stripToBody(name: string): string {
    for (const s of this.separators) {
      if (s === "") continue;
      const at = name.indexOf(s);
      if (at !== -1) return name.slice(at + s.length);
    }
    return name;
  }

  /**
   * Every modifier attached to `baseNoDot` within one selector. `selector` should have its pseudos
   * already dropped (as `parse.ts`/`index.ts` do); the base is given without its leading dot.
   */
  modifiersIn(selector: string, baseNoDot: string): ModifierHit[] {
    const baseEsc = escapeRe(baseNoDot);
    const hits: ModifierHit[] = [];
    const seen = new Set<string>();
    const push = (name: string): void => {
      if (seen.has(name)) return;
      seen.add(name);
      hits.push({ name, ...this.analyze(name) });
    };

    if (this.convention.structure === "suffix") {
      // `.base<sep><body>` — the modifier is conjoined into the base class name.
      const re = new RegExp(`\\.(${baseEsc}${this.sepAlt}[\\w-]+)`, "gu");
      for (const m of selector.matchAll(re)) push(m[1]);
      return hits;
    }

    if (this.convention.structure === "attribute") {
      // `.base[<attr>]…` / `:scope[<attr>]…` — attribute selectors chained onto the base.
      const chain = new RegExp(`(?:\\.${baseEsc}|:scope)((?:\\[[^\\]]*\\])+)`, "gu");
      for (const m of selector.matchAll(chain)) {
        for (const a of m[1].matchAll(/\[([^\]]*)\]/gu)) {
          const name = this.normalizeAttribute(a[1]);
          if (name && this.attributeMatches(name)) push(name);
        }
      }
      return hits;
    }

    // chained: one or more classes chained onto the base, each carrying a separator prefix.
    const cls = `\\.${this.sepAlt}[\\w-]+`;
    const chain = new RegExp(`(?:\\.${baseEsc}|:scope)((?:${cls})+)`, "gu");
    const inner = new RegExp(`\\.(${this.sepAlt}[\\w-]+)`, "gu");
    for (const m of selector.matchAll(chain)) {
      for (const c of m[1].matchAll(inner)) push(c[1]);
    }
    return hits;
  }

  /** Derive `prop`/`value` for a modifier `name` (as returned by {@link modifiersIn} or authored). */
  analyze(name: string): { prop: string; value?: string } {
    if (this.convention.structure === "attribute") {
      const canonical = this.normalizeAttribute(name);
      const eq = canonical.indexOf("=");
      const attr = eq === -1 ? canonical : canonical.slice(0, eq);
      const prop = this.stripPrefix(attr);
      const value = eq === -1 ? undefined : unquote(canonical.slice(eq + 1));
      return { prop, value };
    }

    // Reduce the name to its body (the part after the structural marker).
    const body =
      this.convention.structure === "suffix" ? this.stripToBody(name) : this.stripPrefix(name);

    if (!this.convention.propValue) return { prop: body };
    const sep = this.convention.propValueSeparator ?? "-";
    const at = body.indexOf(sep);
    if (at === -1) return { prop: body };
    return { prop: body.slice(0, at), value: body.slice(at + sep.length) };
  }

  /** Render a modifier `name` as the selector fragment it denotes (`.name` or `[name]`). */
  selectorFor(name: string): string {
    return this.convention.structure === "attribute" ? `[${name}]` : `.${name}`;
  }

  /** Normalize a member token/expression to its canonical `name` key (the inverse of authoring noise). */
  normalizeMember(token: string): string {
    if (this.convention.structure === "attribute") {
      const inner = token.replace(/^\[/u, "").replace(/\]$/u, "");
      return this.normalizeAttribute(inner);
    }
    return token.replace(/^\./u, "");
  }

  /**
   * Does a token/expression seen in a host document (an HTML class token, or an attribute expression)
   * look like a modifier usage of `baseNoDot`? Replaces the old `startsWith("-")` gate.
   */
  looksLikeUsage(token: string, baseNoDot?: string): boolean {
    if (this.convention.structure === "attribute") {
      return this.attributeMatches(this.normalizeMember(token));
    }
    const name = token.replace(/^\./u, "");
    if (this.convention.structure === "suffix") {
      if (baseNoDot) return this.separators.some((s) => name.startsWith(`${baseNoDot}${s}`));
      return this.separators.some((s) => s !== "" && name.includes(s));
    }
    // chained
    if (baseNoDot && name === baseNoDot) return false;
    return this.separators.some((s) => name.startsWith(s));
  }

  /** Canonicalize an attribute expression (bracket-inner): normalize quotes to double, trim. */
  private normalizeAttribute(inner: string): string {
    const trimmed = inner.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) return trimmed;
    // Keep any comparison operator char (`~`, `|`, `^`, `$`, `*`) that precedes `=`.
    const attr = trimmed.slice(0, eq + 1);
    const value = unquote(trimmed.slice(eq + 1));
    return `${attr}"${value}"`;
  }

  /** Does an attribute-expression's name carry one of the convention's required prefixes? */
  private attributeMatches(name: string): boolean {
    const eq = name.indexOf("=");
    const attr = (eq === -1 ? name : name.slice(0, eq)).replace(/[~|^$*]$/u, "");
    return attr.length > 0 && this.separators.some((s) => attr.startsWith(s));
  }
}
