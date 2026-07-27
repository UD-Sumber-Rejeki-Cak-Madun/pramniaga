"""
Purpose: Integration tests for Pramniaga auth, apps, and inventory APIs.
Exports: TestPramniagaAuth, TestPramniagaApps, TestPramniagaInventory

Last updated: 2026-07-26
Author: Pramniaga
"""

from unittest.mock import patch
import base64

import frappe
from frappe.tests import IntegrationTestCase
from frappe.utils import flt

from pramniaga.api.common import get_capabilities


class TestPramniagaAuth(IntegrationTestCase):
	def test_guest_session(self):
		frappe.set_user("Guest")
		from pramniaga.api.auth import session

		data = session()
		self.assertFalse(data["logged_in"])
		self.assertEqual(data["user"], None)

	def test_logged_in_session(self):
		frappe.set_user("Administrator")
		from pramniaga.api.auth import session

		data = session()
		self.assertTrue(data["logged_in"])
		self.assertEqual(data["user"]["name"], "Administrator")
		self.assertTrue(data["capabilities"]["can_manage_items"])


class TestPramniagaApps(IntegrationTestCase):
	def test_list_apps_inventory_only(self):
		frappe.set_user("Administrator")
		from pramniaga.api.apps import list_apps

		apps = list_apps()
		self.assertEqual(len(apps), 1)
		self.assertEqual(apps[0]["name"], "inventory")


