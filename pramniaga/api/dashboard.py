"""
Purpose: Dashboard aggregations for home cards (revenue, activity, events).
Exports: revenue_summary, daily_activities, upcoming_events.
Contents:
  - Helpers: company resolve, permission, month keys, MTD net
  - revenue_summary: 9-month Sales Invoice series + MoM
  - daily_activities: merged recent SI / PE / Stock Entry rows
  - upcoming_events: calendar events for current user
Non-goals: Inventory CRUD (api.inventory.*).
Last updated: 2026-07-24
Author: Pramniaga
"""

import frappe
from frappe.utils import (
	add_days,
	add_months,
	cint,
	flt,
	get_first_day,
	get_last_day,
	getdate,
	now_datetime,
	today,
)

from pramniaga.api.common import get_default_company, require_login


def _resolve_company(company: str | None = None) -> str | None:
	return company or get_default_company()


def _can_read(doctype: str) -> bool:
	return bool(frappe.has_permission(doctype, ptype="read"))


def _month_keys(count: int = 9) -> list[str]:
	"""Return YYYY-MM keys ending with the current month."""
	end = get_first_day(today())
	keys = []
	for i in range(count - 1, -1, -1):
		keys.append(get_first_day(add_months(end, -i)).strftime("%Y-%m"))
	return keys


def _month_label(key: str) -> str:
	return getdate(f"{key}-01").strftime("%b")


@frappe.whitelist()
def revenue_summary(company: str | None = None):
	"""
	revenue_summary - Monthly Sales Invoice totals and MTD income for the dashboard.

	Args:
		company: Optional company; defaults via get_default_company.

	Returns:
			Dict with currency, months[{key,label,income,returns,net}], mtd_total,
			prior_mtd_total, mom_percent, can_read. Empty-safe when SI unreadable.
	"""
	require_login()
	company = _resolve_company(company)

	empty = {
		"company": company,
		"currency": None,
		"can_read": False,
		"months": [],
		"mtd_total": 0,
		"prior_mtd_total": 0,
		"mom_percent": None,
	}

	if not company or not frappe.db.exists("DocType", "Sales Invoice") or not _can_read("Sales Invoice"):
		return empty

	currency = frappe.db.get_value("Company", company, "default_currency")
	month_keys = _month_keys(9)
	start = getdate(f"{month_keys[0]}-01")
	# exclusive end = first day of next month after last key
	end_exclusive = get_first_day(add_months(getdate(f"{month_keys[-1]}-01"), 1))

	rows = frappe.get_all(
		"Sales Invoice",
		filters={
			"docstatus": 1,
			"company": company,
			"posting_date": ["between", [start, add_days(end_exclusive, -1)]],
		},
		fields=["posting_date", "grand_total", "is_return"],
		limit_page_length=0,
	)

	positive = {k: 0.0 for k in month_keys}
	negative = {k: 0.0 for k in month_keys}

	for row in rows:
		key = getdate(row.posting_date).strftime("%Y-%m")
		if key not in positive:
			continue
		amount = abs(flt(row.grand_total))
		if _is_return(row.is_return):
			negative[key] += amount
		else:
			positive[key] += amount

	months = [
		{
			"key": key,
			"label": _month_label(key),
			"income": round(positive[key], 2),
			"returns": round(negative[key], 2),
			"net": round(positive[key] - negative[key], 2),
		}
		for key in month_keys
	]

	today_date = getdate(today())
	current_month = today_date.strftime("%Y-%m")
	prior_month = get_first_day(add_months(today_date, -1)).strftime("%Y-%m")
	day_of_month = today_date.day

	mtd_total = _mtd_net(company, current_month, day_of_month)
	prior_mtd_total = _mtd_net(company, prior_month, day_of_month)
	mom_percent = None
	if prior_mtd_total:
		mom_percent = round(((mtd_total - prior_mtd_total) / abs(prior_mtd_total)) * 100, 1)
	elif mtd_total:
		mom_percent = 100.0

	return {
		"company": company,
		"currency": currency,
		"can_read": True,
		"months": months,
		"mtd_total": round(mtd_total, 2),
		"prior_mtd_total": round(prior_mtd_total, 2),
		"mom_percent": mom_percent,
	}


def _is_return(value) -> bool:
	return bool(cint(value))


def _mtd_net(company: str, month_key: str, through_day: int) -> float:
	"""Net Sales Invoice total from month start through through_day (inclusive)."""
	month_start = getdate(f"{month_key}-01")
	last_day = get_last_day(month_start)
	end = getdate(f"{month_key}-{min(through_day, last_day.day):02d}")

	rows = frappe.get_all(
		"Sales Invoice",
		filters={
			"docstatus": 1,
			"company": company,
			"posting_date": ["between", [month_start, end]],
		},
		fields=["grand_total", "is_return"],
		limit_page_length=0,
	)
	total = 0.0
	for row in rows:
		amount = abs(flt(row.grand_total))
		if _is_return(row.is_return):
			total -= amount
		else:
			total += amount
	return total


