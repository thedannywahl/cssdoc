/**
 * The aspect modules. Each documented aspect contributes some of: author-side model diagnostics,
 * consumer-side usage diagnostics, completions, hover, and definitions. All six aspects the model
 * carries are represented; the component hover folds in the structure, state, and condition facts, and
 * the generators (phase 3) surface them further. `index.ts` aggregates these into the public API.
 *
 * @module
 */
import {
  type ExampleFilter,
  type StructureNode,
  literalMarkdownText,
  selectExampleIndices,
} from "@cssdoc/core";
import { sanitizeMarkdownLinks, unescapeInlineOpeners } from "@cssdoc/core/prose";
import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import {
  ALPHANUMERIC_EXTENDED_SOURCE,
  ASTERISK_CHAR,
  AT_CHAR,
  BACKTICK_CHAR,
  BRACE_CLOSE_CHAR,
  BRACE_OPEN_CHAR,
  BRACKET_CLOSE_CHAR,
  BRACKET_OPEN_CHAR,
  CARET_CHAR,
  COLON_CHAR,
  COMMENT_END_TEXT,
  CSS_CLASS_ATTRIBUTE_SELECTOR,
  CSS_CLASS_REFERENCE,
  CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE,
  CSSDOC_QUALIFIED_REFERENCE_SOURCE,
  CSSDOC_SHORTHAND_STRUCTURE_REFERENCE_SOURCE,
  CSSDOC_TYPED_STRUCTURE_REFERENCE_SOURCE,
  DOLLAR_CHAR,
  DOT_CHAR,
  DOT_SOURCE,
  FORWARD_SLASH_CHAR,
  GREATER_THAN_CHAR,
  HTML_CUSTOM_ELEMENT_LIKE_NAME_SOURCE,
  LESS_THAN_CHAR,
  LINE_ENDING_SOURCE,
  LINE_FEED_CHAR,
  MARKDOWN_BACKTICK_FENCE_LINE_PREFIX,
  MARKDOWN_BACKTICK_FENCE_TEXT,
  PAREN_CLOSE_CHAR,
  PAREN_CLOSE_SOURCE,
  PAREN_OPEN_CHAR,
  PAREN_OPEN_SOURCE,
  POUND_CHAR,
  STRUCTURE_RECORD_KIND_SOURCE,
  TILDE_CHAR,
  UNDERSCORE_CHAR,
  WORD_BOUNDARY_SOURCE,
  escapeRegex,
  toRegExp,
} from "@cssdoc/regex";
import {
  type ClassUsage,
  type CssDocIndex,
  type Location,
  type PropertyAssignment,
  type PropertyUsage,
  type RecordInfo,
  type SourceSpan,
  memberKey,
} from "@cssdoc/index";
import { linkSyntax } from "./mdn.ts";
import { matchesSyntax } from "./syntax.ts";
import { HOVER_SECTION_KEYS } from "./types.ts";
import type {
  Completion,
  Diagnostic,
  Hover,
  HoverDetail,
  HoverPresentation,
  RuleOptions,
  HoverSectionKey,
  HoverSectionOrder,
  HoverSections,
  ResolvedNaming,
  UsageOptions,
} from "./types.ts";
import { resolveRuleOptions } from "./types.ts";

/** Render a `@property` syntax descriptor with each `<type>` linked to its MDN reference page. */
const linkedSyntax = (syntax: string): string => {
  const linked = linkSyntax(
    syntax,
    (type, url) =>
      `${BRACKET_OPEN_CHAR}${BACKTICK_CHAR}${LESS_THAN_CHAR}${type}${GREATER_THAN_CHAR}${BACKTICK_CHAR}${BRACKET_CLOSE_CHAR}${PAREN_OPEN_CHAR}${url}${PAREN_CLOSE_CHAR}`,
  );
  return linked === syntax ? `${BACKTICK_CHAR}${syntax}${BACKTICK_CHAR}` : linked; // no `<type>` to link → plain code span
};

const codeSpan = (text: string): string => `${BACKTICK_CHAR}${text}${BACKTICK_CHAR}`;
const LINE_ENDING: Regex = arkRegex.as(LINE_ENDING_SOURCE, "gu");
const plainHoverProse = (text: string): string =>
  literalMarkdownText(unescapeInlineOpeners(text, "plain")).replace(
    LINE_ENDING,
    `  ${LINE_FEED_CHAR}`,
  );
const bold = (text: string): string =>
  `${ASTERISK_CHAR.repeat(2)}${text}${ASTERISK_CHAR.repeat(2)}`;
const codicon = (name: string): string =>
  `${DOLLAR_CHAR}${PAREN_OPEN_CHAR}${name}${PAREN_CLOSE_CHAR}`;
const emptySection = `${UNDERSCORE_CHAR}—${UNDERSCORE_CHAR}`;
const SELECTOR_PREFIX: Regex = arkRegex.as(`^[${DOT_CHAR}${POUND_CHAR}]`, "u");
const stripDot = (name: string): string => (name.startsWith(DOT_CHAR) ? name.slice(1) : name);
const warn = (d: Omit<Diagnostic, "severity">): Diagnostic => ({ ...d, severity: "warning" });
const scaffoldDocLine = (commentSpan: SourceSpan | undefined, line: string): Diagnostic["fix"] => {
  if (!commentSpan) return undefined;
  const column = Math.max(1, commentSpan.start.column);
  const indentation = " ".repeat(column - 1);
  const position = { line: commentSpan.end.line, column: 1 };
  return {
    edits: [
      {
        span: { start: position, end: position },
        text: `${indentation} ${ASTERISK_CHAR} ${line}\n`,
      },
    ],
  };
};

const CUSTOM_ELEMENT: Regex = arkRegex.as(`^${HTML_CUSTOM_ELEMENT_LIKE_NAME_SOURCE}$`, "u");

/** A `*`-glob name (e.g. `-icon-*`) as a regex source over one class token (`*` → any `[\w-]` run). */
const globSource = (name: string): string =>
  name.split(ASTERISK_CHAR).map(escapeRegex).join(`${ALPHANUMERIC_EXTENDED_SOURCE}*`);

/** `class` attribute selectors, capturing the operator (`~`/`^`/`$`/`*`/`|`/none) and the value. */
const CLASS_ATTR = toRegExp(CSS_CLASS_ATTRIBUTE_SELECTOR);
const CLASS_REFERENCE = toRegExp(CSS_CLASS_REFERENCE);

/**
 * Whether `selectorText` (the record's concatenated selectors) defines the modifier/part `selector`.
 *
 * When `selector` starts with `.` the check is class-aware: literal class token match, then `class`
 * attribute selectors evaluated with their CSS operator semantics (`*=` substring, `$=` suffix,
 * `~=`/`=` exact word; `^=` is intentionally excluded as it anchors to the base class).
 *
 * For any other prefix (`[`, `#`, `:`, or a plain type selector) the check is a direct substring
 * search — `selectorText.includes(selector)`. This handles attribute selectors (`[data-layout="x"]`),
 * IDs (`#foo`), and `:host` without modifications.
 */
export const selectorDefines = (selectorText: string, selector: string): boolean => {
  if (!selector.startsWith(DOT_CHAR)) return selectorText.includes(selector); // attribute-convention modifier
  const name = stripDot(selector); // e.g. `-icon-*` or `-foo`
  const wild = name.includes(ASTERISK_CHAR);
  const prefix = name.split(ASTERISK_CHAR)[0]; // literal part before the first `*`

  // 1. A literal class token matching the (glob) name — e.g. `.-icon-foo` for `-icon-*`, `.-foo` for `-foo`.
  const CLASS: Regex = arkRegex.as(
    `${DOT_SOURCE}${globSource(name)}(?!${ALPHANUMERIC_EXTENDED_SOURCE})`,
    "u",
  );
  if (CLASS.exec(selectorText) !== null) return true;

  // 2. `class` attribute selectors, evaluated per operator against the modifier as a class token.
  const glob: Regex = arkRegex.as(`^${globSource(name)}$`, "u");
  for (const m of selectorText.matchAll(CLASS_ATTR)) {
    const op = m[1];
    const v = m[2] ?? m[3] ?? m[4] ?? "";
    if (!v || op === CARET_CHAR) continue; // ^= targets the attribute start (base class), not a chained modifier
    if (op === ASTERISK_CHAR) {
      if (wild ? prefix.includes(v) || v.includes(prefix) : name.includes(v)) return true;
    } else if (op === DOLLAR_CHAR) {
      if (wild ? v.endsWith(prefix) || prefix.endsWith(v) : name.endsWith(v)) return true;
    } else if (glob.test(v)) {
      return true; // `~=` / `=` (and `|=` bare value): an exact class in the family
    }
  }
  return false;
};

