import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, expect, test } from "vite-plus/test";

const temporary = [];
const git = execFileSync("which", ["git"], { encoding: "utf8" }).trim();
const scriptRoot = resolve("scripts");

afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function run(cwd, command, args, env = {}) {
  return execFileSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function init(dir) {
  mkdirSync(dir, { recursive: true });
  run(dir, git, ["init", "-b", "main"]);
  run(dir, git, ["config", "user.name", "Test"]);
  run(dir, git, ["config", "user.email", "test@example.invalid"]);
}

test("opens and updates registry PRs, and rejects an older release", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-zed-registry-"));
  temporary.push(dir);
  const source = join(dir, "source");
  const upstream = join(dir, "upstream");
  const fork = join(dir, "fork.git");
  const bin = join(dir, "bin");
  init(source);
  mkdirSync(join(source, "scripts"));
  for (const file of [
    "sync-zed-version.mjs",
    "update-zed-registry.mjs",
    "update-zed-registry.sh",
  ]) {
    copyFileSync(join(scriptRoot, file), join(source, "scripts", file));
  }
  mkdirSync(join(source, "servers/zed/src"), { recursive: true });
  mkdirSync(join(source, "servers/language-server"), { recursive: true });
  const setVersion = (version) => {
    writeFileSync(
      join(source, "servers/language-server/package.json"),
      JSON.stringify({ version }),
    );
    writeFileSync(join(source, "servers/zed/extension.toml"), `version = "${version}"\n`);
    writeFileSync(
      join(source, "servers/zed/Cargo.toml"),
      `[package]\nname = "cssdoc-zed"\nversion = "${version}"\n`,
    );
    writeFileSync(
      join(source, "servers/zed/Cargo.lock"),
      `[[package]]\nname = "cssdoc-zed"\nversion = "${version}"\n`,
    );
    writeFileSync(join(source, "servers/zed/src/lib.rs"), `const VERSION: &str = "${version}";\n`);
    run(source, git, ["add", "."]);
    run(source, git, ["commit", "-m", version]);
    return run(source, git, ["rev-parse", "HEAD"]);
  };
  const initial = setVersion("1.0.0");
  init(upstream);
  writeFileSync(
    join(upstream, "extensions.toml"),
    '[cssdoc-language-server]\nsubmodule = "extensions/cssdoc-language-server"\npath = "servers/zed"\nversion = "1.0.0"\n',
  );
  run(upstream, git, ["add", "."]);
  run(upstream, git, [
    "update-index",
    "--add",
    "--cacheinfo",
    `160000,${initial},extensions/cssdoc-language-server`,
  ]);
  run(upstream, git, ["commit", "-m", "initial extension"]);
  run(dir, git, ["clone", "--bare", upstream, fork]);
  const release = setVersion("1.1.0");
  run(source, git, ["remote", "add", "origin", source]);

  mkdirSync(bin);
  writeFileSync(
    join(bin, "git"),
    `#!/usr/bin/env bash
args=()
for arg in "$@"; do
  case "$arg" in
    https://github.com/zed-industries/extensions.git) arg="$TEST_UPSTREAM" ;;
    https://github.com/thedannywahl/extensions.git) arg="$TEST_FORK" ;;
  esac
  args+=("$arg")
done
exec "$REAL_GIT" "\${args[@]}"
`,
    { mode: 0o755 },
  );
  writeFileSync(
    join(bin, "gh"),
    `#!/usr/bin/env bash
echo "$*" >> "$TEST_LOG"
if [[ "$1" == api && -f "$TEST_PR" ]]; then echo "https://example.invalid/pr/1"; fi
if [[ "$1 $2" == "pr create" ]]; then touch "$TEST_PR"; fi
`,
    { mode: 0o755 },
  );
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    REAL_GIT: git,
    TEST_UPSTREAM: upstream,
    TEST_FORK: fork,
    TEST_LOG: join(dir, "gh.log"),
    TEST_PR: join(dir, "pr"),
    GH_TOKEN: "test",
    GITHUB_REF_NAME: "v1.1.0",
    GITHUB_SHA: release,
  };
  const invoke = () =>
    spawnSync("bash", ["scripts/update-zed-registry.sh"], { cwd: source, env, encoding: "utf8" });
  const first = invoke();
  if (first.status !== 0) throw new Error(first.stderr);
  expect(
    run(dir, git, ["--git-dir", fork, "show", "cssdoc-release-update:extensions.toml"]),
  ).toContain('version = "1.1.0"');
  expect(
    run(dir, git, [
      "--git-dir",
      fork,
      "rev-parse",
      "cssdoc-release-update:extensions/cssdoc-language-server",
    ]),
  ).toBe(release);
  const firstBranch = run(dir, git, ["--git-dir", fork, "rev-parse", "cssdoc-release-update"]);
  const second = invoke();
  if (second.status !== 0) throw new Error(second.stderr);
  expect(run(dir, git, ["--git-dir", fork, "rev-parse", "cssdoc-release-update"])).toBe(
    firstBranch,
  );
  expect(readFileSync(env.TEST_LOG, "utf8")).toContain("pr create");
  expect(readFileSync(env.TEST_LOG, "utf8")).toContain("pr edit");

  const next = setVersion("1.2.0");
  env.GITHUB_REF_NAME = "v1.2.0";
  env.GITHUB_SHA = next;
  const newer = invoke();
  if (newer.status !== 0) throw new Error(newer.stderr);
  run(source, git, ["checkout", release, "--", "servers"]);
  env.GITHUB_REF_NAME = "v1.1.0";
  env.GITHUB_SHA = release;
  const older = invoke();
  expect(older.status).not.toBe(0);
  expect(older.stderr).toContain("newer or unrelated commit");
}, 30_000);
