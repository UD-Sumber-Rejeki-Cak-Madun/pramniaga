# Pramniaga File Structure

Map of hand-written source. Follow [CODE_STANDARDS.md](CODE_STANDARDS.md) when adding files.

Last updated: 2026-07-25  
Author: Pramniaga

## App root (`frappe-bench/apps/pramniaga/`)

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
  common.py                # Capabilities, login gates, parse_json, linked employee
  permission.py            # Apps-screen hook (path pinned in hooks.py)
  auth.py                  # login, logout, session, Google OAuth URL
  apps.py                  # list_apps (capability-filtered Shell tiles)
  dashboard.py             # revenue_summary, daily_activities, upcoming_events
  inventory/               # Facade — method IDs stay pramniaga.api.inventory.*
    __init__.py
    _helpers.py
    items.py
    warehouses.py
    stock.py
    moves.py
    adjustments.py
    overview.py
  hr/                      # Facade — method IDs stay pramniaga.api.hr.*
    __init__.py
    _helpers.py
    employees.py
    overview.py
```

When splitting another domain, copy the `inventory/` / `hr/` facade pattern.

## Frontend (`frontend/src/`)

```
src/
  main.tsx
  App.tsx
  index.css
  lib/
    api.ts
    auth.tsx
    session.ts
    types.ts
    utils.ts
    inventoryNav.ts
    hrNav.ts
  components/
    ui/                    # Primitives + barrel (includes PermissionDenied)
    layout/                # Shell, Logo
    dashboard/
    hr/                    # HrModuleStub
  pages/
    Login.tsx
    HomeDashboard.tsx
    login/
    inventory/
    hr/                    # Overview, Profile, People, My*/Manage* stubs
```

## Cursor guidance (`.cursor/`)

```
.cursor/
  CODE_STANDARDS.md
  FILE_STRUCTURE.md
  rules/
    code-standards.mdc
    python-api.mdc
    frontend-react.mdc
  orchestrator/main.md
  backend-developer/main.md
  frontend-developer/main.md
  software-architect/main.md
  test-engineer/main.md
  red-team/main.md
```

## Import / method path stability

| Concern | Stable path |
| --- | --- |
| Inventory whitelists | `pramniaga.api.inventory.<fn>` via package `__init__.py` |
| HR whitelists | `pramniaga.api.hr.<fn>` via package `__init__.py` |
| UI primitives | `@/components/ui` via `components/ui/index.ts` |
| App chrome | `@/components/layout/Shell`, `Logo` |
| Method strings in SPA | Only in `lib/api.ts` |
