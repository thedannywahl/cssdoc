# Engineering log

Hard-won fixes and gotchas from cssdoc work, most surfaced while dogfooding cssdoc through the sibling
`pantoken` docs site. Each entry is symptom → root cause → the durable rule. Version and PR numbers
are left out; the lesson is timeless.

## A new `@cssdoc/markdown` render option silently no-ops in TypeDoc output

**Symptom** — A render option (e.g. `classNames` for status-marker pills) worked when calling the
renderer directly but had no effect through the `@cssdoc/typedoc` path that consumers use. No error —
it just didn't apply.

**Root cause** — `@cssdoc/typedoc`'s `emitCssApi` **cherry-picks** options into its internal
`buildCssApi` call. Its options type _extends_ the renderer's `RenderEntryOptions`, so a new option
compiles fine, but the cherry-pick doesn't forward it, so it's dropped at runtime.

**Fix / rule** — When you add a render option to `@cssdoc/markdown`, forward it through the
`@cssdoc/typedoc` emit path in the same change, and add a forwarding test that asserts the option
reaches the render call. Don't rely on the type check — the extends relationship hides the gap.

## Status-marker spans must wrap only the marker word

**Symptom** — Deprecation and release-stage pills rendered as a giant highlighted block: the whole
sentence (`Deprecated — use .x` and the reason prose) sat inside the styled span.

**Root cause** — The `classNames` wrapping originally spanned the entire marker sentence, including the
trailing reason prose, so the pill styling ballooned to cover it.

**Fix / rule** — Wrap **only the marker word** (`Deprecated`, `experimental`) in the span and leave the
reason prose outside it (`<span>Deprecated</span> — use \`.x\`.`). Drop the code-span backticks around
a stage word so it styles as a bare pill. The pure-Markdown fallback (no `classNames`) stays plain text.

## Emitted Markdown must be VitePress/Vue-safe

**Symptom** — A page failed to compile with a fatal "Element is missing end tag" when a `@summary`
contained raw markup like `native <dialog>`.

**Root cause** — Consumers render emitted Markdown through VitePress, which compiles it with Vue's SFC
parser. Raw `<tag>` and `{{` in prose are interpreted as Vue syntax.

**Fix / rule** — The emitter escapes raw `<tag>`/`{{` in prose it renders (an `escProse()` does this;
backticked code spans are exempt, since VitePress marks them `v-pre`). Keep that escaping when adding
prose-bearing output.

## `@structure` is shape-only, and the lint rule doesn't resolve siblings

**Symptom** — `structure-unknown-selector` flagged a valid `@structure` node, or a modifier-laden node
selector leaked variant styling into the structure tree.

**Root cause** — `@structure` describes DOM **shape**. Node selectors that carry modifier/state/icon
suffixes conflate shape with variants, and the `structure-unknown-selector` check doesn't resolve
sibling records — it only knows the record's own base class and documented members.

**Fix / rule** — Keep `@structure` node selectors bare (`.tab.-selected` → `.tab`); put variants in the
Modifiers/States tables. A bare `.x` in `@structure` must be a real record's base class or a documented
member of the current record.

## `toMermaid` `classDef` is a contract with the consumer's mermaid theme

**Context, not a bug.** `@cssdoc/core`'s `toMermaid` renders `@structure` as a classified flowchart and
emits `classDef cssdoc-root` / `cssdoc-part` / `cssdoc-slot` / `cssdoc-component`. Mermaid compiles a
`classDef` into inline `!important`, which a consumer can't override — so a consumer theme strips those
`classDef` lines from the graph source and repaints via `themeCSS` targeting the `.node.cssdoc-*`
classes. Those four class names couple cssdoc to any consumer's mermaid theme: **change a name here,
and every consumer's theme must change with it.**

## Not yet distilled

Two cssdoc investigations lived only in chat transcripts that don't survive the instance migration and
weren't captured in a memory file — the **language-server / VS Code extension memory leak** and the
**external symbol link warnings**. If either resurfaces, treat it as new and add an entry here.