/**
 * Match a class name against a `structureIgnore` pattern — a literal name or a simple glob where `*`
 * stands for any run of characters (e.g. `util-*`, `*--legacy`, `*`). Matched literally otherwise.
 */
const globMatch = (pattern: string, value: string): boolean => {
  if (!pattern.includes(ASTERISK_CHAR)) return pattern === value;
  const re: Regex = arkRegex.as(
    `^${pattern.split(ASTERISK_CHAR).map(escapeRegex).join(".*")}$`,
    "u",
  );
  return re.test(value);
};

const STRUCTURE_REF_KIND: Regex = arkRegex.as(`^${STRUCTURE_RECORD_KIND_SOURCE}$`, "u");
const CUSTOM_MEDIA_REFERENCE = String.raw`(${CSSDOC_QUALIFIED_REFERENCE_SOURCE})\s+${PAREN_OPEN_SOURCE}\s*(${CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE})\s*${PAREN_CLOSE_SOURCE}(?:\s+(private))?`;
const TYPED_CUSTOM_MEDIA: Regex = arkRegex.as(
  String.raw`^(${STRUCTURE_RECORD_KIND_SOURCE})\s+${CUSTOM_MEDIA_REFERENCE}$`,
  "u",
);
const SHORTHAND_CUSTOM_MEDIA: Regex = arkRegex.as(`^${CUSTOM_MEDIA_REFERENCE}$`, "u");
const TERMINAL_COMPOUND: Regex = arkRegex.as(
  String.raw`([^\s${GREATER_THAN_CHAR}${TILDE_CHAR}+]+)\s*$`,
  "u",
);

type StructureRecordRef = { kind?: string; name: string; profile?: string; private?: boolean };

const parseStructureRecordRef = (selector: string): StructureRecordRef | undefined => {
  if (!selector.startsWith(AT_CHAR)) return undefined;
  const raw = selector.slice(1).trim();
  if (!raw) return undefined;

  const TYPED: Regex = arkRegex.as(`^${CSSDOC_TYPED_STRUCTURE_REFERENCE_SOURCE}$`, "u");
  const typed = raw.match(TYPED);
  if (typed) {
    return {
      kind: typed[1] === "name" ? "component" : typed[1],
      name: typed[2],
      profile: typed[3],
      private: Boolean(typed[4]),
    };
  }

  const typedCustomMedia = raw.match(TYPED_CUSTOM_MEDIA);
  if (typedCustomMedia) {
    return {
      kind: typedCustomMedia[1] === "name" ? "component" : typedCustomMedia[1],
      name: typedCustomMedia[2],
      profile: typedCustomMedia[3],
      private: Boolean(typedCustomMedia[4]),
    };
  }

  const shorthandCustomMedia = raw.match(SHORTHAND_CUSTOM_MEDIA);
  if (shorthandCustomMedia) {
    if (STRUCTURE_REF_KIND.test(shorthandCustomMedia[1])) return undefined;
    return {
      name: shorthandCustomMedia[1],
      profile: shorthandCustomMedia[2],
      private: Boolean(shorthandCustomMedia[3]),
    };
  }

  const SHORTHAND: Regex = arkRegex.as(`^${CSSDOC_SHORTHAND_STRUCTURE_REFERENCE_SOURCE}$`, "u");
  const shorthand = raw.match(SHORTHAND);
  if (!shorthand) return undefined;
  // Guard against malformed `@kind` without a name being interpreted as shorthand.
  if (STRUCTURE_REF_KIND.test(shorthand[1])) return undefined;
  return { name: shorthand[1], profile: shorthand[2], private: Boolean(shorthand[3]) };
};

/**
 * Whether a `@structure` tree references a class (a plain `.class` selector, a comma-list alternative,
 * or `:is()` co-location) or a record name (an `@component <name>` at-rule ref) anywhere in the tree.
 * Used to check that a `private` `@memberOf` member is actually contained in its declared parent's own
 * structure — the two facts should agree.
 */
const structureReferences = (
  nodes: readonly StructureNode[],
  className: string,
  recordName: string,
): boolean =>
  nodes.some((node) => {
    if ([...node.selector.matchAll(CLASS_REFERENCE)].some((m) => m[1] === className)) return true;
    if (node.colocated && node.colocated.replace(SELECTOR_PREFIX, "") === className) return true;
    const ref = parseStructureRecordRef(node.selector);
    if (ref && ref.name === recordName) return true;
    if ((node.variants ?? []).some((v) => structureReferences(v.nodes, className, recordName)))
      return true;
    return structureReferences(node.children, className, recordName);
  });

/**
 * Serialize an authored `@structure` tree back to nested CSS for a syntax-highlighted hover block. Leaf
 * selectors are left bare (no `{}`) — VS Code's CSS grammar still colours them, and it reads like the
 * authored `@structure` declaration; only nesting keeps braces. A node's authored prose (`@wrapper`)
 * trails its selector as a CSS comment.
 */
const renderStructureTree = (nodes: StructureNode[], depth = 0): string[] =>
  nodes.flatMap((n) => {
    const pad = "  ".repeat(depth);
    if (n.variants !== undefined) {
      // A nested `@variant` group re-serializes as the same blocks it was authored with.
      return n.variants.flatMap((v) => [
        `${pad}${AT_CHAR}variant${v.name ? ` ${v.name}` : ""} ${BRACE_OPEN_CHAR}`,
        ...renderStructureTree(v.nodes, depth + 1),
        `${pad}${BRACE_CLOSE_CHAR}`,
      ]);
    }
    const note = n.description
      ? ` ${FORWARD_SLASH_CHAR}${ASTERISK_CHAR} ${n.description} ${COMMENT_END_TEXT}`
      : "";
    const colocSuffix = n.colocated
      ? `${COLON_CHAR}is${PAREN_OPEN_CHAR}${n.colocated}${PAREN_CLOSE_CHAR}`
      : "";
    const label = `${n.selector}${colocSuffix}`;
    return n.children.length
      ? [
          `${pad}${label} ${BRACE_OPEN_CHAR}${note}`,
          ...renderStructureTree(n.children, depth + 1),
          `${pad}${BRACE_CLOSE_CHAR}`,
        ]
      : [`${pad}${label}${note}`];
  });

// ── record ──────────────────────────────────────────────────────────────────────────────────────

