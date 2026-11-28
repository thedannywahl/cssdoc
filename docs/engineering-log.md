# Engineering log

Hard-won fixes and gotchas from cssdoc work, including those found in downstream documentation sites.
Each entry is symptom → root cause → the durable rule. Version and PR numbers are left out; the lesson
is timeless.

## Regex flag rewrites break source consumers

**Symptom** — After converting regex factories to native literals, an ignore-case autofix removed
lowercase branches from shared patterns. Modifier extraction and syntax highlighting stopped
recognizing lowercase names.

**Root cause** — The rewrite preserved direct matching by adding `i`, but consumers of `.source`
didn't inherit that flag. TextMate grammars also store pattern text rather than native regex objects.

**Fix / rule** — Author canonical patterns as native literals, derive registry metadata from those
declarations, and keep `use-ignore-case` off for shared source fragments. Clone native patterns when
independent flags or global state are needed. Use `RegExp.escape` for literal runtime input, not for
configured regex syntax. Don't apply regex autofixes in bulk before checking capture shapes, flags,
source consumers, and adversarial input.

Allow explicit hyphen escapes in the native `no-useless-escape` rule. They prevent accidental ranges
and avoid conflicting with regex-plugin fixes that serialize character classes with `\-`.
Generator-owned model declarations must stay outside lint autofixes as well as formatting.

When a whitespace prefix overlaps a prose capture, capture the separator once and trim at the
consumer. For free-form description separators, don't retry a whitespace run at every character.
Keep greedy identifier boundaries explicit when the following capture accepts the same characters.
The attribute scanners retain empty unquoted class values, but modifier attributes reject
whitespace-only values.

## Documentation bundle warnings hide different kinds of payloads

**Symptom** — Documentation builds reported a redundant CodeMirror import and oversized JavaScript
chunks.

**Root cause** — The editor imported CodeMirror state dynamically after dependencies had already
loaded it statically. Mermaid loaded with the site theme, and the playground bundled several
dependencies together. Generated reference/search data and prebundled vendor grammars/layout engines
also exceeded the ordinary code threshold; module splitting can't divide those individual modules.

**Fix / rule** — Import CodeMirror state consistently, load Mermaid only when rendering a mounted
diagram, and split client dependencies by package. Leave the SSR graph alone: package grouping can
introduce initialization cycles there. Preserve execution order in the client graph.

The documentation build enforces raw and gzip limits rather than merely suppressing warnings:

| Payload            | Raw bytes | Gzip bytes |
| ------------------ | --------: | ---------: |
| Ordinary code      |   500,000 |    200,000 |
| ELK layout engine  | 1,600,000 |    500,000 |
| Mermaid grammar    |   700,000 |    150,000 |
| Local search index | 1,350,000 |    270,000 |
| Pattern reference  |   750,000 |     45,000 |

The exceptions cover measured, indivisible payloads with limited headroom. Every module in an
exception chunk must belong to that payload; adding ordinary application code restores the ordinary
limit. Keep the full search index, reference examples, and Mermaid diagram/layout features.

## Playground HTML editor crashes, or preset changes leave stale text

**Symptom** — The HTML editor stayed blank with a Lezer `TreeNode.nextChild` error. A preset selected
while an editor loaded could leave its text out of sync with the resolved model.

**Root cause** — Different copies of `@lezer/common` broke the HTML parser's tree identity checks.
Separately, the editor captured its initial document before awaiting the language extension; prop
changes during that wait couldn't update an editor that didn't exist yet.

**Fix / rule** — Keep Lezer's shared tree runtime on one version through the workspace override.
Finish loading editor extensions before reading the current props, and skip editor creation if the
component unmounted while loading.

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
reason prose outside it (``<span>Deprecated</span> — use `.x`.``). Drop the code-span backticks around
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
