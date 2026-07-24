"""
Purpose: Item, item-group, UOM, attribute, and variant whitelisted APIs.
Exports: items_*, item_groups_list, uoms_list, attributes_*, variants_create.

Last updated: 2026-07-24
Author: Pramniaga
"""

import frappe
from frappe.utils import cint

from pramniaga.api.common import parse_json, require_capability
from pramniaga.api.inventory._helpers import _item_fields


@frappe.whitelist()
def items_list(search: str | None = None, limit: int = 50, start: int = 0):
	"""
	items_list - List enabled Items with optional search.

	Args:
	search: Optional item_code LIKE filter.
	limit: Page size.
	start: Offset.

	Returns:
		List of Item dicts.
	"""
	require_capability("can_browse_stock")
	filters = {"disabled": 0}
	if search:
		filters["item_code"] = ["like", f"%{search}%"]

	return frappe.get_all(
		"Item",
		filters=filters,
		fields=_item_fields(),
		limit_page_length=cint(limit),
		limit_start=cint(start),
		order_by="modified desc",
	)


@frappe.whitelist()
def items_get(item_code: str):
	"""
	items_get - Return one Item as_dict.

	Args:
	item_code: Item name/code.

	Returns:
		Item as_dict.
	"""
	require_capability("can_browse_stock")
	doc = frappe.get_doc("Item", item_code)
	return doc.as_dict()


@frappe.whitelist()
def items_create(data):
	"""
	items_create - Insert Item from SPA payload.

	Args:
	data: JSON/dict Item fields.

	Returns:
		Inserted Item as_dict.
	"""
	require_capability("can_manage_items")
	payload = parse_json(data)
	doc = frappe.get_doc({"doctype": "Item", **payload})
	doc.insert()
	return doc.as_dict()


@frappe.whitelist()
def items_update(item_code: str, data):
	"""
	items_update - Update Item fields (item_code immutable).

	Args:
	item_code: Item to update.
	data: JSON/dict of fields to set.

	Returns:
		Updated Item as_dict.
	"""
	require_capability("can_manage_items")
	doc = frappe.get_doc("Item", item_code)
	payload = parse_json(data)
	for key, value in payload.items():
		if key not in ("doctype", "name", "item_code"):
			doc.set(key, value)
	doc.save()
	return doc.as_dict()


@frappe.whitelist()
def item_groups_list():
	"""
	item_groups_list - List leaf Item Groups.

	Returns:
		List of Item Group dicts.
	"""
	require_capability("can_browse_stock")
	return frappe.get_all(
		"Item Group",
		filters={"is_group": 0},
		fields=["name", "item_group_name", "parent_item_group"],
		order_by="name asc",
	)


@frappe.whitelist()
def uoms_list():
	"""
	uoms_list - List UOMs.

	Returns:
		List of UOM dicts.
	"""
	require_capability("can_browse_stock")
	return frappe.get_all("UOM", fields=["name", "uom_name"], order_by="name asc")


@frappe.whitelist()
def attributes_list():
	"""
	attributes_list - List Item Attributes.

	Returns:
		List of Item Attribute dicts.
	"""
	require_capability("can_manage_items")
	return frappe.get_all(
		"Item Attribute",
		fields=["name", "attribute_name", "numeric_values"],
		order_by="name asc",
	)


@frappe.whitelist()
def attributes_create(data):
	"""
	attributes_create - Create Item Attribute.

	Args:
	data: JSON/dict Attribute fields.

	Returns:
		Inserted Item Attribute as_dict.
	"""
	require_capability("can_manage_items")
	payload = parse_json(data)
	doc = frappe.get_doc({"doctype": "Item Attribute", **payload})
	doc.insert()
	return doc.as_dict()


@frappe.whitelist()
def variants_create(template: str, attributes):
	"""
	variants_create - Create an Item variant from a template via ERPNext.

	Args:
	template: Template Item name/code.
	attributes: JSON/dict of attribute to value.

	Returns:
		New variant Item as_dict.
	"""
	require_capability("can_manage_items")
	from erpnext.controllers.item_variant import create_variant

	attrs = parse_json(attributes)
	variant = create_variant(template, attrs)
	variant.insert()
	return variant.as_dict()
