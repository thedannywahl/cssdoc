import { configDefaults, defineConfig } from "vite-plus";

// Coding agents create git worktrees here; each holds a full copy of the repo whose stale source would
// otherwise be linted, formatted, and (via Vitest's file discovery) test-run. Ignore both the bare and
// `.claude/`-nested locations across every tool.
const WORKTREE_IGNORE = ["**/.worktrees/**", "**/.claude/worktrees/**"];

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  // Vitest replaces (not merges) `exclude`, so keep its defaults and add the worktree copies.
  test: { exclude: [...configDefaults.exclude, ...WORKTREE_IGNORE] },
  // Generated files whose exact bytes are owned elsewhere, so oxfmt must not touch them:
  //   - CHANGELOG.md — changelogen at release time (see scripts/release-changelog.mjs); its markdown
  //     (e.g. `⚠️  ` after a breaking-change entry) doesn't match oxfmt and would fail the release Gate.
  //   - **/cssdoc.schema.json — the JSON Schema mirrors written by scripts/sync-schema.ts from the
  //     `cssDocSchema` source of truth; oxfmt would collapse arrays and break the byte-exact drift check.
  fmt: { ignorePatterns: ["CHANGELOG.md", "**/cssdoc.schema.json", ...WORKTREE_IGNORE] },
  lint: {
    ignorePatterns: [...WORKTREE_IGNORE],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  // Repo orchestration lives here as `vp run <task>` tasks (invoked by CI and locally) rather than in
  // package.json scripts. The root isn't a workspace member, so a task named `build` running
  // `vp run -r build` recurses over the member packages only — no self-recursion.
  run: {
    cache: true,
    tasks: {
      build: { cache: false, command: "vp run -r build" },
      // `check` also asserts the cssdoc.schema.json mirrors are in sync; `sync:schema` regenerates them.
      check: { cache: false, command: "vp check && node scripts/sync-schema.ts --check" },
      "sync:schema": { cache: false, command: "node scripts/sync-schema.ts" },
      test: { cache: false, command: "vp run -r test" },
      "check:publish": { cache: false, command: "vp run -r publint" },
      ready: { cache: false, command: "vp run build && vp run check && vp run test" },
      "docs:dev": { cache: false, command: "vp run @cssdoc/docs#docs:dev" },
      "docs:build": { cache: false, command: "vp run @cssdoc/docs#docs:build" },
      "docs:preview": { cache: false, command: "vp run @cssdoc/docs#docs:preview" },
      release: {
        cache: false,
        command:
          'vp run ready && vp run check:publish && bumpp -r --all --print-commits --execute "node scripts/release-changelog.mjs" --commit "chore(release): v%s" --tag "v%s" --no-push',
      },
      publish: {
        cache: false,
        command: "vp pm publish -r --provenance --access public --no-git-checks",
      },
      "publish:dry": { cache: false, command: "vp pm publish -r --dry-run --no-git-checks" },
      "ext:package": { cache: false, command: "vp run --filter cssdoc-vscode package" },
      "ext:publish:vsce": { cache: false, command: "vp run --filter cssdoc-vscode publish:vsce" },
      "ext:publish:ovsx": { cache: false, command: "vp run --filter cssdoc-vscode publish:ovsx" },
    },
  },
});
