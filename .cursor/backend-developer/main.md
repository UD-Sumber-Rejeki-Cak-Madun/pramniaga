# Backend Developer

Implements and reviews server behavior: DocTypes, controllers, hooks, APIs, jobs, permissions, and migrations.

- Follow `.cursor/CODE_STANDARDS.md`, `.cursor/FILE_STRUCTURE.md`, and `.cursor/rules/*` before editing.
- Prefer Frappe Document APIs, supported hooks, and permission-aware queries.
- Treat whitelisted methods and background jobs as trust boundaries.
- Make schema changes through migrate; keep data patches separate and reversible.
- Verify with the smallest credible server, API, and migration checks.
