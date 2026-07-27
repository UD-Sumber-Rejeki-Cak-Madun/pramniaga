/**
 * Purpose: Edit packing UOMs and upload a photo per measurement unit.
 * Exports: ProductPackingUoms
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Plus, Trash2 } from 'lucide-react'
import { API, useApiCall } from '@/lib/api'
import type { Item, ItemUomRow, ProductUomMedia, ProductUomMediaUploadResult } from '@/lib/types'
import { Button, ErrorBanner, Input, Select } from '@/components/ui'
import { fileToBase64, productImageSrc } from '@/lib/utils'
import productsFallback from '@/assets/inventory/products.jpg'

const IMAGE_MAX_BYTES = 5 * 1024 * 1024

export interface ProductPackingUomsProps {
	itemCode: string
	stockUom: string
	canEdit: boolean
	onItemChange?: (item: Item) => void
}

type PackingDraft = {
	id: string
	uom: string
	conversion_factor: number
}

/**
 * ProductPackingUoms - Manage packing conversions and per-UOM product photos.
 *
 * @param props.itemCode - Item code.
 * @param props.stockUom - Primary stock UOM.
 * @param props.canEdit - Whether the user may edit packing / upload.
 * @param props.onItemChange - Optional callback after UOM save.
 * @returns Packing UOM editor with image tiles.
 */
