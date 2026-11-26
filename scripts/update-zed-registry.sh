#!/usr/bin/env bash
set -euo pipefail

: "${GH_TOKEN:?Set GH_TOKEN to a token with access to the Zed registry fork and pull requests}"
: "${GITHUB_REF_NAME:?Expected a release tag}"
: "${GITHUB_SHA:?Expected a release commit}"

root="$(git rev-parse --show-toplevel)"
version="$(node -p "require('./servers/language-server/package.json').version")"
if [[ "$GITHUB_REF_NAME" != "v$version" ]]; then
  echo "Release tag $GITHUB_REF_NAME does not match language server version $version" >&2
  exit 1
fi
node scripts/sync-zed-version.mjs --check
git fetch origin main
if ! git merge-base --is-ancestor "$GITHUB_SHA" origin/main; then
  echo "Release commit must be reachable from the main branch before submitting to Zed" >&2
  exit 1
fi

dir="$(mktemp -d)"
trap 'rm -rf "$dir"' EXIT
git clone --quiet --no-checkout https://github.com/zed-industries/extensions.git "$dir/registry"
cd "$dir/registry"
git checkout --quiet main
git remote add fork https://github.com/thedannywahl/extensions.git
branch="cssdoc-release-update"
entry="extensions/cssdoc-language-server"
upstream_sha="$(git ls-tree HEAD -- "$entry" | awk '{print $3}')"
if [[ -z "$upstream_sha" ]]; then
  echo "Zed registry entry is missing; the initial submission must be merged first" >&2
  exit 1
fi
node "$root/scripts/update-zed-registry.mjs" extensions.toml "$version"

check_not_newer() {
  local existing="$1"
  if ! git -C "$root" cat-file -e "$existing^{commit}" 2>/dev/null; then
    echo "Cannot verify registry commit $existing against release history" >&2
    exit 1
  fi
  if ! git -C "$root" merge-base --is-ancestor "$existing" "$GITHUB_SHA"; then
    echo "Registry already points to a newer or unrelated commit $existing; refusing to overwrite it" >&2
    exit 1
  fi
}
check_not_newer "$upstream_sha"

if [[ "$upstream_sha" == "$GITHUB_SHA" ]] && git diff --quiet -- extensions.toml; then
  echo "Zed registry already contains this release"
  exit 0
fi

remote_branch="$(git ls-remote --heads fork "refs/heads/$branch")"
old_branch_sha="${remote_branch%%[[:space:]]*}"
if [[ -n "$old_branch_sha" ]]; then
  git fetch --quiet fork "refs/heads/$branch"
  fork_sha="$(git ls-tree FETCH_HEAD -- "$entry" | awk '{print $3}')"
  if [[ -z "$fork_sha" ]]; then
    echo "Existing registry update branch is missing the extension submodule" >&2
    exit 1
  fi
  check_not_newer "$fork_sha"
fi

git checkout -B "$branch"
git update-index --cacheinfo "160000,$GITHUB_SHA,$entry"
git add extensions.toml
if [[ -n "$old_branch_sha" && "$(git write-tree)" == "$(git rev-parse "$old_branch_sha^{tree}")" ]]; then
  echo "Registry update branch already contains this release"
else
  git -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
    commit -m "Update cssdoc language server to $version"
  git push --force-with-lease="refs/heads/$branch:$old_branch_sha" fork "HEAD:refs/heads/$branch"
fi

pr="$(gh api "repos/zed-industries/extensions/pulls?state=open&head=thedannywahl:$branch&base=main" --jq '.[0].html_url // ""')"
if [[ -n "$pr" ]]; then
  gh pr edit "$pr" --repo zed-industries/extensions --title "Update cssdoc language server to $version" \
    --body "Updates cssdoc language server to [$version](https://github.com/thedannywahl/cssdoc/releases/tag/v$version)."
else
  gh pr create --repo zed-industries/extensions --base main --head "thedannywahl:$branch" \
    --title "Update cssdoc language server to $version" \
    --body "Updates cssdoc language server to [$version](https://github.com/thedannywahl/cssdoc/releases/tag/v$version)."
fi
