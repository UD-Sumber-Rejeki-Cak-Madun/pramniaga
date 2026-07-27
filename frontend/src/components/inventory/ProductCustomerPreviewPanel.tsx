/**
 * Purpose: Ecommerce-style PDP mock body for staff product preview (no page chrome).
 * Exports: ProductCustomerPreviewPanel
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { useEffect, useMemo, useState } from 'react'
import { Package } from 'lucide-react'
import { API, useApiCall } from '@/lib/api'
import type { Item, ProductPreviewDraft } from '@/lib/types'
import { cn, formatMoney, productImageSrc } from '@/lib/utils'
import productsFallback from '@/assets/inventory/products.jpg'

type ProductCustomerPreviewPanelProps = {
	draft: ProductPreviewDraft
	/** When true, load variant SKUs for the template item_code. */
	isNewProduct?: boolean
}

/**
 * ProductCustomerPreviewPanel - Customer-facing PDP mock content for embedding in the product form card.
 *
 * @param props.draft - Product fields to display.
 * @param props.isNewProduct - Whether this is an unsaved / new product (variants may not exist yet).
 * @returns Preview panel markup.
 */
export function ProductCustomerPreviewPanel({ draft, isNewProduct = false }: ProductCustomerPreviewPanelProps) {
	const [variants, setVariants] = useState<Item[]>([])
	const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
	const [activeThumb, setActiveThumb] = useState<string | null>(null)

	const { call: listVariants } = useApiCall<Item[]>(API.inventory.variantsList)

	useEffect(() => {
		if (!draft.has_variants || !draft.item_code || isNewProduct) {
			setVariants([])
			setSelectedVariant(null)
			return
		}
		listVariants({ template: draft.item_code })
			.then((rows: Item[]) => {
				setVariants(rows)
				setSelectedVariant(rows[0]?.item_code || null)
			})
			.catch(() => {
				setVariants([])
				setSelectedVariant(null)
			})
	}, [draft.has_variants, draft.item_code, isNewProduct, listVariants])

	const imageSrc = useMemo(() => {
		if (activeThumb) return activeThumb
		const selected = variants.find((v) => v.item_code === selectedVariant)
		const raw = selected?.image || draft.image
		return productImageSrc(raw, productsFallback)
	}, [activeThumb, draft.image, selectedVariant, variants])

	const thumbs = useMemo(() => {
		const urls = [productImageSrc(draft.image, productsFallback)]
		for (const v of variants.slice(0, 4)) {
			if (v.image) urls.push(productImageSrc(v.image, productsFallback))
		}
		return [...new Set(urls)].slice(0, 5)
	}, [draft.image, variants])

	const title = draft.item_name?.trim() || 'Untitled product'
	const price = formatMoney(draft.standard_rate)
	const pathLabel = draft.category_path || draft.item_group || null

	return (
		<div className="grid gap-0 lg:grid-cols-2">
			<div className="border-b border-line bg-surface-2/40 p-4 lg:border-b-0 lg:border-r lg:p-6">
				<div className="aspect-square overflow-hidden rounded-xl bg-white">
					<img src={imageSrc} alt={title} className="h-full w-full object-cover" />
				</div>
				<div className="mt-3 flex gap-2 overflow-x-auto pb-1">
					{thumbs.map((src) => (
						<button
							key={src}
							type="button"
							className={cn(
								'h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-white',
								src === imageSrc ? 'border-brand ring-1 ring-brand/30' : 'border-line',
							)}
							onClick={() => setActiveThumb(src)}
						>
							<img src={src} alt="" className="h-full w-full object-cover" />
						</button>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-5 p-5 md:p-8">
				<div>
					{pathLabel ? (
						<p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">{pathLabel}</p>
					) : null}
					<h2 className="font-display text-2xl font-semibold leading-snug tracking-tight text-ink md:text-3xl">
						{title}
					</h2>
					{draft.item_code ? (
						<p className="mt-1 font-mono text-xs text-ink-muted">{draft.item_code}</p>
					) : null}
				</div>

				<p className="text-2xl font-bold text-brand">{price}</p>

				{draft.has_variants ? (
					<div className="space-y-2">
						<p className="text-sm font-medium text-ink">Options</p>
						{variants.length > 0 ? (
							<div className="flex flex-wrap gap-2">
								{variants.map((v) => {
									const label =
										v.attributes?.map((a) => a.attribute_value).filter(Boolean).join(' · ') ||
										v.item_name ||
										v.item_code
									const active = selectedVariant === v.item_code
									return (
										<button
											key={v.item_code}
											type="button"
											className={cn(
												'rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors',
												active
													? 'border-brand bg-brand/5 text-ink'
													: 'border-line bg-white text-ink-muted hover:border-brand/40 hover:text-ink',
											)}
											onClick={() => setSelectedVariant(v.item_code)}
										>
											<span className="line-clamp-2">{label}</span>
										</button>
									)
								})}
							</div>
						) : (
							<p className="rounded-lg border border-dashed border-line px-3 py-4 text-sm text-ink-muted">
								{isNewProduct
									? 'Variants appear here after you save the template and create SKUs.'
									: 'No variants created yet for this template.'}
							</p>
						)}
					</div>
				) : null}

				{draft.description ? (
					<div className="space-y-1 border-t border-line pt-4">
						<p className="text-sm font-medium text-ink">Description</p>
						<p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">{draft.description}</p>
					</div>
				) : (
					<div className="flex items-start gap-2 rounded-lg border border-dashed border-line px-3 py-4 text-sm text-ink-muted">
						<Package className="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
						No customer-facing description yet.
					</div>
				)}

				<p className="mt-auto pt-4 text-[11px] text-ink-muted">
					This is an internal preview of how the product could appear to customers. It is not a public
					storefront.
				</p>
			</div>
		</div>
	)
}
