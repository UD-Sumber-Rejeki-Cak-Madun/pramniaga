#!/usr/bin/env bash
# Create a linked git worktree for a Pramniaga deliverable.
#
# Worktrees live OUTSIDE frappe-bench/apps (bench must see only one
# apps/pramniaga). Runtime activation is scripts/use-worktree.sh.
#
# Usage:
#   scripts/new-worktree.sh <name> [branch]
#
# Examples:
#   scripts/new-worktree.sh billing
#   scripts/new-worktree.sh inventory feature/inventory-v2
#
# Resulting path:
#   <development>/worktrees/pramniaga--<name>
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="${1:?usage: new-worktree.sh <name> [branch]}"
BRANCH="${2:-feature/${NAME}}"

APPS_DIR="$(cd "$ROOT/.." && pwd)"
BENCH_ROOT="$(cd "$APPS_DIR/.." && pwd)"
DEV_ROOT="$(cd "$BENCH_ROOT/.." && pwd)"
WORKTREES_DIR="${PRAMNIAGA_WORKTREES_DIR:-$DEV_ROOT/worktrees}"
DEST="$WORKTREES_DIR/pramniaga--${NAME}"

if [[ "$DEST" == "$ROOT" || "$DEST" == "$APPS_DIR"/* ]]; then
	echo "error: refusing to create a worktree under frappe-bench/apps" >&2
	exit 1
fi

if [[ -e "$DEST" ]]; then
	echo "error: destination already exists: $DEST" >&2
	exit 1
fi

mkdir -p "$WORKTREES_DIR"

echo "Creating worktree"
echo "  name:   $NAME"
echo "  branch: $BRANCH"
echo "  path:   $DEST"

if git -C "$ROOT" show-ref --verify --quiet "refs/heads/${BRANCH}"; then
	git -C "$ROOT" worktree add "$DEST" "$BRANCH"
elif git -C "$ROOT" show-ref --verify --quiet "refs/remotes/origin/${BRANCH}"; then
	git -C "$ROOT" worktree add -b "$BRANCH" "$DEST" "origin/${BRANCH}"
else
	git -C "$ROOT" worktree add -b "$BRANCH" "$DEST"
fi

# Optional local files (present in some setups; skipped if missing)
if [[ -f "$ROOT/.env" ]]; then
	cp "$ROOT/.env" "$DEST/.env"
fi
if [[ -d "$ROOT/certs" ]]; then
	cp -R "$ROOT/certs" "$DEST/"
fi

if [[ -f "$DEST/frontend/package.json" ]]; then
	(cd "$DEST/frontend" && yarn install)
elif [[ -f "$DEST/package.json" ]]; then
	(cd "$DEST" && yarn install)
fi

echo
echo "Worktree ready: $DEST"
echo "This folder is for editing only until you activate it for the bench:"
echo "  scripts/use-worktree.sh ${NAME}"
echo
echo "Notes:"
echo "  - Do not place worktrees under frappe-bench/apps"
echo "  - Shared site DB: migrate only when this branch owns DocType/schema changes"
echo "  - Restart yarn dev after activation if the frontend is running"

if command -v cursor >/dev/null 2>&1; then
	cursor "$DEST"
elif command -v code >/dev/null 2>&1; then
	code "$DEST"
fi
