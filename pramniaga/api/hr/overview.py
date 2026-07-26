"""
Purpose: Role-aware HR overview counts for the SPA home cards.
Exports: overview_counts.

Last updated: 2026-07-25
Author: Pramniaga
"""

import frappe

from pramniaga.api.common import get_capabilities, get_default_company, get_linked_employee, require_capability
from pramniaga.api.hr._helpers import hrms_available


@frappe.whitelist()
def overview_counts(company: str | None = None):
	"""
	overview_counts - Return scoped HR counters for cards the user is allowed to see.

	Args:
		company: Optional company filter; defaults to user default company.

	Returns:
		Dict with available keys only for permitted scopes. Omitted keys mean no access.
		Keys may include: people, my_leave_open, leave_approvals_open, my_payslips,
		hrms_available.
	"""
	require_capability("can_use_hr")
	caps = get_capabilities()
	company = company or get_default_company()
	employee = get_linked_employee()
	available = hrms_available()
	counts: dict = {"hrms_available": available}

	if caps.get("can_view_employees"):
		filters = {"status": "Active"}
		if company:
			filters["company"] = company
		counts["people"] = frappe.db.count("Employee", filters)

	if not available:
		return counts

	if caps.get("can_self_service") and employee:
		counts["my_leave_open"] = frappe.db.count(
			"Leave Application",
			{"employee": employee.name, "status": "Open", "docstatus": 1},
		)
		counts["my_payslips"] = frappe.db.count(
			"Salary Slip",
			{"employee": employee.name, "docstatus": 1},
		)

	if caps.get("can_approve_leave"):
		filters = {"status": "Open", "docstatus": 1}
		# Prefer company via employee join when company is set — use Leave Application.company if present.
		if company and frappe.get_meta("Leave Application").has_field("company"):
			filters["company"] = company
		counts["leave_approvals_open"] = frappe.db.count("Leave Application", filters)

	return counts
