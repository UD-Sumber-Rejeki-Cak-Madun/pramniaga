/**
 * Purpose: Products browse — List/Catalog modes, pill search, category filter chips.
 * Exports: default ProductsPage
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutGrid, LayoutList, Plus, X } from 'lucide-react'
import { API, useApiCall } from '@/lib/api'
import type { Item, ItemGroupNode } from '@/lib/types'
import {
	getCategoryOptions,
	getSubcategories,
	hasCategoryStructure,
} from '@/lib/itemGroups'
import { ProductCard } from '@/components/inventory/ProductCard'
import { Button, EmptyState, ErrorBanner, PageHeader } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { cn, formatMoney, productImageSrc } from '@/lib/utils'
import productsFallback from '@/assets/inventory/products.jpg'

type ViewMode = 'catalog' | 'list'

const VIEW_MODE_KEY = 'pramniaga.products.viewMode'

const easeOut = [0.22, 1, 0.36, 1] as const

/**
 * readStoredViewMode - Load last Products view mode from localStorage.
 *
 * @returns Stored view mode, or catalog when unset/invalid.
 */
function readStoredViewMode(): ViewMode {
	try {
		const stored = localStorage.getItem(VIEW_MODE_KEY)
		if (stored === 'list' || stored === 'catalog') return stored
	} catch {
		/* ignore */
	}
	return 'catalog'
}

/**
 * productTypeLabel - Human label for Item type column/badge.
 *
 * @param item - Product Item.
 * @returns Template, Storable, or Consumable.
 */
function productTypeLabel(item: Item) {
	if (item.has_variants) return 'Template'
	return item.is_stock_item ? 'Storable' : 'Consumable'
}

/**
 * ProductsPage - Browse products in Catalog (cards) or List (table) mode.
 *
 * @returns Products browse page.
 */
