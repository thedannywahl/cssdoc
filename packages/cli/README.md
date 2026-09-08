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
- `--fix` — apply deterministic autofixes for the safe doc-scaffold subset before reporting.

Exit code is non-zero when any error-severity violation remains after fixes are applied (or the
`--max-warnings` count is exceeded).

```sh
cssdoc lint "src/**/*.css" --fix --format github --max-warnings 0
```

Globs are `.gitignore`-aware from the nearest Git root and always exclude `node_modules`. Root
`.gitignore` negations are honored; nested `.gitignore` files are not read yet.

Per-glob rule overrides live in `cssdoc.jsonc` next to normal rule severities:

```jsonc
{
  "rules": {
    "missing-summary": "error",
  },
  "overrides": [
    { "files": "docs/**/*.css", "rules": { "missing-summary": "off" } },
    { "files": ["examples/**/*.css"], "rules": { "missing-summary": "warn" } },
  ],
}
```

Override globs are relative to the config file where they're authored. Matching overrides apply in
declaration order, so later matches win.

## License

MIT
