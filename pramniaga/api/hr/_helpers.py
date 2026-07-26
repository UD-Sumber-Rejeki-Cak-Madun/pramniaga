"""
Purpose: Shared helpers for the HR API facade (availability + field sets).
Exports: hrms_available, require_hrms, EMPLOYEE_DIRECTORY_FIELDS, EMPLOYEE_SUMMARY_FIELDS.
Non-goals: Whitelisted endpoints.

Last updated: 2026-07-25
Author: Pramniaga
"""

import frappe

# Identity / org only — never include salary, bank, or tax fields in directory payloads.
EMPLOYEE_DIRECTORY_FIELDS = [
	"name",
	"employee_name",
	"company",
	"department",
	"designation",
	"status",
	"image",
	"user_id",
	"date_of_joining",
	"reports_to",
]

EMPLOYEE_SUMMARY_FIELDS = EMPLOYEE_DIRECTORY_FIELDS


def hrms_available() -> bool:
	"""
	hrms_available - Whether the hrms app is installed on this site.

	Returns:
		True if hrms is installed.
	"""
	return "hrms" in frappe.get_installed_apps()


def require_hrms():
	"""
	require_hrms - Throw if HRMS is not installed (leave/attendance/payroll DocTypes).

	Returns:
		None.
	"""
	if not hrms_available():
		frappe.throw("HRMS is not installed", frappe.ValidationError)
