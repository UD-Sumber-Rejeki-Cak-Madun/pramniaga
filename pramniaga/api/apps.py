"""
Purpose: SPA app-tile catalog for the Shell sidebar.
Exports: list_apps.

Last updated: 2026-07-25
Author: Pramniaga
"""

import frappe

from pramniaga.api.common import get_capabilities, require_login


@frappe.whitelist()
def list_apps():
	"""
	list_apps - Return SPA app tiles the current user is allowed to see.

	Tiles are filtered by capability (inventory: can_browse_stock; hr: can_use_hr).

	Returns:
		List of app tile dicts (name, title, description, route, logo, color).
	"""
	require_login()
	caps = get_capabilities()
	apps = []

	if caps.get("can_browse_stock"):
		apps.append(
			{
				"name": "inventory",
				"title": "Inventory",
				"description": "Products, stock, receipts, deliveries, and adjustments",
				"route": "/inventory",
				"logo": "/assets/pramniaga/logo.svg",
				"color": "#714B67",
			}
		)

	if caps.get("can_use_hr"):
		apps.append(
			{
				"name": "hr",
				"title": "HR",
				"description": "People, leave, attendance, and payroll",
				"route": "/hr",
				"logo": "/assets/pramniaga/logo.svg",
				"color": "#0F766E",
			}
		)

	return apps
