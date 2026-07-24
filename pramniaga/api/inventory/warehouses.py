"""
Purpose: Warehouse list/create whitelisted APIs.
Exports: warehouses_list, warehouses_create.

Last updated: 2026-07-24
Author: Pramniaga
"""

import frappe
from frappe.utils import cint

from pramniaga.api.common import parse_json, require_capability


@frappe.whitelist()
def warehouses_list(company: str | None = None, leaf_only: int = 1):
	"""
	warehouses_list - List Warehouses (default leaf-only).

	Args:
	company: Optional company filter.
	leaf_only: When truthy, only non-group warehouses.

	Returns:
		List of Warehouse dicts.
	"""
	require_capability("can_browse_stock")
	filters = {"disabled": 0}
	if company:
		filters["company"] = company
	if cint(leaf_only):
		filters["is_group"] = 0
	return frappe.get_all(
		"Warehouse",
		filters=filters,
		fields=["name", "warehouse_name", "company", "is_group", "parent_warehouse"],
		order_by="name asc",
	)


@frappe.whitelist()
def warehouses_create(data):
	"""
	warehouses_create - Insert Warehouse from SPA payload.

	Args:
	data: JSON/dict Warehouse fields.

	Returns:
		Inserted Warehouse as_dict.
	"""
	require_capability("can_manage_warehouses")
	payload = parse_json(data)
	doc = frappe.get_doc({"doctype": "Warehouse", **payload})
	doc.insert()
	return doc.as_dict()
