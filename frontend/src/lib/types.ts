export interface Capabilities {
	can_browse_stock: boolean
	can_manage_items: boolean
	can_manage_warehouses: boolean
	can_submit_moves: boolean
	can_adjust_stock: boolean
}

export interface SessionUser {
	name: string
	full_name: string
	email?: string
}

export interface SessionData {
	logged_in: boolean
	user: SessionUser | null
	roles: string[]
	capabilities: Capabilities
	companies: { name: string; company_name: string; abbr: string }[]
	default_company: string | null
	csrf_token: string
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
	category?: string | null
	category_path?: string | null
	stock_uom: string
	is_stock_item: number
	disabled: number
	has_variants: number
	variant_of?: string
	valuation_rate?: number
	standard_rate?: number
	description?: string
	image?: string
	/** Display barcode; same value as item_code by product policy. */
	barcode?: string
	barcodes?: { barcode: string; barcode_type?: string }[]
	uoms?: ItemUomRow[]
	attributes?: { attribute: string; attribute_value?: string }[]
}

export interface ItemUomRow {
	uom: string
	conversion_factor: number
}

export interface ItemGroupNode {
	name: string
	item_group_name: string
	is_group: number
	parent_item_group?: string | null
	children: ItemGroupNode[]
}

/** Draft payload passed to the customer preview route via location.state. */
export interface ProductPreviewDraft {
	item_code?: string
	item_name: string
	standard_rate?: number
	/** Customer-facing copy only; do not pass internal Item.description notes. */
	description?: string
	image?: string | null
	has_variants?: number
	item_group?: string
	category_path?: string | null
}

export interface ItemAttributeValue {
	attribute_value: string
	abbr?: string
}

export interface ItemAttribute {
	name: string
	attribute_name: string
	numeric_values: number
	values?: ItemAttributeValue[]
}

export interface ProductMedia {
	item_code: string
	image?: string | null
	video_url?: string | null
	video_file_name?: string | null
}

export interface ProductMediaUploadResult {
	item_code: string
	media_kind: 'image' | 'video'
	file_url: string
	image?: string | null
	video_url?: string | null
}

export interface ProductUomMediaRow {
	uom: string
	conversion_factor: number
	is_stock_uom: number
	image_url?: string | null
}

export interface ProductUomMedia {
	item_code: string
	stock_uom: string
	media: ProductUomMediaRow[]
}

export interface ProductUomMediaUploadResult {
	item_code: string
	uom: string
	image_url: string
	file_url: string
}

export interface ItemCodeSuggestion {
	item_code: string
	barcode: string
}

export interface VariantCreateManyResult {
	created: Item[]
	errors: { attributes: Record<string, string>; error: string }[]
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
	line_count?: number
	total_qty?: number
	lines_summary?: string
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