export default function ProductsPage() {
	const { session } = useAuth()
	const navigate = useNavigate()
	const [items, setItems] = useState<Item[]>([])
	const [search, setSearch] = useState('')
	const [viewMode, setViewMode] = useState<ViewMode>(() => readStoredViewMode())
	const [tree, setTree] = useState<ItemGroupNode[]>([])
	const [filterCategory, setFilterCategory] = useState<string | null>(null)
	const [filterSubcategory, setFilterSubcategory] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const { call, loading } = useApiCall<Item[]>(API.inventory.itemsList)
	const { call: listTree } = useApiCall<ItemGroupNode[]>(API.inventory.itemGroupsTree)

	const showFilters = hasCategoryStructure(tree)
	const categories = useMemo(() => getCategoryOptions(tree), [tree])
	const subcategories = useMemo(
		() => (filterCategory ? getSubcategories(tree, filterCategory) : []),
		[tree, filterCategory],
	)

	const isInitialLoad = loading && items.length === 0
	const isRefreshing = loading && items.length > 0

	const load = (opts?: {
		search?: string
		category?: string | null
		subcategory?: string | null
	}) => {
		const q = opts?.search ?? search
		const category = opts?.category === undefined ? filterCategory : opts.category
		const subcategory = opts?.subcategory === undefined ? filterSubcategory : opts.subcategory
		setError(null)

		const params: Record<string, unknown> = {
			search: q || undefined,
			exclude_variants: 1,
		}
		if (subcategory) {
			params.item_group = subcategory
			params.include_descendants = 0
		} else if (category) {
			params.item_group = category
			params.include_descendants = 1
		}

		call(params)
			.then(setItems)
			.catch((err) => setError(err.message || 'Unable to load products'))
	}

	useEffect(() => {
		listTree({})
			.then((t) => setTree(t || []))
			.catch(() => setTree([]))
		load()
	}, [])

	const setMode = (mode: ViewMode) => {
		setViewMode(mode)
		try {
			localStorage.setItem(VIEW_MODE_KEY, mode)
		} catch {
			/* ignore */
		}
	}

	const openProduct = (code: string) => navigate(`/inventory/products/${code}`)

	const selectCategory = (name: string | null) => {
		setFilterCategory(name)
		setFilterSubcategory(null)
		load({ category: name, subcategory: null })
	}

	const selectSubcategory = (name: string | null) => {
		setFilterSubcategory(name)
		load({ subcategory: name })
	}

	const clearFilters = () => {
		setFilterCategory(null)
		setFilterSubcategory(null)
		load({ category: null, subcategory: null })
	}

	const activeFilterLabel = filterSubcategory
		? filterSubcategory
		: filterCategory
			? `${filterCategory} (all)`
			: null

	return (
		<div>
			<PageHeader
				title="Products"
				loading={isInitialLoad}
				actions={
					session?.capabilities.can_manage_items ? (
						<Button onClick={() => navigate('/inventory/products/new')}>
							<Plus className="h-4 w-4" />
							New product
						</Button>
					) : null
				}
			/>

			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<form
					className="flex w-full max-w-xl items-center rounded-full border-2 border-brand bg-white p-1 shadow-sm"
					onSubmit={(e) => {
						e.preventDefault()
						load()
					}}
				>
					<input
						className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-ink outline-none placeholder:text-ink-muted"
						placeholder="Search by item code"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						aria-label="Search products"
					/>
					<button
						type="submit"
						className="shrink-0 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
					>
						Search
					</button>
				</form>

				<div
					className="relative inline-flex shrink-0 self-end rounded-lg border border-line bg-white p-1 sm:self-auto"
					role="group"
					aria-label="View mode"
				>
					{/* CSS pill — no layoutId, so Shell remounts cannot desync the shade */}
					<span
						aria-hidden
						className="pointer-events-none absolute top-1 bottom-1 rounded-md bg-brand transition-[left] duration-200 ease-out"
						style={{
							width: 'calc(50% - 0.25rem)',
							left: viewMode === 'list' ? '0.25rem' : 'calc(50%)',
						}}
					/>
					<button
						type="button"
						className={cn(
							'relative z-10 inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200',
							viewMode === 'list' ? 'text-white' : 'text-ink-muted hover:text-ink',
						)}
						aria-pressed={viewMode === 'list'}
						onClick={() => setMode('list')}
					>
						<LayoutList className="h-4 w-4" />
						List
					</button>
					<button
						type="button"
						className={cn(
							'relative z-10 inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200',
							viewMode === 'catalog' ? 'text-white' : 'text-ink-muted hover:text-ink',
						)}
						aria-pressed={viewMode === 'catalog'}
						onClick={() => setMode('catalog')}
					>
						<LayoutGrid className="h-4 w-4" />
						Catalog
					</button>
				</div>
			</div>

			{showFilters ? (
				<div className="mb-5 space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							className={cn(
								'rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200',
								!filterCategory && !filterSubcategory
									? 'bg-brand text-white'
									: 'border border-line bg-white text-ink-muted hover:border-brand/40 hover:text-ink',
							)}
							onClick={clearFilters}
						>
							All products
						</button>
						{categories.map((c) => (
							<button
								key={c.name}
								type="button"
								className={cn(
									'rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200',
									filterCategory === c.name
										? 'bg-brand text-white'
										: 'border border-line bg-white text-ink-muted hover:border-brand/40 hover:text-ink',
								)}
								onClick={() => selectCategory(c.name)}
							>
								{c.item_group_name || c.name}
							</button>
						))}
						<AnimatePresence initial={false}>
							{activeFilterLabel ? (
								<motion.button
									key={activeFilterLabel}
									type="button"
									initial={{ opacity: 0, scale: 0.92 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.92 }}
									transition={{ duration: 0.16, ease: easeOut }}
									className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand"
									onClick={clearFilters}
									aria-label={`Clear filter ${activeFilterLabel}`}
								>
									{activeFilterLabel}
									<X className="h-3 w-3" />
								</motion.button>
							) : null}
						</AnimatePresence>
					</div>
					<AnimatePresence initial={false}>
						{filterCategory && subcategories.length > 0 ? (
							<motion.div
								key={filterCategory}
								initial={{ opacity: 0, y: -4 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -4 }}
								transition={{ duration: 0.18, ease: easeOut }}
								className="flex flex-wrap items-center gap-2 pl-1"
							>
								<span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
									Subcategory
								</span>
								{subcategories.map((s) => (
									<button
										key={s.name}
										type="button"
										className={cn(
											'rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200',
											filterSubcategory === s.name
												? 'bg-ink text-white'
												: 'border border-line bg-white text-ink-muted hover:text-ink',
										)}
										onClick={() =>
											selectSubcategory(filterSubcategory === s.name ? null : s.name)
										}
									>
										{s.item_group_name || s.name}
									</button>
								))}
							</motion.div>
						) : null}
					</AnimatePresence>
				</div>
			) : (
				<p className="mb-5 text-xs text-ink-muted">
					Set up categories in ERPNext Item Group to enable subcategory filters.
				</p>
			)}

			{error ? <ErrorBanner message={error} /> : null}

			<AnimatePresence mode="wait" initial={false}>
				{!isInitialLoad && items.length === 0 ? (
					<motion.div
						key="empty"
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={{ duration: 0.18, ease: easeOut }}
					>
						<EmptyState
							title={activeFilterLabel ? 'No products in this category' : 'No products yet'}
							description={
								activeFilterLabel
									? 'Try another category or clear the filter.'
									: 'Create your first product to start tracking stock.'
							}
						/>
					</motion.div>
				) : null}
			</AnimatePresence>

			{!isInitialLoad && items.length > 0 ? (
				<div
					className={cn(
						'relative min-h-[12rem] transition-opacity duration-200',
						isRefreshing && 'pointer-events-none opacity-55',
					)}
					aria-busy={isRefreshing}
				>
					<AnimatePresence mode="wait" initial={false}>
						{viewMode === 'catalog' ? (
							<motion.div
								key="catalog"
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -6 }}
								transition={{ duration: 0.2, ease: easeOut }}
								className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5"
							>
								<AnimatePresence mode="popLayout" initial={false}>
									{items.map((item, index) => (
										<motion.div
											key={item.item_code}
											layout
											initial={{ opacity: 0, y: 8 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -6 }}
											transition={{
												delay: Math.min(index * 0.03, 0.24),
												duration: 0.22,
												ease: easeOut,
												layout: { duration: 0.2 },
											}}
										>
											<ProductCard item={item} onOpen={openProduct} />
										</motion.div>
									))}
								</AnimatePresence>
							</motion.div>
						) : (
							<motion.div
								key="list"
								initial={{ opacity: 0, y: 6 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -4 }}
								transition={{ duration: 0.2, ease: easeOut }}
								className="overflow-hidden rounded-xl border border-line bg-white"
							>
								<table className="min-w-full text-left text-sm">
									<thead className="bg-surface-2 text-ink-muted">
										<tr>
											<th className="px-4 py-3 font-medium">Product</th>
											<th className="px-4 py-3 font-medium">Item code</th>
											<th className="px-4 py-3 font-medium">Category</th>
											<th className="px-4 py-3 font-medium">Type</th>
											<th className="px-4 py-3 text-right font-medium">Sales price</th>
										</tr>
									</thead>
									<tbody>
										<AnimatePresence mode="popLayout" initial={false}>
											{items.map((item, index) => (
												<motion.tr
													key={item.item_code}
													layout
													initial={{ opacity: 0, y: 8 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: -6 }}
													transition={{
														delay: Math.min(index * 0.03, 0.24),
														duration: 0.22,
														ease: easeOut,
														layout: { duration: 0.2 },
													}}
													className="cursor-pointer border-t border-line hover:bg-surface-2/70"
													onClick={() => openProduct(item.item_code)}
												>
													<td className="px-4 py-3 text-ink">
														<div className="flex items-center gap-3">
															<img
																src={productImageSrc(item.image, productsFallback)}
																alt=""
																className="h-10 w-10 shrink-0 rounded-lg object-cover"
															/>
															<p className="truncate font-medium text-ink">{item.item_name}</p>
														</div>
													</td>
													<td className="px-4 py-3">
														<span className="font-mono text-xs text-ink-muted">{item.item_code}</span>
													</td>
													<td className="px-4 py-3 text-ink">
														{item.category_path || item.item_group}
													</td>
													<td className="px-4 py-3 text-ink">{productTypeLabel(item)}</td>
													<td className="px-4 py-3 text-right">
														<span className="font-semibold text-brand">
															{formatMoney(item.standard_rate)}
														</span>
													</td>
												</motion.tr>
											))}
										</AnimatePresence>
									</tbody>
								</table>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			) : null}
		</div>
	)
}
