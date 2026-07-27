"""
Purpose: Item, item-group, UOM, attribute, media, and variant whitelisted APIs.
Exports: items_*, item_groups_list, item_groups_tree, uoms_list, attributes_*, variants_*.

Last updated: 2026-07-26
Author: Pramniaga
"""

import base64
import re

import frappe
from frappe import _
from frappe.utils import cint
from frappe.utils.file_manager import save_file

from pramniaga.api.common import parse_json, require_capability
from pramniaga.api.inventory._helpers import _item_fields, _safe_payload

PRODUCT_VIDEO_PREFIX = "product-video-"
PRODUCT_UOM_IMAGE_PREFIX = "product-uom-"
IMAGE_MAX_BYTES = 5 * 1024 * 1024
VIDEO_MAX_BYTES = 50 * 1024 * 1024
# SVG omitted on purpose — public uploads would be a stored XSS vector.
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".webm"}
ITEM_CODE_PREFIX = "PRM-"
VARIANTS_CREATE_MANY_MAX = 100


@frappe.whitelist()
def items_list(
	search: str | None = None,
	limit: int = 50,
	start: int = 0,
	exclude_variants: int | None = 0,
	exclude_templates: int | None = 0,
	item_group: str | None = None,
	include_descendants: int | None = 1,
):
	"""
	items_list - List enabled Items with optional search and category filter.

	Args:
		search: Optional item_code LIKE filter.
		limit: Page size.
		start: Offset.
		exclude_variants: When truthy, omit child variants (templates + standalone only).
			Defaults to off so stock forms can pick variant SKUs.
		exclude_templates: When truthy, omit has_variants templates (standalone + variants).
			Use on stock move / adjustment pickers.
		item_group: Leaf or parent Item Group name to filter by.
		include_descendants: When truthy (default), parent filters include descendant leaves.

	Returns:
		List of Item dicts with category / category_path enrichment.
	"""
	require_capability("can_browse_stock")
	filters: dict = {"disabled": 0}
	if cint(exclude_variants):
		# Child variants link back to a template; keep templates + standalone only.
		filters["variant_of"] = ["in", ["", None]]
	if cint(exclude_templates):
		filters["has_variants"] = 0
	if search:
		filters["item_code"] = ["like", f"%{search}%"]
	if item_group:
		group_names = _item_group_filter_names(item_group, include_descendants=cint(include_descendants))
		if len(group_names) == 1:
			filters["item_group"] = group_names[0]
		else:
			filters["item_group"] = ["in", group_names]

	rows = frappe.get_all(
		"Item",
		filters=filters,
		fields=_item_fields(),
		limit_page_length=cint(limit),
		limit_start=cint(start),
		order_by="modified desc",
	)
	return _enrich_items_with_barcode(_enrich_items_with_category(rows))


@frappe.whitelist()
def items_get(item_code: str):
	"""
	items_get - Return one Item as_dict with category path enrichment.

	Args:
		item_code: Item name/code.

	Returns:
		Item as_dict including category and category_path when available.
	"""
	require_capability("can_browse_stock")
	doc = frappe.get_doc("Item", item_code)
	data = doc.as_dict()
	enriched = _enrich_items_with_barcode(_enrich_items_with_category([data]))
	return enriched[0] if enriched else data


@frappe.whitelist()
def items_suggest_code():
	"""
	items_suggest_code - Suggest a unique item code used as SKU and barcode.

	Returns:
		Dict with item_code and barcode (same value).
	"""
	require_capability("can_manage_items")
	for _ in range(24):
		code = f"{ITEM_CODE_PREFIX}{frappe.generate_hash(length=8).upper()}"
		if _item_code_available(code):
			return {"item_code": code, "barcode": code}
	frappe.throw(_("Could not generate a unique item code"))


