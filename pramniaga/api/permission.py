"""
Purpose: Apps-screen permission hook for Pramniaga.
Exports: has_app_permission (referenced from hooks.py — path must stay stable).

Last updated: 2026-07-24
Author: Pramniaga
"""

import frappe


def has_app_permission() -> bool:
	"""
	has_app_permission - True when a non-Guest user may see Pramniaga on the apps screen.

	Returns:
		True for logged-in users, False for Guest.
	"""
	if frappe.session.user == "Guest":
		return False
	return True
