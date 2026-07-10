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
   * string or several — any one of which marks a modifier. Separators are matched literally.
   */
  separator: string | string[];
  /**
   * The delimiter that marks a **BEM-style element** inside the base class name (e.g. `"__"` in
   * `.block__element`). When set (`suffix` structure only), a matching class is recorded as a
   * {@link https://cssdoc.dev part} rather than a modifier. Its own modifiers
   * (`.block__element--mod`) are captured as part of the element name for now.
   */
  elementSeparator?: string | string[];
  /**
   * Class prefixes that mark a **state** rather than a modifier (e.g. `["is-", "has-"]`). A class
   * chained to the base whose name starts with one of these is recorded as a state, and is never
   * treated as a modifier. Opt-in; no preset sets it by default.
   */
  statePrefixes?: string[];
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
  /** BEM / SUIT — `.button--primary`, with `.button__element` sub-elements. The default. */
  bem: { structure: "suffix", separator: "--", elementSeparator: "__", propValue: false },
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
    ...(base.elementSeparator !== undefined ? { elementSeparator: base.elementSeparator } : {}),
    ...(base.statePrefixes !== undefined ? { statePrefixes: base.statePrefixes } : {}),
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
  /** BEM-style element separators (longest-first), or empty when the convention has none. */
  private readonly elementSeparators: string[];
  /** The element separators as a non-capturing alternation, or `""` when there are none. */
  private readonly elementSepAlt: string;
  /** State-class prefixes (longest-first), or empty when the convention has none. */
  private readonly statePrefixes: string[];

  constructor(convention: ModifierConvention) {
    this.convention = convention;
    const longestFirst = (value: string | string[]): string[] =>
      (Array.isArray(value) ? value : [value]).slice().sort((a, b) => b.length - a.length);
    this.separators = longestFirst(convention.separator);
    this.sepAlt = `(?:${this.separators.map(escapeRe).join("|")})`;
    this.elementSeparators = convention.elementSeparator
      ? longestFirst(convention.elementSeparator).filter((s) => s !== "")
      : [];
    this.elementSepAlt = this.elementSeparators.length
      ? `(?:${this.elementSeparators.map(escapeRe).join("|")})`
      : "";
    this.statePrefixes = (convention.statePrefixes ?? [])
      .filter((p) => p !== "")
      .slice()
      .sort((a, b) => b.length - a.length);
  }

  /** Does a class name (no leading dot) start with one of the convention's state prefixes? */
  private isStateClass(name: string): boolean {
    return this.statePrefixes.some((p) => name.startsWith(p));
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
      for (const c of m[1].matchAll(inner)) if (!this.isStateClass(c[1])) push(c[1]);
    }
    return hits;
  }

  /**
   * Every BEM-style element attached to `baseNoDot` within one selector (`.base<elementSep><name>`),
   * as parts. Only meaningful for `suffix` conventions that set an `elementSeparator`; empty otherwise.
   * The element name is the full class token (e.g. `card__title`), matching how it's authored in HTML.
   */
  elementsIn(selector: string, baseNoDot: string): { name: string }[] {
    if (this.convention.structure !== "suffix" || this.elementSepAlt === "") return [];
    const baseEsc = escapeRe(baseNoDot);
    const re = new RegExp(`\\.(${baseEsc}${this.elementSepAlt}[\\w-]+)`, "gu");
    const seen = new Set<string>();
    const out: { name: string }[] = [];
    for (const m of selector.matchAll(re)) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        out.push({ name: m[1] });
      }
    }
    return out;
  }

  /**
   * Every state class chained to `baseNoDot` within one selector — a class whose name starts with one
   * of the convention's {@link ModifierConvention.statePrefixes} (e.g. `.tabs.is-open` → `is-open`).
   * Empty when the convention sets no state prefixes.
   */
  statesIn(selector: string, baseNoDot: string): { name: string }[] {
    if (this.statePrefixes.length === 0) return [];
    const baseEsc = escapeRe(baseNoDot);
    const prefixAlt = `(?:${this.statePrefixes.map(escapeRe).join("|")})`;
    const chain = new RegExp(`(?:\\.${baseEsc}|:scope)((?:\\.[\\w-]+)+)`, "gu");
    const inner = new RegExp(`\\.(${prefixAlt}[\\w-]+)`, "gu");
    const seen = new Set<string>();
    const out: { name: string }[] = [];
    for (const m of selector.matchAll(chain)) {
      for (const c of m[1].matchAll(inner)) {
        if (!seen.has(c[1])) {
          seen.add(c[1]);
          out.push({ name: c[1] });
        }
      }
    }
    return out;
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
    // A state class is a state, not a modifier usage.
    if (this.isStateClass(name)) return false;
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
