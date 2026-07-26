/**
 * Purpose: Shared TypeScript types for session, inventory, HR, and dashboard payloads.
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
export interface Capabilities {
	can_browse_stock: boolean
	can_manage_items: boolean
	can_manage_warehouses: boolean
	can_submit_moves: boolean
	can_adjust_stock: boolean
	can_use_hr: boolean
	can_self_service: boolean
	can_view_employees: boolean
	can_manage_employees: boolean
	can_approve_leave: boolean
	can_manage_attendance: boolean
	can_view_payroll: boolean
	can_run_payroll: boolean
}

export interface SessionUser {
	name: string
	full_name: string
	email?: string
}

export interface EmployeeSummary {
	name: string
	employee_name: string
	company: string
	department?: string
	designation?: string
	status: string
	image?: string
	user_id?: string
	date_of_joining?: string
	reports_to?: string
}

export interface SessionData {
	logged_in: boolean
	user: SessionUser | null
	roles: string[]
	capabilities: Capabilities
	employee: EmployeeSummary | null
	companies: { name: string; company_name: string; abbr: string }[]
	default_company: string | null
	csrf_token: string
}

export interface HrOverviewCounts {
	hrms_available: boolean
	people?: number
	my_leave_open?: number
	leave_approvals_open?: number
	my_payslips?: number
}

export interface AppTile {
	name: string
	title: string
	description: string
	route: string
	logo: string
	color: string
}

export interface Item {
	name: string
	item_code: string
	item_name: string
	item_group: string
	stock_uom: string
	is_stock_item: number
	disabled: number
	has_variants: number
	variant_of?: string
	valuation_rate?: number
	standard_rate?: number
	description?: string
	image?: string
	attributes?: { attribute: string; attribute_value: string }[]
}

export interface Warehouse {
	name: string
	warehouse_name: string
	company: string
	is_group: number
	parent_warehouse?: string
}

export interface BinRow {
	name: string
	item_code: string
	warehouse: string
	actual_qty: number
	projected_qty: number
	valuation_rate: number
	stock_uom: string
	company: string
}

export interface StockEntrySummary {
	name: string
	stock_entry_type: string
	company: string
	posting_date: string
	docstatus: number
	from_warehouse?: string
	to_warehouse?: string
}

export interface OverviewCounts {
	receipt: number
	delivery: number
	transfer: number
	adjustment: number
	products: number
	warehouses: number
}

export interface RevenueMonth {
	key: string
	label: string
	income: number
	returns: number
	net: number
}

export interface RevenueSummary {
	company: string | null
	currency: string | null
	can_read: boolean
	months: RevenueMonth[]
	mtd_total: number
	prior_mtd_total: number
	mom_percent: number | null
}

export interface ActivityItem {
	id: string
	doctype: string
	name: string
	title: string
	time: string
	tone: 'brand' | 'pink' | 'teal' | 'amber' | string
	status: string
}

export interface DailyActivities {
	company: string | null
	items: ActivityItem[]
}

export interface CalendarEventItem {
	name: string
	subject: string
	starts_on: string | null
	ends_on: string | null
	all_day: boolean
	color: string
	description: string
}

export interface UpcomingEvents {
	can_read: boolean
	items: CalendarEventItem[]
}