@frappe.whitelist()
def items_create(data):
	"""
	items_create - Insert Item from SPA payload.

	Templates (has_variants) require an attributes table in ERPNext. When the SPA
	creates a template before the enrichment step, bootstrap a Colour attribute.
	Item code doubles as the primary barcode (same-value rule).

	Args:
		data: JSON/dict Item fields.

	Returns:
		Inserted Item as_dict.
	"""
	require_capability("can_manage_items")
	payload = _safe_payload(data)
	item_code = (payload.get("item_code") or "").strip()
	if not item_code:
		frappe.throw(_("Item code is required"))
	payload["item_code"] = item_code
	if not payload.get("item_name"):
		payload["item_name"] = item_code
	_ensure_payload_barcode(payload, item_code)
	# ERPNext rejects has_variants without attributes; bootstrap until enrichment.
	if cint(payload.get("has_variants")) and not payload.get("attributes"):
		_ensure_attribute_with_values("Colour", ["Default"])
		payload["attributes"] = [{"attribute": "Colour"}]
	doc = frappe.get_doc({"doctype": "Item", **payload})
	doc.insert()
	return _enrich_items_with_barcode([doc.as_dict()])[0]


@frappe.whitelist()
def items_update(item_code: str, data):
	"""
	items_update - Update Item fields (item_code immutable).

	Accepts packing `uoms` rows (UOM Conversion Detail) alongside scalar fields.

	Args:
		item_code: Item to update.
		data: JSON/dict of fields to set.

	Returns:
		Updated Item as_dict.
	"""
	require_capability("can_manage_items")
	doc = frappe.get_doc("Item", item_code)
	payload = _safe_payload(data, drop=("doctype", "name", "item_code"))
	if "has_variants" in payload and cint(payload.get("has_variants")) != cint(doc.has_variants):
		frappe.throw(_("Cannot change the variants setting after the product is created"))
	# Ignore no-op has_variants so clients may echo the current value.
	payload.pop("has_variants", None)
	if "uoms" in payload:
		payload["uoms"] = _normalize_uom_rows(payload.get("uoms"), doc.stock_uom)
	for key, value in payload.items():
		doc.set(key, value)
	doc.save()
	return _enrich_items_with_barcode([doc.as_dict()])[0]


@frappe.whitelist()
def items_get_media(item_code: str):
	"""
	items_get_media - Return main image and primary product video for an Item.

	Args:
		item_code: Item name/code.

	Returns:
		Dict with item_code, image, and video_url.
	"""
	require_capability("can_browse_stock")
	if not frappe.db.exists("Item", item_code):
		frappe.throw(_("Item not found"))
	image = frappe.db.get_value("Item", item_code, "image")
	video = _find_product_video(item_code)
	return {
		"item_code": item_code,
		"image": image,
		"video_url": video.file_url if video else None,
		"video_file_name": video.file_name if video else None,
	}


@frappe.whitelist()
def items_upload_media(item_code: str, media_kind: str, filename: str | None = None, filedata: str | None = None):
	"""
	items_upload_media - Attach an image or video to an Item.

	Image uploads set Item.image. Video uploads replace the primary product-video File.

	Args:
		item_code: Item name/code.
		media_kind: "image" or "video".
		filename: Original filename (required with filedata; optional with multipart).
		filedata: Optional base64 payload (data URL or raw). Multipart `file` is preferred.

	Returns:
		Dict with item_code, media_kind, file_url, and image/video_url as applicable.
	"""
	require_capability("can_manage_items")
	if not frappe.db.exists("Item", item_code):
		frappe.throw(_("Item not found"))

	kind = (media_kind or "").strip().lower()
	if kind not in {"image", "video"}:
		frappe.throw(_("media_kind must be image or video"))

	fname, content = _read_upload_content(filename, filedata)
	_validate_media_file(kind, fname, content)

	if kind == "image":
		file_doc = save_file(fname, content, "Item", item_code, is_private=0, df="image")
		frappe.db.set_value("Item", item_code, "image", file_doc.file_url)
		return {
			"item_code": item_code,
			"media_kind": "image",
			"file_url": file_doc.file_url,
			"image": file_doc.file_url,
			"video_url": None,
		}

	# Replace previous product videos so the SPA has a single primary clip.
	_clear_product_videos(item_code)
	safe_name = f"{PRODUCT_VIDEO_PREFIX}{_sanitize_filename(fname)}"
	file_doc = save_file(safe_name, content, "Item", item_code, is_private=0)
	return {
		"item_code": item_code,
		"media_kind": "video",
		"file_url": file_doc.file_url,
		"image": frappe.db.get_value("Item", item_code, "image"),
		"video_url": file_doc.file_url,
	}