/** Providers for documented records and their usage. */
export const record = {
  /** Check record-level authoring rules, including structure references and naming. */
  model(
    index: CssDocIndex,
    naming?: ResolvedNaming,
    structureIgnore: readonly string[] = [],
    // Sibling components a structure tree may compose. Defaults to the linted index, so a single sheet
    // (all records in one file) works as before; the language server passes the project-wide index so a
    // component can reference a sibling defined in another file (see the prefix-derivation below).
    siblingIndex: CssDocIndex = index,
    ruleOptions?: RuleOptions,
  ): Diagnostic[] {
    const options = resolveRuleOptions(ruleOptions);
    const disallowedKeyword = (value: string): string | undefined => {
      const mode = options.sealed.mode;
      const keywords =
        mode === "compat"
          ? ["unset", "initial"]
          : [
              "unset",
              "initial",
              "revert",
              "revert-layer",
              ...(options.values.allowInherit ? [] : ["inherit"]),
            ];
      return keywords.find((k) => {
        const KEYWORD: Regex = arkRegex.as(
          `${WORD_BOUNDARY_SOURCE}${k}${WORD_BOUNDARY_SOURCE}`,
          "u",
        );
        return KEYWORD.test(value);
      });
    };
    const out: Diagnostic[] = [];
    const sameKindCounts = new Map<string, number>();
    const nameKinds = new Map<string, Set<string>>();
    for (const r of index.records) {
      const key = `${r.entry.kind}:${r.entry.name}`;
      sameKindCounts.set(key, (sameKindCounts.get(key) ?? 0) + 1);
      const kinds = nameKinds.get(r.entry.name) ?? new Set<string>();
      kinds.add(r.entry.kind);
      nameKinds.set(r.entry.name, kinds);
    }

    const siblingNameKinds = new Map<string, Set<string>>();
    for (const r of siblingIndex.records) {
      const kinds = siblingNameKinds.get(r.entry.name) ?? new Set<string>();
      kinds.add(r.entry.kind);
      siblingNameKinds.set(r.entry.name, kinds);
    }
    // Also index by full className so :is(.pfx-card), :is(button), :is(#id), :is([attr]) all resolve.
    const siblingByClassName = new Map<string, Set<string>>();
    for (const r of siblingIndex.records) {
      const kinds = siblingByClassName.get(r.entry.className) ?? new Set<string>();
      kinds.add(r.entry.kind);
      siblingByClassName.set(r.entry.className, kinds);
    }

    const siblingClasses = new Set(siblingIndex.records.map((r) => stripDot(r.entry.className)));
    const siblingNames = new Set(
      siblingIndex.records.flatMap((r) => (r.entry.kind === "component" ? [r.entry.name] : [])),
    );
    for (const info of index.records) {
      const kindKey = `${info.entry.kind}:${info.entry.name}`;
      if ((sameKindCounts.get(kindKey) ?? 0) > 1) {
        out.push(
          warn({
            aspect: "record",
            rule: "duplicate-record-id",
            message: `Record id "${info.entry.name}" is duplicated for kind "${info.entry.kind}" in this scope.`,
            record: info.entry.name,
            span: info.span,
          }),
        );
      }
      if ((nameKinds.get(info.entry.name)?.size ?? 0) > 1) {
        const kinds = [...(nameKinds.get(info.entry.name) ?? new Set<string>())]
          .toSorted()
          .join(", ");
        out.push(
          warn({
            aspect: "record",
            rule: "duplicate-record-id-cross-kind",
            message: `Record id "${info.entry.name}" is shared across kinds (${kinds}); use typed structure refs like ${AT_CHAR}component ${info.entry.name}.`,
            record: info.entry.name,
            span: info.span,
          }),
        );
      }

      const decoratorSet = new Set(info.entry.decorators ?? []);
      const readonlyLike = decoratorSet.has("readonly") || decoratorSet.has("frozen");
      const sealedLike = decoratorSet.has("sealed") || decoratorSet.has("frozen");

      const refs = info.entry.refs ?? [];
      const annotationRows = info.entry.annotations ?? [];
      if (refs.length) {
        const annotations = new Set(annotationRows.map((a) => a.ref));
        for (const ref of refs) {
          if (annotations.has(ref)) continue;
          out.push(
            warn({
              aspect: "record",
              rule: "unknown-annotation-ref",
              message: `${AT_CHAR}ref ${ref} has no matching annotation legend entry in "${info.entry.name}".`,
              record: info.entry.name,
              span: info.span,
            }),
          );
        }
      }

      if (readonlyLike) {
        for (const [property, values] of info.propertyValues ?? new Map<string, Set<string>>()) {
          if (values.size <= 1) continue;
          out.push(
            warn({
              aspect: "record",
              rule: "readonly-redefinition",
              message: `${AT_CHAR}${decoratorSet.has("frozen") ? "frozen" : "readonly"} record "${info.entry.name}" redefines "${property}" with multiple values (${[...values].map(codeSpan).join(", ")}).`,
              record: info.entry.name,
              span: info.span,
            }),
          );
        }
      }

      if (sealedLike) {
        for (const usage of info.resetValueUsages ?? []) {
          const keyword = disallowedKeyword(usage.value);
          if (!keyword) continue;
          out.push(
            warn({
              aspect: "record",
              rule: "sealed-reset-value",
              message: `${AT_CHAR}${decoratorSet.has("frozen") ? "frozen" : "sealed"} record "${info.entry.name}" uses disallowed reset-like value keyword "${keyword}" on "${usage.property}".`,
              record: info.entry.name,
              span: usage.span ?? info.span,
            }),
          );
        }
      }

      if (!info.entry.summary?.trim()) {
        out.push(
          warn({
            aspect: "record",
            rule: "missing-summary",
            message: `Record "${info.entry.name}" has no ${AT_CHAR}summary.`,
            record: info.entry.name,
            span: info.span,
            fix: scaffoldDocLine(info.span, `${AT_CHAR}summary TODO.`),
          }),
        );
      }
      // Component base-class name case (e.g. SUIT PascalCase). Only components carry this convention.
      if (naming?.component && info.entry.kind === "component" && info.entry.className) {
        if (!naming.component.test(stripDot(info.entry.className))) {
          out.push(
            warn({
              aspect: "record",
              rule: "component-name-case",
              message: `Component class "${info.entry.className}" doesn't match the configured name case.`,
              record: info.entry.name,
              span: info.span,
            }),
          );
        }
      }
      // Every class named anywhere in an @structure selector should resolve to the component class, a
      // documented member, or another documented component (a composed subcomponent) — catches drift when
      // a selector is renamed but the doc comment isn't. We validate *every* class token (the node's own
      // compound classes and any inside `:has()`/`:is()`/`:not()`), so class order never matters and inner
      // targets are covered too. A sibling component's own members (e.g. its modifiers) belong to that
      // component's docs, so reference it bare (`.close-button`); list other externals under structureIgnore.
      if (info.entry.structure?.length || info.entry.structureVariants?.length) {
        const known = new Set<string>([
          stripDot(info.entry.className),
          // Sibling components are valid children — a component tree composes other components.
          ...siblingClasses,
          ...info.entry.parts.flatMap((p) => [
            stripDot(p.name),
            ...(p.modifiers ?? []).map((m) => m.name),
          ]),
          ...info.entry.shadowParts.map((p) => stripDot(p.name)),
          ...info.entry.states.map((s) => s.name),
          ...info.entry.modifiers.map((m) => m.name),
          ...info.entry.slots.map((s) => s.name),
        ]);
        // An optional-ancestor wrapper: the tree roots at a class other than this component's own, with
        // the component itself appearing below it (`.wrapper { … .self … }`). Such ancestor roots are
        // valid — they're documented by the structure's shape (and optionally annotated with `@wrapper`)
        // — so a top-level root's classes are known when the component's own class is one of its
        // descendants. A normal structure (rooted at the component) is unaffected.
        const selfClass = stripDot(info.entry.className);
        const classesOf = (sel: string): string[] =>
          [...sel.matchAll(CLASS_REFERENCE)].map((m) => m[1]);
        const hasSelfBelow = (nodes: StructureNode[]): boolean =>
          nodes.some(
            (n) =>
              classesOf(n.selector).includes(selfClass) ||
              hasSelfBelow(n.children) ||
              (n.variants ?? []).some((v) => hasSelfBelow(v.nodes)),
          );
        // Alternative DOM shapes (`@variant` blocks) are validated independently, each against the
        // component's own known classes plus its own ancestor-wrapper roots — falls back to the single
        // `structure` tree when no `@variant` was authored.
        const groups = info.entry.structureVariants?.length
          ? info.entry.structureVariants.map((v) => v.nodes)
          : [info.entry.structure ?? []];
        for (const roots of groups) {
          for (const root of roots) {
            if (hasSelfBelow(root.children)) for (const c of classesOf(root.selector)) known.add(c);
          }
        }
        // The prefix this record's own class carries in front of its name (e.g. `vendor-` in
        // `.vendor-alert`, or the masked `aaaa` when an embedded `${p}` is projected). A sibling
        // reference wears the same prefix, so stripping it should leave a known component name — this is
        // how `.aaaaclose-button` resolves to the `close-button` component regardless of the mask.
        const own = stripDot(info.entry.className);
        const prefix =
          info.entry.name && own.endsWith(info.entry.name)
            ? own.slice(0, own.length - info.entry.name.length)
            : "";
        const isSibling = (cls: string): boolean =>
          prefix !== "" && cls.startsWith(prefix) && siblingNames.has(cls.slice(prefix.length));
        const seen = new Set<string>();
        const seenRefs = new Set<string>();
        const walk = (nodes: StructureNode[]): void => {
          for (const node of nodes) {
            if (node.colocated) {
              const colocKey = `colocated:${node.colocated}`;
              if (!seenRefs.has(colocKey)) {
                seenRefs.add(colocKey);
                const kinds =
                  siblingByClassName.get(node.colocated) ?? siblingNameKinds.get(node.colocated);
                const colocName = node.colocated.replace(SELECTOR_PREFIX, "");
                if (!kinds || kinds.size === 0) {
                  out.push(
                    warn({
                      aspect: "record",
                      rule: "structure-unknown-record",
                      message: `${AT_CHAR}structure co-locates "${node.colocated}" via :is(), but no documented record with selector "${node.colocated}" was found.`,
                      record: info.entry.name,
                      span: info.span,
                    }),
                  );
                } else if (!kinds.has("component")) {
                  out.push(
                    warn({
                      aspect: "record",
                      rule: "structure-unknown-record",
                      message: `${AT_CHAR}structure co-locates "${node.colocated}" via :is(), but "${node.colocated}" isn't documented as a component.`,
                      record: info.entry.name,
                      span: info.span,
                    }),
                  );
                } else if (kinds.size > 1) {
                  out.push(
                    warn({
                      aspect: "record",
                      rule: "structure-ambiguous-record",
                      message: `${AT_CHAR}structure :is() co-location "${node.colocated}" is ambiguous across kinds (${[...kinds].toSorted().join(", ")}); use a typed ref like ${AT_CHAR}component ${colocName}.`,
                      record: info.entry.name,
                      span: info.span,
                    }),
                  );
                }
              }
            }
            const ref = parseStructureRecordRef(node.selector);
            if (ref) {
              const key = `${ref.kind ?? ASTERISK_CHAR}${COLON_CHAR}${ref.name}${COLON_CHAR}${ref.profile ?? ""}`;
              if (!seenRefs.has(key)) {
                seenRefs.add(key);
                const kinds = siblingNameKinds.get(ref.name);
                if (!kinds || kinds.size === 0) {
                  out.push(
                    warn({
                      aspect: "record",
                      rule: "structure-unknown-record",
                      message: `${AT_CHAR}structure references "${node.selector}", but no documented record named "${ref.name}" was found.`,
                      record: info.entry.name,
                      span: info.span,
                    }),
                  );
                } else if (ref.kind) {
                  if (!kinds.has(ref.kind)) {
                    out.push(
                      warn({
                        aspect: "record",
                        rule: "structure-unknown-record",
                        message: `${AT_CHAR}structure references "${node.selector}", but "${ref.name}" isn't documented as kind "${ref.kind}".`,
                        record: info.entry.name,
                        span: info.span,
                      }),
                    );
                  }
                } else if (kinds.size > 1) {
                  out.push(
                    warn({
                      aspect: "record",
                      rule: "structure-ambiguous-record",
                      message: `${AT_CHAR}structure reference "${node.selector}" is ambiguous across kinds (${[...kinds].toSorted().join(", ")}); use a typed ref like ${AT_CHAR}component ${ref.name}.`,
                      record: info.entry.name,
                      span: info.span,
                    }),
                  );
                }
              }
              walk(node.children);
              continue;
            }

            for (const m of node.selector.matchAll(CLASS_REFERENCE)) {
              const cls = m[1];
              if (
                seen.has(cls) ||
                known.has(cls) ||
                isSibling(cls) ||
                structureIgnore.some((g) => globMatch(g, cls))
              )
                continue;
              seen.add(cls);
              out.push(
                warn({
                  aspect: "record",
                  rule: "structure-unknown-selector",
                  message: `${AT_CHAR}structure references "${DOT_CHAR}${cls}", which isn't the component class or a documented member (add it, or list it under structureIgnore).`,
                  record: info.entry.name,
                  span: info.span,
                  // The class as it appears in the (possibly projected) source. The language server uses
                  // it to restore an embedded interpolation for display — e.g. `.${p}foo`, not `.aaaafoo`.
                  data: { maskedName: cls },
                }),
              );
            }
            walk(node.children);
            // A nested `@variant` group's alternatives live in `variants`, not `children`.
            for (const variant of node.variants ?? []) walk(variant.nodes);
          }
        };
        for (const roots of groups) walk(roots);
      }

      if (info.entry.memberOf) {
        const parentName = info.entry.memberOf.component;
        const parentKinds = siblingNameKinds.get(parentName);
        if (!parentKinds || parentKinds.size === 0) {
          out.push(
            warn({
              aspect: "record",
              rule: "member-of-unknown-component",
              message: `${AT_CHAR}memberOf references "${parentName}", but no documented record with that name was found.`,
              record: info.entry.name,
              span: info.span,
            }),
          );
        } else if (info.entry.memberOf.private) {
          const parent = siblingIndex.records.find((r) => r.entry.name === parentName);
          const memberOfBack = parent
            ? structureReferences(
                parent.entry.structureVariants?.length
                  ? parent.entry.structureVariants.flatMap((v) => v.nodes)
                  : (parent.entry.structure ?? []),
                stripDot(info.entry.className),
                info.entry.name,
              )
            : false;
          if (parent && !memberOfBack) {
            out.push(
              warn({
                aspect: "record",
                rule: "private-member-orphaned",
                message: `"${info.entry.name}" declares ${AT_CHAR}memberOf "${parentName}" private, but "${parentName}"'s own ${AT_CHAR}structure never references it back.`,
                record: info.entry.name,
                span: info.span,
              }),
            );
          }
        }
      }

      for (const memberName of info.entry.members ?? []) {
        const memberKinds = siblingNameKinds.get(memberName);
        if (!memberKinds || memberKinds.size === 0) {
          out.push(
            warn({
              aspect: "record",
              rule: "members-unknown-component",
              message: `${AT_CHAR}members references "${memberName}", but no documented record with that name was found.`,
              record: info.entry.name,
              span: info.span,
            }),
          );
        }
      }

      for (const memberDecl of info.entry.memberDeclarations ?? []) {
        if (!memberDecl.private) continue;
        const member =
          siblingIndex.records.find(
            (r) => r.entry.name === memberDecl.name && r.entry.kind === "component",
          ) ?? siblingIndex.records.find((r) => r.entry.name === memberDecl.name);
        if (!member) continue; // unknown names are covered by members-unknown-component

        const declaresPrivateBack =
          member.entry.memberOf?.component === info.entry.name && member.entry.memberOf.private;
        if (!declaresPrivateBack) {
          out.push(
            warn({
              aspect: "record",
              rule: "private-member-orphaned",
              message: `"${info.entry.name}" declares ${AT_CHAR}member "${memberDecl.name}" private, but "${memberDecl.name}" doesn't declare a matching ${AT_CHAR}memberOf "${info.entry.name}" private.`,
              record: info.entry.name,
              span: info.span,
            }),
          );
          continue;
        }

        const parentReferencesMember = structureReferences(
          info.entry.structureVariants?.length
            ? info.entry.structureVariants.flatMap((v) => v.nodes)
            : (info.entry.structure ?? []),
          stripDot(member.entry.className),
          member.entry.name,
        );
        if (!parentReferencesMember) {
          out.push(
            warn({
              aspect: "record",
              rule: "private-member-orphaned",
              message: `"${info.entry.name}" declares ${AT_CHAR}member "${memberDecl.name}" private, but "${info.entry.name}"'s own ${AT_CHAR}structure never references it back.`,
              record: info.entry.name,
              span: info.span,
            }),
          );
        }
      }

      for (const m of info.entry.modifiers) {
        for (const a of m.affects ?? []) {
          const kinds = siblingNameKinds.get(a.component);
          if (!kinds || kinds.size === 0) {
            out.push(
              warn({
                aspect: "record",
                rule: "affects-unknown-component",
                message: `Modifier "${m.name}" of "${info.entry.name}" declares ${AT_CHAR}affects "${a.component}", but no documented record with that name was found.`,
                record: info.entry.name,
                span: info.span,
              }),
            );
          }
        }
      }
    }
    return out;
  },

  /** Suggest indexed base classes without their leading dots. */
  completions(index: CssDocIndex): Completion[] {
    return index.entries.map((entry) => ({
      label: stripDot(entry.className),
      kind: "component" as const,
      detail: entry.kind,
      documentation: entry.summary,
      deprecated: Boolean(entry.deprecated),
    }));
  },

  /** Render the matching record's hover card, or return `undefined` when no record matches. */
  hover(
    base: string,
    index: CssDocIndex,
    detail: HoverDetail = "full",
    sections?: HoverSections,
    sectionOrder?: HoverSectionOrder,
    exampleFilter?: ExampleFilter | null,
    presentation: HoverPresentation = "vscode",
  ): Hover | undefined {
    const entry = index.componentForClass(base);
    if (!entry) return undefined;
    const selectorFor = (name: string): string => index.matcher.selectorFor(name);
    // Inline HTML accents (the client enables `supportHtml`): a warning colour for deprecation, and
    // symbol-category colours so a selector/property/name pops over its prose description — mirroring
    // the palette the injection grammar uses (component → class, modifier/part → field, state/property
    // → variable, function → method).
    const icon = (name: string): string => (presentation === "vscode" ? `${codicon(name)} ` : "");
    const warnHtml = (label: string): string =>
      presentation === "vscode"
        ? `${LESS_THAN_CHAR}span style="color:var(--vscode-editorWarning-foreground);"${GREATER_THAN_CHAR}${label}${LESS_THAN_CHAR}${FORWARD_SLASH_CHAR}span${GREATER_THAN_CHAR}`
        : bold(label);
    const styled = (text: string, kind: "class" | "field" | "variable" | "method"): string =>
      presentation === "vscode"
        ? `${LESS_THAN_CHAR}code style="color:var(--vscode-symbolIcon-${kind}Foreground);"${GREATER_THAN_CHAR}${text}${LESS_THAN_CHAR}${FORWARD_SLASH_CHAR}code${GREATER_THAN_CHAR}`
        : codeSpan(text);
    const dash = (d?: string): string => (d ? ` — ${d}` : "");

    const head = [`${icon("symbol-class")}${styled(entry.className, "class")}`, entry.kind];
    if (entry.releaseStage) head.push(entry.releaseStage);
    if (entry.since) head.push(`since ${entry.since}`);
    const lines = [head.join(" · ")];
    const deprecatedLine = entry.deprecated
      ? `${icon("warning")}${warnHtml("Deprecated")} — ${entry.deprecated}`
      : undefined;

    if (detail === "compact") {
      if (entry.summary) lines.push("", entry.summary);
      if (deprecatedLine) lines.push("", deprecatedLine);
      const facets = [
        entry.modifiers.length && `${entry.modifiers.length} modifiers`,
        entry.parts.length && `${entry.parts.length} parts`,
        entry.shadowParts.length && `${entry.shadowParts.length} shadow parts`,
        entry.pseudoElements.length && `${entry.pseudoElements.length} pseudo-elements`,
        entry.states.length && `${entry.states.length} states`,
        entry.cssPropertiesDeclared.length &&
          `${entry.cssPropertiesDeclared.length} custom properties`,
        entry.functions.length && `${entry.functions.length} functions`,
        entry.conditions.length && `${entry.conditions.length} conditions`,
      ].filter(Boolean);
      if (facets.length) lines.push("", facets.join(" · "));
      return { contents: sanitizeMarkdownLinks(lines.join("\n")) };
    }

    // full / custom: a section-driven Markdown card. Structure and prose stay Markdown (bold headers
    // with codicons, plain-text descriptions); only genuine CSS — the @structure tree and @example
    // blocks — is fenced so VS Code syntax-highlights it. `full` shows every section that has content;
    // `custom` consults `sections` per key: `auto` (show if content), `on` (always), `off` (hide).
    const want = (key: string, has: boolean): "content" | "empty" | "skip" => {
      const mode = detail === "custom" ? (sections?.[key] ?? "auto") : "auto";
      if (mode === "off") return "skip";
      return has ? "content" : mode === "on" ? "empty" : "skip";
    };
    // Each section builds into its own fragment, keyed by section name; the emit loop at the end appends
    // them in `sectionOrder` (default {@link HOVER_SECTION_KEYS}), so users can reorder or drop sections.
    const fragments = {} as Record<HoverSectionKey, string[]>;
    const prose = (key: HoverSectionKey, prefix: string, text?: string): void => {
      const w = want(key, Boolean(text?.trim()));
      if (w !== "skip") fragments[key] = ["", `${prefix}${w === "content" ? text : emptySection}`];
    };
    const list = (key: HoverSectionKey, icon: string, label: string, rows: string[]): void => {
      const w = want(key, rows.length > 0);
      if (w !== "skip")
        fragments[key] = [
          "",
          bold(`${presentation === "vscode" ? `${codicon(icon)} ` : ""}${label}`),
          ...(w === "content" ? rows : [emptySection]),
        ];
    };

    prose("summary", "", entry.summary);
    {
      const w = want("deprecated", Boolean(entry.deprecated));
      if (w !== "skip")
        fragments.deprecated = [
          "",
          w === "content"
            ? (deprecatedLine as string)
            : `${icon("warning")}${warnHtml("Deprecated")}`,
        ];
    }
    const remarksMode = entry.prose?.find((body) => body.field === "remarks")?.mode;
    prose(
      "remarks",
      "",
      entry.remarks && remarksMode
        ? remarksMode === "plain"
          ? plainHoverProse(entry.remarks)
          : unescapeInlineOpeners(entry.remarks, "markdown")
        : entry.remarks,
    );
    prose("accessibility", icon("accessibility"), entry.accessibility);

    list(
      "modifiers",
      "symbol-property",
      "Modifiers",
      entry.modifiers.map((m) => {
        const sel = styled(selectorFor(m.name), "field");
        if (m.deprecated) {
          const to = m.deprecated.canonical
            ? ` → ${styled(selectorFor(m.deprecated.canonical), "field")}`
            : dash(m.deprecated.note);
          return `- ${sel} — ${warnHtml("deprecated")}${to}`;
        }
        return `- ${sel}${dash(m.description)}`;
      }),
    );
    list(
      "parts",
      "symbol-field",
      "Parts",
      entry.parts.map((p) => `- ${styled(`${DOT_CHAR}${p.name}`, "field")}${dash(p.description)}`),
    );
    list(
      "shadowParts",
      "symbol-namespace",
      "Shadow parts",
      entry.shadowParts.map(
        (p) =>
          `- ${styled(`${COLON_CHAR}${COLON_CHAR}part${PAREN_OPEN_CHAR}${p.name}${PAREN_CLOSE_CHAR}`, "field")}${dash(p.description)}`,
      ),
    );
    list(
      "pseudoElements",
      "symbol-misc",
      "Pseudo-elements",
      entry.pseudoElements.map(
        (p) => `- ${styled(`${COLON_CHAR}${COLON_CHAR}${p.name}`, "field")}${dash(p.description)}`,
      ),
    );
    list(
      "states",
      "symbol-event",
      "States",
      entry.states.map(
        (s) =>
          `- ${styled(s.kind === "custom" ? `${COLON_CHAR}state${PAREN_OPEN_CHAR}${s.name}${PAREN_CLOSE_CHAR}` : `${COLON_CHAR}${s.name}`, "variable")}${dash(s.description)}`,
      ),
    );
    list(
      "customProperties",
      "symbol-variable",
      "Custom properties",
      entry.cssPropertiesDeclared.map((p) => {
        const syntax = p.syntax ? `: ${linkedSyntax(p.syntax)}` : "";
        const def = p.defaultValue ? ` (default ${codeSpan(p.defaultValue)})` : "";
        return `- ${styled(p.name, "variable")}${syntax}${def}${dash(p.description)}`;
      }),
    );
    list(
      "functions",
      "symbol-method",
      "Functions",
      entry.functions.map(
        (f) =>
          `- ${styled(`${f.name}${PAREN_OPEN_CHAR}${PAREN_CLOSE_CHAR}`, "method")}${dash(f.description)}`,
      ),
    );
    list(
      "slots",
      "symbol-parameter",
      "Slots",
      entry.slots.map((s) => `- ${styled(s.name, "field")}${dash(s.description)}`),
    );
    list(
      "animations",
      "play",
      "Animations",
      entry.animations.map((a) => `- ${styled(a.name, "method")}${dash(a.description)}`),
    );
    list(
      "layers",
      "layers",
      "Layers",
      entry.layers.map((l) => `- ${styled(l.name, "class")}${dash(l.description)}`),
    );
    list(
      "conditions",
      "filter",
      "Conditions",
      entry.conditions.map(
        (c) => `- ${codeSpan(`${AT_CHAR}${c.type} ${c.query}`)}${dash(c.description)}`,
      ),
    );
    list(
      "see",
      "references",
      "See also",
      entry.see.map((s) => `- ${s}`),
    );
    list(
      "todos",
      "checklist",
      "To do",
      entry.todos.map((t) => `- ${t}`),
    );

    {
      const w = want(
        "structure",
        Boolean(entry.structure?.length || entry.structureVariants?.length),
      );
      if (w !== "skip") {
        const frag = ["", bold(`${icon("list-tree")}Structure`)];
        if (w === "content") {
          if (entry.structureDescription) frag.push("", entry.structureDescription);
          if (entry.structureVariants?.length) {
            frag.push("", `${MARKDOWN_BACKTICK_FENCE_TEXT}css`);
            entry.structureVariants.forEach((variant, i) => {
              if (i > 0) frag.push("");
              frag.push(
                `${FORWARD_SLASH_CHAR}${ASTERISK_CHAR} Variant: ${variant.name ?? `Variant ${i + 1}`} ${COMMENT_END_TEXT}`,
              );
              frag.push(...renderStructureTree(variant.nodes));
            });
            frag.push(MARKDOWN_BACKTICK_FENCE_TEXT);
          } else {
            frag.push(
              "",
              `${MARKDOWN_BACKTICK_FENCE_TEXT}css`,
              ...renderStructureTree(entry.structure ?? []),
              MARKDOWN_BACKTICK_FENCE_TEXT,
            );
          }
        } else frag.push("", emptySection);
        fragments.structure = frag;
      }
    }
    {
      const examples = selectExampleIndices(entry, exampleFilter);
      const w = want("examples", examples.length > 0);
      if (w !== "skip") {
        const frag = ["", bold(`${icon("book")}Example${examples.length > 1 ? "s" : ""}`)];
        if (w === "content")
          for (const index of examples) {
            const text = entry.examples[index];
            const prose = entry.prose?.find((body) => body.exampleIndex === index);
            const ex = text.trim();
            // An example that already carries a fenced block is Markdown (prose + code) — emit it
            // verbatim. Only bare, fence-less code gets auto-fenced (sniffing markup vs CSS).
            frag.push(
              "",
              prose?.mode === "plain"
                ? plainHoverProse(text)
                : prose?.mode === "markdown"
                  ? unescapeInlineOpeners(text, "markdown")
                  : MARKDOWN_BACKTICK_FENCE_LINE_PREFIX.exec(ex) !== null
                    ? ex
                    : `${MARKDOWN_BACKTICK_FENCE_TEXT}${ex.includes(LESS_THAN_CHAR) ? "html" : "css"}\n${ex}\n${MARKDOWN_BACKTICK_FENCE_TEXT}`,
            );
          }
        else frag.push("", emptySection);
        fragments.examples = frag;
      }
    }

    // Emit sections in the requested order (default the canonical order); unlisted keys are dropped. An
    // empty order means "not configured" → use the default (matching the `cssdoc.hover.sectionOrder`
    // setting, whose empty default must not blank the whole card).
    for (const key of sectionOrder?.length ? sectionOrder : HOVER_SECTION_KEYS) {
      const frag = fragments[key];
      if (frag) lines.push(...frag);
    }
    return { contents: sanitizeMarkdownLinks(lines.join("\n")) };
  },

  /** Find the base record's source location, when indexed. */
  definition(base: string, index: CssDocIndex): Location | undefined {
    const entry = index.componentForClass(base);
    return entry ? index.location(entry.name, "record") : undefined;
  },
};

