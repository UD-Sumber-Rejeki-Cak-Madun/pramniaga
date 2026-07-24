"""
Purpose: Shared capability gates, company helpers, and JSON parsing for API modules.
Exports: get_capabilities, get_default_company, require_login, require_capability,
	get_companies, parse_json, INVENTORY_ROLES.
Non-goals: Domain CRUD (lives in auth/inventory/dashboard).

Last updated: 2026-07-24
Author: Pramniaga
"""

import frappe

INVENTORY_ROLES = {
	"stock_user": "Stock User",
	"stock_manager": "Stock Manager",
	"item_manager": "Item Manager",
}


def get_capabilities() -> dict:
	"""
	get_capabilities - Map the current user's ERPNext roles to SPA capability flags.

	Returns:
		Dict of boolean capability flags.
	"""
	user = frappe.session.user
	if user == "Guest":
		return {
			"can_browse_stock": False,
			"can_manage_items": False,
			"can_manage_warehouses": False,
			"can_submit_moves": False,
			"can_adjust_stock": False,
		}

	roles = set(frappe.get_roles(user))
	return {
		"can_browse_stock": bool(roles & {"Stock User", "Stock Manager", "Item Manager", "System Manager"}),
		"can_manage_items": bool(roles & {"Item Manager", "System Manager"}),
		"can_manage_warehouses": bool(roles & {"Item Manager", "System Manager"}),
		"can_submit_moves": bool(roles & {"Stock User", "Stock Manager", "System Manager"}),
		"can_adjust_stock": bool(roles & {"Stock Manager", "System Manager"}),
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
