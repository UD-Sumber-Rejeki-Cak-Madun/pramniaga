"""
Purpose: Stock Entry (receipt / delivery / transfer) list, get, create, submit, cancel.
Exports: receipts_*, deliveries_*, transfers_*, moves_*.
Contents:
  - _moves_list / _create_stock_entry helpers
  - Purpose-specific list/create whitelists
  - Shared get/submit/cancel
Last updated: 2026-07-24
Author: Pramniaga
"""

import frappe
from frappe import _
from frappe.utils import cint, flt, nowdate, nowtime

from pramniaga.api.common import parse_json, require_capability
from pramniaga.api.inventory._helpers import _company_or_throw


def _moves_list(purpose: str, company: str | None = None, limit: int = 50):
	"""
	_moves_list - List Stock Entries for one stock_entry_type (excludes cancelled).

	Args:
		purpose: stock_entry_type value.
		company: Optional company filter.
		limit: Max rows.

	Returns:
		List of Stock Entry summary dicts.
	"""
	require_capability("can_browse_stock")
	filters = {"stock_entry_type": purpose, "docstatus": ["!=", 2]}
	if company:
		filters["company"] = company
	return frappe.get_all(
		"Stock Entry",
		filters=filters,
		fields=[
			"name",
			"stock_entry_type",
			"company",
			"posting_date",
			"posting_time",
			"docstatus",
			"from_warehouse",
			"to_warehouse",
			"creation",
		],
		limit_page_length=cint(limit),
		order_by="creation desc",
	)


def _create_stock_entry(purpose: str, data):
	"""
	_create_stock_entry - Build a Stock Entry from SPA payload.

	Args:
		purpose: ERPNext stock_entry_type (Material Receipt|Issue|Transfer).
		data: JSON/dict with company, warehouses, items[], optional submit.

	Returns:
		Stock Entry as_dict (draft or submitted).

	Raises:
		ValidationError for empty lines, template items, or batch/serial items.
	"""
	require_capability("can_submit_moves")
	payload = parse_json(data)
	company = _company_or_throw(payload.get("company"))
	items = payload.get("items") or []
	if not items:
		frappe.throw(_("At least one item line is required."))

	# 1. Create header
	doc = frappe.new_doc("Stock Entry")
	doc.stock_entry_type = purpose
	doc.company = company
	doc.posting_date = payload.get("posting_date") or nowdate()
	doc.posting_time = payload.get("posting_time") or nowtime()
	doc.from_warehouse = payload.get("from_warehouse")
	doc.to_warehouse = payload.get("to_warehouse")

	# 2. Append lines (warehouse fields depend on purpose)
	for row in items:
		item_code = row.get("item_code")
		item = frappe.get_cached_doc("Item", item_code)
		if item.has_variants:
			frappe.throw(_("Item {0} is a template. Use a variant instead.").format(item_code))
		if item.has_batch_no or item.has_serial_no:
			frappe.throw(_("Batch/serial items are not supported in this UI yet: {0}").format(item_code))

		line = {
			"item_code": item_code,
			"qty": flt(row.get("qty")),
			"uom": row.get("uom") or item.stock_uom,
			"stock_uom": item.stock_uom,
			"conversion_factor": 1,
		}
		if purpose == "Material Receipt":
			line["t_warehouse"] = row.get("warehouse") or payload.get("to_warehouse")
			line["basic_rate"] = flt(row.get("basic_rate") or row.get("valuation_rate") or item.valuation_rate)
		elif purpose == "Material Issue":
			line["s_warehouse"] = row.get("warehouse") or payload.get("from_warehouse")
		elif purpose == "Material Transfer":
			line["s_warehouse"] = row.get("s_warehouse") or payload.get("from_warehouse")
			line["t_warehouse"] = row.get("t_warehouse") or payload.get("to_warehouse")
		doc.append("items", line)

	# 3. Insert; optionally submit
	doc.insert()
	if cint(payload.get("submit")):
		doc.submit()
	return doc.as_dict()


@frappe.whitelist()
def receipts_list(company: str | None = None, limit: int = 50):
	"""
	receipts_list - List Material Receipt Stock Entries.

	Args:
		company: Optional company filter.
		limit: Max rows.

	Returns:
		List of Stock Entry summary dicts.
	"""
	return _moves_list("Material Receipt", company, limit)


@frappe.whitelist()
def deliveries_list(company: str | None = None, limit: int = 50):
	"""
	deliveries_list - List Material Issue Stock Entries.

	Args:
		company: Optional company filter.
		limit: Max rows.

	Returns:
		List of Stock Entry summary dicts.
	"""
	return _moves_list("Material Issue", company, limit)


@frappe.whitelist()
def transfers_list(company: str | None = None, limit: int = 50):
	"""
	transfers_list - List Material Transfer Stock Entries.

	Args:
		company: Optional company filter.
		limit: Max rows.

	Returns:
		List of Stock Entry summary dicts.
	"""
	return _moves_list("Material Transfer", company, limit)


@frappe.whitelist()
def moves_get(name: str):
	"""
	moves_get - Return one Stock Entry as_dict.

	Args:
		name: Stock Entry name.

	Returns:
		Stock Entry as_dict.
	"""
	require_capability("can_browse_stock")
	doc = frappe.get_doc("Stock Entry", name)
	return doc.as_dict()


@frappe.whitelist()
def receipts_create(data):
	"""
	receipts_create - Create (and optionally submit) a Material Receipt Stock Entry.

	Args:
		data: SPA payload (company, warehouses, items, optional submit).

	Returns:
		Stock Entry as_dict.
	"""
	return _create_stock_entry("Material Receipt", data)


@frappe.whitelist()
def deliveries_create(data):
	"""
	deliveries_create - Create (and optionally submit) a Material Issue Stock Entry.

	Args:
		data: SPA payload (company, warehouses, items, optional submit).

	Returns:
		Stock Entry as_dict.
	"""
	return _create_stock_entry("Material Issue", data)


@frappe.whitelist()
def transfers_create(data):
	"""
	transfers_create - Create (and optionally submit) a Material Transfer Stock Entry.

	Args:
		data: SPA payload (company, warehouses, items, optional submit).

	Returns:
		Stock Entry as_dict.
	"""
	return _create_stock_entry("Material Transfer", data)


@frappe.whitelist()
def moves_submit(name: str):
	"""
	moves_submit - Submit a draft Stock Entry.

	Args:
		name: Stock Entry name.

	Returns:
		Stock Entry as_dict.
	"""
	require_capability("can_submit_moves")
	doc = frappe.get_doc("Stock Entry", name)
	if doc.docstatus == 0:
		doc.submit()
	return doc.as_dict()


@frappe.whitelist()
def moves_cancel(name: str):
	"""
	moves_cancel - Cancel a submitted Stock Entry.

	Args:
		name: Stock Entry name.

	Returns:
		Stock Entry as_dict.
	"""
	require_capability("can_submit_moves")
	doc = frappe.get_doc("Stock Entry", name)
	if doc.docstatus == 1:
		doc.cancel()
	return doc.as_dict()
