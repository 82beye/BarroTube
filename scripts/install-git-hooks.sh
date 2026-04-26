#!/usr/bin/env bash
#
# install-git-hooks.sh — One-time onboarding helper for new collaborators.
#
# Points git at the repo-tracked `.githooks/` directory so the agent-sync
# pre-commit hook runs automatically on every commit.
#
# Usage:
#   bash scripts/install-git-hooks.sh
#
# Verify:
#   git config --get core.hooksPath   # should print `.githooks`
#
# Why this is needed:
#   `core.hooksPath` is local config, not propagated by `git clone`. Each
#   collaborator runs this once. Hook contents (`.githooks/pre-commit`) are
#   tracked in git, so updates propagate normally via pull.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [ -z "$REPO_ROOT" ]; then
  echo "ERROR: must be run from inside a git repository." >&2
  exit 1
fi

cd "$REPO_ROOT"

if [ ! -d ".githooks" ]; then
  echo "ERROR: .githooks/ not found in repo root: $REPO_ROOT" >&2
  exit 1
fi

# Ensure all hooks under .githooks/ are executable (git silently ignores non-x hooks).
chmod +x .githooks/* 2>/dev/null || true

git config core.hooksPath .githooks

echo "[install-git-hooks] core.hooksPath = $(git config --get core.hooksPath)"
echo "[install-git-hooks] active hooks:"
ls -1 .githooks/ | sed 's/^/  - /'
echo ""
echo "Done. Next .claude/agents/ commit will auto-run sync-agents.js."
