import frappe


INVENTORY_ROLES = {
	"stock_user": "Stock User",
	"stock_manager": "Stock Manager",
	"item_manager": "Item Manager",
}


def get_capabilities() -> dict:
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
	company = frappe.defaults.get_user_default("Company")
	if company:
		return company
	return frappe.db.get_value("Company", {}, "name", order_by="creation asc")


def require_login():
	if frappe.session.user == "Guest":
		frappe.throw("Login required", frappe.AuthenticationError)


def require_capability(capability: str):
	require_login()
	if not get_capabilities().get(capability):
		frappe.throw("Insufficient permissions", frappe.PermissionError)


def get_companies() -> list[dict]:
	return frappe.get_all("Company", fields=["name", "company_name", "abbr"], order_by="name asc")


def parse_json(value):
	if isinstance(value, str):
		return frappe.parse_json(value)
	return value
