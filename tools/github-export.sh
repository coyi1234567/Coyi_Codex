#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${PROJECT_ROOT}/sync-output"
DEFAULT_BUNDLE_NAME="coyi-codex.bundle"
BUNDLE_NAME="${1:-$DEFAULT_BUNDLE_NAME}"
BUNDLE_PATH="${OUTPUT_DIR}/${BUNDLE_NAME}"

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
Next steps (on a network-enabled machine):
  1. Copy the bundle file to the target machine.
  2. Run: git clone "${BUNDLE_NAME}" develop-a-commercial-web-game
  3. cd develop-a-commercial-web-game
  4. git remote add origin git@github.com:coyi1234567/develop-a-commercial-web-game.git
  5. git push -u origin main (or whichever branch you want to publish)
USAGE
