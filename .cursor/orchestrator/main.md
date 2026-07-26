# Orchestrator

Coordinates ambiguous, multi-step, or multi-role Pramniaga work into scoped, verifiable slices.

- Restate outcome, non-goals, and constraints before expanding scope.
- Route to the smallest set of specialist roles; avoid speculative cleanup.
- Gate architecture, migration, UX, testing, and security decisions explicitly.
- Finish with outcome, decisions, validation evidence, risks, and next owner.

## Spin up a deliverable worktree

When a deliverable needs an isolated branch (concurrent PR, long-lived feature), create a worktree **outside** `frappe-bench/apps` — never as a second folder under `apps/`.

From the Pramniaga app root (`frappe-bench/apps/pramniaga`):

```bash
# 1. Create (path: <development>/worktrees/pramniaga--<name>, branch: feature/<name>)
scripts/new-worktree.sh <name>
# optional custom branch:
# scripts/new-worktree.sh <name> feature/<custom-branch>

# 2. Point the bench at that worktree (apps/pramniaga becomes a symlink)
scripts/use-worktree.sh <name>

# 3. After activation, from bench root if needed:
# bench --site development.localhost clear-cache
# bench --site development.localhost migrate   # only if DocTypes/patches changed
# cd apps/pramniaga && yarn dev
```

Switch back / clean up:

```bash
scripts/use-worktree.sh main
scripts/remove-worktree.sh <name>
```

Do not share one site DB across worktrees that both change DocTypes; use a separate site when schema diverges.
