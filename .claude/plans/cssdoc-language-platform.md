# cssdoc as a language platform — consumer-side validation and IntelliSense

## Context

Today cssdoc is an author-side toolchain: it parses a CSS doc-comment grammar plus the CSS AST into a
model (`@cssdoc/core`), emits docs (`@cssdoc/markdown`, `@cssdoc/typedoc`), and lints the CSS's own
documentation hygiene (`@cssdoc/lint-core` + the Stylelint/ESLint adapters). It says nothing about how
consumers *use* the CSS.

The next step is consumer-side: validate that class usage, custom-property references, and component
structure match the documented CSS surface, and surface that same knowledge in the editor as
completions, hover, go-to-definition, and quick-fixes (IntelliSense). This must be future-forward,
standards-based, and modular — each aspect (modifier, custom property, structure, and later functions,
states, conditions) plugs in without touching the integrations, and each editor/linter is a thin
adapter over one shared model.

The guiding principle is the one TypeScript, the VS Code CSS/HTML language services, and Custom Elements
Manifest tooling all share: **one semantic model, exposed through pure host-agnostic providers, with
every tool a thin adapter.** Build a capability once; every surface gets it.

## Architecture — three tiers plus standards

```
                 ┌─────────────────────────────────────────────┐
   parse         │ @cssdoc/core  → CssDocEntry[] (pure model)   │  (have)
                 └─────────────────────────────────────────────┘
                                    │
   index         ┌─────────────────────────────────────────────┐
                 │ @cssdoc/index → CssDocIndex (queryable) +    │  (new)
                 │   Usage abstraction + optional source spans  │
                 └─────────────────────────────────────────────┘
                                    │
   providers     ┌─────────────────────────────────────────────┐
                 │ @cssdoc/providers → aspect modules:          │  (new; absorbs
                 │   modifier · custom-property · structure     │   lint-core checks)
                 │   each: diagnostics · completion · hover ·   │
                 │         definition                           │
                 └─────────────────────────────────────────────┘
                     │            │              │            │
   adapters   ┌──────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐
              │ ESLint   │ │ Stylelint  │ │ generators │ │ language     │
              │ (css +   │ │ (author)   │ │ custom-data│ │ server (LSP) │
              │  jsx/html)│ │            │ │ + CEM      │ │ + vscode ext │
              └──────────┘ └────────────┘ └────────────┘ └──────────────┘
```

### Tier 1 — semantic index (`@cssdoc/index`, new)

Turns `CssDocEntry[]` into a structure optimized for lookups — the analog of TypeScript's
`Program`/checker or VS Code custom data. Built once, queried many times.

```ts
class CssDocIndex {
  componentForClass(className: string): CssDocEntry | undefined;
  modifiersFor(name: string): CssModifier[];
  partsFor(name: string): CssPart[];
  customPropertiesFor(name: string): CssPropertyDeclared[];
  structureFor(name: string): StructureNode[] | undefined;
  isModifier(base: string, modifier: string): boolean;
  deprecationOf(base: string, modifier: string): { canonical?: string; note?: string } | undefined;
  allCustomProperties(): CssPropertyDeclared[]; // for var(...) completion
  toManifest(): CssDocManifest;                 // stable, serializable snapshot
}
```

Two cross-cutting concerns live here:

- **The `Usage` abstraction** — the neutral shape every producer (HTML, JSX, template literal, CSS
  selector) emits, so the providers never care about the host:
  ```ts
  interface ClassUsage { base?: string; tokens: string[]; token: string; loc: SourceSpan; }
  interface PropertyUsage { name: string; loc: SourceSpan; }
  ```
  `class="instui-button -color-secondary"` (space-separated) and `.instui-button.-color-secondary`
  (chained selector) are just two producers of the same `ClassUsage`.
- **Source spans (the one real gap).** `@cssdoc/core` deliberately drops positions. Diagnostics with
  locations, hover ranges, and definitions need them. Close this early: keep the pure model, but thread
  PostCSS `node.source` into an optional `loc` layer the index carries. Retrofitting spans after tools
  depend on the index is painful, so it belongs in the first phase.

### Tier 2 — aspect providers (`@cssdoc/providers`, new)

Each documented aspect is one module implementing a common interface. This is where the modularity the
project needs lives.

```ts
interface CssDocAspect {
  name: "modifier" | "custom-property" | "structure";
  diagnostics(usage: Usage[], index: CssDocIndex): Diagnostic[];
  completions(ctx: CompletionContext, index: CssDocIndex): Completion[];
  hover(ctx: PositionContext, index: CssDocIndex): Hover | undefined;
  definition(ctx: PositionContext, index: CssDocIndex): Location | undefined;
}
```

Ship three to start: `modifier`, `custom-property`, `structure`. Add `function`, `state`, and
`condition` later by dropping in a module — no adapter changes. The existing `@cssdoc/lint-core` checks
become the diagnostics half of the author-side aspects; refactor `lint-core` into a thin diagnostics
façade over `@cssdoc/providers` so the Stylelint/ESLint adapters keep working unchanged.

Deprecation is already first-class in the model (`canonical`), so it maps straight to a code action —
"replace `.-variant-error` with `.-color-danger`" — one of the most valuable IntelliSense features,
with the data already present.

### Tier 3 — adapters (thin, one per surface)