// ── modifier ────────────────────────────────────────────────────────────────────────────────────

/** Providers for modifier documentation and usage. */
export const modifier = {
  /** Check modifier documentation and selector drift across indexed records. */
  model(index: CssDocIndex): Diagnostic[] {
    const out: Diagnostic[] = [];
    for (const info of index.records) {
      const name = info.entry.name;
      for (const m of info.entry.modifiers) {
        const sel = index.matcher.selectorFor(m.name);
        const span =
          info.memberSpans.get(memberKey("modifier", m.name)) ??
          info.authoredModifierLines.get(m.name) ??
          info.span;
        if (!m.description?.trim() && !m.deprecated && !m.alias) {
          // A concrete AST-extracted instance of an already-documented `*` family (e.g. `-transition-
          // fade-exiting` under an authored `-transition-*`) doesn't need its own description — the
          // family's covers it. Only flag it if no such covering family exists.
          const coveredByFamily =
            !m.pattern &&
            info.entry.modifiers.some(
              (fam) =>
                fam.pattern &&
                fam.name !== m.name &&
                fam.description?.trim() &&
                index.matcher.matchesModifier(fam.name, m.name),
            );
          if (!coveredByFamily) {
            out.push(
              warn({
                aspect: "modifier",
                rule: "undocumented-modifier",
                message: `Modifier "${sel}" of "${name}" has no ${AT_CHAR}modifier description.`,
                record: name,
                span,
                fix: scaffoldDocLine(info.span, `${AT_CHAR}modifier ${m.name} — TODO.`),
              }),
            );
          }
        }
        if (m.alias && !m.alias.canonical) {
          out.push(
            warn({
              aspect: "modifier",
              rule: "alias-requires-canonical",
              message: `Aliased modifier "${sel}" of "${name}" needs a canonical replacement (${BRACE_OPEN_CHAR}${AT_CHAR}link${BRACE_CLOSE_CHAR}) or an alias target.`,
              record: name,
              span,
            }),
          );
        }
        if (m.deprecated && !m.deprecated.canonical && !m.deprecated.note?.trim()) {
          out.push(
            warn({
              aspect: "modifier",
              rule: "deprecated-requires-canonical",
              message: `Deprecated modifier "${sel}" of "${name}" needs a canonical replacement (${BRACE_OPEN_CHAR}${AT_CHAR}link${BRACE_CLOSE_CHAR}) or a note.`,
              record: name,
              span,
            }),
          );
        }
        // Check for conflicting global modifiers: if this record is not global and has a modifier
        // that also exists in a global record, issue a diagnostic.
        if (!info.entry.global) {
          const globalRecordsWithModifier = index.records.filter(
            (r) =>
              r.entry.global &&
              r.entry.modifiers.some((gm) => index.matcher.matchesModifier(gm.name, m.name)),
          );
          if (globalRecordsWithModifier.length > 0) {
            const conflictingGlobals = globalRecordsWithModifier
              .map((r) => `"${r.entry.name}"`)
              .join(", ");
            out.push({
              aspect: "modifier",
              rule: "conflicting-global-modifier",
              severity: "warning",
              message: `Modifier "${sel}" of "${name}" conflicts with the same modifier in global record(s): ${conflictingGlobals}.`,
              record: name,
              span,
            });
          }
        }
      }
      // Deprecated aliases (`@modifier -x — @deprecated {@link -y}`) are legacy names intentionally not
      // in the CSS, and `@interaction`-flagged modifiers (JS-toggled hooks with no styling) never are —
      // both are exempt from the "defined by a selector" check.
      const cssExempt = new Set(
        info.entry.modifiers
          .filter((m) => m.deprecated || m.alias || m.interaction)
          .map((m) => m.name),
      );
      for (const authored of info.authoredModifiers) {
        if (cssExempt.has(authored)) continue;
        const sel = index.matcher.selectorFor(authored);
        if (selectorDefines(info.selectorText, sel)) continue;
        // An `@affects <component>.<target>` modifier can have its only defining rule in that other,
        // already-documented record's own stylesheet (not combined into this record's own selectors) —
        // check there too before flagging drift.
        const affects = info.entry.modifiers.find((mm) => mm.name === authored)?.affects;
        const affectsDefines = affects?.some((a) => {
          const target = index.records.find((r) => r.entry.name === a.component);
          return target && selectorDefines(target.selectorText, sel);
        });
        if (!affectsDefines) {
          out.push(
            warn({
              aspect: "modifier",
              rule: "name-not-in-css",
              message: `Documented modifier "${sel}" of "${name}" is not defined by any selector.`,
              record: name,
              span: info.authoredModifierLines.get(authored) ?? info.span,
            }),
          );
        }
      }
    }
    return out;
  },

  /** Diagnose unknown or deprecated modifier usage on a recognized base class. */
  classUsage(usage: ClassUsage, index: CssDocIndex): Diagnostic[] {
    if (!usage.base || !index.matcher.looksLikeUsage(usage.token, usage.base)) return [];
    const entry = index.componentForClass(usage.base);
    if (!entry) return [];
    const sel = index.matcher.selectorFor(index.matcher.normalizeMember(usage.token));
    if (!index.isModifier(usage.base, usage.token)) {
      return [
        warn({
          aspect: "modifier",
          rule: "unknown-modifier",
          message: `"${sel}" is not a documented modifier of "${entry.name}".`,
          record: entry.name,
          span: usage.loc,
        }),
      ];
    }
    const dep = index.deprecationOf(usage.base, usage.token);
    if (dep) {
      const advice = dep.canonical
        ? `use "${index.matcher.selectorFor(dep.canonical)}"`
        : (dep.note ?? "no replacement given");
      return [
        warn({
          aspect: "modifier",
          rule: "deprecated-modifier",
          message: `Modifier "${sel}" of "${entry.name}" is deprecated — ${advice}.`,
          record: entry.name,
          span: usage.loc,
        }),
      ];
    }
    return [];
  },

  /** Suggest direct and global modifiers for a recognized base class. */
  completions(base: string, index: CssDocIndex): Completion[] {
    const entry = index.componentForClass(base);
    if (!entry) return [];

    // Modifiers from records marked `@global` apply everywhere; resolve name collisions the same
    // way lookups do (index.globalPrecedence), then list direct modifiers before global ones.
    const globalByName = new Map<string, (typeof entry.modifiers)[number]>();
    for (const record of index.records) {
      if (!record.entry.global || record.entry === entry) continue;
      for (const m of record.entry.modifiers) {
        const key = index.matcher.normalizeMember(m.name);
        if (!globalByName.has(key)) globalByName.set(key, m);
      }
    }

    const direct = entry.modifiers.map((m) => {
      const key = index.matcher.normalizeMember(m.name);
      const global = globalByName.get(key);
      const resolved = global && index.globalPrecedence === "global" ? global : m;
      globalByName.delete(key);
      return {
        label: m.name,
        kind: "modifier" as const,
        detail: resolved.prop,
        documentation: resolved.description,
        deprecated: Boolean(resolved.deprecated),
        sortText: `0-${m.name}`,
      };
    });

    const global = [...globalByName.values()].map((m) => ({
      label: m.name,
      kind: "modifier" as const,
      detail: m.prop,
      documentation: m.description ? `${m.description} (global)` : "(global)",
      deprecated: Boolean(m.deprecated),
      sortText: `1-${m.name}`,
    }));

    return [...direct, ...global];
  },

  /** Render hover content for a directly documented modifier, when found. */
  hover(base: string, token: string, index: CssDocIndex): Hover | undefined {
    const entry = index.componentForClass(base);
    const m = entry?.modifiers.find((x) => x.name === index.matcher.normalizeMember(token));
    if (!m) return undefined;
    const lines = [
      `${codeSpan(index.matcher.selectorFor(m.name))} — modifier of ${codeSpan(entry!.className)}`,
    ];
    if (m.interaction)
      lines.push("", `${bold("Interaction")} — a JS-toggled hook, not styled directly.`);
    if (m.affects?.length) {
      const notes = m.affects.map(
        (a) =>
          `${codeSpan(`${a.component}${DOT_CHAR}${a.target}`)}${a.description ? ` — ${a.description}` : ""}`,
      );
      lines.push("", `${bold("Affects")} — ${notes.join("; ")}`);
    }
    if (m.description) lines.push("", m.description);
    if (m.alias) {
      const advice = m.alias.canonical
        ? `maps to ${codeSpan(index.matcher.selectorFor(m.alias.canonical))}`
        : (m.alias.note ?? "");
      lines.push("", `${bold("Alias")} — ${advice}`);
    }
    if (m.deprecated) {
      const advice = m.deprecated.canonical
        ? `use ${codeSpan(index.matcher.selectorFor(m.deprecated.canonical))}`
        : (m.deprecated.note ?? "");
      lines.push("", `${bold("Deprecated")} — ${advice}`);
    }
    return { contents: sanitizeMarkdownLinks(lines.join("\n")) };
  },

  /** Find a modifier's source location, when indexed. */
  definition(base: string, token: string, index: CssDocIndex): Location | undefined {
    const entry = index.componentForClass(base);
    return entry
      ? index.location(entry.name, memberKey("modifier", index.matcher.normalizeMember(token)))
      : undefined;
  },
};

