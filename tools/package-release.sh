#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
RELEASE_DIR="$ROOT_DIR/release"
DIST_DIR="$ROOT_DIR/dist"

if ! command -v npm >/dev/null 2>&1; then
  echo "[package-release] npm is required but was not found in PATH." >&2
  exit 1
fi

pushd "$ROOT_DIR" >/dev/null

npm install --no-audit --no-fund --prefer-offline
npm run build

mkdir -p "$RELEASE_DIR"

TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
ARCHIVE_NAME="startrail-release-${TIMESTAMP}.zip"
ARCHIVE_PATH="$RELEASE_DIR/$ARCHIVE_NAME"

if [ -d "$DIST_DIR" ]; then
  (cd "$DIST_DIR" && zip -r "$ARCHIVE_PATH" .)
  echo "[package-release] Created archive: $ARCHIVE_PATH"
else
  echo "[package-release] dist directory was not generated." >&2
  exit 1
fi

cat <<MSG

Release package ready!
Location: $ARCHIVE_PATH
Next steps:
  1. Copy the archive to a network-enabled machine.
  2. Extract and serve/upload the contents to the hosting platform of your choice (e.g., Vercel static hosting, GitHub Pages).
  3. Point DNS or share the hosting URL with stakeholders.
MSG

popd >/dev/null
