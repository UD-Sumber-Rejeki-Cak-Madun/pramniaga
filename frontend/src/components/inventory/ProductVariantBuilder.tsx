/**
 * Purpose: Build Color/Size (or custom) attribute combinations and create ERPNext variants.
 * Exports: ProductVariantBuilder
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Plus, Trash2 } from 'lucide-react'
import { API, useApiCall } from '@/lib/api'
import type { Item, ItemAttribute, ProductMediaUploadResult, VariantCreateManyResult } from '@/lib/types'
import { Badge, Button, ErrorBanner, Input, Select } from '@/components/ui'
import { fileToBase64, productImageSrc } from '@/lib/utils'
import productsFallback from '@/assets/inventory/products.jpg'

const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const VARIANTS_CREATE_MANY_MAX = 100

type AttributeDraft = {
	id: string
	attribute: string
	valuesText: string
}

export interface ProductVariantBuilderProps {
	itemCode: string
	canEdit: boolean
}

function cartesianProduct(groups: { attribute: string; values: string[] }[]): Record<string, string>[] {
	if (!groups.length) return []
	return groups.reduce<Record<string, string>[]>(
		(acc, group) => {
			if (!acc.length) {
				return group.values.map((value) => ({ [group.attribute]: value }))
			}
			const next: Record<string, string>[] = []
			for (const combo of acc) {
				for (const value of group.values) {
					next.push({ ...combo, [group.attribute]: value })
				}
			}
			return next
		},
		[],
	)
}

function comboKey(combo: Record<string, string>) {
	return Object.entries(combo)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}:${v}`)
		.join('|')
}

function parseValues(text: string) {
	return text
		.split(/[,|\n]/)
		.map((v) => v.trim())
		.filter(Boolean)
}

/**
 * ProductVariantBuilder - Define template attributes, preview combos, and create variant SKUs.
 *
 * @param props.itemCode - Template Item code.
 * @param props.canEdit - Whether the user may manage attributes/variants.
 * @returns Variants builder section.
 */
