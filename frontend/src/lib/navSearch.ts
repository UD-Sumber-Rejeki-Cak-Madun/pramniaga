/**
 * Purpose: Build and filter searchable app-chrome menu entries for the topbar.
 * Exports: NavSearchItem, buildNavSearchItems, filterNavSearchItems
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard } from 'lucide-react'
import { inventoryAppIcon, inventoryNavItems } from '@/lib/inventoryNav'
import type { AppTile } from '@/lib/types'

export type NavSearchGroup = 'Home' | 'Apps' | 'Inventory'

export interface NavSearchItem {
	id: string
	label: string
	to: string
	group: NavSearchGroup
	keywords?: string[]
	icon?: LucideIcon
	logo?: string
	accent?: string
}

/**
 * buildNavSearchItems - Assemble Dashboard, app tiles, and inventory links for menu search.
 *
 * Dedupes by route so Overview and the Inventory app tile do not both appear for `/inventory`.
 *
 * @param apps - App tiles from list_apps.
 * @returns Ordered searchable menu entries.
 */
export function buildNavSearchItems(apps: AppTile[]): NavSearchItem[] {
	const items: NavSearchItem[] = [
		{
			id: 'home-dashboard',
			label: 'Dashboard',
			to: '/',
			group: 'Home',
			keywords: ['home'],
			icon: LayoutDashboard,
		},
	]

	const seenRoutes = new Set<string>(['/'])

	for (const app of apps) {
		const route = app.route || '/'
		if (seenRoutes.has(route)) continue
		seenRoutes.add(route)

		const isInventory = app.name === 'inventory' || route.startsWith('/inventory')
		items.push({
			id: `app-${app.name}`,
			label: app.title,
			to: route,
			group: 'Apps',
			keywords: isInventory
				? [app.name, app.description, 'overview'].filter(Boolean) as string[]
				: ([app.name, app.description].filter(Boolean) as string[]),
			icon: isInventory ? inventoryAppIcon : undefined,
			logo: isInventory ? undefined : app.logo,
			accent: app.color,
		})
	}

	for (const link of inventoryNavItems) {
		if (seenRoutes.has(link.to)) continue
		seenRoutes.add(link.to)

		items.push({
			id: `inventory-${link.key}`,
			label: link.label,
			to: link.to,
			group: 'Inventory',
			keywords: link.key === 'stock' ? ['on hand', 'stock', 'qty'] : [link.key],
			icon: link.icon,
			accent: link.accent,
		})
	}

	return items
}

/**
 * filterNavSearchItems - Case-insensitive match on label, group, and keywords.
 *
 * Empty query returns all items (browse mode).
 *
 * @param items - Full search index.
 * @param query - User-typed filter string.
 * @returns Matching menu entries in original order.
 */
export function filterNavSearchItems(items: NavSearchItem[], query: string): NavSearchItem[] {
	const normalized = query.trim().toLowerCase()
	if (!normalized) return items

	return items.filter((item) => {
		if (item.label.toLowerCase().includes(normalized)) return true
		if (item.group.toLowerCase().includes(normalized)) return true
		return (item.keywords ?? []).some((keyword) => keyword.toLowerCase().includes(normalized))
	})
}
