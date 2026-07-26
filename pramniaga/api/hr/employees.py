"""
Purpose: Employee self-service and directory list APIs for the HR SPA.
Exports: employee_me, employees_list.

Last updated: 2026-07-25
Author: Pramniaga
"""

import frappe

from pramniaga.api.common import get_default_company, get_linked_employee, require_capability
from pramniaga.api.hr._helpers import EMPLOYEE_DIRECTORY_FIELDS


@frappe.whitelist()
def employee_me():
	"""
	employee_me - Return the Employee linked to the current session user.

	Resolves employee from session only (ignores any client-supplied id).

	Returns:
		Employee summary dict without salary/bank fields, or None if unlinked.
	"""
	require_capability("can_use_hr")
	# Self-service link is optional: users with HR roles may open HR without an Employee.
	# can_self_service callers still get their own record when linked.
	return get_linked_employee()


@frappe.whitelist()
def employees_list(
	company: str | None = None,
	search: str | None = None,
	status: str | None = "Active",
	limit: int = 50,
	start: int = 0,
):
	"""
	employees_list - Paginated employee directory (identity/org fields only).

	Args:
		company: Optional company filter; defaults to user default company.
		search: Optional employee_name / name LIKE filter.
		status: Employment status filter (default Active); pass empty to skip.
		limit: Page size (max 100).
		start: Offset.

	Returns:
		List of Employee dicts without salary/bank fields.
	"""
	require_capability("can_view_employees")
	company = company or get_default_company()
	limit = min(frappe.utils.cint(limit) or 50, 100)
	start = max(frappe.utils.cint(start) or 0, 0)

	filters: dict = {}
	if company:
		filters["company"] = company
	if status:
		filters["status"] = status

	or_filters = None
	if search:
		like = f"%{search}%"
		or_filters = [
			["employee_name", "like", like],
			["name", "like", like],
			["employee_number", "like", like],
		]

	return frappe.get_all(
		"Employee",
		filters=filters,
		or_filters=or_filters,
		fields=EMPLOYEE_DIRECTORY_FIELDS,
		order_by="employee_name asc",
		limit=limit,
		start=start,
	)
