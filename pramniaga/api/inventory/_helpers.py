"""
Purpose: Shared helpers and constants for inventory API submodules.
Exports: STOCK_ENTRY_TYPES, MOVE_PURPOSE_TO_TYPE, _company_or_throw, _item_fields, _safe_payload.
Non-goals: Whitelisted endpoints (live in sibling modules).

Last updated: 2026-07-25
Author: Pramniaga
"""

import frappe
from frappe import _

from pramniaga.api.common import get_default_company, parse_json

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


def _safe_payload(data, drop=("doctype", "name")):
	"""
	_safe_payload - Parse SPA JSON and strip identity keys the server must own.

	Args:
		data: JSON string or dict from the client.
		drop: Keys to remove so clients cannot override DocType/name.

	Returns:
		Sanitized dict of fields.
	"""
	payload = parse_json(data) or {}
	if not isinstance(payload, dict):
		frappe.throw(_("Invalid payload"))
	return {key: value for key, value in payload.items() if key not in drop}


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
