"""
Purpose: Inventory overview draft-count summary for the SPA home cards.
Exports: overview_counts.

Last updated: 2026-07-24
Author: Pramniaga
"""

import frappe

from pramniaga.api.common import get_default_company, require_capability
from pramniaga.api.inventory._helpers import STOCK_ENTRY_TYPES


@frappe.whitelist()
def overview_counts(company: str | None = None):
	"""
	overview_counts - Return draft move/adjustment counts plus product and warehouse totals.

	Args:
		company: Optional company filter; defaults to user/company default.

	Returns:
		Dict keys: receipt, delivery, transfer, adjustment, products, warehouses.
	"""
	require_capability("can_browse_stock")
	company = company or get_default_company()
	counts = {}
	for purpose, key in STOCK_ENTRY_TYPES.items():
		filters = {"stock_entry_type": purpose, "docstatus": 0}
		if company:
			filters["company"] = company
		counts[key] = frappe.db.count("Stock Entry", filters)

	reco_filters = {"docstatus": 0}
	if company:
		reco_filters["company"] = company
	counts["adjustment"] = frappe.db.count("Stock Reconciliation", reco_filters)
	counts["products"] = frappe.db.count("Item", {"disabled": 0})
	counts["warehouses"] = frappe.db.count("Warehouse", {"disabled": 0, "is_group": 0})
	return counts