export function ProductVariantBuilder({ itemCode, canEdit }: ProductVariantBuilderProps) {
	const [catalog, setCatalog] = useState<ItemAttribute[]>([])
	const [drafts, setDrafts] = useState<AttributeDraft[]>([
		{ id: 'color', attribute: 'Colour', valuesText: 'Red, Blue' },
		{ id: 'size', attribute: 'Size', valuesText: 'S, M, L' },
	])
	const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
	const [existing, setExisting] = useState<Item[]>([])
	const [error, setError] = useState<string | null>(null)
	const [status, setStatus] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)
	const [uploadingCode, setUploadingCode] = useState<string | null>(null)
	const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

	const { call: listAttributes } = useApiCall<ItemAttribute[]>(API.inventory.attributesList)
	const { call: setAttributes } = useApiCall<Item>(API.inventory.itemsSetAttributes)
	const { call: listVariants } = useApiCall<Item[]>(API.inventory.variantsList)
	const { call: createMany } = useApiCall<VariantCreateManyResult>(API.inventory.variantsCreateMany)
	const { call: uploadMedia } = useApiCall<ProductMediaUploadResult>(API.inventory.itemsUploadMedia)

	const loadExisting = () => {
		listVariants({ template: itemCode })
			.then(setExisting)
			.catch((err) => setError(err.message || 'Unable to load variants'))
	}

	useEffect(() => {
		listAttributes({})
			.then((attrs) => {
				setCatalog(attrs)
				const colour = attrs.find((a) => /colou?r/i.test(a.attribute_name || a.name))
				const size = attrs.find((a) => /size/i.test(a.attribute_name || a.name))
				setDrafts((prev) =>
					prev.map((row) => {
						if (row.id === 'color' && colour) {
							const values = (colour.values || [])
								.map((v) => v.attribute_value)
								.filter((v) => v !== 'Default')
								.join(', ')
							return { ...row, attribute: colour.name, valuesText: values || row.valuesText }
						}
						if (row.id === 'size' && size) {
							const values = (size.values || []).map((v) => v.attribute_value).join(', ')
							return { ...row, attribute: size.name, valuesText: values || row.valuesText }
						}
						return row
					}),
				)
			})
			.catch((err) => setError(err.message || 'Unable to load attributes'))
		listVariants({ template: itemCode })
			.then(setExisting)
			.catch((err) => setError(err.message || 'Unable to load variants'))
	}, [itemCode, listAttributes, listVariants])

	const parsedGroups = useMemo(
		() =>
			drafts
				.map((d) => ({
					attribute: d.attribute.trim(),
					values: parseValues(d.valuesText),
				}))
				.filter((g) => g.attribute && g.values.length),
		[drafts],
	)

	const combinations = useMemo(() => cartesianProduct(parsedGroups), [parsedGroups])
	const knownComboKeysRef = useRef<Set<string>>(new Set())

	useEffect(() => {
		const nextKeys = combinations.map(comboKey)
		const nextSet = new Set(nextKeys)
		setSelectedKeys((prev) => {
			const updated = new Set<string>()
			// Keep still-valid selections the user already made.
			for (const key of prev) {
				if (nextSet.has(key)) updated.add(key)
			}
			// Auto-select only combinations that just appeared (first load or new values).
			for (const key of nextKeys) {
				if (!knownComboKeysRef.current.has(key)) updated.add(key)
			}
			return updated
		})
		knownComboKeysRef.current = nextSet
	}, [combinations])

	const existingKeys = useMemo(() => {
		const keys = new Set<string>()
		for (const variant of existing) {
			const map: Record<string, string> = {}
			for (const row of variant.attributes || []) {
				if (row.attribute && row.attribute_value) map[row.attribute] = row.attribute_value
			}
			if (Object.keys(map).length) keys.add(comboKey(map))
		}
		return keys
	}, [existing])

	async function handleCreate() {
		if (!canEdit) return
		setError(null)
		setStatus(null)
		const checked = combinations.filter((c) => selectedKeys.has(comboKey(c)) && !existingKeys.has(comboKey(c)))
		if (!parsedGroups.length) {
			setError('Add at least one attribute with values.')
			return
		}
		if (!checked.length) {
			setError('Select at least one new combination to create.')
			return
		}
		if (checked.length > VARIANTS_CREATE_MANY_MAX) {
			setError(`Select at most ${VARIANTS_CREATE_MANY_MAX} combinations at once.`)
			return
		}

		setBusy(true)
		try {
			await setAttributes({
				item_code: itemCode,
				attributes: parsedGroups.map((g) => ({ attribute: g.attribute, values: g.values })),
			})
			const result = await createMany({ template: itemCode, combinations: checked })
			const createdCount = result.created?.length || 0
			const errorCount = result.errors?.length || 0
			setStatus(
				errorCount
					? `Created ${createdCount} variant(s); ${errorCount} skipped or failed.`
					: `Created ${createdCount} variant(s).`,
			)
			if (errorCount && result.errors?.[0]?.error) {
				setError(result.errors[0].error)
			}
			loadExisting()
			const attrs = await listAttributes({})
			setCatalog(attrs)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to create variants')
		} finally {
			setBusy(false)
		}
	}

	async function handleVariantImage(variantCode: string, file: File | undefined) {
		if (!file || !canEdit) return
		setError(null)
		if (file.size > IMAGE_MAX_BYTES) {
			setError('Image must be 5 MB or smaller.')
			return
		}
		setUploadingCode(variantCode)
		try {
			const filedata = await fileToBase64(file)
			const result = await uploadMedia({
				item_code: variantCode,
				media_kind: 'image',
				filename: file.name,
				filedata,
			})
			setExisting((rows) =>
				rows.map((row) =>
					row.item_code === variantCode ? { ...row, image: result.image || result.file_url } : row,
				),
			)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to upload variant image')
		} finally {
			setUploadingCode(null)
		}
	}

	return (
		<section className="space-y-4">
			<div>
				<h2 className="font-display text-lg font-semibold text-ink">Variants</h2>
				<p className="mt-1 text-sm text-ink-muted">
					Define attributes like Colour or Size, preview combinations, then create SKUs. Each variant
					gets its own code/barcode and photo.
				</p>
			</div>
			{error ? <ErrorBanner message={error} /> : null}
			{status ? <p className="text-sm text-emerald-700">{status}</p> : null}

			<div className="space-y-3 rounded-xl border border-line bg-white p-4">
				{drafts.map((draft) => (
					<div key={draft.id} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
						<div className="space-y-1.5">
							<span className="text-sm font-medium text-ink">Attribute</span>
							{canEdit ? (
								<>
									<Select
										value={catalog.some((a) => a.name === draft.attribute) ? draft.attribute : ''}
										onChange={(e) => {
											const name = e.target.value
											const match = catalog.find((a) => a.name === name)
											const values = (match?.values || []).map((v) => v.attribute_value).join(', ')
											setDrafts((rows) =>
												rows.map((r) =>
													r.id === draft.id
														? { ...r, attribute: name || r.attribute, valuesText: values || r.valuesText }
														: r,
												),
											)
										}}
									>
										<option value="">Custom / type below</option>
										{catalog
											.filter((a) => !a.numeric_values)
											.map((a) => (
												<option key={a.name} value={a.name}>
													{a.attribute_name || a.name}
												</option>
											))}
									</Select>
									<Input
										placeholder="e.g. Colour"
										value={draft.attribute}
										onChange={(e) =>
											setDrafts((rows) =>
												rows.map((r) => (r.id === draft.id ? { ...r, attribute: e.target.value } : r)),
											)
										}
									/>
								</>
							) : (
								<p className="text-sm text-ink">{draft.attribute}</p>
							)}
						</div>
						<Input
							label="Values (comma-separated)"
							placeholder="Red, Blue, Green"
							disabled={!canEdit}
							value={draft.valuesText}
							onChange={(e) =>
								setDrafts((rows) =>
									rows.map((r) => (r.id === draft.id ? { ...r, valuesText: e.target.value } : r)),
								)
							}
						/>
						{canEdit ? (
							<div className="flex items-end">
								<Button
									type="button"
									variant="ghost"
									aria-label="Remove attribute"
									onClick={() => setDrafts((rows) => rows.filter((r) => r.id !== draft.id))}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						) : null}
					</div>
				))}
				{canEdit ? (
					<Button
						type="button"
						variant="secondary"
						onClick={() =>
							setDrafts((rows) => [
								...rows,
								{ id: `attr-${Date.now()}`, attribute: '', valuesText: '' },
							])
						}
					>
						<Plus className="h-4 w-4" />
						Add attribute
					</Button>
				) : null}
			</div>

			{combinations.length > 0 ? (
				<div className="overflow-hidden rounded-xl border border-line bg-white">
					<div className="border-b border-line px-4 py-3 text-sm font-medium text-ink">
						Combinations ({combinations.length})
					</div>
					<ul className="divide-y divide-line">
						{combinations.map((combo) => {
							const key = comboKey(combo)
							const already = existingKeys.has(key)
							const checked = selectedKeys.has(key)
							const label = Object.values(combo).join(' · ')
							return (
								<li key={key} className="flex items-center gap-3 px-4 py-2.5 text-sm">
									<input
										type="checkbox"
										className="h-4 w-4 accent-brand"
										disabled={!canEdit || already}
										checked={already || checked}
										onChange={(e) => {
											setSelectedKeys((prev) => {
												const next = new Set(prev)
												if (e.target.checked) next.add(key)
												else next.delete(key)
												return next
											})
										}}
									/>
									<span className="flex-1 text-ink">{label}</span>
									{already ? <Badge tone="success">Exists</Badge> : null}
								</li>
							)
						})}
					</ul>
				</div>
			) : null}

			{canEdit ? (
				<Button type="button" disabled={busy} onClick={() => void handleCreate()}>
					{busy ? 'Creating variants…' : 'Save attributes & create variants'}
				</Button>
			) : null}

			{existing.length > 0 ? (
				<div className="space-y-3">
					<p className="text-sm font-medium text-ink">Existing variants</p>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{existing.map((variant) => {
							const label = variant.attributes?.length
								? variant.attributes.map((a) => a.attribute_value).join(' / ')
								: variant.item_name
							const src = productImageSrc(variant.image, productsFallback)
							const code = variant.barcode || variant.item_code
							return (
								<div
									key={variant.item_code}
									className="overflow-hidden rounded-xl border border-line bg-white"
								>
									<div className="aspect-[4/3] bg-ink/5">
										<img src={src} alt="" className="h-full w-full object-cover" />
									</div>
									<div className="space-y-2 p-3">
										<p className="text-sm font-medium text-ink">{label}</p>
										<p className="font-mono text-xs text-ink-muted">{code}</p>
										{canEdit ? (
											<>
												<input
													ref={(el) => {
														fileRefs.current[variant.item_code] = el
													}}
													type="file"
													accept="image/jpeg,image/png,image/gif,image/webp"
													className="hidden"
													onChange={(e) => {
														void handleVariantImage(variant.item_code, e.target.files?.[0])
														e.target.value = ''
													}}
												/>
												<Button
													type="button"
													variant="secondary"
													disabled={uploadingCode === variant.item_code}
													onClick={() => fileRefs.current[variant.item_code]?.click()}
												>
													<ImagePlus className="h-4 w-4" />
													{uploadingCode === variant.item_code
														? 'Uploading…'
														: variant.image
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
				</div>
			) : null}
		</section>
	)
}