@frappe.whitelist()
def items_get_uom_media(item_code: str):
	"""
	items_get_uom_media - Return image URLs for stock and packing UOMs on an Item.

	Args:
		item_code: Item name/code.

	Returns:
		Dict with item_code, stock_uom, and media[] of {uom, image_url, conversion_factor}.
	"""
	require_capability("can_browse_stock")
	if not frappe.db.exists("Item", item_code):
		frappe.throw(_("Item not found"))

	doc = frappe.get_doc("Item", item_code)
	uom_rows = _item_uom_media_slots(doc)
	media = []
	for row in uom_rows:
		uom = row["uom"]
		media.append(
			{
				"uom": uom,
				"conversion_factor": row["conversion_factor"],
				"is_stock_uom": row["is_stock_uom"],
				"image_url": _find_uom_image(item_code, uom),
			}
		)
	return {"item_code": item_code, "stock_uom": doc.stock_uom, "media": media}


@frappe.whitelist()
def items_upload_uom_media(
	item_code: str,
	uom: str,
	filename: str | None = None,
	filedata: str | None = None,
):
	"""
	items_upload_uom_media - Attach or replace an image for one Item packing UOM.

	Files are named with prefix product-uom-{safe_uom}- and attached to the Item.

	Args:
		item_code: Item name/code.
		uom: Stock or packing UOM name.
		filename: Original filename (required with filedata; optional with multipart).
		filedata: Optional base64 payload.

	Returns:
		Dict with item_code, uom, and image_url.
	"""
	require_capability("can_manage_items")
	if not frappe.db.exists("Item", item_code):
		frappe.throw(_("Item not found"))

	uom_name = (uom or "").strip()
	if not uom_name:
		frappe.throw(_("UOM is required"))

	doc = frappe.get_doc("Item", item_code)
	allowed = {doc.stock_uom} | {row.uom for row in doc.uoms if row.uom}
	if uom_name not in allowed:
		frappe.throw(_("UOM {0} is not configured on this product").format(uom_name))

	fname, content = _read_upload_content(filename, filedata)
	_validate_media_file("image", fname, content)
	_clear_uom_images(item_code, uom_name)
	safe_name = f"{_uom_file_prefix(uom_name)}{_sanitize_filename(fname)}"
	file_doc = save_file(safe_name, content, "Item", item_code, is_private=0)
	return {
		"item_code": item_code,
		"uom": uom_name,
		"image_url": file_doc.file_url,
		"file_url": file_doc.file_url,
	}