class TestPramniagaInventory(IntegrationTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")

	def setUp(self):
		frappe.set_user("Administrator")

	def test_capabilities_for_admin(self):
		caps = get_capabilities()
		self.assertTrue(caps["can_manage_items"])
		self.assertTrue(caps["can_submit_moves"])
		self.assertTrue(caps["can_adjust_stock"])

	def test_items_list(self):
		from pramniaga.api.inventory import items_list

		items = items_list()
		self.assertIsInstance(items, list)

	def test_overview_counts(self):
		from pramniaga.api.inventory import overview_counts

		counts = overview_counts()
		self.assertIn("products", counts)
		self.assertIn("receipt", counts)
		self.assertIn("warehouses", counts)

	def test_guest_cannot_browse_or_create_items(self):
		from pramniaga.api.inventory import items_create, items_list

		frappe.set_user("Guest")
		with self.assertRaises(frappe.AuthenticationError):
			items_list()
		with self.assertRaises(frappe.AuthenticationError):
			items_create({"item_code": "SHOULD-FAIL"})

	def test_underprivileged_cannot_manage_items(self):
		from pramniaga.api.inventory import items_create, items_list

		denied = {
			"can_browse_stock": False,
			"can_manage_items": False,
			"can_manage_warehouses": False,
			"can_submit_moves": False,
			"can_adjust_stock": False,
		}
		with patch("pramniaga.api.common.get_capabilities", return_value=denied):
			with self.assertRaises(frappe.PermissionError):
				items_list()
			with self.assertRaises(frappe.PermissionError):
				items_create({"item_code": "SHOULD-FAIL"})

	def test_items_create_ignores_forged_doctype(self):
		from pramniaga.api.inventory import items_create

		item_code = f"PRA-SAFE-{frappe.generate_hash(length=6)}"
		item_group = frappe.db.get_value("Item Group", {"is_group": 0}, "name")
		if not item_group:
			self.skipTest("No leaf Item Group available")

		doc = items_create(
			{
				"doctype": "Warehouse",
				"name": "HACKED-NAME",
				"item_code": item_code,
				"item_name": item_code,
				"item_group": item_group,
				"stock_uom": "Nos",
				"is_stock_item": 1,
			}
		)
		self.assertEqual(doc.get("doctype"), "Item")
		self.assertEqual(doc.get("item_code"), item_code)
		self.assertTrue(frappe.db.exists("Item", item_code))
		self.assertFalse(frappe.db.exists("Warehouse", "HACKED-NAME"))

	def test_stock_and_overview_require_company(self):
		from pramniaga.api.inventory import overview_counts, stock_on_hand

		with patch("pramniaga.api.inventory._helpers.get_default_company", return_value=None):
			with self.assertRaises(frappe.ValidationError):
				stock_on_hand(company=None)
			with self.assertRaises(frappe.ValidationError):
				overview_counts(company=None)

	def test_overview_warehouses_are_company_scoped(self):
		from pramniaga.api.inventory import overview_counts

		company = frappe.db.get_value("Company", {}, "name")
		if not company:
			self.skipTest("No Company available")

		counts = overview_counts(company=company)
		expected = frappe.db.count(
			"Warehouse",
			{"disabled": 0, "is_group": 0, "company": company},
		)
		self.assertEqual(counts["warehouses"], expected)

	def test_create_item_and_receipt_flow(self):
		from pramniaga.api.inventory import items_create, receipts_create, stock_on_hand

		item_code = f"PRA-TEST-{frappe.generate_hash(length=6)}"
		company = frappe.db.get_value("Company", {}, "name")
		warehouse = frappe.db.get_value(
			"Warehouse", {"company": company, "is_group": 0, "disabled": 0}, "name"
		)
		if not warehouse:
			self.skipTest("No leaf warehouse available")

		item_group = frappe.db.get_value("Item Group", {"is_group": 0}, "name")
		items_create(
			{
				"item_code": item_code,
				"item_name": item_code,
				"item_group": item_group,
				"stock_uom": "Nos",
				"is_stock_item": 1,
				"valuation_rate": 100,
			}
		)

		receipts_create(
			{
				"company": company,
				"to_warehouse": warehouse,
				"submit": 1,
				"items": [
					{
						"item_code": item_code,
						"qty": 5,
						"warehouse": warehouse,
						"basic_rate": 100,
					}
				],
			}
		)

		rows = stock_on_hand(company=company, item_code=item_code, warehouse=warehouse)
		self.assertTrue(any(row["actual_qty"] >= 5 for row in rows))

		from pramniaga.api.inventory import receipts_list

		summaries = receipts_list(company=company, limit=20)
		matched = next((row for row in summaries if item_code in (row.get("lines_summary") or "")), None)
		self.assertIsNotNone(matched)
		self.assertEqual(matched["line_count"], 1)
		self.assertEqual(flt(matched["total_qty"]), 5)

	def test_items_upload_media_sets_image(self):
		from pramniaga.api.inventory import items_create, items_get_media, items_upload_media

		item_code = f"PRA-IMG-{frappe.generate_hash(length=6)}"
		item_group = frappe.db.get_value("Item Group", {"is_group": 0}, "name")
		if not item_group:
			self.skipTest("No leaf Item Group available")

		items_create(
			{
				"item_code": item_code,
				"item_name": item_code,
				"item_group": item_group,
				"stock_uom": "Nos",
				"is_stock_item": 1,
			}
		)

		# 1x1 PNG
		png_b64 = (
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
		)
		result = items_upload_media(
			item_code=item_code,
			media_kind="image",
			filename="dot.png",
			filedata=png_b64,
		)
		self.assertEqual(result["media_kind"], "image")
		self.assertTrue(result["file_url"])
		self.assertEqual(frappe.db.get_value("Item", item_code, "image"), result["file_url"])

		media = items_get_media(item_code)
		self.assertEqual(media["image"], result["file_url"])

	def test_underprivileged_cannot_upload_media(self):
		from pramniaga.api.inventory import items_upload_media

		denied = {
			"can_browse_stock": True,
			"can_manage_items": False,
			"can_manage_warehouses": False,
			"can_submit_moves": False,
			"can_adjust_stock": False,
		}
		with patch("pramniaga.api.common.get_capabilities", return_value=denied):
			with self.assertRaises(frappe.PermissionError):
				items_upload_media(
					item_code="ANY",
					media_kind="image",
					filename="dot.png",
					filedata="aaaa",
				)

	def test_template_attributes_and_variants_create(self):
		from pramniaga.api.inventory import (
			items_create,
			items_set_attributes,
			variants_create,
			variants_create_many,
			variants_list,
		)

		item_group = frappe.db.get_value("Item Group", {"is_group": 0}, "name")
		if not item_group:
			self.skipTest("No leaf Item Group available")

		suffix = frappe.generate_hash(length=6)
		template_code = f"PRA-TPL-{suffix}"
		attr_color = f"PRA Color {suffix}"
		attr_size = f"PRA Size {suffix}"

		items_create(
			{
				"item_code": template_code,
				"item_name": template_code,
				"item_group": item_group,
				"stock_uom": "Nos",
				"is_stock_item": 1,
				"has_variants": 1,
			}
		)

		items_set_attributes(
			template_code,
			[
				{"attribute": attr_color, "values": ["Red", "Blue"]},
				{"attribute": attr_size, "values": ["S", "M"]},
			],
		)

		template = frappe.get_doc("Item", template_code)
		self.assertEqual(len(template.attributes), 2)

		single = variants_create(
			template_code,
			{attr_color: "Red", attr_size: "S"},
		)
		self.assertEqual(single.get("variant_of"), template_code)
		self.assertTrue(frappe.db.exists("Item", single["name"]))

		batch = variants_create_many(
			template_code,
			[
				{attr_color: "Red", attr_size: "M"},
				{attr_color: "Blue", attr_size: "S"},
			],
		)
		self.assertEqual(len(batch["created"]), 2)
		self.assertEqual(batch["errors"], [])

		listed = variants_list(template_code)
		self.assertGreaterEqual(len(listed), 3)

	def test_underprivileged_cannot_create_variants(self):
		from pramniaga.api.inventory import variants_create, variants_create_many

		denied = {
			"can_browse_stock": True,
			"can_manage_items": False,
			"can_manage_warehouses": False,
			"can_submit_moves": False,
			"can_adjust_stock": False,
		}
		with patch("pramniaga.api.common.get_capabilities", return_value=denied):
			with self.assertRaises(frappe.PermissionError):
				variants_create("ANY", {"Colour": "Red"})
			with self.assertRaises(frappe.PermissionError):
				variants_create_many("ANY", [{"Colour": "Red"}])

	def test_items_suggest_code_and_create_barcode(self):
		from pramniaga.api.inventory import items_create, items_suggest_code

		item_group = frappe.db.get_value("Item Group", {"is_group": 0}, "name")
		if not item_group:
			self.skipTest("No leaf Item Group available")

		suggested = items_suggest_code()
		self.assertTrue(suggested["item_code"].startswith("PRM-"))
		self.assertEqual(suggested["item_code"], suggested["barcode"])

		doc = items_create(
			{
				"item_code": suggested["item_code"],
				"item_name": "Suggest barcode item",
				"item_group": item_group,
				"stock_uom": "Nos",
				"is_stock_item": 1,
			}
		)
		self.assertEqual(doc.get("barcode"), suggested["item_code"])
		barcodes = frappe.get_all(
			"Item Barcode",
			filters={"parent": suggested["item_code"]},
			pluck="barcode",
		)
		self.assertIn(suggested["item_code"], barcodes)

	def test_variant_barcode_matches_item_code(self):
		from pramniaga.api.inventory import items_create, items_set_attributes, variants_create

		item_group = frappe.db.get_value("Item Group", {"is_group": 0}, "name")
		if not item_group:
			self.skipTest("No leaf Item Group available")

		suffix = frappe.generate_hash(length=6)
		template_code = f"PRA-BC-{suffix}"
		attr_color = f"PRA BC Color {suffix}"

		items_create(
			{
				"item_code": template_code,
				"item_name": template_code,
				"item_group": item_group,
				"stock_uom": "Nos",
				"is_stock_item": 1,
				"has_variants": 1,
			}
		)
		items_set_attributes(template_code, [{"attribute": attr_color, "values": ["Red", "Blue"]}])
		variant = variants_create(template_code, {attr_color: "Red"})
		self.assertEqual(variant.get("barcode"), variant.get("item_code"))
		barcodes = frappe.get_all(
			"Item Barcode",
			filters={"parent": variant["name"]},
			pluck="barcode",
		)
		self.assertIn(variant["item_code"], barcodes)

	def test_items_uom_media_upload(self):
		from pramniaga.api.inventory import (
			items_create,
			items_get_uom_media,
			items_update,
			items_upload_uom_media,
		)

		item_group = frappe.db.get_value("Item Group", {"is_group": 0}, "name")
		if not item_group:
			self.skipTest("No leaf Item Group available")

		packing_uom = frappe.db.get_value("UOM", {"name": ["!=", "Nos"]}, "name")
		if not packing_uom:
			self.skipTest("No alternate UOM available")

		item_code = f"PRA-UOM-{frappe.generate_hash(length=6)}"
		items_create(
			{
				"item_code": item_code,
				"item_name": item_code,
				"item_group": item_group,
				"stock_uom": "Nos",
				"is_stock_item": 1,
			}
		)
		items_update(item_code, {"uoms": [{"uom": packing_uom, "conversion_factor": 12}]})

		png_b64 = (
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
		)
		uploaded = items_upload_uom_media(
			item_code=item_code,
			uom=packing_uom,
			filename="pack.png",
			filedata=png_b64,
		)
		self.assertTrue(uploaded["image_url"])

		media = items_get_uom_media(item_code)
		uoms = {row["uom"]: row.get("image_url") for row in media["media"]}
		self.assertIn("Nos", uoms)
		self.assertIn(packing_uom, uoms)
		self.assertEqual(uoms[packing_uom], uploaded["image_url"])

	def _ensure_category_tree(self, suffix: str):
		"""Create parent category + two leaf subcategories for tests."""
		root = frappe.db.get_value("Item Group", {"parent_item_group": ["in", ["", None]]}, "name")
		if not root:
			root = "All Item Groups"
			if not frappe.db.exists("Item Group", root):
				self.skipTest("No Item Group root available")

		parent = f"PRA Cat {suffix}"
		leaf_a = f"PRA Sub A {suffix}"
		leaf_b = f"PRA Sub B {suffix}"

		if not frappe.db.exists("Item Group", parent):
			frappe.get_doc(
				{
					"doctype": "Item Group",
					"item_group_name": parent,
					"parent_item_group": root,
					"is_group": 1,
				}
			).insert()
		if not frappe.db.exists("Item Group", leaf_a):
			frappe.get_doc(
				{
					"doctype": "Item Group",
					"item_group_name": leaf_a,
					"parent_item_group": parent,
					"is_group": 0,
				}
			).insert()
		if not frappe.db.exists("Item Group", leaf_b):
			frappe.get_doc(
				{
					"doctype": "Item Group",
					"item_group_name": leaf_b,
					"parent_item_group": parent,
					"is_group": 0,
				}
			).insert()

		return parent, leaf_a, leaf_b

	def test_item_groups_tree_returns_parents_with_children(self):
		from pramniaga.api.inventory import item_groups_tree

		suffix = frappe.generate_hash(length=6)
		parent, leaf_a, leaf_b = self._ensure_category_tree(suffix)
		tree = item_groups_tree()
		self.assertIsInstance(tree, list)

		def find(nodes, name):
			for node in nodes:
				if node["name"] == name:
					return node
				found = find(node.get("children") or [], name)
				if found:
					return found
			return None

		parent_node = find(tree, parent)
		self.assertIsNotNone(parent_node)
		child_names = {c["name"] for c in parent_node.get("children") or []}
		self.assertIn(leaf_a, child_names)
		self.assertIn(leaf_b, child_names)

	def test_items_list_filters_by_leaf_and_parent_descendants(self):
		from pramniaga.api.inventory import items_create, items_list

		suffix = frappe.generate_hash(length=6)
		parent, leaf_a, leaf_b = self._ensure_category_tree(suffix)

		item_a = f"PRA-CA-{suffix}"
		item_b = f"PRA-CB-{suffix}"
		items_create(
			{
				"item_code": item_a,
				"item_name": item_a,
				"item_group": leaf_a,
				"stock_uom": "Nos",
				"is_stock_item": 1,
			}
		)
		items_create(
			{
				"item_code": item_b,
				"item_name": item_b,
				"item_group": leaf_b,
				"stock_uom": "Nos",
				"is_stock_item": 1,
			}
		)

		leaf_rows = items_list(item_group=leaf_a, include_descendants=0, exclude_variants=1, limit=100)
		leaf_codes = {r["item_code"] for r in leaf_rows}
		self.assertIn(item_a, leaf_codes)
		self.assertNotIn(item_b, leaf_codes)
		matched = next(r for r in leaf_rows if r["item_code"] == item_a)
		self.assertEqual(matched.get("category"), parent)
		self.assertEqual(matched.get("category_path"), f"{parent} · {leaf_a}")

		parent_rows = items_list(item_group=parent, include_descendants=1, exclude_variants=1, limit=100)
		parent_codes = {r["item_code"] for r in parent_rows}
		self.assertIn(item_a, parent_codes)
		self.assertIn(item_b, parent_codes)

	def test_guest_cannot_read_item_groups_tree(self):
		from pramniaga.api.inventory import item_groups_tree

		frappe.set_user("Guest")
		with self.assertRaises(frappe.AuthenticationError):
			item_groups_tree()

	def test_items_upload_rejects_svg_and_mismatched_content(self):
		from pramniaga.api.inventory import items_create, items_upload_media

		item_group = frappe.db.get_value("Item Group", {"is_group": 0}, "name")
		if not item_group:
			self.skipTest("No leaf Item Group available")

		item_code = f"PRA-SVG-{frappe.generate_hash(length=6)}"
		items_create(
			{
				"item_code": item_code,
				"item_name": item_code,
				"item_group": item_group,
				"stock_uom": "Nos",
				"is_stock_item": 1,
			}
		)

		svg_b64 = base64.b64encode(b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').decode()
		with self.assertRaises(frappe.ValidationError):
			items_upload_media(
				item_code=item_code,
				media_kind="image",
				filename="evil.svg",
				filedata=svg_b64,
			)

		# Extension says PNG but payload is plain text.
		fake_png = base64.b64encode(b"not-a-real-png").decode()
		with self.assertRaises(frappe.ValidationError):
			items_upload_media(
				item_code=item_code,
				media_kind="image",
				filename="fake.png",
				filedata=fake_png,
			)

	def test_items_update_cannot_change_has_variants(self):
		from pramniaga.api.inventory import items_create, items_update

		item_group = frappe.db.get_value("Item Group", {"is_group": 0}, "name")
		if not item_group:
			self.skipTest("No leaf Item Group available")

		item_code = f"PRA-HV-{frappe.generate_hash(length=6)}"
		items_create(
			{
				"item_code": item_code,
				"item_name": item_code,
				"item_group": item_group,
				"stock_uom": "Nos",
				"is_stock_item": 1,
				"has_variants": 0,
			}
		)
		with self.assertRaises(frappe.ValidationError):
			items_update(item_code, {"has_variants": 1})

	def test_items_list_exclude_templates(self):
		from pramniaga.api.inventory import items_create, items_list

		item_group = frappe.db.get_value("Item Group", {"is_group": 0}, "name")
		if not item_group:
			self.skipTest("No leaf Item Group available")

		suffix = frappe.generate_hash(length=6)
		standalone = f"PRA-ST-{suffix}"
		template = f"PRA-TP-{suffix}"
		items_create(
			{
				"item_code": standalone,
				"item_name": standalone,
				"item_group": item_group,
				"stock_uom": "Nos",
				"is_stock_item": 1,
			}
		)
		items_create(
			{
				"item_code": template,
				"item_name": template,
				"item_group": item_group,
				"stock_uom": "Nos",
				"is_stock_item": 1,
				"has_variants": 1,
			}
		)

		rows = items_list(exclude_templates=1, limit=500)
		codes = {r["item_code"] for r in rows}
		self.assertIn(standalone, codes)
		self.assertNotIn(template, codes)

	def test_variants_create_many_rejects_oversized_batch(self):
		from pramniaga.api.inventory import items_create, items_set_attributes, variants_create_many
		from pramniaga.api.inventory.items import VARIANTS_CREATE_MANY_MAX

		item_group = frappe.db.get_value("Item Group", {"is_group": 0}, "name")
		if not item_group:
			self.skipTest("No leaf Item Group available")

		suffix = frappe.generate_hash(length=6)
		template_code = f"PRA-MAX-{suffix}"
		attr_color = f"PRA Max Color {suffix}"
		items_create(
			{
				"item_code": template_code,
				"item_name": template_code,
				"item_group": item_group,
				"stock_uom": "Nos",
				"is_stock_item": 1,
				"has_variants": 1,
			}
		)
		items_set_attributes(template_code, [{"attribute": attr_color, "values": ["Red"]}])
		oversized = [{attr_color: "Red"} for _ in range(VARIANTS_CREATE_MANY_MAX + 1)]
		with self.assertRaises(frappe.ValidationError):
			variants_create_many(template_code, oversized)