// ── part ────────────────────────────────────────────────────────────────────────────────────────

/** Providers for documented class-based parts. */
export const part = {
  /** Check class-based part documentation and optional naming conventions. */
  model(index: CssDocIndex, naming?: ResolvedNaming): Diagnostic[] {
    const out: Diagnostic[] = [];
    for (const info of index.records) {
      const name = info.entry.name;
      for (const p of info.entry.parts) {
        if (!p.description?.trim()) {
          // A CSS-derived part is covered when an authored chain @part has it as its terminal compound.
          const cls = `${DOT_CHAR}${p.name}`;
          const coveredByChain = [...info.authoredParts.values()].some(
            (sel) => (sel.match(TERMINAL_COMPOUND)?.[1] ?? sel) === cls,
          );
          if (coveredByChain) continue;
          out.push(
            warn({
              aspect: "part",
              rule: "undocumented-part",
              message: `Part "${DOT_CHAR}${p.name}" of "${name}" has no ${AT_CHAR}part description.`,
              record: name,
              span:
                info.memberSpans.get(memberKey("part", p.name)) ??
                info.authoredPartLines.get(p.name) ??
                info.span,
              fix: scaffoldDocLine(info.span, `${AT_CHAR}part ${DOT_CHAR}${p.name} — TODO.`),
            }),
          );
        }
        if (naming?.part && !naming.part.test(p.name)) {
          out.push(
            warn({
              aspect: "part",
              rule: "part-name-case",
              message: `Part "${DOT_CHAR}${p.name}" of "${name}" doesn't match the configured name case.`,
              record: name,
              span: info.memberSpans.get(memberKey("part", p.name)) ?? info.span,
            }),
          );
        }
      }
      for (const [partName, partSel] of info.authoredParts) {
        if (!selectorDefines(info.selectorText, partSel)) {
          out.push(
            warn({
              aspect: "part",
              rule: "name-not-in-css",
              message: `Documented part "${partSel}" of "${name}" is not defined by any selector.`,
              record: name,
              span: info.authoredPartLines.get(partName) ?? info.span,
            }),
          );
        }
      }
    }
    return out;
  },
};

