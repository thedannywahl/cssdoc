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
   * Native pseudo-classes (without the `:`) to recognize as states when they appear on the base,
   * e.g. `["disabled", "checked"]`. Defaults to {@link DEFAULT_STATE_PSEUDO_CLASSES} — a curated set
   * of form/UI states, deliberately excluding ubiquitous interaction pseudos (`:hover`, `:focus`).
   */
  statePseudoClasses?: string[];
  /**
   * Split the modifier body into `prop`/`value` on {@link ModifierConvention.propValueSeparator}?
   * Defaults to `false`. Ignored for `attribute` (which always derives `prop` from the attribute name
   * and `value` from the attribute value).
   */
  propValue?: boolean;
  /** The separator for the `prop`/`value` split. Defaults to `-`. */
  propValueSeparator?: string;
}

/**
 * The pseudo-classes cssdoc treats as component states by default — form and UI states a component
 * meaningfully declares. Ubiquitous interaction pseudos (`:hover`, `:focus`, `:active`) are omitted so
 * incidental rules don't become documented states; add them via `statePseudoClasses` if you want them.
 */
export const DEFAULT_STATE_PSEUDO_CLASSES: readonly string[] = [
  "checked",
  "disabled",
  "enabled",
  "indeterminate",
  "default",
  "open",
  "placeholder-shown",
  "read-only",
  "read-write",
  "required",
  "optional",
  "valid",
  "invalid",
  "in-range",
  "out-of-range",
];

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
    statePseudoClasses: base.statePseudoClasses ?? [...DEFAULT_STATE_PSEUDO_CLASSES],
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
  /** Set when the name is a `*` family (e.g. `-icon-*`, derived from a `[class*="-icon-"]` selector). */
  pattern?: boolean;
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
  /** Native pseudo-classes (no `:`) recognized as states. */
  private readonly statePseudoClasses: Set<string>;

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
    this.statePseudoClasses = new Set(convention.statePseudoClasses ?? []);
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
      hits.push({ name, ...this.analyze(name), ...(name.includes("*") ? { pattern: true } : {}) });
    };

    if (this.convention.structure === "suffix") {
      // `.base<sep><body>` — the modifier is conjoined into the base class name.
      const re = new RegExp(`\\.(${baseEsc}${this.sepAlt}[\\w-]+)`, "gu");
      for (const m of selector.matchAll(re)) push(m[1]);
      for (const name of this.classAttrFamilies(selector, baseEsc)) push(name);
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
    for (const name of this.classAttrFamilies(selector, baseEsc)) push(name);
    return hits;
  }

  /**
   * Family modifiers declared by a `class` attribute selector on the base — `.base[class*="-icon-"]`
   * yields the `*` family `-icon-*`. The operator maps to the wildcard position: `*=`/`|=` and (rare)
   * exact `~=`/`=` derive a prefix family or a concrete name, `$=` a suffix family; `^=` is skipped
   * (it anchors to the start of the whole class attribute — the base class — not a chained modifier).
   * The value must begin with a convention separator to count (so `[class*="-icon-"]` does, `[dir]` and
   * `[class*="grid"]` don't), and carry a literal core beyond the separator.
   */
  private classAttrFamilies(selector: string, baseEsc: string): string[] {
    const out: string[] = [];
    const chain = new RegExp(`(?:\\.${baseEsc}|:scope)((?:\\[[^\\]]*\\])+)`, "gu");
    const attr = /\[\s*class\s*([~^$*|]?)=\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]*))\s*\]/gu;
    for (const m of selector.matchAll(chain)) {
      for (const a of m[1].matchAll(attr)) {
        const value = (a[2] ?? a[3] ?? a[4] ?? "").trim();
        const name = this.classAttrFamily(a[1], value);
        if (name) out.push(name);
      }
    }
    return out;
  }

  /** Derive a modifier name from a `[class OP value]` selector, or `undefined` when it isn't one. */
  private classAttrFamily(op: string, value: string): string | undefined {
    const sep = this.separators.find((s) => s !== "" && value.startsWith(s));
    if (sep === undefined && this.separators.every((s) => s !== "")) return undefined; // not a modifier value
    if (value.length <= (sep?.length ?? 0)) return undefined; // no literal core beyond the separator
    if (op === "^") return undefined; // anchors to the attribute start (base class), not a chained modifier
    if (op === "$") return `*${value}`;
    if (op === "" || op === "~") return value; // exact class → a concrete modifier
    return `${value}*`; // *=, |= → prefix family
  }

  /**
   * Every BEM-style element attached to `baseNoDot` within one selector (`.base<elementSep><name>`),
   * as parts, each with any element-scoped modifiers (`.base__element--mod` → element `base__element`
   * with modifier `mod`). Only meaningful for `suffix` conventions with an `elementSeparator`.
   */
  elementsIn(selector: string, baseNoDot: string): { name: string; modifiers: ModifierHit[] }[] {
    if (this.convention.structure !== "suffix" || this.elementSepAlt === "") return [];
    const baseEsc = escapeRe(baseNoDot);
    const re = new RegExp(`\\.(${baseEsc}${this.elementSepAlt}[\\w-]+)`, "gu");
    const byName = new Map<string, ModifierHit[]>();
    for (const m of selector.matchAll(re)) {
      const { element, modifier } = this.splitElementModifier(m[1], baseNoDot);
      const mods = byName.get(element) ?? [];
      if (modifier && !mods.some((x) => x.name === modifier.name)) mods.push(modifier);
      byName.set(element, mods);
    }
    return [...byName].map(([name, modifiers]) => ({ name, modifiers }));
  }

  /**
   * Split `.base__element--mod`-style tokens into the element class (`base__element`) and, if a
   * modifier separator follows the element name, the element-scoped modifier.
   */
  private splitElementModifier(
    token: string,
    baseNoDot: string,
  ): { element: string; modifier?: ModifierHit } {
    const elsep = this.elementSeparators.find((s) => token.startsWith(baseNoDot + s));
    if (!elsep) return { element: token };
    const afterElement = baseNoDot.length + elsep.length;
    let at = -1;
    for (const sep of this.separators) {
      if (sep === "") continue;
      const i = token.indexOf(sep, afterElement);
      if (i !== -1 && (at === -1 || i < at)) at = i;
    }
    if (at === -1) return { element: token };
    return { element: token.slice(0, at), modifier: { name: token, ...this.analyze(token) } };
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

  /**
   * Every native pseudo-class on the selector recognized as a state — a `:name` whose `name` is in the
   * convention's {@link ModifierConvention.statePseudoClasses} (e.g. `.tab:disabled` → `disabled`).
   * Pseudo-elements (`::part`) and pseudos not in the set are ignored.
   */
  pseudoStatesIn(selector: string): { name: string }[] {
    if (this.statePseudoClasses.size === 0) return [];
    const seen = new Set<string>();
    const out: { name: string }[] = [];
    for (const m of selector.matchAll(/(?<!:):([\w-]+)/gu)) {
      const name = m[1];
      if (this.statePseudoClasses.has(name) && !seen.has(name)) {
        seen.add(name);
        out.push({ name });
      }
    }
    return out;
  }

  /** Derive `prop`/`value` for a modifier `name` (as returned by {@link modifiersIn} or authored). */
  analyze(name: string): { prop: string; value?: string } {
    if (name.includes("*")) {
      // A `*` family has no clean value; group by its literal core (the body minus wildcard and seps).
      const body =
        this.convention.structure === "suffix" ? this.stripToBody(name) : this.stripPrefix(name);
      const prop = body.replace(/\*/gu, "").replace(/-+$/u, "");
      return { prop: prop || body };
    }
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

  /**
   * Whether a used class `used` is an instance of the documented modifier `name` — an exact match, or,
   * when `name` is a `*` family (e.g. `-icon-*`), a glob match (`*` → any `[\w-]` run). Used consumer-side
   * so `-icon-arrow` resolves to the documented `-icon-*` family.
   */
  matchesModifier(name: string, used: string): boolean {
    if (name === used) return true;
    if (!name.includes("*")) return false;
    return new RegExp(`^${name.split("*").map(escapeRe).join("[\\w-]*")}$`, "u").test(used);
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

  /**
   * Classify a host-document class token relative to `baseNoDot`: a `modifier` usage, a `state` class
   * (a `statePrefixes` prefix), a BEM `element` class (`base<elementSep>…`), or `undefined` if it's
   * none of those. Consumer-side linting routes each kind to the right "unknown-…" check.
   */
  usageKind(token: string, baseNoDot?: string): "modifier" | "state" | "element" | undefined {
    if (this.convention.structure === "attribute") {
      return this.looksLikeUsage(token, baseNoDot) ? "modifier" : undefined;
    }
    const name = token.replace(/^\./u, "");
    if (this.isStateClass(name)) return "state";
    if (
      baseNoDot &&
      this.convention.structure === "suffix" &&
      this.elementSeparators.some((s) => name.startsWith(`${baseNoDot}${s}`))
    ) {
      return "element";
    }
    return this.looksLikeUsage(token, baseNoDot) ? "modifier" : undefined;
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
