#!/usr/bin/env bash
# Remove a Pramniaga deliverable worktree.
#
# Refuses to remove the worktree currently linked at apps/pramniaga.
#
# Usage:
#   scripts/remove-worktree.sh <name>
#   scripts/remove-worktree.sh <name> --force   # git worktree remove --force
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=worktree-common.sh
source "$SCRIPT_DIR/worktree-common.sh"

ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NAME="${1:?usage: remove-worktree.sh <name> [--force]}"
FORCE="${2:-}"

BENCH_ROOT="$(find_bench_root "$ROOT")" || {
	echo "error: could not locate frappe-bench from $ROOT" >&2
	exit 1
}
DEV_ROOT="$(cd "$BENCH_ROOT/.." && pwd)"
APPS_DIR="$BENCH_ROOT/apps"
WORKTREES_DIR="${PRAMNIAGA_WORKTREES_DIR:-$DEV_ROOT/worktrees}"
ACTIVE="$APPS_DIR/pramniaga"
DEST="$WORKTREES_DIR/pramniaga--${NAME}"

if [[ "$NAME" == "main" ]]; then
	echo "error: refusing to remove pramniaga--main; switch away and clean up manually if needed" >&2
	exit 1
fi

if [[ ! -e "$DEST" ]]; then
	echo "error: worktree not found: $DEST" >&2
	exit 1
fi

resolve() {
	if readlink -f "$1" >/dev/null 2>&1; then
		readlink -f "$1"
	else
		python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$1"
	fi
}

if [[ -L "$ACTIVE" ]]; then
	CURRENT="$(resolve "$ACTIVE")"
	TARGET="$(resolve "$DEST")"
	if [[ "$CURRENT" == "$TARGET" ]]; then
		echo "error: $NAME is currently active at apps/pramniaga" >&2
		echo "switch first: scripts/use-worktree.sh main" >&2
		exit 1
	fi
fi

# Prefer running remove from any remaining checkout in this repo.
GIT_DIR="$ROOT"
if [[ -L "$ACTIVE" ]]; then
	GIT_DIR="$(resolve "$ACTIVE")"
fi

if [[ "$FORCE" == "--force" ]]; then
	git -C "$GIT_DIR" worktree remove --force "$DEST"
else
	git -C "$GIT_DIR" worktree remove "$DEST"
fi

echo "Removed worktree: $DEST"
git -C "$GIT_DIR" worktree list
