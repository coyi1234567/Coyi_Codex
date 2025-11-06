#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${PROJECT_ROOT}/sync-output"
BUNDLE_PATH="${OUTPUT_DIR}/coyi-codex.bundle"

cd "$PROJECT_ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Repository has uncommitted changes. Please commit or stash before exporting." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

git bundle create "$BUNDLE_PATH" HEAD

echo "Bundle created at: $BUNDLE_PATH"
echo
cat <<'USAGE'
Next steps:
  1. Download the bundle file to a network-enabled machine.
  2. Run: git clone coyi-codex.bundle coyi-codex
  3. cd coyi-codex
  4. git remote add origin <git@github.com:coyi1234567/<repo>.git>
  5. git push -u origin main (or the current branch name)
USAGE
