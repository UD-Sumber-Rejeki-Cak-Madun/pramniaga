"""
Purpose: Integration tests for auth, apps catalog, inventory, and HR API facades.
Last updated: 2026-07-25
Author: Pramniaga
"""

import frappe
from frappe.tests import IntegrationTestCase
from frappe.utils import getdate

from pramniaga.api.common import get_capabilities, get_linked_employee


def _ensure_role(role: str):
	if not frappe.db.exists("Role", role):
		frappe.get_doc({"doctype": "Role", "role_name": role}).insert(ignore_permissions=True)


def _make_user(email: str, roles: list[str], password: str = "password") -> str:
	_ensure_role("Employee")
	for role in roles:
		_ensure_role(role)

	if frappe.db.exists("User", email):
		user = frappe.get_doc("User", email)
	else:
		user = frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": email.split("@")[0],
				"send_welcome_email": 0,
				"new_password": password,
			}
		)
		user.insert(ignore_permissions=True)

	user.enabled = 1
	user.flags.ignore_permissions = True
	user.save()
	for role in roles:
		user.add_roles(role)
	return email


def _make_employee(user_id: str | None, company: str, first_name: str) -> str:
	gender = frappe.db.get_value("Gender", {}, "name") or "Male"
	if not frappe.db.exists("Gender", gender):
		frappe.get_doc({"doctype": "Gender", "gender": "Male"}).insert(ignore_permissions=True)
		gender = "Male"

	doc = frappe.get_doc(
		{
			"doctype": "Employee",
			"first_name": first_name,
			"gender": gender,
			"date_of_birth": "1990-01-01",
			"date_of_joining": getdate(),
			"status": "Active",
			"company": company,
			"user_id": user_id,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.name


class TestPramniagaAuth(IntegrationTestCase):
	def test_guest_session(self):
		frappe.set_user("Guest")
		from pramniaga.api.auth import session

		data = session()
		self.assertFalse(data["logged_in"])
		self.assertEqual(data["user"], None)
		self.assertIsNone(data.get("employee"))
		self.assertFalse(data["capabilities"]["can_use_hr"])

	def test_logged_in_session(self):
		frappe.set_user("Administrator")
		from pramniaga.api.auth import session

		data = session()
		self.assertTrue(data["logged_in"])
		self.assertEqual(data["user"]["name"], "Administrator")
		self.assertTrue(data["capabilities"]["can_manage_items"])
		self.assertTrue(data["capabilities"]["can_use_hr"])
		self.assertIn("employee", data)


class TestPramniagaApps(IntegrationTestCase):
	def test_list_apps_admin_includes_inventory_and_hr(self):
		frappe.set_user("Administrator")
		from pramniaga.api.apps import list_apps

		apps = list_apps()
		names = [app["name"] for app in apps]
		self.assertIn("inventory", names)
		self.assertIn("hr", names)

	def test_list_apps_stock_only_excludes_hr(self):
		email = "stock.only@example.com"
		_make_user(email, ["Stock User"])
		frappe.set_user(email)
		from pramniaga.api.apps import list_apps

		apps = list_apps()
		names = [app["name"] for app in apps]
		self.assertIn("inventory", names)
		self.assertNotIn("hr", names)


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


class TestPramniagaHR(IntegrationTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls.company = frappe.db.get_value("Company", {}, "name")
		if not cls.company:
			raise frappe.ValidationError("No Company available for HR tests")

		cls.ess_email = "hr.ess@example.com"
		cls.other_email = "hr.other@example.com"
		cls.hr_user_email = "hr.user@example.com"
		cls.stock_email = "hr.stock@example.com"

		_make_user(cls.ess_email, ["Employee", "Employee Self Service"])
		_make_user(cls.other_email, ["Employee"])
		_make_user(cls.hr_user_email, ["HR User"])
		_make_user(cls.stock_email, ["Stock User"])

		cls.ess_employee = _make_employee(cls.ess_email, cls.company, "Ess")
		cls.other_employee = _make_employee(cls.other_email, cls.company, "Other")

	def test_guest_denied_on_hr_endpoints(self):
		frappe.set_user("Guest")
		from pramniaga.api.hr import employee_me, employees_list, overview_counts

		with self.assertRaises(frappe.AuthenticationError):
			employee_me()
		with self.assertRaises(frappe.AuthenticationError):
			employees_list()
		with self.assertRaises(frappe.AuthenticationError):
			overview_counts()

	def test_stock_user_cannot_use_hr(self):
		frappe.set_user(self.stock_email)
		caps = get_capabilities()
		self.assertFalse(caps["can_use_hr"])
		from pramniaga.api.hr import employee_me

		with self.assertRaises(frappe.PermissionError):
			employee_me()

	def test_ess_self_service_and_employee_me(self):
		frappe.set_user(self.ess_email)
		caps = get_capabilities()
		self.assertTrue(caps["can_use_hr"])
		self.assertTrue(caps["can_self_service"])
		self.assertFalse(caps["can_view_employees"])

		from pramniaga.api.hr import employee_me

		me = employee_me()
		self.assertIsNotNone(me)
		self.assertEqual(me["name"], self.ess_employee)
		self.assertEqual(me["user_id"], self.ess_email)
		self.assertNotIn("ctc", me or {})
		self.assertNotIn("bank_ac_no", me or {})

	def test_employee_me_ignores_other_employee_identity(self):
		"""IDOR: employee_me always resolves from session user_id, never request body."""
		frappe.set_user(self.ess_email)
		from pramniaga.api.hr import employee_me

		me = employee_me()
		self.assertEqual(me["name"], self.ess_employee)
		self.assertNotEqual(me["name"], self.other_employee)
		linked = get_linked_employee(self.ess_email)
		self.assertEqual(linked["name"], self.ess_employee)

	def test_hr_user_directory_excludes_salary_fields(self):
		frappe.set_user(self.hr_user_email)
		caps = get_capabilities()
		self.assertTrue(caps["can_view_employees"])
		self.assertFalse(caps["can_manage_employees"])

		from pramniaga.api.hr import employees_list

		rows = employees_list(company=self.company)
		self.assertIsInstance(rows, list)
		self.assertTrue(any(row["name"] == self.ess_employee for row in rows))
		for row in rows:
			self.assertNotIn("ctc", row)
			self.assertNotIn("bank_ac_no", row)
			self.assertNotIn("iban", row)
			self.assertNotIn("salary_mode", row)

	def test_ess_cannot_list_employees(self):
		frappe.set_user(self.ess_email)
		from pramniaga.api.hr import employees_list

		with self.assertRaises(frappe.PermissionError):
			employees_list()

	def test_overview_counts_scoped(self):
		frappe.set_user(self.ess_email)
		from pramniaga.api.hr import overview_counts

		counts = overview_counts(company=self.company)
		self.assertIn("hrms_available", counts)
		self.assertNotIn("people", counts)
		self.assertIn("my_leave_open", counts)

		frappe.set_user(self.hr_user_email)
		admin_counts = overview_counts(company=self.company)
		self.assertIn("people", admin_counts)
		self.assertGreaterEqual(admin_counts["people"], 1)