// ── shadow parts (`::part()`) ─────────────────────────────────────────────────────────────────────

/** Providers for documented shadow parts. */
export const cssPart = {
  /** Check shadow-part descriptions on indexed records. */
  model(index: CssDocIndex): Diagnostic[] {
    const out: Diagnostic[] = [];
    for (const info of index.records) {
      const name = info.entry.name;
      for (const p of info.entry.shadowParts) {
        if (!p.description?.trim()) {
          out.push(
            warn({
              aspect: "css-part",
              rule: "undocumented-css-part",
              message: `Shadow part "${COLON_CHAR}${COLON_CHAR}part${PAREN_OPEN_CHAR}${p.name}${PAREN_CLOSE_CHAR}" of "${name}" has no ${AT_CHAR}csspart description.`,
              record: name,
              span: info.memberSpans.get(memberKey("shadow-part", p.name)) ?? info.span,
              fix: scaffoldDocLine(info.span, `${AT_CHAR}csspart ${p.name} — TODO.`),
            }),
          );
        }
      }
    }
    return out;
  },
};

// ── consumer-side state / element usage ───────────────────────────────────────────────────────

/** A component class used on an element disallowed by the record's default `@element` profile. */
export function elementUsage(usage: ClassUsage, index: CssDocIndex): Diagnostic[] {
  if (!usage.base || usage.token !== usage.base) return [];
  if (!usage.elementName) return [];
  const entry = index.componentForClass(usage.base);
  if (!entry) return [];
  const profile = entry.elements?.default;
  if (!profile) return [];

  const element = usage.elementName.toLowerCase();
  // `@element` models HTML elements/groups; custom elements are out of scope.
  if (CUSTOM_ELEMENT.exec(element) !== null) return [];

  const allowed = profile.any
    ? !profile.exclude.includes(element)
    : profile.allowed.includes(element);
  if (allowed) return [];

  return [
    warn({
      aspect: "element",
      rule: "disallowed-element",
      message: `"${entry.className}" is not documented for ${LESS_THAN_CHAR}${element}${GREATER_THAN_CHAR} by ${AT_CHAR}element constraints.`,
      record: entry.name,
      span: usage.loc,
    }),
  ];
}

