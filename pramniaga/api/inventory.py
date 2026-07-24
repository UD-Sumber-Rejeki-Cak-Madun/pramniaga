import frappe
from frappe import _
from frappe.utils import cint, flt, nowdate, nowtime

from pramniaga.api.common import (
	get_default_company,
	parse_json,
	require_capability,
	require_login,
)

STOCK_ENTRY_TYPES = {
	"Material Receipt": "receipt",
	"Material Issue": "delivery",
	"Material Transfer": "transfer",
}

MOVE_PURPOSE_TO_TYPE = {v: k for k, v in STOCK_ENTRY_TYPES.items()}


def _company_or_throw(company: str | None = None) -> str:
	company = company or get_default_company()
	if not company:
		frappe.throw(_("Please set a default Company before using Inventory."))
	return company


def _item_fields():
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


@frappe.whitelist()
def items_list(search: str | None = None, limit: int = 50, start: int = 0):
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
	require_capability("can_browse_stock")
	doc = frappe.get_doc("Item", item_code)
	return doc.as_dict()


@frappe.whitelist()
def items_create(data):
	require_capability("can_manage_items")
	payload = parse_json(data)
	doc = frappe.get_doc({"doctype": "Item", **payload})
	doc.insert()
	return doc.as_dict()


@frappe.whitelist()
def items_update(item_code: str, data):
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
	require_capability("can_browse_stock")
	return frappe.get_all(
		"Item Group",
		filters={"is_group": 0},
		fields=["name", "item_group_name", "parent_item_group"],
		order_by="name asc",
	)


@frappe.whitelist()
def uoms_list():
	require_capability("can_browse_stock")
	return frappe.get_all("UOM", fields=["name", "uom_name"], order_by="name asc")


@frappe.whitelist()
def attributes_list():
	require_capability("can_manage_items")
	return frappe.get_all(
		"Item Attribute",
		fields=["name", "attribute_name", "numeric_values"],
		order_by="name asc",
	)


@frappe.whitelist()
def attributes_create(data):
	require_capability("can_manage_items")
	payload = parse_json(data)
	doc = frappe.get_doc({"doctype": "Item Attribute", **payload})
	doc.insert()
	return doc.as_dict()


@frappe.whitelist()
def variants_create(template: str, attributes):
	require_capability("can_manage_items")
	from erpnext.controllers.item_variant import create_variant

	attrs = parse_json(attributes)
	variant = create_variant(template, attrs)
	variant.insert()
	return variant.as_dict()


@frappe.whitelist()
def warehouses_list(company: str | None = None, leaf_only: int = 1):
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
	require_capability("can_manage_warehouses")
	payload = parse_json(data)
	doc = frappe.get_doc({"doctype": "Warehouse", **payload})
	doc.insert()
	return doc.as_dict()


@frappe.whitelist()
def stock_on_hand(company: str | None = None, item_code: str | None = None, warehouse: str | None = None):
	require_capability("can_browse_stock")
	filters = {}
	if company:
		filters["company"] = company
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
	require_capability("can_browse_stock")
	from erpnext.stock.utils import get_latest_stock_qty, get_stock_balance

	if warehouse:
		return {
			"item_code": item_code,
			"warehouse": warehouse,
			"qty": flt(get_stock_balance(item_code, warehouse)),
		}
	return {"item_code": item_code, "qty": flt(get_latest_stock_qty(item_code))}


def _moves_list(purpose: str, company: str | None = None, limit: int = 50):
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


@frappe.whitelist()
def receipts_list(company: str | None = None, limit: int = 50):
	return _moves_list("Material Receipt", company, limit)


@frappe.whitelist()
def deliveries_list(company: str | None = None, limit: int = 50):
	return _moves_list("Material Issue", company, limit)


@frappe.whitelist()
def transfers_list(company: str | None = None, limit: int = 50):
	return _moves_list("Material Transfer", company, limit)


@frappe.whitelist()
def moves_get(name: str):
	require_capability("can_browse_stock")
	doc = frappe.get_doc("Stock Entry", name)
	return doc.as_dict()


def _create_stock_entry(purpose: str, data):
	require_capability("can_submit_moves")
	payload = parse_json(data)
	company = _company_or_throw(payload.get("company"))
	items = payload.get("items") or []
	if not items:
		frappe.throw(_("At least one item line is required."))

	doc = frappe.new_doc("Stock Entry")
	doc.stock_entry_type = purpose
	doc.company = company
	doc.posting_date = payload.get("posting_date") or nowdate()
	doc.posting_time = payload.get("posting_time") or nowtime()
	doc.from_warehouse = payload.get("from_warehouse")
	doc.to_warehouse = payload.get("to_warehouse")

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

	doc.insert()
	if cint(payload.get("submit")):
		doc.submit()
	return doc.as_dict()


@frappe.whitelist()
def receipts_create(data):
	return _create_stock_entry("Material Receipt", data)


@frappe.whitelist()
def deliveries_create(data):
	return _create_stock_entry("Material Issue", data)


@frappe.whitelist()
def transfers_create(data):
	return _create_stock_entry("Material Transfer", data)


@frappe.whitelist()
def moves_submit(name: str):
	require_capability("can_submit_moves")
	doc = frappe.get_doc("Stock Entry", name)
	if doc.docstatus == 0:
		doc.submit()
	return doc.as_dict()


@frappe.whitelist()
def moves_cancel(name: str):
	require_capability("can_submit_moves")
	doc = frappe.get_doc("Stock Entry", name)
	if doc.docstatus == 1:
		doc.cancel()
	return doc.as_dict()


@frappe.whitelist()
def adjustments_list(company: str | None = None, limit: int = 50):
	require_capability("can_adjust_stock")
	filters = {"docstatus": ["!=", 2]}
	if company:
		filters["company"] = company
	return frappe.get_all(
		"Stock Reconciliation",
		filters=filters,
		fields=["name", "company", "purpose", "posting_date", "docstatus", "creation"],
		limit_page_length=cint(limit),
		order_by="creation desc",
	)


@frappe.whitelist()
def adjustments_get(name: str):
	require_capability("can_adjust_stock")
	return frappe.get_doc("Stock Reconciliation", name).as_dict()


@frappe.whitelist()
def adjustments_create(data):
	require_capability("can_adjust_stock")
	payload = parse_json(data)
	company = _company_or_throw(payload.get("company"))
	items = payload.get("items") or []
	if not items:
		frappe.throw(_("At least one item line is required."))

	doc = frappe.new_doc("Stock Reconciliation")
	doc.company = company
	doc.purpose = payload.get("purpose") or "Stock Reconciliation"
	doc.posting_date = payload.get("posting_date") or nowdate()
	doc.posting_time = payload.get("posting_time") or nowtime()

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

	doc.insert()
	if cint(payload.get("submit")):
		doc.submit()
	return doc.as_dict()


@frappe.whitelist()
def adjustments_submit(name: str):
	require_capability("can_adjust_stock")
	doc = frappe.get_doc("Stock Reconciliation", name)
	if doc.docstatus == 0:
		doc.submit()
	return doc.as_dict()


@frappe.whitelist()
def overview_counts(company: str | None = None):
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
