/**
 * Purpose: Post-create enrichment page for product media, packing UOMs, and variants.
 * Exports: default ProductMediaVariantsPage
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API, useApiCall } from '@/lib/api'
import type { Item, ProductMedia } from '@/lib/types'
import { ProductMediaUploader } from '@/components/inventory/ProductMediaUploader'
import { ProductPackingUoms } from '@/components/inventory/ProductPackingUoms'
import { ProductVariantBuilder } from '@/components/inventory/ProductVariantBuilder'
import { Button, ErrorBanner, PageHeader } from '@/components/ui'
import { useAuth } from '@/lib/auth'

/**
 * ProductBarcodePanel - Show the shared item code / barcode for visual confirmation.
 *
 * @param props.code - Item code used as barcode.
 * @returns Barcode confirmation panel.
 */
function ProductBarcodePanel({ code }: { code: string }) {
	return (
		<section className="rounded-xl border border-line bg-white p-5">
			<h2 className="font-display text-lg font-semibold text-ink">Barcode</h2>
			<p className="mt-1 text-sm text-ink-muted">
				SKU and barcode are the same value. Use this code on labels and scanners.
			</p>
			<div className="mt-4 inline-flex flex-col items-center gap-2 rounded-lg border border-line bg-surface-2 px-6 py-4">
				{/* Lightweight glyph: repeating bars derived from character codes — confirmation only. */}
				<svg
					role="img"
					aria-label={`Barcode for ${code}`}
					viewBox="0 0 240 64"
					className="h-14 w-56 text-ink"
				>
					{Array.from(code).flatMap((ch, index) => {
						const width = 1 + (ch.charCodeAt(0) % 3)
						const x = 8 + index * 7
						return (
							<rect
								key={`${ch}-${index}`}
								x={x}
								y={4}
								width={width}
								height={40}
								fill="currentColor"
							/>
						)
					})}
				</svg>
				<p className="font-mono text-sm tracking-wider text-ink">{code}</p>
			</div>
		</section>
	)
}

/**
 * ProductMediaVariantsPage - Enrich a product with main media, packing photos, and variants.
 *
 * @returns Media & variants enrichment page.
 */
export default function ProductMediaVariantsPage() {
	const { id } = useParams()
	const itemCode = id || ''
	const navigate = useNavigate()
	const { session } = useAuth()
	const canEdit = Boolean(session?.capabilities.can_manage_items)

	const [item, setItem] = useState<Item | null>(null)
	const [media, setMedia] = useState<ProductMedia>({ item_code: itemCode })
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)

	const { call: getItem } = useApiCall<Item>(API.inventory.itemsGet)
	const { call: getMedia } = useApiCall<ProductMedia>(API.inventory.itemsGetMedia)

	useEffect(() => {
		if (!itemCode) return
		setLoading(true)
		Promise.all([getItem({ item_code: itemCode }), getMedia({ item_code: itemCode })])
			.then(([loadedItem, loadedMedia]) => {
				setItem(loadedItem)
				setMedia(loadedMedia)
			})
			.catch((err) => setError(err.message || 'Unable to load product'))
			.finally(() => setLoading(false))
	}, [getItem, getMedia, itemCode])

	if (!itemCode) return <ErrorBanner message="Missing product code." />

	const isTemplate = Boolean(item?.has_variants)
	const barcode = item?.barcode || item?.item_code || itemCode

	return (
		<div className="space-y-10">
			<PageHeader
				title={`Media & variants · ${item?.item_name || itemCode}`}
				loading={loading}
				actions={
					<div className="flex flex-wrap gap-2">
						<Button variant="secondary" onClick={() => navigate(`/inventory/products/${itemCode}`)}>
							Edit basics
						</Button>
						<Button onClick={() => navigate('/inventory/products')}>Done</Button>
					</div>
				}
			/>
			{error ? <ErrorBanner message={error} /> : null}

			{!loading && item ? (
				<>
					<ProductBarcodePanel code={barcode} />

					<ProductMediaUploader
						itemCode={itemCode}
						media={media}
						canEdit={canEdit}
						onMediaChange={setMedia}
					/>

					<ProductPackingUoms
						itemCode={itemCode}
						stockUom={item.stock_uom}
						canEdit={canEdit}
						onItemChange={setItem}
					/>

					{isTemplate ? (
						<ProductVariantBuilder itemCode={itemCode} canEdit={canEdit} />
					) : (
						<section className="rounded-xl border border-dashed border-line bg-white px-5 py-8">
							<h2 className="font-display text-lg font-semibold text-ink">Variants</h2>
							<p className="mt-2 max-w-xl text-sm text-ink-muted">
								This product is a single SKU. To add Colour, Size, or other variants, create a new product
								with “Template with variants” selected.
							</p>
						</section>
					)}

					<div className="flex justify-end gap-2 border-t border-line pt-4">
						<Button variant="secondary" onClick={() => navigate('/inventory/products')}>
							Skip for now
						</Button>
						<Button onClick={() => navigate('/inventory/products')}>Done</Button>
					</div>
				</>
			) : null}
		</div>
	)
}
