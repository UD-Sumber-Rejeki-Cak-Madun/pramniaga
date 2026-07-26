"""
Purpose: On-hand Bin browse and single-item stock balance APIs.
Exports: stock_on_hand, stock_balance.

Last updated: 2026-07-25
Author: Pramniaga
"""

import frappe
from frappe.utils import flt

from pramniaga.api.common import require_capability
from pramniaga.api.inventory._helpers import _company_or_throw


@frappe.whitelist()
def stock_on_hand(company: str | None = None, item_code: str | None = None, warehouse: str | None = None):
	"""
	stock_on_hand - List Bin rows (qty/rate) for a resolved company.

	Args:
		company: Optional company; falls back to default (required).
		item_code: Optional item filter.
		warehouse: Optional warehouse filter.

	Returns:
		List of Bin dicts (max 200).
	"""
	require_capability("can_browse_stock")
	filters = {"company": _company_or_throw(company)}
	if item_code:
		filters["item_code"] = item_code
	if warehouse:
		filters["warehouse"] = warehouse
	return frappe.get_all(
		"Bin",
		filters=filters,
		fields=[
			"name",
			"item_code",
			"warehouse",
			"actual_qty",
			"projected_qty",
			"valuation_rate",
			"stock_uom",
			"company",
		],
		order_by="modified desc",
		limit_page_length=200,
	)


@frappe.whitelist()
def stock_balance(item_code: str, warehouse: str | None = None):
	"""
	stock_balance - Return qty for one item via ERPNext stock utils.

	Args:
		item_code: Item to balance.
		warehouse: If set, balance for that warehouse; else latest stock qty.

	Returns:
		Dict with item_code, optional warehouse, and qty.
	"""
	require_capability("can_browse_stock")
	from erpnext.stock.utils import get_latest_stock_qty, get_stock_balance

	if warehouse:
		return {
			"item_code": item_code,
			"warehouse": warehouse,
			"qty": flt(get_stock_balance(item_code, warehouse)),
		}
	return {"item_code": item_code, "qty": flt(get_latest_stock_qty(item_code))}
