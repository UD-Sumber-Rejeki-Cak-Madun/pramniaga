# Pramniaga Code Standards

Source of truth for documentation, naming, file layout, and reuse.
See also [FILE_STRUCTURE.md](FILE_STRUCTURE.md). Cursor rules under `.cursor/rules/` enforce these while editing.

## Goals

- Keep the codebase readable as domains grow.
- Prefer small, purpose-named modules over god-files.
- Document contracts (`@param` / `@returns` or Args / Returns) so debugging is easy later.
- Preserve public Frappe method paths (`pramniaga.api.<module>.<fn>`) when splitting.
- Prefer names and UI labels that match real data meaning (no “clever” or misleading copy).

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

## Naming (variables, types, CSS)

### Code identifiers

| Layer | Convention | Examples |
| --- | --- | --- |
| Python modules / functions | `snake_case`; private `_name` | `items_list`, `_company_or_throw` |
| Python capabilities | `can_<verb>_<noun>` | `can_browse_stock`, `can_submit_moves` |
| TS/TSX components | `PascalCase` | `PageHeader`, `MoveFormPage` |
| TS functions / hooks / vars | `camelCase`, intent-first | `defaultCompany`, `overviewCounts` |
| Boolean vars | `is` / `has` / `can` / `show` | `isLoading`, `canManageItems` |
| Collections | plural nouns | `warehouses`, `draftReceipts` |
| API method strings | only in `lib/api.ts` | `API.inventory.itemsList` |

Avoid opaque names (`data2`, `tmp`, `val`, `x`, `obj`) outside tiny loop indexes.

### CSS / Tailwind classes

- Prefer **design tokens** from `index.css` (`bg-brand`, `text-ink-muted`, `border-line`) over one-off hex (`bg-[#F3F3F3]`).
- Custom CSS classes are **domain + role**: `login-brand-mesh`, `font-display` — not `box1`, `style2`.
- Exported style constants: suffix `Class` and name by role (`pillInputClass`, `labelClass`), not by color.
- Do not invent parallel class systems; extend `components/ui` variants when the pattern repeats twice.

### UI labels must match data

If a value is a **total count**, label it “Total” / “Active”, not “To process”.  
If a value is **draft docstatus=0**, label it “Draft” / “To process”.  
Mismatch between label and API semantics is a product bug.

## File management

See [FILE_STRUCTURE.md](FILE_STRUCTURE.md) for the live tree.

- Backend: one domain file until ~300 lines or a 4th unrelated concern, then `api/<domain>/` + facade `__init__.py`.
- Frontend: `components/ui` (barrel), `components/layout`, `components/<domain>`, `pages/<domain>`, `lib`.
- Shared server gates → `api/common.py`. Do not move `permission.py` without updating `hooks.py`.

## Security & multi-company (sustainability)

Whitelisted methods are trust boundaries:

- Never build docs with `{"doctype": "X", **payload}` if `payload` can contain `doctype`. Strip or reject client `doctype` / `name` overrides; set DocType in server code only.
- Require a resolved company for stock lists/counts when the site is multi-company; do not silently return cross-company rows.
- Capability checks (`require_capability`) gate every mutating whitelist; add a negative permission test when introducing a new gate.
- Auth: treat boot `window.boot.session` as a hint; keep protected routes blocked until session refresh finishes (`loading` true until verified).

## Reusable components

- New shared control → `components/ui`, export from barrel.
- Domain widget → `components/<domain>/`.
- Server: reuse `require_login` / `require_capability` / `parse_json`.

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
# BAD — client can override DocType
doc = frappe.get_doc({"doctype": "Item", **payload})

# GOOD — server owns DocType; strip dangerous keys
payload = {k: v for k, v in parse_json(data).items() if k not in ("doctype", "name")}
doc = frappe.get_doc({"doctype": "Item", **payload})
```

```python
# BAD — change public path when splitting
# pramniaga.api.inventory.items.items_list

# GOOD — facade re-export keeps pramniaga.api.inventory.items_list
```

```tsx
// BAD — every card says "To process" but products/warehouses are totals
<p>To process</p>

// GOOD — label follows the metric
<p>{isDraftQueue ? 'To process' : 'Active'}</p>
```

## Tooling

pre-commit: ruff, eslint, prettier. After SPA structural moves, `yarn build` so `public/frontend` stays in sync.