@frappe.whitelist()
def items_set_attributes(item_code: str, attributes):
	"""
	items_set_attributes - Ensure Item Attributes + values, then set template attribute rows.

	Args:
		item_code: Template Item name/code (must have has_variants).
		attributes: JSON list of {attribute, values[]} for non-numeric attributes.

	Returns:
		Updated Item as_dict.
	"""
	require_capability("can_manage_items")
	doc = frappe.get_doc("Item", item_code)
	if not cint(doc.has_variants):
		frappe.throw(_("Only template items can define variant attributes"))

	rows = parse_json(attributes) or []
	if not isinstance(rows, list) or not rows:
		frappe.throw(_("Provide at least one attribute with values"))

	attribute_names: list[str] = []
	for row in rows:
		if not isinstance(row, dict):
			frappe.throw(_("Invalid attribute row"))
		attribute_name = (row.get("attribute") or "").strip()
		values = row.get("values") or []
		if not attribute_name:
			frappe.throw(_("Attribute name is required"))
		if not isinstance(values, list) or not values:
			frappe.throw(_("Attribute {0} needs at least one value").format(attribute_name))
		_ensure_attribute_with_values(attribute_name, [str(v).strip() for v in values if str(v).strip()])
		attribute_names.append(attribute_name)

	doc.set("attributes", [])
	for attribute_name in attribute_names:
		doc.append("attributes", {"attribute": attribute_name})
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
def item_groups_tree():
	"""
	item_groups_tree - Nested Item Group tree for Category → Subcategory UI.

	Returns children of the root "All Item Groups" node (or all roots if missing).
	Each node: name, item_group_name, is_group, parent_item_group, children[].

	Returns:
		List of top-level category nodes with nested children.
	"""
	require_capability("can_browse_stock")
	rows = frappe.get_all(
		"Item Group",
		fields=["name", "item_group_name", "is_group", "parent_item_group", "lft"],
		order_by="lft asc",
	)
	by_parent: dict[str | None, list[dict]] = {}
	for row in rows:
		node = {
			"name": row.name,
			"item_group_name": row.item_group_name or row.name,
			"is_group": cint(row.is_group),
			"parent_item_group": row.parent_item_group,
			"children": [],
		}
		by_parent.setdefault(row.parent_item_group, []).append(node)

	def attach(nodes: list[dict]) -> list[dict]:
		for node in nodes:
			node["children"] = attach(by_parent.get(node["name"], []))
		return nodes

	root_name = _("All Item Groups")
	if root_name in {r.name for r in rows}:
		return attach(by_parent.get(root_name, []))
	# Fallback: nodes with no parent.
	return attach(by_parent.get(None, []) + by_parent.get("", []))


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
	attributes_list - List Item Attributes including allowed values.

	Returns:
		List of Item Attribute dicts with values[].
	"""
	require_capability("can_manage_items")
	attrs = frappe.get_all(
		"Item Attribute",
		fields=["name", "attribute_name", "numeric_values"],
		order_by="name asc",
	)
	for attr in attrs:
		attr["values"] = frappe.get_all(
			"Item Attribute Value",
			filters={"parent": attr["name"]},
			fields=["attribute_value", "abbr"],
			order_by="idx asc",
		)
	return attrs


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
	payload = _safe_payload(data)
	doc = frappe.get_doc({"doctype": "Item Attribute", **payload})
	doc.insert()
	return doc.as_dict()


@frappe.whitelist()
def variants_list(template: str):
	"""
	variants_list - List enabled variants of a template Item with attributes.

	Args:
		template: Template Item name/code.

	Returns:
		List of variant Item dicts including attributes[].
	"""
	require_capability("can_browse_stock")
	variants = frappe.get_all(
		"Item",
		filters={"variant_of": template, "disabled": 0},
		fields=_item_fields(),
		order_by="item_code asc",
	)
	for variant in variants:
		variant["attributes"] = frappe.get_all(
			"Item Variant Attribute",
			filters={"parent": variant["name"]},
			fields=["attribute", "attribute_value"],
			order_by="idx asc",
		)
	return _enrich_items_with_barcode(variants)


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
	_sync_barcode_to_item_code(variant.name)
	return _enrich_items_with_barcode([frappe.get_doc("Item", variant.name).as_dict()])[0]


@frappe.whitelist()
def variants_create_many(template: str, combinations):
	"""
	variants_create_many - Create multiple variants from attribute combinations.

	Args:
		template: Template Item name/code.
		combinations: JSON list of attribute→value dicts.

	Returns:
		Dict with created[] Item dicts and errors[] for failed combos.
	"""
	require_capability("can_manage_items")
	from erpnext.controllers.item_variant import ItemVariantExistsError, create_variant

	combos = parse_json(combinations) or []
	if not isinstance(combos, list) or not combos:
		frappe.throw(_("Provide at least one attribute combination"))
	if len(combos) > VARIANTS_CREATE_MANY_MAX:
		frappe.throw(
			_("At most {0} variants can be created at once").format(VARIANTS_CREATE_MANY_MAX)
		)

	created = []
	errors = []
	for combo in combos:
		if not isinstance(combo, dict) or not combo:
			errors.append({"attributes": combo, "error": "Invalid combination"})
			continue
		try:
			variant = create_variant(template, combo)
			variant.insert()
			_sync_barcode_to_item_code(variant.name)
			created.append(
				_enrich_items_with_barcode([frappe.get_doc("Item", variant.name).as_dict()])[0]
			)
		except ItemVariantExistsError:
			errors.append({"attributes": combo, "error": "Variant already exists"})
		except Exception as exc:
			errors.append({"attributes": combo, "error": str(exc)})
	return {"created": created, "errors": errors}


def _item_code_available(code: str) -> bool:
	"""
	_item_code_available - True when code is unused as Item name and Item Barcode.

	Args:
		code: Candidate item code / barcode.

	Returns:
		Whether the code can be used.
	"""
	if not code:
		return False
	if frappe.db.exists("Item", code):
		return False
	if frappe.db.exists("Item Barcode", {"barcode": code}):
		return False
	return True


def _ensure_payload_barcode(payload: dict, item_code: str):
	"""
	_ensure_payload_barcode - Ensure barcodes child uses the shared item_code value.

	Args:
		payload: Mutable Item create payload.
		item_code: Canonical SKU / barcode string.
	"""
	rows = payload.get("barcodes")
	if not rows:
		payload["barcodes"] = [{"barcode": item_code}]
		return
	if not isinstance(rows, list):
		frappe.throw(_("Invalid barcodes payload"))
	normalized = []
	seen = set()
	for row in rows:
		if not isinstance(row, dict):
			continue
		barcode = (row.get("barcode") or item_code).strip() or item_code
		if barcode in seen:
			continue
		seen.add(barcode)
		normalized.append({**row, "barcode": barcode})
	if item_code not in seen:
		normalized.insert(0, {"barcode": item_code})
	payload["barcodes"] = normalized or [{"barcode": item_code}]


def _sync_barcode_to_item_code(item_name: str):
	"""
	_sync_barcode_to_item_code - Set primary Item barcode equal to item_code.

	Args:
		item_name: Item name (usually same as item_code).
	"""
	doc = frappe.get_doc("Item", item_name)
	code = doc.item_code
	existing = [row.barcode for row in doc.barcodes if row.barcode]
	if existing and existing[0] == code and code in existing:
		return
	doc.set("barcodes", [])
	doc.append("barcodes", {"barcode": code})
	doc.save()


def _normalize_uom_rows(uoms, stock_uom: str) -> list[dict]:
	"""
	_normalize_uom_rows - Sanitize packing UOM conversion rows for Item.uoms.

	Args:
		uoms: Client list of {uom, conversion_factor}.
		stock_uom: Item stock UOM (always included at factor 1).

	Returns:
		List of uom child dicts suitable for doc.set("uoms", ...).
	"""
	from frappe.utils import flt

	rows = parse_json(uoms) or []
	if not isinstance(rows, list):
		frappe.throw(_("Invalid uoms payload"))

	normalized: list[dict] = []
	seen = {stock_uom}
	normalized.append({"uom": stock_uom, "conversion_factor": 1})
	for row in rows:
		if not isinstance(row, dict):
			continue
		uom = (row.get("uom") or "").strip()
		if not uom or uom in seen:
			continue
		if not frappe.db.exists("UOM", uom):
			frappe.throw(_("Unknown UOM {0}").format(uom))
		factor = flt(row.get("conversion_factor") or 0)
		if factor <= 0:
			frappe.throw(_("Conversion factor for {0} must be greater than zero").format(uom))
		seen.add(uom)
		normalized.append({"uom": uom, "conversion_factor": factor})
	return normalized


def _item_uom_media_slots(doc) -> list[dict]:
	"""
	_item_uom_media_slots - Stock UOM plus packing UOMs for media tiles.

	Args:
		doc: Item document.

	Returns:
		List of {uom, conversion_factor, is_stock_uom}.
	"""
	from frappe.utils import flt

	slots = [{"uom": doc.stock_uom, "conversion_factor": 1.0, "is_stock_uom": 1}]
	seen = {doc.stock_uom}
	for row in doc.uoms:
		if not row.uom or row.uom in seen:
			continue
		seen.add(row.uom)
		slots.append(
			{
				"uom": row.uom,
				"conversion_factor": flt(row.conversion_factor) or 1.0,
				"is_stock_uom": 0,
			}
		)
	return slots


def _uom_safe_key(uom: str) -> str:
	"""
	_uom_safe_key - Filesystem-safe UOM token for media prefixes.

	Args:
		uom: UOM name.

	Returns:
		Lowercase hyphenated key.
	"""
	cleaned = re.sub(r"[^A-Za-z0-9]+", "-", (uom or "").strip()).strip("-").lower()
	return cleaned or "uom"


def _uom_file_prefix(uom: str) -> str:
	"""
	_uom_file_prefix - File name prefix for a UOM image on an Item.

	Args:
		uom: UOM name.

	Returns:
		Prefix string ending with a hyphen.
	"""
	return f"{PRODUCT_UOM_IMAGE_PREFIX}{_uom_safe_key(uom)}-"


def _find_uom_image(item_code: str, uom: str) -> str | None:
	"""
	_find_uom_image - Newest File URL for a UOM image prefix on an Item.

	Args:
		item_code: Item name/code.
		uom: UOM name.

	Returns:
		file_url or None.
	"""
	prefix = _uom_file_prefix(uom)
	files = frappe.get_all(
		"File",
		filters={"attached_to_doctype": "Item", "attached_to_name": item_code},
		fields=["file_url", "file_name"],
		order_by="creation desc",
	)
	for row in files:
		if (row.file_name or "").startswith(prefix):
			return row.file_url
	return None


def _clear_uom_images(item_code: str, uom: str):
	"""
	_clear_uom_images - Delete prior UOM image Files for one UOM on an Item.

	Args:
		item_code: Item name/code.
		uom: UOM name.
	"""
	prefix = _uom_file_prefix(uom)
	files = frappe.get_all(
		"File",
		filters={"attached_to_doctype": "Item", "attached_to_name": item_code},
		fields=["name", "file_name"],
	)
	for row in files:
		if (row.file_name or "").startswith(prefix):
			frappe.delete_doc("File", row.name, ignore_permissions=True, force=True)


def _enrich_items_with_barcode(rows: list[dict]) -> list[dict]:
	"""
	_enrich_items_with_barcode - Expose barcode display field (same as item_code).

	Args:
		rows: Item dicts.

	Returns:
		Same rows with barcode set from barcodes child or item_code.
	"""
	for row in rows:
		barcode = None
		barcodes = row.get("barcodes")
		if isinstance(barcodes, list) and barcodes:
			first = barcodes[0]
			if isinstance(first, dict):
				barcode = first.get("barcode")
			else:
				barcode = getattr(first, "barcode", None)
		row["barcode"] = barcode or row.get("item_code")
	return rows


def _item_group_filter_names(item_group: str, include_descendants: int = 1) -> list[str]:
	"""
	_item_group_filter_names - Resolve Item Group name(s) for items_list filters.

	Args:
		item_group: Leaf or parent Item Group name.
		include_descendants: When truthy, expand parents to descendant leaf names.

	Returns:
		List of Item Group names to match against Item.item_group.
	"""
	if not item_group or not frappe.db.exists("Item Group", item_group):
		frappe.throw(_("Category not found"))

	is_group = cint(frappe.db.get_value("Item Group", item_group, "is_group"))
	if not include_descendants or not is_group:
		return [item_group]

	bounds = frappe.db.get_value("Item Group", item_group, ["lft", "rgt"], as_dict=True)
	if not bounds:
		return [item_group]

	leaves = frappe.get_all(
		"Item Group",
		filters={
			"lft": (">=", bounds.lft),
			"rgt": ("<=", bounds.rgt),
			"is_group": 0,
		},
		pluck="name",
	)
	return leaves or [item_group]


def _enrich_items_with_category(rows: list[dict]) -> list[dict]:
	"""
	_enrich_items_with_category - Add category and category_path from parent Item Group.

	Args:
		rows: Item dicts that include item_group.

	Returns:
		Same rows with category / category_path fields set.
	"""
	if not rows:
		return rows

	group_names = {row.get("item_group") for row in rows if row.get("item_group")}
	parents: dict[str, str | None] = {}
	if group_names:
		for row in frappe.get_all(
			"Item Group",
			filters={"name": ["in", list(group_names)]},
			fields=["name", "parent_item_group"],
		):
			parent = row.parent_item_group
			if parent and parent != _("All Item Groups"):
				parents[row.name] = parent
			else:
				parents[row.name] = None

	for row in rows:
		leaf = row.get("item_group")
		category = parents.get(leaf) if leaf else None
		row["category"] = category
		if category and leaf:
			row["category_path"] = f"{category} · {leaf}"
		elif leaf:
			row["category_path"] = leaf
		else:
			row["category_path"] = None
	return rows


def _read_upload_content(filename: str | None, filedata: str | None) -> tuple[str, bytes]:
	"""
	_read_upload_content - Read multipart file or base64 payload from the request.

	Args:
		filename: Optional filename for base64 uploads.
		filedata: Optional base64 content.

	Returns:
		Tuple of (filename, binary content).
	"""
	uploaded = None
	if frappe.request and frappe.request.files:
		uploaded = frappe.request.files.get("file")
	if uploaded and uploaded.filename:
		return uploaded.filename, uploaded.stream.read()

	if not filedata:
		frappe.throw(_("No file attached"))
	raw = filedata
	if "," in raw:
		raw = raw.rsplit(",", 1)[1]
	try:
		content = base64.b64decode(raw)
	except Exception:
		frappe.throw(_("Invalid file data"))
	fname = filename or "upload.bin"
	return fname, content


def _validate_media_file(kind: str, filename: str, content: bytes):
	"""
	_validate_media_file - Enforce extension, size, and magic-byte checks for product media.

	Args:
		kind: image or video.
		filename: Original filename.
		content: Binary file bytes.
	"""
	ext = _file_extension(filename)
	size = len(content)
	if kind == "image":
		if ext not in IMAGE_EXTENSIONS:
			frappe.throw(_("Image must be JPG, PNG, GIF, or WebP"))
		if size > IMAGE_MAX_BYTES:
			frappe.throw(_("Image must be 5 MB or smaller"))
		if not _content_matches_image_extension(ext, content):
			frappe.throw(_("File content does not match a valid image type"))
		return
	if ext not in VIDEO_EXTENSIONS:
		frappe.throw(_("Video must be MP4 or WebM"))
	if size > VIDEO_MAX_BYTES:
		frappe.throw(_("Video must be 50 MB or smaller"))
	if not _content_matches_video_extension(ext, content):
		frappe.throw(_("File content does not match a valid video type"))


def _content_matches_image_extension(ext: str, content: bytes) -> bool:
	"""
	_content_matches_image_extension - True when binary magic matches the claimed image ext.

	Args:
		ext: Lowercase extension including the dot.
		content: File bytes.

	Returns:
		Whether content looks like the claimed image type.
	"""
	if not content:
		return False
	if ext in {".jpg", ".jpeg"}:
		return content.startswith(b"\xff\xd8\xff")
	if ext == ".png":
		return content.startswith(b"\x89PNG\r\n\x1a\n")
	if ext == ".gif":
		return content.startswith(b"GIF87a") or content.startswith(b"GIF89a")
	if ext == ".webp":
		return len(content) >= 12 and content.startswith(b"RIFF") and content[8:12] == b"WEBP"
	return False


def _content_matches_video_extension(ext: str, content: bytes) -> bool:
	"""
	_content_matches_video_extension - True when binary magic matches the claimed video ext.

	Args:
		ext: Lowercase extension including the dot.
		content: File bytes.

	Returns:
		Whether content looks like the claimed video type.
	"""
	if not content:
		return False
	if ext == ".mp4":
		# ISO BMFF: bytes 4-8 are usually "ftyp".
		return len(content) >= 8 and content[4:8] == b"ftyp"
	if ext == ".webm":
		return content.startswith(b"\x1a\x45\xdf\xa3")
	return False


def _file_extension(filename: str) -> str:
	"""
	_file_extension - Lowercase file extension including the dot.

	Args:
		filename: Filename string.

	Returns:
		Extension like ".jpg", or empty string.
	"""
	name = (filename or "").lower()
	dot = name.rfind(".")
	return name[dot:] if dot >= 0 else ""


def _sanitize_filename(filename: str) -> str:
	"""
	_sanitize_filename - Keep a filesystem-safe basename.

	Args:
		filename: Original filename.

	Returns:
		Sanitized basename.
	"""
	base = filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
	cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip("-")
	return cleaned or "media.bin"


def _find_product_video(item_code: str):
	"""
	_find_product_video - Return the newest primary product-video File for an Item.

	Args:
		item_code: Item name/code.

	Returns:
		File-like dict/row or None.
	"""
	files = frappe.get_all(
		"File",
		filters={"attached_to_doctype": "Item", "attached_to_name": item_code},
		fields=["name", "file_url", "file_name"],
		order_by="creation desc",
	)
	for row in files:
		name = row.file_name or ""
		if name.startswith(PRODUCT_VIDEO_PREFIX):
			return row
	return None


def _clear_product_videos(item_code: str):
	"""
	_clear_product_videos - Delete previous primary product-video Files for an Item.

	Only removes files named with PRODUCT_VIDEO_PREFIX so unrelated attachments stay.

	Args:
		item_code: Item name/code.
	"""
	files = frappe.get_all(
		"File",
		filters={"attached_to_doctype": "Item", "attached_to_name": item_code},
		fields=["name", "file_name"],
	)
	for row in files:
		name = row.file_name or ""
		if name.startswith(PRODUCT_VIDEO_PREFIX):
			frappe.delete_doc("File", row.name, ignore_permissions=True, force=True)


def _ensure_attribute_with_values(attribute_name: str, values: list[str]):
	"""
	_ensure_attribute_with_values - Create or update a non-numeric Item Attribute with values.

	Args:
		attribute_name: Attribute name / docname.
		values: Allowed attribute values.
	"""
	if frappe.db.exists("Item Attribute", attribute_name):
		doc = frappe.get_doc("Item Attribute", attribute_name)
		if cint(doc.numeric_values):
			frappe.throw(_("Attribute {0} is numeric and cannot use value chips").format(attribute_name))
	else:
		doc = frappe.get_doc(
			{
				"doctype": "Item Attribute",
				"attribute_name": attribute_name,
				"numeric_values": 0,
			}
		)
		doc.insert()

	existing = {row.attribute_value for row in doc.item_attribute_values}
	used_abbrs = {str(row.abbr).lower() for row in doc.item_attribute_values if row.abbr}
	changed = False
	for value in values:
		if value in existing:
			continue
		abbr = _abbr_for(value, used_abbrs)
		doc.append("item_attribute_values", {"attribute_value": value, "abbr": abbr})
		existing.add(value)
		changed = True
	if changed or doc.is_new():
		# Clear ERPNext attribute-value cache so new values validate immediately.
		frappe.flags.attribute_values = None
		doc.save()


def _abbr_for(value: str, used: set[str]) -> str:
	"""
	_abbr_for - Build a unique abbreviation for an attribute value.

	Args:
		value: Attribute value label.
		used: Set of already-used lowercase abbreviations.

	Returns:
		Unique abbreviation string.
	"""
	alnum = "".join(ch for ch in value if ch.isalnum())
	base = (alnum[:3] or "X").upper()
	abbr = base
	index = 1
	while abbr.lower() in used:
		abbr = f"{base}{index}"
		index += 1
	used.add(abbr.lower())
	return abbr
