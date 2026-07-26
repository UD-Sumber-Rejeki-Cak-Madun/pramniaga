"""
Purpose: Shared capability gates, company helpers, and JSON parsing for Pramniaga APIs.
Exports: INVENTORY_ROLES, get_capabilities, get_default_company, require_login,
	require_capability, get_companies, parse_json.

Last updated: 2026-07-25
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
	get_capabilities - Return inventory capability flags for the current user.

	Returns:
		Dict of can_* booleans based on Frappe roles.
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
	get_default_company - Resolve the user's default Company or the oldest Company.

	Returns:
		Company name or None when the site has no Company.
	"""
	company = frappe.defaults.get_user_default("Company")
	if company:
		return company
	return frappe.db.get_value("Company", {}, "name", order_by="creation asc")


def require_login():
	"""
	require_login - Throw AuthenticationError when the session user is Guest.
	"""
	if frappe.session.user == "Guest":
		frappe.throw("Login required", frappe.AuthenticationError)


def require_capability(capability: str):
	"""
	require_capability - Require login and a named inventory capability.

	Args:
		capability: Key from get_capabilities() (e.g. can_browse_stock).
	"""
	require_login()
	if not get_capabilities().get(capability):
		frappe.throw("Insufficient permissions", frappe.PermissionError)


def get_companies() -> list[dict]:
	"""
	get_companies - List companies for SPA selectors.

	Returns:
		List of Company dicts.
	"""
	return frappe.get_all("Company", fields=["name", "company_name", "abbr"], order_by="name asc")


def parse_json(value):
	"""
	parse_json - Parse a JSON string or return a dict/list unchanged.

	Args:
		value: JSON string or already-parsed value.

	Returns:
		Parsed Python object.
	"""
	if isinstance(value, str):
		return frappe.parse_json(value)
	return value