/** A host-document class that looks like a state (via `statePrefixes`) but isn't a documented state. */
export function stateUsage(usage: ClassUsage, index: CssDocIndex): Diagnostic[] {
  if (!usage.base) return [];
  const entry = index.componentForClass(usage.base);
  if (!entry) return [];
  const name = stripDot(usage.token);
  if (entry.states.some((s) => s.name === name)) return [];
  return [
    warn({
      aspect: "state",
      rule: "unknown-state",
      message: `"${DOT_CHAR}${name}" is not a documented state of "${entry.name}".`,
      record: entry.name,
      span: usage.loc,
    }),
  ];
}

/** A host-document class that looks like a BEM element (`base<sep>…`) but isn't a documented part. */
export function partUsage(usage: ClassUsage, index: CssDocIndex): Diagnostic[] {
  if (!usage.base) return [];
  const entry = index.componentForClass(usage.base);
  if (!entry) return [];
  const name = stripDot(usage.token);
  const known = entry.parts.some(
    (p) => p.name === name || p.modifiers?.some((m) => m.name === name),
  );
  if (known) return [];
  return [
    warn({
      aspect: "part",
      rule: "unknown-part",
      message: `"${DOT_CHAR}${name}" is not a documented part of "${entry.name}".`,
      record: entry.name,
      span: usage.loc,
    }),
  ];
}