@frappe.whitelist()
def daily_activities(company: str | None = None, limit: int = 15):
	"""
	daily_activities - Recent readable documents for the activity timeline.

	Args:
		company: Optional company filter.
		limit: Max items after merge/sort (1-50).

	Returns:
			Dict with company and items[{id, doctype, name, title, time, tone, status}].
	"""
	require_login()
	company = _resolve_company(company)
	limit = max(1, min(cint(limit), 50))
	activities = []

	if company and frappe.db.exists("DocType", "Sales Invoice") and _can_read("Sales Invoice"):
		for row in frappe.get_all(
			"Sales Invoice",
			filters={"company": company, "docstatus": ["<", 2]},
			fields=["name", "customer_name", "grand_total", "modified", "docstatus", "is_return", "currency"],
			order_by="modified desc",
			limit_page_length=limit,
		):
			label = "Credit note" if _is_return(row.is_return) else "Sales invoice"
			status = {0: "draft", 1: "submitted"}.get(row.docstatus, "cancelled")
			customer = row.customer_name or row.name
			amount = abs(flt(row.grand_total))
			activities.append(
				{
					"id": f"Sales Invoice::{row.name}",
					"doctype": "Sales Invoice",
					"name": row.name,
					"title": f"{label} {row.name} for {customer} of {amount:,.2f}",
					"time": str(row.modified),
					"tone": "pink" if _is_return(row.is_return) else "brand",
					"status": status,
				}
			)

	if company and frappe.db.exists("DocType", "Payment Entry") and _can_read("Payment Entry"):
		for row in frappe.get_all(
			"Payment Entry",
			filters={"company": company, "docstatus": ["<", 2]},
			fields=["name", "party_name", "paid_amount", "modified", "docstatus", "payment_type"],
			order_by="modified desc",
			limit_page_length=limit,
		):
			party = row.party_name or row.name
			amount = abs(flt(row.paid_amount))
			activities.append(
				{
					"id": f"Payment Entry::{row.name}",
					"doctype": "Payment Entry",
					"name": row.name,
					"title": f"Payment {row.payment_type or ''} from {party} of {amount:,.2f}".strip(),
					"time": str(row.modified),
					"tone": "teal",
					"status": {0: "draft", 1: "submitted"}.get(row.docstatus, "cancelled"),
				}
			)

	if company and frappe.db.exists("DocType", "Stock Entry") and _can_read("Stock Entry"):
		for row in frappe.get_all(
			"Stock Entry",
			filters={"company": company, "docstatus": ["<", 2]},
			fields=["name", "stock_entry_type", "modified", "docstatus"],
			order_by="modified desc",
			limit_page_length=limit,
		):
			activities.append(
				{
					"id": f"Stock Entry::{row.name}",
					"doctype": "Stock Entry",
					"name": row.name,
					"title": f"{row.stock_entry_type or 'Stock entry'} {row.name}",
					"time": str(row.modified),
					"tone": "amber",
					"status": {0: "draft", 1: "submitted"}.get(row.docstatus, "cancelled"),
				}
			)

	activities.sort(key=lambda item: item["time"], reverse=True)
	return {
		"company": company,
		"items": activities[:limit],
	}


@frappe.whitelist()
def upcoming_events(days: int = 14):
	"""
	upcoming_events - Upcoming calendar events for the current user.

	Args:
		days: Lookahead window (1-60).

	Returns:
			Dict with can_read and items[{name, subject, starts_on, ends_on, all_day, color, description}].
	"""
	require_login()
	days = max(1, min(cint(days), 60))

	if not _can_read("Event"):
		return {"can_read": False, "items": []}

	from frappe.desk.doctype.event.event import get_events

	start = today()
	end = add_days(start, days)
	raw = get_events(start=start, end=end, user=frappe.session.user) or []

	items = []
	now = now_datetime()
	for event in raw:
		starts_on = event.get("starts_on")
		if starts_on and getdate(starts_on) < getdate(start):
			# include multi-day events that started earlier but still ongoing
			ends_on = event.get("ends_on")
			if ends_on and getdate(ends_on) < getdate(start):
				continue
		items.append(
			{
				"name": event.get("name"),
				"subject": event.get("subject") or "Event",
				"starts_on": str(starts_on) if starts_on else None,
				"ends_on": str(event.get("ends_on")) if event.get("ends_on") else None,
				"all_day": bool(event.get("all_day")),
				"color": event.get("color") or "#714B67",
				"description": event.get("description") or "",
			}
		)

	items.sort(key=lambda item: item["starts_on"] or "")
	# drop past timed events from today
	filtered = []
	for item in items:
		if item["starts_on"] and not item["all_day"]:
			try:
				if getdate(item["starts_on"]) == getdate(now) and frappe.utils.get_datetime(item["starts_on"]) < now:
					continue
			except Exception:
				pass
		filtered.append(item)

	return {"can_read": True, "items": filtered[:30]}
