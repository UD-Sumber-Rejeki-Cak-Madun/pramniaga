"""
Purpose: Shared helpers and constants for inventory API submodules.
Exports: STOCK_ENTRY_TYPES, MOVE_PURPOSE_TO_TYPE, _company_or_throw, _item_fields.
Non-goals: Whitelisted endpoints (live in sibling modules).

Last updated: 2026-07-24
Author: Pramniaga
"""

import frappe
from frappe import _

from pramniaga.api.common import get_default_company

STOCK_ENTRY_TYPES = {
	"Material Receipt": "receipt",
	"Material Issue": "delivery",
	"Material Transfer": "transfer",
}

MOVE_PURPOSE_TO_TYPE = {v: k for k, v in STOCK_ENTRY_TYPES.items()}


def _company_or_throw(company: str | None = None) -> str:
	"""
	_company_or_throw - Return company name or throw if no default Company is configured.

	Args:
		company: Optional company; falls back to default.

	Returns:
		Company name string.
	"""
	company = company or get_default_company()
	if not company:
		frappe.throw(_("Please set a default Company before using Inventory."))
	return company


def _item_fields():
	"""
	_item_fields - Standard Item field list for list/browse responses.

	Returns:
		List of Item field names.
	"""
	return [
		"name",
		"item_code",
		"item_name",
		"item_group",
		"stock_uom",
		"is_stock_item",
		"disabled",
		"has_variants",
		"variant_of",
		"valuation_rate",
		"standard_rate",
		"description",
		"image",
		"creation",
		"modified",
	]
