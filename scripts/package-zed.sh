#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
node scripts/sync-zed-version.mjs --check
version="$(node -p "require('./servers/language-server/package.json').version")"
if [[ -n "${GITHUB_REF_NAME:-}" && "$GITHUB_REF_NAME" != "v$version" ]]; then
  echo "Release tag $GITHUB_REF_NAME does not match language server version $version" >&2
  exit 1
fi
cargo build --locked --release --target wasm32-wasip2 --manifest-path servers/zed/Cargo.toml

dir="$(mktemp -d)"
trap 'rm -rf "$dir"' EXIT
cp servers/zed/extension.toml "$dir/"
cp servers/zed/target/wasm32-wasip2/release/cssdoc_zed.wasm "$dir/extension.wasm"
cp servers/zed/LICENSE "$dir/"
cp servers/zed/INSTALL.md "$dir/README.md"
mkdir -p dist
tar -czf "dist/cssdoc-zed-$version.tar.gz" -C "$dir" extension.toml extension.wasm LICENSE README.md
echo "Created dist/cssdoc-zed-$version.tar.gz"
