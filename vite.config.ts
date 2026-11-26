import { configDefaults, defineConfig, mergeConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

import { baseConfig } from "./vite.config.base.ts";

// Coding agents create git worktrees here; each holds a full copy of the repo whose stale source would
// otherwise be linted, formatted, and (via Vitest's file discovery) test-run. Ignore both the bare and
// `.claude/`-nested locations across every tool.
const WORKTREE_IGNORE = ["**/.worktrees/**", "**/.claude/worktrees/**"];

const config: UserConfig = mergeConfig(
  baseConfig,
  defineConfig({
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
    //   - scripts/sync-schema.d.ts — unused, but tsgo's experimental type-aware lint pass re-emits it as a
    //     side effect of type-checking the config package test's relative import, ignoring `noEmit`.
    fmt: {
      ignorePatterns: [
        "CHANGELOG.md",
        "**/cssdoc.schema.json",
        "plugins/stylelint/src/index.d.ts",
        "scripts/sync-schema.d.ts",
        ...WORKTREE_IGNORE,
      ],
    },
    lint: {
      ignorePatterns: [...WORKTREE_IGNORE],
      jsPlugins: [
        { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
        { name: "tsdoc", specifier: "eslint-plugin-tsdoc" },
        { name: "tsdoc-require-2", specifier: "eslint-plugin-tsdoc-require-2" },
      ],
      rules: { "vite-plus/prefer-vite-plus-imports": "error" },
      overrides: [
        {
          // TSDoc enforcement on source TypeScript: every exported declaration needs a doc comment and
          // comments must be valid TSDoc (honouring tsdoc.json). Both rules are comment/syntax-only.
          files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
          excludeFiles: [
            "**/*.test.ts",
            "**/*.test.tsx",
            "**/*.test.mts",
            "**/*.test.cts",
            "**/*.spec.ts",
            "**/*.spec.tsx",
            "**/*.spec.mts",
            "**/*.spec.cts",
            "**/tests/**",
            "**/generated/**",
            "**/dist/**",
            "**/*.d.ts",
            "**/*.config.ts",
            "**/*.base.ts",
          ],
          rules: {
            "tsdoc/syntax": "error",
            "tsdoc-require-2/require": "error",
            "jsdoc/check-access": "error",
            "jsdoc/check-property-names": "error",
            "jsdoc/empty-tags": "error",
            "jsdoc/implements-on-classes": "error",
            "jsdoc/no-defaults": "error",
            "jsdoc/require-param": ["error", { ignoreWhenAllParamsMissing: true }],
            "jsdoc/require-param-description": "error",
            "jsdoc/require-param-name": "error",
            "jsdoc/require-property": "error",
            "jsdoc/require-property-description": "error",
            "jsdoc/require-property-name": "error",
            "jsdoc/require-property-type": "off",
            "jsdoc/require-returns-description": "error",
            "jsdoc/require-yields": "error",
          },
        },
      ],
    },
    // Repo orchestration lives here as `vp run <task>` tasks (invoked by CI and locally) rather than in
    // package.json scripts. The root isn't a workspace member, so a task named `build` running
    // `vp run -r build` recurses over the member packages only — no self-recursion.
    run: {
      cache: true,
      tasks: {
        setup: { cache: false, command: "vp config" },
        build: { cache: false, command: "vp run -r build" },
        // `check` also verifies the compiler projects and schema mirrors.
        check: {
          cache: false,
          command:
            "vp check && vp run type-check && node scripts/sync-schema.ts --check && node scripts/sync-zed-version.mjs --check",
        },
        "type-check": { cache: false, command: "tsc --noEmit && vp run --no-cache -r type-check" },
        "sync:schema": { cache: false, command: "node scripts/sync-schema.ts" },
        test: { cache: false, command: "vp run -r test" },
        "check:publish": {
          cache: false,
          command: "vp run -r publint && vp run --no-cache -r attw",
        },
        ready: {
          cache: false,
          command:
            "vp run build && vp run check && vp run test && vp run check:publish && vp run docs:build",
        },
        "docs:dev": { cache: false, command: "vp run @cssdoc/docs#docs:dev" },
        "docs:build": { cache: false, command: "vp run @cssdoc/docs#docs:build" },
        "docs:preview": { cache: false, command: "vp run @cssdoc/docs#docs:preview" },
        release: {
          cache: false,
          command:
            'vp run ready && bumpp -r --all --print-commits --execute "node scripts/release-changelog.mjs" --commit "chore(release): v%s" --tag "v%s" --no-push && git push --follow-tags',
        },
        publish: {
          cache: false,
          command: "vp pm publish -r --provenance --access public --no-git-checks",
        },
        "publish:dry": { cache: false, command: "vp pm publish -r --dry-run --no-git-checks" },
        "ext:package": { cache: false, command: "vp run --filter cssdoc-vscode package" },
        "ext:publish:vsce": { cache: false, command: "vp run --filter cssdoc-vscode publish:vsce" },
        "ext:publish:ovsx": { cache: false, command: "vp run --filter cssdoc-vscode publish:ovsx" },
        "zed:package": { cache: false, command: "bash scripts/package-zed.sh" },
      },
    },
  }),
);
export default config;
