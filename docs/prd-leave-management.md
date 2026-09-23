# PRD — Leave Management (My Leave + Leave Approvals)

| Field      | Value                                              |
|------------|----------------------------------------------------|
| Status     | Draft — review together before implementation      |
| Branch     | `feature/HR`                                       |
| Author     | Pax                                                |
| Date       | 2026-09-23                                         |
| Replaces   | `frontend/src/pages/hr/MyLeave.tsx` stub, `frontend/src/pages/hr/ManageLeave.tsx` stub |

## 1. Summary

Implement the two stubbed HR pages so employees can request leave and track their
applications (**My Leave**, ESS), and so managers/HR can review, approve, or reject
open applications (**Leave Approvals**). Both ride on the installed HRMS app's
`Leave Application` DocType — no new DocTypes, no migrations. This is the natural
next slice of the HR module: the overview API already returns `my_leave_open` and
`leave_approvals_open`, and both pages already exist as capability-gated stubs in
the nav.

## 2. Background & Context

The `feature/HR` branch (commit `79a4c74`) shipped the HR shell with:

- Overview dashboard with role-aware count cards (`pramniaga.api.hr.overview_counts`)
- Employee directory (`employee_me`, `employees_list`) with identity-only fields
- Self-service Profile
- Capability model in `pramniaga/api/common.py` (`can_use_hr`, `can_self_service`,
  `can_approve_leave`, `can_view_employees`, `can_manage_attendance`, …)
- Honest stubs behind `can_self_service` / `can_approve_leave` gates for
  leave, attendance, payslips, payroll

Six of the nine HR nav entries are stubs. Leave is chosen first because it is the
most-used day-to-day HR flow, it is well-scoped (two endpoints groups, two pages),
and it establishes the reusable approve/reject workflow pattern that later flows
(overtime, shift swaps) can copy.

## 3. Goals

1. Employees can view their leave balances, apply for leave, and track the status
   of their applications from `/hr/me/leave`.
2. Approvers can see a queue of open leave applications, inspect details, and
   approve or reject with remarks from `/hr/manage/leave`.
3. All access is capability-gated exactly as the existing matrix dictates; users
   can never see or act on another employee's leave data.
4. The implementation follows `CODE_STANDARDS.md` (file headers, JSDoc/docstrings,
   facade pattern, `api.ts` method registry) and ships with backend integration
   tests in the style of `pramniaga/tests/test_inventory_api.py`.

## 4. Non-Goals (explicit)

- Payroll / salary slips (ships last; called out as high-friction in existing code).
- Attendance check-in/out flows.
- New DocTypes or schema changes — HRMS `Leave Application`, `Leave Type`, and
  `Leave Allocation` are reused as-is.
