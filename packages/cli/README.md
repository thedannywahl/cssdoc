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

Run `cssdoc` with no arguments in an interactive terminal for a guided lint flow. It asks which CSS
path or glob to lint, whether to apply safe fixes, and whether warnings should fail the run.

For scripts and CI, use the explicit command:

```sh
cssdoc lint "src/**/*.css"
```

`cssdoc lint` always requires at least one file or glob and never prompts. Run `cssdoc --help` or
`cssdoc lint --help` for generated command help, and `cssdoc --version` for the installed version.

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

In an interactive terminal, the default `pretty` format uses a structured terminal presentation.
Redirected `pretty` output stays plain text, and `json` and `github` are always undecorated for
machine consumption.

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

## Shell completion

Generate completion scripts with `cssdoc complete <shell>`. Supported shells are `zsh`, `bash`,
`fish`, and `powershell`.

For a one-time zsh session:

```sh
source <(cssdoc complete zsh)
```

To install zsh completion permanently:

```sh
cssdoc complete zsh > ~/.cssdoc-completion.zsh
echo 'source ~/.cssdoc-completion.zsh' >> ~/.zshrc
```

Use the corresponding shell name and startup file for bash, fish, or PowerShell.

## License

MIT
