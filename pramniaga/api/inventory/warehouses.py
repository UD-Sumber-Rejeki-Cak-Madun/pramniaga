"""
Purpose: Warehouse list/create whitelisted APIs.
Exports: warehouses_list, warehouses_create.

Last updated: 2026-07-25
Author: Pramniaga
"""

import frappe
from frappe.utils import cint

from pramniaga.api.common import require_capability
from pramniaga.api.inventory._helpers import _company_or_throw, _safe_payload


@frappe.whitelist()
def warehouses_list(company: str | None = None, leaf_only: int = 1):
	"""
	warehouses_list - List Warehouses for a resolved company (default leaf-only).

	Args:
		company: Optional company; falls back to default (required).
		leaf_only: When truthy, only non-group warehouses.

	Returns:
		List of Warehouse dicts.
	"""
	require_capability("can_browse_stock")
	company = _company_or_throw(company)
	filters = {"disabled": 0, "company": company}
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
	payload = _safe_payload(data)
	payload["company"] = _company_or_throw(payload.get("company"))
	doc = frappe.get_doc({"doctype": "Warehouse", **payload})
	doc.insert()
	return doc.as_dict()
