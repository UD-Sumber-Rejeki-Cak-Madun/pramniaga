#!/usr/bin/env bash
# Point frappe-bench/apps/pramniaga at a deliverable worktree so bench runs it.
#
# First activation converts the current apps/pramniaga checkout into:
#   <development>/worktrees/pramniaga--main
# and replaces apps/pramniaga with a symlink.
#
# Usage:
#   scripts/use-worktree.sh <name>
#   scripts/use-worktree.sh main          # return to the primary checkout
#
# After switching:
#   bench --site <site> clear-cache
#   bench --site <site> migrate           # only if DocTypes/patches changed
#   (re)start yarn dev from apps/pramniaga
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="${1:?usage: use-worktree.sh <name>}"

APPS_DIR="$(cd "$ROOT/.." && pwd)"
BENCH_ROOT="$(cd "$APPS_DIR/.." && pwd)"
DEV_ROOT="$(cd "$BENCH_ROOT/.." && pwd)"
WORKTREES_DIR="${PRAMNIAGA_WORKTREES_DIR:-$DEV_ROOT/worktrees}"
ACTIVE="$APPS_DIR/pramniaga"
TARGET="$WORKTREES_DIR/pramniaga--${NAME}"
MAIN_WT="$WORKTREES_DIR/pramniaga--main"

if [[ ! -e "$TARGET" ]]; then
	echo "error: worktree not found: $TARGET" >&2
	echo "create it with: scripts/new-worktree.sh ${NAME}" >&2
	exit 1
fi

resolve() {
	# Prefer GNU readlink -f; fall back for busybox/macOS.
	if readlink -f "$1" >/dev/null 2>&1; then
		readlink -f "$1"
	else
		python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$1"
	fi
}

ensure_symlink_layout() {
	if [[ -L "$ACTIVE" ]]; then
		return 0
	fi

	if [[ ! -d "$ACTIVE/.git" && ! -f "$ACTIVE/.git" ]]; then
		echo "error: $ACTIVE is not a git checkout" >&2
		exit 1
	fi

	echo "Converting apps/pramniaga to symlink layout (one-time)..."
	mkdir -p "$WORKTREES_DIR"

	if [[ -e "$MAIN_WT" ]]; then
		echo "error: $MAIN_WT already exists; resolve manually before continuing" >&2
		exit 1
	fi

	# Move the current (usually main) worktree out of apps/, then symlink back.
	git -C "$ACTIVE" worktree move "$ACTIVE" "$MAIN_WT"
	ln -sfn "$MAIN_WT" "$ACTIVE"
	echo "Primary checkout moved to: $MAIN_WT"
}

ensure_symlink_layout

CURRENT="$(resolve "$ACTIVE")"
NEXT="$(resolve "$TARGET")"

if [[ "$CURRENT" == "$NEXT" ]]; then
	echo "Already active: $NAME -> $NEXT"
	exit 0
fi

ln -sfn "$NEXT" "$ACTIVE"
echo "Activated: $NAME"
echo "  apps/pramniaga -> $NEXT"
echo
echo "Next (from bench root), if needed:"
echo "  bench --site development.localhost clear-cache"
echo "  bench --site development.localhost migrate"
echo "  cd apps/pramniaga && yarn dev"
