# @cssdoc/cli

A host-agnostic `cssdoc lint` command: the same [`@cssdoc/lint-core`](../lint-core) rules the
Stylelint and ESLint adapters run, with no host linter required. Useful for toolchains that don't
already have Stylelint or ESLint in the loop (or that want CSS doc-hygiene checks in a pre-commit hook
without one).

## Install

```sh
npm i -D @cssdoc/cli
```

## Use

```sh
cssdoc lint "src/**/*.css"
```

`cssdoc lint` auto-loads the nearest `cssdoc.jsonc`/`cssdoc.json` per file — honoring `extends`,
`providers`, rule severities, and `structureIgnore` — exactly as the Stylelint and ESLint plugins do.

Options:

- `--format pretty|json|github` (default `pretty`). `github` emits `::error`/`::warning` annotations
  for GitHub Actions.
- `--quiet` — drop warning-severity violations from the report (and from the exit-code calculation).
- `--max-warnings <n>` — fail if more than `n` warnings are reported (default: unlimited).

Exit code is non-zero when any error-severity violation is reported (or the `--max-warnings` count is
exceeded).

```sh
cssdoc lint "src/**/*.css" --format github --max-warnings 0
```

## Not yet implemented

- `--fix` for the autofixable rule subset.
- Per-glob rule overrides in `cssdoc.jsonc` (an `overrides: [{ files, rules }]`-shaped extension).
- `.gitignore`-aware globbing (globs currently just exclude `node_modules`).

## License

MIT
