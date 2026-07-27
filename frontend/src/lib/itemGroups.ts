/**
 * Purpose: Item Group tree helpers for Category → Subcategory UI.
 * Exports: getCategoryOptions, getSubcategories, findParentCategory, formatCategoryPath,
 *   flattenLeafGroups, hasCategoryStructure
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import type { ItemGroupNode } from '@/lib/types'

/**
 * getCategoryOptions - Top-level category nodes (parents with children, or group nodes).
 *
 * For SPA v1: prefer nodes that are groups OR have children. Flat-only leaves under root
 * are returned as empty categories list (caller falls back to flat leaf select).
 *
 * @param tree - Nested item group tree from item_groups_tree.
 * @returns Category nodes suitable for the Category select.
 */
export function getCategoryOptions(tree: ItemGroupNode[]): ItemGroupNode[] {
	return tree.filter((node) => node.is_group || (node.children && node.children.length > 0))
}

/**
 * getSubcategories - Leaf (or assignable) children under a category.
 *
 * @param tree - Nested item group tree.
 * @param categoryName - Selected category name.
 * @returns Subcategory nodes (prefer leaves; if child is a group, flatten one level of leaves).
 */
export function getSubcategories(tree: ItemGroupNode[], categoryName: string): ItemGroupNode[] {
	const category = findNode(tree, categoryName)
	if (!category) return []
	const out: ItemGroupNode[] = []
	for (const child of category.children || []) {
		if (!child.is_group || !(child.children && child.children.length)) {
			out.push(child)
			continue
		}
		// Deeper than 2 levels: expose grandchild leaves under this category.
		for (const leaf of flattenLeafGroups([child])) {
			out.push(leaf)
		}
	}
	return out
}

/**
 * findParentCategory - Resolve the category (parent) for a leaf subcategory name.
 *
 * @param tree - Nested item group tree.
 * @param leafName - Item.item_group leaf name.
 * @returns Parent category name, or null when the leaf sits at root / unknown.
 */
export function findParentCategory(tree: ItemGroupNode[], leafName: string): string | null {
	for (const category of getCategoryOptions(tree)) {
		const subs = getSubcategories(tree, category.name)
		if (subs.some((s) => s.name === leafName)) return category.name
	}
	// Leaf may itself be a top-level node with no parent category.
	if (tree.some((n) => n.name === leafName)) return null
	return null
}

/**
 * formatCategoryPath - Display path "Category · Subcategory".
 *
 * @param category - Parent category name (optional).
 * @param subcategory - Leaf subcategory / item_group name.
 * @returns Path string for cards and lists.
 */
export function formatCategoryPath(category?: string | null, subcategory?: string | null) {
	if (category && subcategory) return `${category} · ${subcategory}`
	return subcategory || category || ''
}

/**
 * flattenLeafGroups - Collect all leaf nodes from a tree.
 *
 * @param tree - Nested item group nodes.
 * @returns Flat list of leaf nodes.
 */
export function flattenLeafGroups(tree: ItemGroupNode[]): ItemGroupNode[] {
	const leaves: ItemGroupNode[] = []
	const walk = (nodes: ItemGroupNode[]) => {
		for (const node of nodes) {
			if (!node.children?.length) {
				leaves.push(node)
				continue
			}
			if (!node.is_group) leaves.push(node)
			walk(node.children)
		}
	}
	walk(tree)
	return leaves
}

/**
 * hasCategoryStructure - True when the tree has at least one parent with children.
 *
 * @param tree - Nested item group tree.
 * @returns Whether cascading Category → Subcategory UI should be used.
 */
export function hasCategoryStructure(tree: ItemGroupNode[]): boolean {
	return getCategoryOptions(tree).some((c) => getSubcategories(tree, c.name).length > 0)
}

function findNode(nodes: ItemGroupNode[], name: string): ItemGroupNode | null {
	for (const node of nodes) {
		if (node.name === name) return node
		const found = findNode(node.children || [], name)
		if (found) return found
	}
	return null
}
