import frappe

from pramniaga.api.common import require_login


@frappe.whitelist()
def list_apps():
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
