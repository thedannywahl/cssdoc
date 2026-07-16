<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# cssdoc.

`@cssdoc` is a framework-agnostic documentation toolchain for plain CSS — TSDoc, for CSS. It parses a
doc-comment grammar plus the CSS AST into one serializable model, then emits Markdown, HTML, JSON, or
an LLM digest on top — the way the `@microsoft/tsdoc` family and TypeDoc split a parser, a config
loader, and a set of emitters and plugins. It's a Vite+/pnpm monorepo publishing the `@cssdoc/*`
scope to npm (MIT; bare `cssdoc` is squatted).

Read `README.md` for the full package map and architecture. This section is the map to what an agent
needs beyond it; open the linked docs only when a task calls for them.

## How to work here.

- **AST-first is the core design principle.** Modifiers, parts, consumed and declared custom
  properties, and deprecated-alias links are extracted from the CSS selectors themselves — they can't
  drift. Authored doc-comments supply **only prose**. Never re-derive from a selector something the
  AST already gives you, and never let a doc-comment override a fact the AST owns.
- **Use the `vp` CLIs — never raw pnpm/npm/yarn.** Run `vp check` and `vp test` before you're done
  (see the Vite+ checklist above).
- **The sibling `~/Scripts/pantoken` repo dogfoods `@cssdoc/*` from npm.** When you add a render
  option to `@cssdoc/markdown`, forward it through the `@cssdoc/typedoc` emit path too — the emit
  wrapper cherry-picks options, so a new option silently no-ops otherwise. Add a forwarding test. See
  `docs/engineering-log.md`.
- **Markdown output must be VitePress/Vue-safe.** Consumers render emitted pages through Vue, so the
  emitter escapes raw `<tag>`/`{{` in prose (backticked code spans exempt).
- **Writing:** active voice, contractions, plain language, Oxford comma. Don't use empowering,
  harnessing, unlocking, supercharging, transforming, game-changing, seamless, robust, leverage, or
  synergy.

## Knowledge map.

| When you need to…                                                             | Read…                     |
| ----------------------------------------------------------------------------- | ------------------------- |
| Understand the packages, tiers, and architecture                              | `README.md`               |
| Match an agent to a domain (parser, emitters, lint/providers, editor tooling) | `AGENTS.md`               |
| Avoid re-solving a known bug or gotcha                                        | `docs/engineering-log.md` |
