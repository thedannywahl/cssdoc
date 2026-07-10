/**
 * bumpp `--execute` hook: regenerate the changelog with the freshly-bumped version as the section
 * heading. Runs after bumpp writes the new version into the `package.json` files but before it
 * creates the release commit and tag.
 *
 * Passing the version to `changelogen` as `-r <version>` is the whole point: without it, changelogen
 * titles the section from the git range — and since the new tag doesn't exist yet, that resolves to
 * `v<last>...main` (e.g. `v0.2.0...main`). With `-r`, the heading is `## v<version>` and the compare
 * link is the clean `v<last>...v<version>`. Mirrors the coe-mcp release scheme.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
if (!pkg.version) {
  console.error("release-changelog: could not read version from package.json");
  process.exit(1);
}

// `--output` (no filename) writes CHANGELOG.md; `-r` sets the release version for the heading.
execFileSync("changelogen", ["--output", "-r", pkg.version], { stdio: "inherit" });
