#!/usr/bin/env bash
# Shared helpers for Pramniaga worktree scripts.
# shellcheck shell=bash

# Resolve frappe-bench whether this checkout is apps/pramniaga or a linked worktree.
find_bench_root() {
	local dir="$1"
	while true; do
		if [[ -f "$dir/sites/common_site_config.json" ]]; then
			printf '%s\n' "$dir"
			return 0
		fi
		if [[ -f "$dir/frappe-bench/sites/common_site_config.json" ]]; then
			printf '%s\n' "$dir/frappe-bench"
			return 0
		fi
		local parent
		parent="$(dirname "$dir")"
		if [[ "$parent" == "$dir" ]]; then
			return 1
		fi
		dir="$parent"
	done
}

# Vite (and other tooling) often resolves ../../../sites from
# development/worktrees/<app>--*/frontend → development/sites.
# Point that at the real bench sites directory.
ensure_sites_symlink() {
	local bench_root="$1"
	local dev_root
	dev_root="$(cd "$bench_root/.." && pwd)"
	local link_path="$dev_root/sites"
	local target="$bench_root/sites"

	if [[ ! -d "$target" ]]; then
		echo "error: bench sites directory missing: $target" >&2
		return 1
	fi

	if [[ -L "$link_path" ]]; then
		ln -sfn "$target" "$link_path"
		echo "Sites symlink ok: $link_path -> $target"
		return 0
	fi

	if [[ -e "$link_path" ]]; then
		echo "warning: $link_path exists and is not a symlink; leave it unchanged" >&2
		return 0
	fi

	ln -sfn "$target" "$link_path"
	echo "Created sites symlink: $link_path -> $target"
}
