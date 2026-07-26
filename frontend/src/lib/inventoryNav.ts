/**
 * Purpose: Shared inventory navigation metadata — sidebar icons and overview card assets.
 * Exports: inventoryNavItems, inventoryOverviewCards, inventoryAppIcon
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import type { LucideIcon } from 'lucide-react'
import {
	ArrowLeftRight,
	Box,
	Building2,
	Layers,
	LayoutGrid,
	Package,
	Receipt,
	SlidersHorizontal,
	Truck,
} from 'lucide-react'
import type { OverviewCounts } from '@/lib/types'
import adjustmentsImage from '@/assets/inventory/adjustments.jpg'
import deliveriesImage from '@/assets/inventory/deliveries.jpg'
import productsImage from '@/assets/inventory/products.jpg'
import receiptsImage from '@/assets/inventory/receipts.jpg'
import stockImage from '@/assets/inventory/stock.jpg'
import transfersImage from '@/assets/inventory/transfers.jpg'
import warehousesImage from '@/assets/inventory/warehouses.jpg'

export interface InventoryNavItem {
	key: string
	to: string
	label: string
	end?: boolean
	icon: LucideIcon
	accent: string
	image: string
	countKey?: keyof OverviewCounts
	showOnOverview: boolean
}

/** inventoryNavItems - Sidebar links with icons and card imagery metadata. */
export const inventoryNavItems: InventoryNavItem[] = [
	{
		key: 'overview',
		to: '/inventory',
		label: 'Overview',
		end: true,
		icon: LayoutGrid,
		accent: '#714B67',
		image: stockImage,
		showOnOverview: false,
	},
	{
		key: 'products',
		to: '/inventory/products',
		label: 'Products',
		icon: Box,
		accent: '#714B67',
		image: productsImage,
		countKey: 'products',
		showOnOverview: true,
	},
	{
		key: 'receipt',
		to: '/inventory/receipts',
		label: 'Receipts',
		icon: Receipt,
		accent: '#059669',
		image: receiptsImage,
		countKey: 'receipt',
		showOnOverview: true,
	},
	{
		key: 'delivery',
		to: '/inventory/deliveries',
		label: 'Deliveries',
		icon: Truck,
		accent: '#D97706',
		image: deliveriesImage,
		countKey: 'delivery',
		showOnOverview: true,
	},
	{
		key: 'transfer',
		to: '/inventory/transfers',
		label: 'Transfers',
		icon: ArrowLeftRight,
		accent: '#0284C7',
		image: transfersImage,
		countKey: 'transfer',
		showOnOverview: true,
	},
	{
		key: 'adjustment',
		to: '/inventory/adjustments',
		label: 'Adjustments',
		icon: SlidersHorizontal,
		accent: '#7C3AED',
		image: adjustmentsImage,
		countKey: 'adjustment',
		showOnOverview: true,
	},
	{
		key: 'stock',
		to: '/inventory/stock',
		label: 'On Hand',
		icon: Layers,
		accent: '#0F766E',
		image: stockImage,
		showOnOverview: true,
	},
	{
		key: 'warehouses',
		to: '/inventory/warehouses',
		label: 'Warehouses',
		icon: Building2,
		accent: '#334155',
		image: warehousesImage,
		countKey: 'warehouses',
		showOnOverview: true,
	},
]

/** inventoryOverviewCards - Overview grid entries (excludes the hub link itself). */
export const inventoryOverviewCards = inventoryNavItems.filter((item) => item.showOnOverview)

/** inventoryAppIcon - Parent inventory app tile icon. */
export const inventoryAppIcon = Package
