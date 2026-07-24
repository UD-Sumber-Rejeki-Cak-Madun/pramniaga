"""
Purpose: SPA app-tile catalog for the Shell sidebar.
Exports: list_apps.

Last updated: 2026-07-24
Author: Pramniaga
"""

import frappe

from pramniaga.api.common import require_login


@frappe.whitelist()
def list_apps():
	"""
	list_apps - Return SPA app tiles for the Shell sidebar (currently Inventory only).

	Returns:
		List of app tile dicts (name, title, description, route, logo, color).
	"""
	require_login()
	return [
		{
			"name": "inventory",
			"title": "Inventory",
			"description": "Products, stock, receipts, deliveries, and adjustments",
			"route": "/inventory",
			"logo": "/assets/pramniaga/logo.svg",
			"color": "#714B67",
		}
	]
