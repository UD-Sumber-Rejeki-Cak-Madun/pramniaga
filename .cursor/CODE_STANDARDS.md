# Pramniaga Code Standards

Source of truth for documentation, file layout, and reuse.
See also [FILE_STRUCTURE.md](FILE_STRUCTURE.md). Cursor rules under `.cursor/rules/` enforce these while editing.

## Goals

- Keep the codebase readable as domains grow.
- Prefer small, purpose-named modules over god-files.
- Document contracts (`@param` / `@returns` or Args / Returns) so debugging is easy later.
- Preserve public Frappe method paths (`pramniaga.api.<module>.<fn>`) when splitting.

## File headers

Every hand-written `.py`, `.ts`, and `.tsx` file starts with:

```
Purpose: one sentence.
Exports: main public symbols (optional if obvious from filename).

Last updated: YYYY-MM-DD
Author: Pramniaga
```

**Heavy files** (>~200 lines or multi-concern): also add a **Contents** outline.

**TS/TSX gold standard:** [`frontend/src/lib/api.ts`](../frontend/src/lib/api.ts)

Skip headers on generated assets under `pramniaga/public/frontend/`.

## Function / component documentation

Every **public** export needs a named docstring. Trivial private helpers may stay one-line.

### TypeScript / TSX (JSDoc)

```ts
/**
 * unwrapMessage - Unwrap the message from the Frappe response.
 *
 * @param data - The Frappe response.
 * @returns The message.
 */
export function unwrapMessage<T>(data: unknown): T { ... }
```

Components use the same shape (`Name - description`, `@param`, `@returns`).

### Python

```python
def items_list(search: str | None = None, limit: int = 50, start: int = 0):
	"""
	items_list - List enabled Items with optional search.

	Args:
		search: Optional item_code LIKE filter.
		limit: Page size.
		start: Offset.

	Returns:
		List of Item dicts.
	"""
```

### Step comments

Numbered intent comments only for multi-step workflows (e.g. Stock Entry create).  
Do **not** narrate the next line (`// Use the useFrappePostCall hook...`).

## File management

See [FILE_STRUCTURE.md](FILE_STRUCTURE.md) for the live tree.

- Backend: one domain file until ~300 lines or a 4th unrelated concern, then `api/<domain>/` + facade `__init__.py`.
- Frontend: `components/ui` (barrel), `components/layout`, `components/<domain>`, `pages/<domain>`, `lib`.
- Shared server gates → `api/common.py`. Do not move `permission.py` without updating `hooks.py`.

## Reusable components

- New shared control → `components/ui`, export from barrel.
- Domain widget → `components/<domain>/`.
- Server: reuse `require_login` / `require_capability` / `parse_json`.

## Naming

- Python: `snake_case`; private `_name`.
- TypeScript: `PascalCase` components; `camelCase` functions/hooks.
- Whitelist method strings live in `frontend/src/lib/api.ts` (plus tests/hooks/www).

## What not to document

- Generated `public/frontend/assets/*`
- Comments that only repeat the next line of code
- Pure formatting (ruff/eslint/prettier)

## Good / Bad

```ts
// BAD — file header only, no function docs; narrating inline comments
export function useApiCall(...) {
  // Use the useFrappePostCall hook to call the Frappe method.
  ...
}

// GOOD — see api.ts
/**
 * useApiCall - A custom hook to call Frappe methods.
 *
 * @param method - The Frappe method to call.
 * @returns Object with call, loading, error, result, reset, isCompleted.
 */
```

```python
# BAD — change public path when splitting
# pramniaga.api.inventory.items.items_list

# GOOD — facade re-export keeps pramniaga.api.inventory.items_list
```

## Tooling

pre-commit: ruff, eslint, prettier. After SPA structural moves, `yarn build` so `public/frontend` stays in sync.