- **ESLint usage rules** — extend `@cssdoc/eslint-plugin` with `cssdoc/valid-class-usage`: a JSX rule
  over `className`/`class` string literals (and `clsx(...)`-style calls), and an HTML rule via
  `@html-eslint/parser` (peer). Both produce `ClassUsage` and call the modifier aspect's diagnostics.
- **Stylelint** — author-side, unchanged; now backed by providers.
- **Generators (standards on-ramp — the cheapest IntelliSense):**
  - `@cssdoc/vscode-custom-data` → emit `css.customData` and `html.customData` JSON from the index. The
    built-in VS Code CSS/HTML language services read these directly, so custom properties, at-rules,
    and documented classes get completions and hover with no extension.
  - `@cssdoc/cem` → emit a Custom Elements Manifest. The vocabulary is already CEM-shaped
    (`@cssproperty`, `@csspart`, `@cssstate`), so this makes the model interoperable with the wider CEM
    tooling ecosystem.
  - `@cssdoc/dtcg` → emit the declared custom properties as W3C Design Tokens (DTCG) — a `$value` /
    `$type` / `$description` token tree. This is the interchange format for the properties that double
    as design tokens (which, in a system like pantoken's `--instui-*`, is most of them), so other token
    tooling and pipelines consume them directly.
- **Language server (`@cssdoc/language-server`, LSP) + `@cssdoc/vscode` (thin extension).** LSP is
  editor-agnostic — VS Code, Neovim, JetBrains, and Zed all speak it — so the rich features get written
  once: class/modifier completion (context-aware chaining), `var(--…)` completion, hover with the
  documented description and deprecation, go-to-definition into the CSS rule, and the deprecation
  quick-fix. The server is a thin protocol shell over the providers.

## New packages and workspace layout

Add two workspace groups (`generators/*`, `servers/*`) to `pnpm-workspace.yaml`:

```
packages/
  index/            # @cssdoc/index          (semantic index, Usage, source spans)
  providers/        # @cssdoc/providers       (aspect modules)
  lint-core/        # @cssdoc/lint-core       (refactor → façade over providers)
generators/
  vscode-custom-data/  # @cssdoc/vscode-custom-data
  cem/                 # @cssdoc/cem
  dtcg/                # @cssdoc/dtcg  (custom properties → W3C Design Tokens)
servers/
  language-server/  # @cssdoc/language-server (LSP)
  vscode/           # @cssdoc/vscode          (thin extension bundling the server + custom data)
plugins/
  eslint/           # add cssdoc/valid-class-usage (jsx + html)
```

Peers: `@html-eslint/parser` (HTML usage rule), `vscode-languageserver` / `vscode-languageserver-textdocument` (server). Everything else stays inside the existing catalog conventions.

## Roadmap (phased, each lands green)

1. **Index + Usage + source spans.** `@cssdoc/index`; thread optional `loc` from PostCSS through core.
   Refactor `@cssdoc/lint-core` diagnostics into `@cssdoc/providers` aspect modules (author-side first).
2. **Consumer-side usage diagnostics.** `cssdoc/valid-class-usage` in `@cssdoc/eslint-plugin` for
   **both** JSX/`className` and HTML (`@html-eslint/parser`). This directly answers the "does it work
   for HTML with chained classes" need. Add custom-property-reference validation (an unknown or
   deprecated `var(--…)`).
3. **Standards generators.** `@cssdoc/vscode-custom-data`, `@cssdoc/cem`, and `@cssdoc/dtcg`. Immediate
   editor completions/hover through the built-in language services, CEM interop, and DTCG token export —
   no server yet.
4. **Language server + VS Code extension.** `@cssdoc/language-server` (completion, hover, definition,
   deprecation quick-fix) reusing the providers; `@cssdoc/vscode` bundles it and registers the generated
   custom data. Publish the server so other editors can consume it.
5. **Optional — `tsserver` plugin** for CSS-in-template-literals, if that authoring style is in use.

## Testing

- **Providers are pure** → unit-test each aspect's diagnostics/completion/hover against fixture indexes;
  this is the bulk of the coverage and stays fast.
- **Adapters** → ESLint `RuleTester`/`Linter`, Stylelint programmatic lint, generator snapshot tests
  (custom-data + CEM JSON), and an LSP test harness driving the server over the protocol with fixture
  documents (completion at a position, hover, definition, code action).
- **Index** → lookup and span-accuracy tests, plus a round-trip `toManifest()` snapshot.

## Confirmed decisions

1. **Usage surfaces — both.** `cssdoc/valid-class-usage` covers HTML (`@html-eslint/parser`) and
   JSX/`className` from the start. They share the provider core; each contributes its own producer of
   `ClassUsage`.
2. **Generators first.** Phase 3 ships the standards generators (custom data, CEM, DTCG) for immediate
   editor support; the language server (phase 4) reuses what they expose.
3. **DTCG for custom properties.** Custom properties export as W3C Design Tokens via `@cssdoc/dtcg`
   (`$value` / `$type` / `$description`), so properties that double as design tokens interchange with
   token tooling. The index maps `syntax → $type`, `defaultValue → $value`, and `description →
   $description`.
4. **Naming confirmed.** New `@cssdoc/index` and `@cssdoc/providers`; refactor `@cssdoc/lint-core` into
   a thin diagnostics façade over the providers so the Stylelint and ESLint adapters keep working
   through the rename.
