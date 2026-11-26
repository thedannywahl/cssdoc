# Releasing

cssdoc uses **Conventional Commits**, **fixed (synced) versioning** — every package shares one version
— and a **tag-driven** release. Changelogs come from the commit history; the version bump and publish
are gated by CI.

## Day to day

Write [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`,
`refactor:`, `chore:`, `feat!:` / `BREAKING CHANGE:` for majors). CI lints every PR's commits and runs
the full gate (`build`, `check`, `test`, `publint`, and Are the Types Wrong?).
The type-package check uses pnpm-packed tarballs and ATTW's ESM-only profile, matching the published
packages' module format.

## Cutting a release

```sh
vp run release
```

That runs the gate, including the docs build, then `bumpp` (recursive) which:

1. prompts for the new version and applies it to **every** `package.json`;
2. synchronizes the Zed extension manifest, Cargo crate and lockfile, and pinned language-server
   version with the bumped language-server package;
3. runs `changelogen` to prepend the release section to `CHANGELOG.md` from the Conventional Commits
   since the last tag;
4. commits `chore(release): vX.Y.Z` and creates the `vX.Y.Z` tag.

The command then runs `git push --follow-tags` to ship the release.

Pushing the `v*` tag triggers `.github/workflows/release.yml`, which re-runs the gate and, in parallel:

- publishes all public npm packages with `vp pm publish -r --provenance` and creates a GitHub Release;
- builds the VS Code extension and publishes it to the **VS Code Marketplace** (`vsce`) and **Open VSX**
  (`ovsx`). `bumpp -r` already bumped the extension to the same version, so it stays in sync;
- builds the Zed extension for `wasm32-wasip2` and attaches a versioned archive to the GitHub Release,
  with registry update PRs temporarily disabled.

## One-time setup

- **npm trusted publishing (OIDC)** — configure each `@cssdoc/*` package as a trusted publisher on npm:
  its page → Settings → Trusted Publisher → GitHub Actions, org `thedannywahl`, repo `cssdoc`, workflow
  `release.yml` (leave environment blank). CI then publishes over OIDC with provenance and no stored
  token. A package must already exist before it can be configured, so `0.1.0` was published once with a
  temporary `NPM_TOKEN` (an npm automation token, since the registry can't prompt for a 2FA OTP in CI);
  that token and secret were removed once the trusted publishers were in place.
- **First `@cssdoc/regex` release** — bootstrap the package on npm and configure its trusted publisher
  before a tag-driven release that depends on it. The publish dry run doesn't perform this setup.
- **VS Code extension tokens** — the Marketplace has no OIDC, so publishing needs stored PATs. Add repo
  secrets `VSCE_PAT` (an Azure DevOps token for the `cssdoc` publisher) and `OVSX_PAT` (an Open VSX
  token). The `cssdoc` publisher must exist on both marketplaces.
- **Zed registry updates** — merge the initial submission in `zed-industries/extensions` first. Add
  a `ZED_REGISTRY_TOKEN` repo secret for a GitHub account that can push to `thedannywahl/extensions`
  and open and edit pull requests against `zed-industries/extensions` (a classic PAT with
  `public_repo` scope works for these public repositories). The release commit must be reachable
  from `main`. Set the repository variable `ZED_REGISTRY_UPDATE_ENABLED` to `true` to enable update
  PRs. Review and follow up on the registry PR; opening it doesn't publish the extension.
- **Branch protection** — require the CI `verify` and `commitlint` checks on `main`.
- **GitHub Pages** — Settings → Pages → Source: GitHub Actions (for the docs deploy).
- **Local commit hook (optional)** — to catch bad commit messages before pushing, add a `commit-msg`
  hook that runs `pnpm exec commitlint --edit "$1"` (e.g. via `simple-git-hooks` or `lefthook`).

## Notes

- The private `cssdoc-vscode` extension is skipped by the npm `publish` (no `publishConfig`); it goes to
  the VS Code Marketplace + Open VSX via the `publish-extension` job. The job packages the `.vsix` once,
  attaches it to the GitHub Release, then publishes to each marketplace independently — the Marketplace
  (`vsce`) is best-effort, so a failing PAT there doesn't skip Open VSX. Build/publish by hand with
  `vp run ext:package`, then `vp run ext:publish:vsce` and/or `vp run ext:publish:ovsx`.
- `vp run publish:dry` does a full dry-run publish without touching the registry.
- `vp run zed:package` builds the Zed archive locally with Rust and the `wasm32-wasip2` target.
  Extract it to a permanent directory and use **zed: install dev extension** to select that directory.
  This overrides the registry extension. The prebuilt archive doesn't include Rust source; the
  extension still needs Node.js 26 or newer and network access to install the pinned language server.
