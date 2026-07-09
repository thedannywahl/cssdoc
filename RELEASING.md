# Releasing

cssdoc uses **Conventional Commits**, **fixed (synced) versioning** — every package shares one version
— and a **tag-driven** release. Changelogs come from the commit history; the version bump and publish
are gated by CI.

## Day to day

Write [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`,
`refactor:`, `chore:`, `feat!:` / `BREAKING CHANGE:` for majors). CI lints every PR's commits and runs
the full gate (`build`, `check`, `test`, `publint`).

## Cutting a release

```sh
vp run release
```

That runs the gate, then `bumpp` (recursive) which:

1. prompts for the new version and applies it to **every** `package.json`;
2. runs `changelogen` to prepend the release section to `CHANGELOG.md` from the Conventional Commits
   since the last tag;
3. commits `chore(release): vX.Y.Z` and creates the `vX.Y.Z` tag — but does **not** push.

Review the commit and `CHANGELOG.md`, then push to ship:

```sh
git push --follow-tags
```

Pushing the `v*` tag triggers `.github/workflows/release.yml`, which re-runs the gate and, in parallel:

- publishes all public npm packages with `vp pm publish -r --provenance` and creates a GitHub Release;
- builds the VS Code extension and publishes it to the **VS Code Marketplace** (`vsce`) and **Open VSX**
  (`ovsx`). `bumpp -r` already bumped the extension to the same version, so it stays in sync.

## One-time setup

- **npm trusted publishing** — configure each `@cssdoc/*` package as a trusted publisher on npm (repo +
  `release.yml` workflow). This lets CI publish over OIDC with provenance and no stored token. If your
  npm/pnpm version can't use OIDC yet, add an `NPM_TOKEN` repo secret and uncomment `NODE_AUTH_TOKEN`
  in `release.yml`.
- **VS Code extension tokens** — the Marketplace has no OIDC, so publishing needs stored PATs. Add repo
  secrets `VSCE_PAT` (an Azure DevOps token for the `cssdoc` publisher) and `OVSX_PAT` (an Open VSX
  token). The `cssdoc` publisher must exist on both marketplaces.
- **Branch protection** — require the CI `verify` and `commitlint` checks on `main`.
- **GitHub Pages** — Settings → Pages → Source: GitHub Actions (for the docs deploy).
- **Local commit hook (optional)** — to catch bad commit messages before pushing, add a `commit-msg`
  hook that runs `pnpm exec commitlint --edit "$1"` (e.g. via `simple-git-hooks` or `lefthook`).

## Notes

- The private `cssdoc-vscode` extension is skipped by the npm `publish` (no `publishConfig`); it goes to
  the VS Code Marketplace + Open VSX via the `publish-extension` job. Build/publish it by hand with
  `vp run ext:package` / `vp run ext:publish`.
- `vp run publish:dry` does a full dry-run publish without touching the registry.
