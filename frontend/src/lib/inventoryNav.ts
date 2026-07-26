/**
 * Purpose: Inventory sidebar / overview link metadata (single source for Shell).
 * Exports: inventoryLinks, InventoryNavLink
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */

export interface InventoryNavLink {
	to: string
	label: string
	end?: boolean
}

export const inventoryLinks: InventoryNavLink[] = [
	{ to: '/inventory', label: 'Overview', end: true },
	{ to: '/inventory/products', label: 'Products' },
	{ to: '/inventory/receipts', label: 'Receipts' },
	{ to: '/inventory/deliveries', label: 'Deliveries' },
	{ to: '/inventory/transfers', label: 'Transfers' },
	{ to: '/inventory/adjustments', label: 'Adjustments' },
	{ to: '/inventory/stock', label: 'On Hand' },
	{ to: '/inventory/warehouses', label: 'Warehouses' },
]
