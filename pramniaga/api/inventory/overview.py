"""
Purpose: Inventory overview draft-count summary for the SPA home cards.
Exports: overview_counts.

Last updated: 2026-07-25
Author: Pramniaga
"""

import frappe

from pramniaga.api.common import require_capability
from pramniaga.api.inventory._helpers import STOCK_ENTRY_TYPES, _company_or_throw


@frappe.whitelist()
def overview_counts(company: str | None = None):
	"""
	overview_counts - Return draft move/adjustment counts plus product and warehouse totals.

	Args:
		company: Optional company; falls back to default (required).

	Returns:
		Dict keys: receipt, delivery, transfer, adjustment, products, warehouses.
		Draft keys are company-scoped. Warehouses are company-scoped.
		Products are enabled Items (master data, not company-owned in ERPNext).
	"""
	require_capability("can_browse_stock")
	company = _company_or_throw(company)
	counts = {}
	for purpose, key in STOCK_ENTRY_TYPES.items():
		counts[key] = frappe.db.count(
			"Stock Entry",
			{"stock_entry_type": purpose, "docstatus": 0, "company": company},
		)

	counts["adjustment"] = frappe.db.count(
		"Stock Reconciliation",
		{"docstatus": 0, "company": company},
	)
	# Item is company-agnostic master data; warehouse rows are company-scoped.
	counts["products"] = frappe.db.count("Item", {"disabled": 0})
	counts["warehouses"] = frappe.db.count(
		"Warehouse",
		{"disabled": 0, "is_group": 0, "company": company},
	)
	return counts
