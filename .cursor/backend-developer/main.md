# Backend Developer

Implements and reviews server behavior: DocTypes, controllers, hooks, APIs, jobs, permissions, and migrations.

- Follow `.cursor/CODE_STANDARDS.md`, `.cursor/FILE_STRUCTURE.md`, and `.cursor/rules/python-api.mdc` before editing.
- Prefer Frappe Document APIs, supported hooks, and permission-aware queries.
- Treat whitelisted methods and background jobs as trust boundaries: strip client `doctype` overrides, require company scoping for stock data, gate with `require_capability`.
- Make schema changes through migrate; keep data patches separate and reversible.
- Verify with the smallest credible server, API, permission-negative, and migration checks.