// ── custom-property ─────────────────────────────────────────────────────────────────────────────

function findProperty(
  index: CssDocIndex,
  name: string,
): { record: RecordInfo; index: number } | undefined {
  for (const rec of index.records) {
    const i = rec.entry.cssPropertiesDeclared.findIndex((p) => p.name === name);
    if (i >= 0) return { record: rec, index: i };
  }
  return undefined;
}

/** Providers for custom property documentation and usage. */
export const customProperty = {
  /** Author-side: a registered property's default (`initial-value`/`@defaultValue`) must match its syntax. */
  model(index: CssDocIndex): Diagnostic[] {
    const out: Diagnostic[] = [];
    for (const { property, record } of index.allCustomProperties()) {
      if (!property.syntax || property.defaultValue === undefined) continue;
      const m = matchesSyntax(property.syntax, property.defaultValue);
      if (m.skipped || m.ok) continue;
      out.push(
        warn({
          aspect: "custom-property",
          rule: "invalid-default-value",
          message: `Default ${codeSpan(property.defaultValue)} of ${codeSpan(property.name)} doesn't match its syntax ${codeSpan(property.syntax)}.`,
          record,
          span: index.location(record, memberKey("property", property.name))?.span,
        }),
      );
    }
    return out;
  },

  /** Consumer-side: an assignment `--name: value` must match the property's declared syntax. */
  assignment(a: PropertyAssignment, index: CssDocIndex): Diagnostic[] {
    const found = findProperty(index, a.name);
    if (!found) return [];
    const property = found.record.entry.cssPropertiesDeclared[found.index];
    if (!property.syntax) return [];
    const m = matchesSyntax(property.syntax, a.value);
    if (m.skipped || m.ok) return [];
    return [
      warn({
        aspect: "custom-property",
        rule: "invalid-property-value",
        message: `${codeSpan(a.value)} doesn't match the declared syntax ${codeSpan(property.syntax)} of ${codeSpan(a.name)}.`,
        record: found.record.entry.name,
        span: a.loc,
      }),
    ];
  },

  /** Check a property reference's fallback and, when configured, whether its name is known. */
  propertyUsage(usage: PropertyUsage, index: CssDocIndex, options: UsageOptions): Diagnostic[] {
    const out: Diagnostic[] = [];
    // A `var(--x, fallback)` fallback must match --x's declared syntax.
    if (usage.fallback) {
      const found = findProperty(index, usage.name);
      const property = found?.record.entry.cssPropertiesDeclared[found.index];
      if (property?.syntax) {
        const m = matchesSyntax(property.syntax, usage.fallback);
        if (!m.skipped && !m.ok) {
          out.push(
            warn({
              aspect: "custom-property",
              rule: "invalid-fallback-value",
              message: `${codeSpan(`var${PAREN_OPEN_CHAR}${usage.name}, …${PAREN_CLOSE_CHAR}`)} fallback ${codeSpan(usage.fallback)} doesn't match the declared syntax ${codeSpan(property.syntax)}.`,
              span: usage.loc,
            }),
          );
        }
      }
    }
    // Unknown custom property (opt-in via prefix).
    if (
      options.propertyPrefix &&
      usage.name.startsWith(options.propertyPrefix) &&
      !findProperty(index, usage.name)
    ) {
      out.push(
        warn({
          aspect: "custom-property",
          rule: "unknown-custom-property",
          message: `${codeSpan(usage.name)} is not a documented custom property.`,
          span: usage.loc,
        }),
      );
    }
    return out;
  },

  /** Suggest declared custom properties from the index. */
  completions(index: CssDocIndex): Completion[] {
    return index.allCustomProperties().map(({ property }) => ({
      label: property.name,
      kind: "property" as const,
      detail: property.syntax,
      documentation: property.description,
    }));
  },

  /** Render property documentation and resolved values, when available. */
  hover(name: string, index: CssDocIndex, valueIndex: CssDocIndex = index): Hover | undefined {
    const found = findProperty(index, name);
    const { declared, resolved } = valueIndex.resolveCustomProperty(name);
    // Hover a documented `@property`/`@cssproperty`, or any custom property the value graph knows.
    if (!found && declared === undefined) return undefined;
    const p = found?.record.entry.cssPropertiesDeclared[found.index];
    const lines = [`${codeSpan(name)}${p?.syntax ? ` — ${linkedSyntax(p.syntax)}` : ""}`];
    const value = declared ?? p?.defaultValue;
    if (value) lines.push("", `Value: ${codeSpan(value)}`);
    // The value it computes to, following `var()` references through the sheet (dev-tools style).
    if (resolved) lines.push("", `Resolves to: ${codeSpan(resolved)}`);
    if (p?.description) lines.push("", p.description);
    return { contents: sanitizeMarkdownLinks(lines.join("\n")) };
  },

  /** Find a custom property's source location, when indexed. */
  definition(name: string, index: CssDocIndex): Location | undefined {
    const found = findProperty(index, name);
    return found ? index.location(found.record.entry.name, memberKey("property", name)) : undefined;
  },
};

// ── function ────────────────────────────────────────────────────────────────────────────────────

/** Providers for documented CSS functions. */
export const func = {
  /** Suggest documented custom functions from the index. */
  completions(index: CssDocIndex): Completion[] {
    return index.allFunctions().map(({ fn }) => ({
      label: fn.name,
      kind: "function" as const,
      detail: fn.result
        ? `${PAREN_OPEN_CHAR}${fn.parameters.join(", ")}${PAREN_CLOSE_CHAR} → ${fn.result}`
        : `${PAREN_OPEN_CHAR}${fn.parameters.join(", ")}${PAREN_CLOSE_CHAR}`,
      documentation: fn.description,
    }));
  },

  /** Render the first matching function's signature and description. */
  hover(name: string, index: CssDocIndex): Hover | undefined {
    const match = index.allFunctions().find(({ fn }) => fn.name === name);
    if (!match) return undefined;
    const { fn } = match;
    const sig = `${codeSpan(`${fn.name}${PAREN_OPEN_CHAR}${fn.parameters.join(", ")}${PAREN_CLOSE_CHAR}`)}${fn.result ? ` → ${codeSpan(fn.result)}` : ""}`;
    return {
      contents: sanitizeMarkdownLinks(fn.description ? `${sig}\n\n${fn.description}` : sig),
    };
  },

  /** Find the first matching custom function's source location, when indexed. */
  definition(name: string, index: CssDocIndex): Location | undefined {
    const match = index.allFunctions().find(({ fn }) => fn.name === name);
    return match ? index.location(match.record, memberKey("function", name)) : undefined;
  },
};
