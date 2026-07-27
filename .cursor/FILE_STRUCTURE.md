# Pramniaga File Structure

Map of hand-written source. Follow [CODE_STANDARDS.md](CODE_STANDARDS.md) when adding files.

Last updated: 2026-07-26  
Author: Pramniaga

## App root

```
pramniaga/                 # Frappe Python package
  api/                     # Whitelisted methods + shared helpers
  www/                     # SPA shell page context
  tests/                   # Integration tests
  public/frontend/         # Built SPA assets (generated — do not hand-edit)
  hooks.py
frontend/                  # Vite + React SPA source
  src/
  proxyOptions.ts
  vite.config.ts
.cursor/                   # Standards, structure, Cursor rules, role notes
scripts/                   # Worktree helpers
```

## Backend API (`pramniaga/api/`)

```
api/
  common.py                # Capabilities, login gates, parse_json
  permission.py            # Apps-screen hook (path pinned in hooks.py)
  auth.py                  # login, logout, session, Google OAuth URL
  apps.py                  # list_apps (Shell tiles)
  dashboard.py             # revenue_summary, daily_activities, upcoming_events
  inventory/               # Facade package — method IDs stay pramniaga.api.inventory.*
    __init__.py            # Re-exports all whitelists
    _helpers.py            # Shared constants / company / safe payload helpers
    items.py
    warehouses.py
    stock.py
    moves.py
    adjustments.py
    overview.py
```

When splitting another domain, copy the `inventory/` facade pattern.

## Frontend (`frontend/src/`)

```
src/
  main.tsx                 # Entry
  App.tsx                  # Router + auth gate
  index.css                # Tokens (--brand, --accent, …) + rare custom classes
  lib/
    api.ts                 # Method registry + useApiCall (JSDoc gold standard)
    auth.tsx
    session.ts
    types.ts
    utils.ts
  components/
    ui/                    # Primitives + barrel index.ts → import @/components/ui
    layout/                # Shell, Logo
    dashboard/             # Home dashboard cards
    inventory/             # Product*, InventoryActionCard, receipt compose helpers
  pages/
    Login.tsx
    HomeDashboard.tsx
    login/                 # AuthForms, BrandStage, formStyles
    inventory/             # Overview, products, stock, moves, adjustments, …
```

## Cursor guidance (`.cursor/`)

```
.cursor/
  CODE_STANDARDS.md        # Documentation + naming + security rules
  FILE_STRUCTURE.md        # This file
  rules/
    code-standards.mdc     # alwaysApply
    python-api.mdc         # globs: pramniaga/**/*.py
    frontend-react.mdc     # globs: frontend/**/*.{ts,tsx,css}
  frontend-developer/main.md
  backend-developer/main.md
  …
```

## Import / method path stability

| Concern | Stable path |
| --- | --- |
| Inventory whitelists | `pramniaga.api.inventory.<fn>` via package `__init__.py` |
| UI primitives | `@/components/ui` via `components/ui/index.ts` |
| App chrome | `@/components/layout/Shell`, `Logo` |
| Method strings in SPA | Only in `lib/api.ts` |
