import frappe
from frappe.tests import IntegrationTestCase

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

		rows = stock_on_hand(item_code=item_code, warehouse=warehouse)
		self.assertTrue(any(row["actual_qty"] >= 5 for row in rows))
