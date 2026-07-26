"""
Purpose: Shared capability gates, company helpers, and JSON parsing for API modules.
Exports: get_capabilities, get_linked_employee, get_default_company, require_login,
	require_capability, get_companies, parse_json, INVENTORY_ROLES, HR_ROLES.
Non-goals: Domain CRUD (lives in auth/inventory/hr/dashboard).

Capability matrix (roles verified against installed HRMS / ERPNext):
  can_browse_stock / inventory flags — Stock User, Stock Manager, Item Manager, System Manager
  can_use_hr — Employee, Employee Self Service, HR User, HR Manager, Leave Approver,
    System Manager, or any user with a linked Employee
  can_self_service — session user has a linked Employee (user_id)
  can_view_employees — HR User, HR Manager, System Manager
  can_manage_employees — HR Manager, System Manager
  can_approve_leave — Leave Approver, HR User, HR Manager, System Manager
  can_manage_attendance — HR User, HR Manager, System Manager
  can_view_payroll — Employee (self via self-service), HR User, HR Manager, System Manager
  can_run_payroll — HR Manager, System Manager

Last updated: 2026-07-25
Author: Pramniaga
"""

import frappe

INVENTORY_ROLES = {
	"stock_user": "Stock User",
	"stock_manager": "Stock Manager",
	"item_manager": "Item Manager",
}

HR_ROLES = {
	"employee": "Employee",
	"employee_self_service": "Employee Self Service",
	"hr_user": "HR User",
	"hr_manager": "HR Manager",
	"leave_approver": "Leave Approver",
}

_EMPTY_CAPABILITIES = {
	"can_browse_stock": False,
	"can_manage_items": False,
	"can_manage_warehouses": False,
	"can_submit_moves": False,
	"can_adjust_stock": False,
	"can_use_hr": False,
	"can_self_service": False,
	"can_view_employees": False,
	"can_manage_employees": False,
	"can_approve_leave": False,
	"can_manage_attendance": False,
	"can_view_payroll": False,
	"can_run_payroll": False,
}


def get_linked_employee(user: str | None = None) -> dict | None:
	"""
	get_linked_employee - Resolve the Employee linked to a User via user_id.

	Args:
		user: User name; defaults to the current session user.

	Returns:
		Employee summary dict (no salary/bank fields) or None.
	"""
	user = user or frappe.session.user
	if not user or user == "Guest":
		return None

	row = frappe.db.get_value(
		"Employee",
		{"user_id": user},
		[
			"name",
			"employee_name",
			"company",
			"department",
			"designation",
			"status",
			"image",
			"user_id",
			"date_of_joining",
			"reports_to",
		],
		as_dict=True,
	)
	return row


def get_capabilities() -> dict:
	"""
	get_capabilities - Map the current user's roles (and Employee link) to SPA capability flags.

	Returns:
		Dict of boolean capability flags for inventory and HR.
	"""
	user = frappe.session.user
	if user == "Guest":
		return dict(_EMPTY_CAPABILITIES)

	roles = set(frappe.get_roles(user))
	is_system = "System Manager" in roles
	employee = get_linked_employee(user)
	can_self_service = bool(employee)

	can_view_employees = bool(roles & {"HR User", "HR Manager"}) or is_system
	can_manage_employees = "HR Manager" in roles or is_system
	can_approve_leave = bool(roles & {"Leave Approver", "HR User", "HR Manager"}) or is_system
	can_manage_attendance = bool(roles & {"HR User", "HR Manager"}) or is_system
	can_run_payroll = "HR Manager" in roles or is_system
	can_view_payroll = can_self_service or bool(roles & {"HR User", "HR Manager"}) or is_system
	can_use_hr = (
		can_self_service
		or bool(
			roles
			& {
				"Employee",
				"Employee Self Service",
				"HR User",
				"HR Manager",
				"Leave Approver",
			}
		)
		or is_system
	)

	return {
		"can_browse_stock": bool(roles & {"Stock User", "Stock Manager", "Item Manager", "System Manager"}),
		"can_manage_items": bool(roles & {"Item Manager", "System Manager"}),
		"can_manage_warehouses": bool(roles & {"Item Manager", "System Manager"}),
		"can_submit_moves": bool(roles & {"Stock User", "Stock Manager", "System Manager"}),
		"can_adjust_stock": bool(roles & {"Stock Manager", "System Manager"}),
		"can_use_hr": can_use_hr,
		"can_self_service": can_self_service,
		"can_view_employees": can_view_employees,
		"can_manage_employees": can_manage_employees,
		"can_approve_leave": can_approve_leave,
		"can_manage_attendance": can_manage_attendance,
		"can_view_payroll": can_view_payroll,
		"can_run_payroll": can_run_payroll,
	}


def get_default_company() -> str | None:
	"""
	get_default_company - User default Company, else first Company by creation.

	Returns:
		Company name or None.
	"""
	company = frappe.defaults.get_user_default("Company")
	if company:
		return company
	return frappe.db.get_value("Company", {}, "name", order_by="creation asc")


def require_login():
	"""
	require_login - Throw AuthenticationError if the session is Guest.

	Returns:
		None.
	"""
	if frappe.session.user == "Guest":
		frappe.throw("Login required", frappe.AuthenticationError)


def require_capability(capability: str):
	"""
	require_capability - Require login and a named capability from get_capabilities().

	Args:
		capability: Capability key (e.g. can_browse_stock).

	Returns:
		None.
	"""
	require_login()
	if not get_capabilities().get(capability):
		frappe.throw("Insufficient permissions", frappe.PermissionError)


def get_companies() -> list[dict]:
	"""
	get_companies - List companies for session payload selectors.

	Returns:
		List of Company dicts.
	"""
	return frappe.get_all("Company", fields=["name", "company_name", "abbr"], order_by="name asc")


def parse_json(value):
	"""
	parse_json - Parse a JSON string; pass through non-string values unchanged.

	Args:
		value: JSON string or already-parsed value.

	Returns:
		Parsed object or original value.
	"""
	if isinstance(value, str):
		return frappe.parse_json(value)
	return value
