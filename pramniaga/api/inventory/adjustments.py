"""
Purpose: Stock Reconciliation (adjustment) list/get/create/submit APIs.
Exports: adjustments_list, adjustments_get, adjustments_create, adjustments_submit.

Last updated: 2026-07-25
Author: Pramniaga
"""

import frappe
from frappe import _
from frappe.utils import cint, flt, nowdate, nowtime

from pramniaga.api.common import parse_json, require_capability
from pramniaga.api.inventory._helpers import _company_or_throw


@frappe.whitelist()
def adjustments_list(company: str | None = None, limit: int = 50):
	"""
	adjustments_list - List Stock Reconciliations for a resolved company (excludes cancelled).

	Args:
		company: Optional company; falls back to default (required).
		limit: Max rows.

	Returns:
		List of Stock Reconciliation summary dicts.
	"""
	require_capability("can_adjust_stock")
	filters = {"docstatus": ["!=", 2], "company": _company_or_throw(company)}
	return frappe.get_all(
		"Stock Reconciliation",
		filters=filters,
		fields=["name", "company", "purpose", "posting_date", "docstatus", "creation"],
		limit_page_length=cint(limit),
		order_by="creation desc",
	)


@frappe.whitelist()
def adjustments_get(name: str):
	"""
	adjustments_get - Return one Stock Reconciliation as_dict.

	Args:
		name: Stock Reconciliation name.

	Returns:
		Stock Reconciliation as_dict.
	"""
	require_capability("can_adjust_stock")
	return frappe.get_doc("Stock Reconciliation", name).as_dict()


@frappe.whitelist()
def adjustments_create(data):
	"""
	adjustments_create - Create (and optionally submit) a Stock Reconciliation from SPA payload.

	Args:
		data: JSON/dict with company, items[{item_code, warehouse, qty, valuation_rate}],
			optional posting_date/time, purpose, submit.

	Returns:
		Stock Reconciliation as_dict.
	"""
	require_capability("can_adjust_stock")
	payload = parse_json(data)
	company = _company_or_throw(payload.get("company"))
	items = payload.get("items") or []
	if not items:
		frappe.throw(_("At least one item line is required."))

	# 1. Header
	doc = frappe.new_doc("Stock Reconciliation")
	doc.company = company
	doc.purpose = payload.get("purpose") or "Stock Reconciliation"
	doc.posting_date = payload.get("posting_date") or nowdate()
	doc.posting_time = payload.get("posting_time") or nowtime()

	# 2. Lines (reject template items)
	for row in items:
		item_code = row.get("item_code")
		item = frappe.get_cached_doc("Item", item_code)
		if item.has_variants:
			frappe.throw(_("Item {0} is a template. Use a variant instead.").format(item_code))
		doc.append(
			"items",
			{
				"item_code": item_code,
				"warehouse": row.get("warehouse"),
				"qty": flt(row.get("qty")),
				"valuation_rate": flt(row.get("valuation_rate") or item.valuation_rate),
			},
		)

	# 3. Insert; optionally submit
	doc.insert()
	if cint(payload.get("submit")):
		doc.submit()
	return doc.as_dict()


@frappe.whitelist()
def adjustments_submit(name: str):
	"""
	adjustments_submit - Submit a draft Stock Reconciliation.

	Args:
		name: Stock Reconciliation name.

	Returns:
		Stock Reconciliation as_dict.
	"""
	require_capability("can_adjust_stock")
	doc = frappe.get_doc("Stock Reconciliation", name)
	if doc.docstatus == 0:
		doc.submit()
	return doc.as_dict()
