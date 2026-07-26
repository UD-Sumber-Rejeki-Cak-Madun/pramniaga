import frappe


def has_app_permission() -> bool:
	if frappe.session.user == "Guest":
		return False
	return True
