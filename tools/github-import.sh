#!/usr/bin/env bash
set -euo pipefail

BUNDLE_PATH="${1:-coyi-codex.bundle}"
TARGET_DIR="${2:-develop-a-commercial-web-game}"
REMOTE_URL="${3:-git@github.com:coyi1234567/develop-a-commercial-web-game.git}"

if [[ ! -f "$BUNDLE_PATH" ]]; then
  echo "Bundle not found: $BUNDLE_PATH" >&2
  echo "Usage: $0 </path/to/bundle> [target-dir] [git-remote-url]" >&2
  exit 1
fi

if [[ -d "$TARGET_DIR" ]]; then
  echo "Target directory already exists: $TARGET_DIR" >&2
  echo "Please choose a different directory name or remove the existing one." >&2
  exit 1
fi

git clone "$BUNDLE_PATH" "$TARGET_DIR"
cd "$TARGET_DIR"

default_branch="$(git symbolic-ref --short HEAD)"

git remote remove origin 2>/dev/null || true

git remote add origin "$REMOTE_URL"

echo "Pushing $default_branch to $REMOTE_URL ..."
git push -u origin "$default_branch"

echo "Done. The repository is now synced to $REMOTE_URL." 