- Email/push notifications for approvals (may be a fast follow-up; see §13).
- Multi-level / sequential approval chains — single decision step per application
  in this phase (HRMS supports more; we just don't expose it).
- Carry-forward / encashment management (read balances only).

## 5. Personas & Capability Gates

| Persona          | Capability            | Sees                                          |
|------------------|-----------------------|-----------------------------------------------|
| Employee (ESS)   | `can_self_service`    | Own balances, own applications, own detail   |
| Leave Approver   | `can_approve_leave`   | Open-application queue, applicant details     |
| HR User/Manager  | `can_approve_leave`   | Same as approver (queue scoped to company)    |
| Anyone else      | —                     | `PermissionDenied` via existing `HrModuleStub` gate |

Existing capability derivation is unchanged (`common.py`):
`can_approve_leave` = roles {Leave Approver, HR User, HR Manager} or System Manager.
Note: `can_self_service` requires a linked Employee (`user_id` match).

## 6. Functional Requirements

### 6.1 My Leave — `/hr/me/leave` (ESS)

| ID     | Requirement |
|--------|-------------|
| FR-1.1 | List the current user's leave applications, newest first, paginated (default 20/page). Each row: leave type, date range, days, status badge, submitted date. |
| FR-1.2 | Filter the list by status: All / Open / Approved / Rejected / Cancelled. |
| FR-1.3 | Show leave balances per leave type: allocated, used, remaining (from HRMS `Leave Allocation` for the current leave period). |
| FR-1.4 | "Apply for leave" opens a form: leave type (dropdown of active types), from date, to date, reason/description (required), optional half-day toggle. Show a live day-count estimate before submit. |
| FR-1.5 | On submit, create the `Leave Application` with `docstatus=1` (submitted) so it enters the approval queue immediately. Validate: from ≤ to, dates within an open leave period, requested days ≤ remaining balance, no overlapping open/approved application for the same employee. |
| FR-1.6 | A user may cancel their own application while it is still Open (sets status to Cancelled). Approved/rejected applications cannot be cancelled by ESS. |
| FR-1.7 | Application detail view: type, dates, days, status timeline, approver remarks (if any). |
| FR-1.8 | If HRMS is not installed, the page shows the same honest empty state pattern as today (`hrms_available` from `overview_counts`), not a broken page. |
| FR-1.9 | If the session user has no linked Employee, show the existing "ask an administrator" guidance instead of the list. |

### 6.2 Leave Approvals — `/hr/manage/leave` (Approvers)

| ID     | Requirement |
|--------|-------------|
| FR-2.1 | Queue of open leave applications (`status=Open`, `docstatus=1`), newest first, paginated. Each row: applicant name, department, leave type, date range, days, days-until-start indicator. |
| FR-2.2 | Scope: HR User / HR Manager / System Manager see all open applications in their default company. A pure `Leave Approver` (no HR role) sees only applications where they are the designated `leave_approver`. |
| FR-2.3 | Filters: leave type, department, date range. Search by applicant name. |
| FR-2.4 | Detail drawer/page: applicant, type, dates, days, reason, remaining balance of that type, any overlapping team leave (informational), approver history if re-submitted. |
| FR-2.5 | Approve action: single click + optional remark → `Leave Application` approved per HRMS workflow (sets `status=Approved`). |
| FR-2.6 | Reject action: requires a remark → sets `status=Rejected`. |
| FR-2.7 | An application disappears from the queue immediately after decision (optimistic UI with rollback on error). |
| FR-2.8 | Approvers cannot approve their own applications (blocked server-side, not just hidden). |
| FR-2.9 | Decision audit: every approve/reject records who decided and when (HRMS comment/version trail suffices; no separate log table). |

### 6.3 Shared / Cross-cutting

| ID     | Requirement |
|--------|-------------|
| FR-3.1 | Overview cards `My leave` (`my_leave_open`) and `Leave approvals` (`leave_approvals_open`) now link to live pages — no count changes needed, they already exist. |
| FR-3.2 | Both pages reuse existing UI primitives (`DataTable`, `PageHeader`, `LoadingState`, `ErrorBanner`, `EmptyState`, `Badge`) and follow the Overview/People page patterns (motion, responsive grid). |
| FR-3.3 | All date inputs/outputs use the user's locale; dates are stored as ISO dates server-side. |

## 7. Proposed API Design

Backend lives in a new `pramniaga/api/hr/leave.py`, re-exported from
`pramniaga/api/hr/__init__.py` (facade pattern — public method paths stay
`pramniaga.api.hr.*`). Frontend paths registered in `frontend/src/lib/api.ts`
under `API.hr`.

| Method path | Args | Capability | Returns |
|-------------|------|------------|---------|
| `leave_types_list` | — | `can_use_hr` | Active leave types (name, is_paid, allow_half_day…) |
| `leave_balances` | `employee` (optional, defaults to linked) | `can_self_service` | Per-type: allocated, used, remaining, period |
| `leave_my_list` | `status?`, `limit`, `start` | `can_self_service` | Paginated own applications (identity + date/status fields only) |
| `leave_get` | `name` | `can_self_service` or `can_approve_leave` | Single application detail; server enforces ownership-or-approver visibility |
| `leave_apply` | `leave_type`, `from_date`, `to_date`, `description`, `half_day?` | `can_self_service` | Created application summary; throws `ValidationError` on rule violations |
| `leave_cancel` | `name` | `can_self_service` | Updated status; only own + Open |
| `leave_approvals_list` | `leave_type?`, `department?`, `from_date?`, `to_date?`, `search?`, `limit`, `start` | `can_approve_leave` | Paginated open applications, scoped per §6.2 FR-2.2 |
| `leave_decide` | `name`, `action` ("approve" \| "reject"), `remark?` | `can_approve_leave` | Updated status; remark required for reject; self-approval blocked |

Field exposure rule (mirrors employees.py): list/detail payloads carry
identity, dates, status, and balance fields only — never salary/bank/tax fields,
which `Leave Application` does not contain anyway.

## 8. Non-Functional Requirements

| ID      | Requirement |
|---------|-------------|
| NFR-1   | **Performance:** list endpoints paginate (max 100/page); queue loads in < 1s at 500 open applications on a normal bench. Use indexed filters (`status`, `docstatus`, `employee`) — no full-table scans. |
| NFR-2   | **Security:** every endpoint calls `require_login` + the capability gate first; `leave_get`/`leave_cancel`/`leave_decide` re-verify ownership or approver scope *after* fetching the doc (no trust in client-supplied identity). |
| NFR-3   | **Data integrity:** `leave_apply` validates inside a single transaction; overlapping-application check and balance check are atomic with the insert. Double-submit is idempotent (disable button + server-side overlap guard). |
| NFR-4   | **Availability coupling:** all endpoints call `require_hrms()` and fail with the standard honest message when HRMS is missing; frontend checks `hrms_available` before rendering lists. |
| NFR-5   | **Usability:** pages work on mobile widths (approvers often decide from phones); touch targets ≥ 40px; approve/reject reachable within two taps from the queue. |
| NFR-6   | **Accessibility:** form labels, error text tied to inputs, status badges not color-only (text labels). |
| NFR-7   | **Maintainability:** new code passes `oxlint` (frontend) and `ruff` (backend) if configured; file headers + named docstrings per `CODE_STANDARDS.md`; `FILE_STRUCTURE.md` updated with the new module. |
| NFR-8   | **Observability:** decision actions log to the Frappe comment/version trail; validation failures return typed messages the UI can display (no raw tracebacks to the client). |

## 9. Constraints

1. **HRMS dependency:** `Leave Application`, `Leave Type`, `Leave Allocation` must
   exist. If absent, endpoints throw via `require_hrms()`; UI degrades to the
   honest empty state. No feature-specific schema is added.
2. **Capability matrix is frozen:** reuse `get_capabilities()` / `require_capability()`
   from `api/common.py`; do not invent new gates for this feature.
3. **Frontend stack:** React 19 + Vite + `frappe-react-sdk` (`useApiCall`), Tailwind,
   existing `components/ui` barrel. New shared controls go in `components/ui`;
   leave-specific widgets go in `components/hr/`.
4. **Method-path stability:** public paths are `pramniaga.api.hr.leave_*`; if
   `leave.py` is ever split, keep the facade re-exports (per code standards).
5. **No generated assets hand-edited:** built files under `pramniaga/public/frontend/`
   are rebuilt via `yarn build`, never edited directly.
6. **Route stability:** `/hr/me/leave` and `/hr/manage/leave` already exist in
   `hrNav.ts` and `App.tsx` routing — this feature replaces stub components in
   place; no route changes.
7. **Localization posture:** initial copy in English (matches current HR pages);
   Indonesian leave-type names come from HRMS data, not hardcoded strings.

## 10. Testing Plan

Backend integration tests go in `pramniaga/tests/test_hr_leave_api.py`,
mirroring the fixtures/patterns in `test_inventory_api.py`
(login helpers, role assignment, capability assertions).

### 10.1 Backend test cases

| ID     | Case | Expectation |
|--------|------|-------------|
| T-1.1  | Guest calls `leave_my_list` | Permission denied |
| T-1.2  | Stock-only user (no HR caps) calls `leave_apply` | Permission denied |
| T-1.3  | ESS user lists own applications | Returns only their docs, paginated |
| T-1.4  | ESS user calls `leave_my_list` for another employee | Impossible by design (no employee arg) — assert no cross-employee leak via `leave_get` with another's `name` |
| T-1.5  | `leave_apply` with from_date > to_date | `ValidationError`, nothing created |
| T-1.6  | `leave_apply` exceeding remaining balance | `ValidationError`, nothing created |
| T-1.7  | `leave_apply` overlapping an existing Open application | `ValidationError` (idempotency / double-submit guard) |
| T-1.8  | `leave_apply` happy path | Doc created with `docstatus=1`, `status=Open`, correct `total_leave_days` |
| T-1.9  | `leave_cancel` on own Open application | Status → Cancelled |
| T-1.10 | `leave_cancel` on another employee's application | Permission denied |
| T-1.11 | `leave_cancel` on an Approved application | `ValidationError` |
| T-1.12 | Approver lists queue | Only `Open` + `docstatus=1`, scoped to company/designated approver per FR-2.2 |
| T-1.13 | Approver approves | Status → Approved, decision recorded |
| T-1.14 | Approver rejects without remark | `ValidationError` (remark required) |
| T-1.15 | Approver decides own application | Permission denied (self-approval block) |
| T-1.16 | Non-approver calls `leave_decide` | Permission denied |
| T-1.17 | `leave_decide` on already-decided application | `ValidationError` (no double decision) |
| T-1.18 | HRMS uninstalled (mocked `hrms_available` → False) | Endpoints raise the standard HRMS-missing error |

### 10.2 Frontend / manual test scenarios

No frontend test runner is configured (`package.json` has no vitest/jest), so
verification is manual against a seeded bench, plus `oxlint` and `tsc`:

- M-1: ESS with no linked Employee sees the guidance message, not an empty list.
- M-2: Apply flow: validation errors render inline; day-count estimate matches
  server-computed `total_leave_days`; submit disables the button until response.
- M-3: Balances card math matches HRMS allocation (allocated − used = remaining).
- M-4: Approver queue updates optimistically; a failed decision rolls back and
  shows `ErrorBanner`.
- M-5: Direct navigation to `/hr/manage/leave` as ESS renders `PermissionDenied`.
- M-6: Mobile viewport (390px): queue rows collapse legibly; approve/reject
  reachable within two taps.
- M-7: With HRMS removed from the site, both pages show the honest empty state.

### 10.3 Acceptance criteria

- All backend tests in `test_hr_leave_api.py` pass.
- `oxlint` and `tsc` clean; production `yarn build` succeeds.
- Both stub pages are replaced; no `HrModuleStub` usage remains on the leave routes.
- `FILE_STRUCTURE.md` updated; every new file has a header + named docstrings.

## 11. Rollout Phases

1. **Phase 1 — Backend:** `pramniaga/api/hr/leave.py` + facade re-exports +
   `test_hr_leave_api.py` green. No UI changes.
2. **Phase 2 — Frontend:** replace both stubs; register `API.hr.leave_*` paths;
   add `LeaveApplication`/`LeaveBalance` types to `lib/types.ts`.
3. **Phase 3 — Polish:** optimistic UI, mobile pass, empty-state copy review,
   rebuild SPA assets.

## 12. Risks

| Risk | Mitigation |
|------|------------|
| HRMS version differences in `Leave Application` fields/behavior | Pin the tested HRMS version in this doc; guard field access like `overview.py` does with `has_field` |
| Balance math disagreements with HRMS | Read allocations via HRMS's own APIs/utils rather than re-implementing accrual |
| Approver-scope edge cases (matrix approvers, department heads) | Phase 1 supports company-scope + designated `leave_approver` only; document as a known limit |

## 13. Open Questions (to fix together)

1. **Half-day leave in phase 1?** Adds UI + validation complexity; propose deferring
   unless it's a must-have.
2. **Draft vs direct submit:** should `leave_apply` create `docstatus=0` (draft,
   editable) or submit immediately (`docstatus=1`)? Proposal: direct submit —
   simpler, matches "request and track" mental model.
3. **Approval scope:** is company-scope + designated `leave_approver` enough for
   phase 1, or do we need department-head routing now?
4. **Attachments** (e.g., sick notes) — in scope or later?
5. **Notifications:** email/WhatsApp on decision — fast follow-up or phase 2?
6. **Backdated leave policy:** allow applying for past dates (common for sick
   leave)? If yes, what's the window (e.g., ≤ 3 days back)?
7. **Cancellation window:** can ESS cancel an approved-but-future application, or
   is cancellation Open-only as proposed?