export function ProductPackingUoms({ itemCode, stockUom, canEdit, onItemChange }: ProductPackingUomsProps) {
	const [uomOptions, setUomOptions] = useState<{ name: string }[]>([])
	const [drafts, setDrafts] = useState<PackingDraft[]>([])
	const [mediaByUom, setMediaByUom] = useState<Record<string, string | null>>({})
	const [error, setError] = useState<string | null>(null)
	const [status, setStatus] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [uploadingUom, setUploadingUom] = useState<string | null>(null)
	const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

	const { call: listUoms } = useApiCall<{ name: string }[]>(API.inventory.uomsList)
	const { call: getItem } = useApiCall<Item>(API.inventory.itemsGet)
	const { call: updateItem } = useApiCall<Item>(API.inventory.itemsUpdate)
	const { call: getUomMedia } = useApiCall<ProductUomMedia>(API.inventory.itemsGetUomMedia)
	const { call: uploadUomMedia } = useApiCall<ProductUomMediaUploadResult>(API.inventory.itemsUploadUomMedia)

	function applyItemUoms(item: Item) {
		const packing = (item.uoms || [])
			.filter((row) => row.uom && row.uom !== item.stock_uom)
			.map((row, index) => ({
				id: `uom-${row.uom}-${index}`,
				uom: row.uom,
				conversion_factor: Number(row.conversion_factor) || 1,
			}))
		setDrafts(packing)
	}

	function loadMedia() {
		getUomMedia({ item_code: itemCode })
			.then((result) => {
				const map: Record<string, string | null> = {}
				for (const row of result.media || []) {
					map[row.uom] = row.image_url || null
				}
				setMediaByUom(map)
			})
			.catch((err) => setError(err.message || 'Unable to load UOM media'))
	}

	useEffect(() => {
		listUoms({}).then(setUomOptions).catch(() => setUomOptions([]))
		getItem({ item_code: itemCode })
			.then((item) => {
				applyItemUoms(item)
				onItemChange?.(item)
			})
			.catch((err) => setError(err.message || 'Unable to load packing units'))
		loadMedia()
	}, [itemCode, getItem, getUomMedia, listUoms])

	async function handleSavePacking() {
		if (!canEdit) return
		setError(null)
		setStatus(null)
		const rows: ItemUomRow[] = drafts
			.filter((d) => d.uom && d.uom !== stockUom)
			.map((d) => ({ uom: d.uom, conversion_factor: Number(d.conversion_factor) || 0 }))
		for (const row of rows) {
			if (row.conversion_factor <= 0) {
				setError(`Conversion for ${row.uom} must be greater than zero.`)
				return
			}
		}
		setSaving(true)
		try {
			const updated = await updateItem({ item_code: itemCode, data: { uoms: rows } })
			applyItemUoms(updated)
			onItemChange?.(updated)
			setStatus('Packing units saved.')
			loadMedia()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to save packing units')
		} finally {
			setSaving(false)
		}
	}

	async function handleUpload(uom: string, file: File | undefined) {
		if (!file || !canEdit) return
		setError(null)
		if (file.size > IMAGE_MAX_BYTES) {
			setError('Image must be 5 MB or smaller.')
			return
		}
		setUploadingUom(uom)
		try {
			const filedata = await fileToBase64(file)
			const result = await uploadUomMedia({
				item_code: itemCode,
				uom,
				filename: file.name,
				filedata,
			})
			setMediaByUom((prev) => ({ ...prev, [uom]: result.image_url }))
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to upload UOM image')
		} finally {
			setUploadingUom(null)
		}
	}

	const tiles = [
		{ uom: stockUom, conversion_factor: 1, isStock: true },
		...drafts
			.filter((d) => d.uom && d.uom !== stockUom)
			.map((d) => ({ uom: d.uom, conversion_factor: d.conversion_factor, isStock: false })),
	]

	return (
		<section className="space-y-4">
			<div>
				<h2 className="font-display text-lg font-semibold text-ink">Packing units & photos</h2>
				<p className="mt-1 text-sm text-ink-muted">
					Add how this product packs (box, carton, etc.) and a photo of how each unit looks.
				</p>
			</div>
			{error ? <ErrorBanner message={error} /> : null}
			{status ? <p className="text-sm text-emerald-700">{status}</p> : null}

			<div className="space-y-3 rounded-xl border border-line bg-white p-4">
				<p className="text-sm text-ink">
					Stock UOM: <span className="font-medium">{stockUom}</span> (factor 1)
				</p>
				{drafts.map((draft) => (
					<div key={draft.id} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
						<Select
							label="Packing UOM"
							value={draft.uom}
							disabled={!canEdit}
							onChange={(e) =>
								setDrafts((rows) =>
									rows.map((r) => (r.id === draft.id ? { ...r, uom: e.target.value } : r)),
								)
							}
						>
							<option value="">Select UOM</option>
							{uomOptions
								.filter((u) => u.name !== stockUom)
								.map((u) => (
									<option key={u.name} value={u.name}>
										{u.name}
									</option>
								))}
						</Select>
						<Input
							label={`Qty of ${stockUom} per unit`}
							type="number"
							min="0.0001"
							step="any"
							disabled={!canEdit}
							value={draft.conversion_factor}
							onChange={(e) =>
								setDrafts((rows) =>
									rows.map((r) =>
										r.id === draft.id
											? { ...r, conversion_factor: Number(e.target.value) }
											: r,
									),
								)
							}
						/>
						{canEdit ? (
							<div className="flex items-end">
								<Button
									type="button"
									variant="ghost"
									aria-label="Remove packing UOM"
									onClick={() => setDrafts((rows) => rows.filter((r) => r.id !== draft.id))}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						) : null}
					</div>
				))}
				{canEdit ? (
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="secondary"
							onClick={() =>
								setDrafts((rows) => [
									...rows,
									{ id: `uom-${Date.now()}`, uom: '', conversion_factor: 1 },
								])
							}
						>
							<Plus className="h-4 w-4" />
							Add packing UOM
						</Button>
						<Button type="button" disabled={saving} onClick={() => void handleSavePacking()}>
							{saving ? 'Saving…' : 'Save packing units'}
						</Button>
					</div>
				) : null}
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{tiles.map((tile) => {
					const src = productImageSrc(mediaByUom[tile.uom], productsFallback)
					return (
						<div key={tile.uom} className="overflow-hidden rounded-xl border border-line bg-white">
							<div className="aspect-[4/3] bg-ink/5">
								<img src={src} alt="" className="h-full w-full object-cover" />
							</div>
							<div className="space-y-2 p-3">
								<p className="text-sm font-medium text-ink">
									{tile.uom}
									{tile.isStock ? ' · stock' : ` · ${tile.conversion_factor} ${stockUom}`}
								</p>
								{canEdit ? (
									<>
										<input
											ref={(el) => {
												fileRefs.current[tile.uom] = el
											}}
											type="file"
											accept="image/jpeg,image/png,image/gif,image/webp"
											className="hidden"
											onChange={(e) => {
												void handleUpload(tile.uom, e.target.files?.[0])
												e.target.value = ''
											}}
										/>
										<Button
											type="button"
											variant="secondary"
											disabled={uploadingUom === tile.uom}
											onClick={() => fileRefs.current[tile.uom]?.click()}
										>
											<ImagePlus className="h-4 w-4" />
											{uploadingUom === tile.uom
												? 'Uploading…'
												: mediaByUom[tile.uom]
													? 'Replace photo'
													: 'Add photo'}
										</Button>
									</>
								) : null}
							</div>
						</div>
					)
				})}
			</div>
		</section>
	)
}
