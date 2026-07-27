/**
 * Purpose: Create / edit product with Odoo-like title form; templates get inline variants.
 * Exports: default ProductFormPage
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Eye, ImagePlus, Pencil } from 'lucide-react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { API, useApiCall } from '@/lib/api'
import type { Item, ItemCodeSuggestion, ProductMediaUploadResult, ProductPreviewDraft } from '@/lib/types'
import { ProductCustomerPreviewPanel } from '@/components/inventory/ProductCustomerPreviewPanel'
import { ProductVariantBuilder } from '@/components/inventory/ProductVariantBuilder'
import { Button, ErrorBanner, Input, PageHeader, Select, Textarea } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { cn, fileToBase64, productImageSrc } from '@/lib/utils'

const IMAGE_MAX_BYTES = 5 * 1024 * 1024

/**
 * ToggleField - Compact labeled on/off control for product flags.
 *
 * @param props.label - Visible field label.
 * @param props.checked - Whether the toggle is on.
 * @param props.disabled - Disable interaction.
 * @param props.onChange - Called with the next checked state.
 * @param props.hint - Optional helper text under the control.
 * @returns Toggle row.
 */
function ToggleField({
	label,
	checked,
	disabled,
	onChange,
	hint,
}: {
	label: string
	checked: boolean
	disabled?: boolean
	onChange: (next: boolean) => void
	hint?: string
}) {
	return (
		<label className="flex items-start justify-between gap-4">
			<span className="min-w-0">
				<span className="block text-sm font-medium text-ink">{label}</span>
				{hint ? <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span> : null}
			</span>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				disabled={disabled}
				onClick={() => onChange(!checked)}
				className={cn(
					'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors',
					checked ? 'bg-brand' : 'bg-line',
					disabled && 'cursor-not-allowed opacity-60',
				)}
			>
				<span
					className={cn(
						'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
						checked && 'translate-x-5',
					)}
				/>
			</button>
		</label>
	)
}

/**
 * ProductFormPage - Create or edit a product (title-first layout, inline template variants).
 *
 * @returns Product form page.
 */
export default function ProductFormPage() {
	const { id } = useParams()
	const isNew = !id || id === 'new'
	const navigate = useNavigate()
	const location = useLocation()
	const { session } = useAuth()
	const canEdit = session?.capabilities.can_manage_items
	const imageInputRef = useRef<HTMLInputElement>(null)

	const locationState = (location.state as { draft?: ProductPreviewDraft; openPreview?: boolean } | null) || null
	const returnedDraft = locationState?.draft
	const reduceMotion = useReducedMotion()

	const [form, setForm] = useState({
		item_code: returnedDraft?.item_code || '',
		item_name: returnedDraft?.item_name && returnedDraft.item_name !== 'Untitled product' ? returnedDraft.item_name : '',
		item_group: returnedDraft?.item_group || '',
		stock_uom: 'Nos',
		is_stock_item: 1,
		has_variants: returnedDraft?.has_variants || 0,
		valuation_rate: 0,
		standard_rate: returnedDraft?.standard_rate || 0,
		description: returnedDraft?.description || '',
	})
	const [groups, setGroups] = useState<{ name: string }[]>([])
	const [uoms, setUoms] = useState<{ name: string }[]>([])
	const [existingImage, setExistingImage] = useState<string | null>(
		returnedDraft?.image && !returnedDraft.image.startsWith('blob:') ? returnedDraft.image : null,
	)
	const [pendingImage, setPendingImage] = useState<File | null>(null)
	const [pendingPreview, setPendingPreview] = useState<string | null>(null)
	const [generating, setGenerating] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(!isNew)
	const [saving, setSaving] = useState(false)
	const [showPreview, setShowPreview] = useState(Boolean(locationState?.openPreview))

	const { call: getItem } = useApiCall<Item>(API.inventory.itemsGet)
	const { call: suggestCode } = useApiCall<ItemCodeSuggestion>(API.inventory.itemsSuggestCode)
	const { call: createItem } = useApiCall<Item>(API.inventory.itemsCreate)
	const { call: updateItem } = useApiCall<Item>(API.inventory.itemsUpdate)
	const { call: uploadMedia } = useApiCall<ProductMediaUploadResult>(API.inventory.itemsUploadMedia)
	const { call: listGroups } = useApiCall<{ name: string }[]>(API.inventory.itemGroupsList)
	const { call: listUoms } = useApiCall<{ name: string }[]>(API.inventory.uomsList)

	useEffect(() => {
		Promise.all([listGroups({}), listUoms({})]).then(([g, u]) => {
			setGroups(g)
			setUoms(u)
			if (isNew && g[0] && !returnedDraft?.item_group) {
				setForm((prev) => ({ ...prev, item_group: prev.item_group || g[0].name }))
			}
		})
	}, [isNew, listGroups, listUoms, returnedDraft?.item_group])

	useEffect(() => {
		if (isNew) return
		setLoading(true)
		getItem({ item_code: id })
			.then((item) => {
				setForm({
					item_code: item.item_code,
					item_name: returnedDraft?.item_name || item.item_name,
					item_group: returnedDraft?.item_group || item.item_group,
					stock_uom: item.stock_uom,
					is_stock_item: item.is_stock_item,
					has_variants: returnedDraft?.has_variants ?? item.has_variants,
					valuation_rate: item.valuation_rate || 0,
					standard_rate: returnedDraft?.standard_rate ?? item.standard_rate ?? 0,
					description: returnedDraft?.description ?? item.description ?? '',
				})
				const draftImage =
					returnedDraft?.image && !returnedDraft.image.startsWith('blob:') ? returnedDraft.image : null
				setExistingImage(draftImage || item.image || null)
			})
			.catch((err) => setError(err.message || 'Unable to load product'))
			.finally(() => setLoading(false))
	}, [getItem, id, isNew, returnedDraft])

	useEffect(() => {
		if (!pendingImage) {
			setPendingPreview(null)
			return
		}
		const url = URL.createObjectURL(pendingImage)
		setPendingPreview(url)
		return () => URL.revokeObjectURL(url)
	}, [pendingImage])

	async function handleGenerateCode() {
		if (!canEdit || !isNew) return
		setError(null)
		setGenerating(true)
		try {
			const suggested = await suggestCode({})
			setForm((prev) => ({ ...prev, item_code: suggested.item_code }))
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to generate item code')
		} finally {
			setGenerating(false)
		}
	}

	async function uploadPendingImage(itemCode: string) {
		if (!pendingImage) return
		if (pendingImage.size > IMAGE_MAX_BYTES) {
			throw new Error('Image must be 5 MB or smaller.')
		}
		const filedata = await fileToBase64(pendingImage)
		const result = await uploadMedia({
			item_code: itemCode,
			media_kind: 'image',
			filename: pendingImage.name,
			filedata,
		})
		setExistingImage(result.image || existingImage)
		setPendingImage(null)
	}

	const imagePreview = pendingPreview || productImageSrc(existingImage) || null
	const showVariantBuilder = !isNew && Boolean(form.has_variants)

	/**
	 * buildPreviewDraft - Snapshot form fields for the inline customer preview.
	 *
	 * @returns Draft payload for ProductCustomerPreviewPanel.
	 */
	const buildPreviewDraft = (): ProductPreviewDraft => ({
		item_code: form.item_code,
		item_name: form.item_name || 'Untitled product',
		standard_rate: form.standard_rate,
		// Form `description` is internal notes — never surface in customer preview.
		image: imagePreview,
		has_variants: form.has_variants,
		item_group: form.item_group,
		category_path: form.item_group || null,
	})

	const contentMotion = reduceMotion
		? { initial: false, animate: { opacity: 1 }, exit: undefined, transition: { duration: 0 } }
		: {
				initial: { opacity: 0 },
				animate: { opacity: 1 },
				exit: { opacity: 0 },
				transition: { duration: 0.16, ease: 'linear' as const },
			}

	return (
		<div className="space-y-6">
			<PageHeader
				title={isNew ? 'New product' : 'Product'}
				loading={loading}
				actions={
					<div className="flex flex-wrap items-center justify-end gap-2">
						{showPreview ? (
							<Button type="button" variant="secondary" className="group" onClick={() => setShowPreview(false)}>
								<Pencil className="icon-shake h-4 w-4" />
								Edit
							</Button>
						) : (
							<Button type="button" variant="secondary" className="group" onClick={() => setShowPreview(true)}>
								<Eye className="icon-shake h-4 w-4" />
								Preview
							</Button>
						)}
						{!isNew && id ? (
							<Button
								type="button"
								variant="secondary"
								className="group"
								onClick={() => navigate(`/inventory/products/${encodeURIComponent(id)}/media`)}
							>
								<ImagePlus className="icon-shake h-4 w-4" />
								Media & packing
							</Button>
						) : null}
						<Button
							type="button"
							variant="secondary"
							className="group"
							onClick={() => navigate('/inventory/products')}
						>
							<ArrowLeft className="icon-shake h-4 w-4" />
							Back
						</Button>
					</div>
				}
			/>
			{error ? <ErrorBanner message={error} /> : null}

			{!loading ? (
				<>
			<div
				className={cn(
					'w-full rounded-xl border border-line bg-white',
					showPreview ? 'overflow-hidden' : 'space-y-8 p-6 md:p-8',
				)}
			>
				<AnimatePresence mode="wait" initial={false}>
					{showPreview ? (
						<motion.div key="product-preview" {...contentMotion}>
							<ProductCustomerPreviewPanel draft={buildPreviewDraft()} isNewProduct={isNew} />
						</motion.div>
					) : (
						<motion.form
							key="product-form"
							{...contentMotion}
							className="space-y-8"
							onSubmit={async (e) => {
								e.preventDefault()
								setError(null)
								setSaving(true)
								try {
									if (isNew) {
										const code = form.item_code.trim()
										if (!code) {
											setError('Reference / barcode is required. Generate one or enter it manually.')
											setSaving(false)
											return
										}
										const created = await createItem({
											data: {
												...form,
												item_code: code,
												barcodes: [{ barcode: code }],
											},
										})
										const createdCode = created.item_code || code
										if (pendingImage) {
											await uploadPendingImage(createdCode)
										}
										// Enrichment page: packing UOMs, video, and template variants.
										navigate(`/inventory/products/${encodeURIComponent(createdCode)}/media`)
									} else {
										await updateItem({ item_code: id, data: form })
										if (pendingImage && id) {
											await uploadPendingImage(id)
										}
										// Stay on the form so template variants remain editable (ERPNext Desk pattern).
									}
								} catch (err) {
									setError(err instanceof Error ? err.message : 'Unable to save product')
								} finally {
									setSaving(false)
								}
							}}
						>
				{/* Title row — product name + optional image */}
				<div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 flex-1">
						<label className="sr-only" htmlFor="product-name">
							Product name
						</label>
						<input
							id="product-name"
							className="w-full border-0 bg-transparent font-display text-2xl font-semibold text-ink outline-none placeholder:text-ink-muted/50 focus:ring-0 disabled:opacity-60 md:text-3xl"
							value={form.item_name}
							disabled={!canEdit}
							onChange={(e) => setForm({ ...form, item_name: e.target.value })}
							required
							placeholder="Product name"
						/>
					</div>
					<div className="shrink-0">
						<input
							ref={imageInputRef}
							type="file"
							accept="image/jpeg,image/png,image/gif,image/webp"
							className="hidden"
							onChange={(e) => {
								setPendingImage(e.target.files?.[0] || null)
								e.target.value = ''
							}}
						/>
						<button
							type="button"
							disabled={!canEdit}
							onClick={() => imageInputRef.current?.click()}
							className={cn(
								'flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-surface-2 text-ink-muted transition hover:border-brand/40',
								!canEdit && 'cursor-not-allowed opacity-60',
							)}
							aria-label="Add product image"
						>
							{imagePreview ? (
								<img src={imagePreview} alt="" className="h-full w-full object-cover" />
							) : (
								<ImagePlus className="h-7 w-7" />
							)}
						</button>
						{pendingImage && canEdit ? (
							<button
								type="button"
								className="mt-1 block w-24 text-center text-[11px] text-ink-muted underline"
								onClick={() => setPendingImage(null)}
							>
								Remove
							</button>
						) : null}
					</div>
				</div>

				{/* General info */}
				<section className="grid gap-8 md:grid-cols-2">
					<div className="space-y-5">
						<Select
							label="Product type"
							value={String(form.is_stock_item)}
							disabled={!canEdit || Boolean(form.has_variants)}
							onChange={(e) => setForm({ ...form, is_stock_item: Number(e.target.value) })}
						>
							<option value="1">Goods (storable)</option>
							<option value="0">Service / non-stock</option>
						</Select>

						<ToggleField
							label="Track inventory"
							checked={Boolean(form.is_stock_item)}
							disabled={!canEdit || Boolean(form.has_variants)}
							hint={
								form.has_variants
									? 'Templates do not hold stock — variants do.'
									: 'When off, this product is not stocked.'
							}
							onChange={(on) => setForm({ ...form, is_stock_item: on ? 1 : 0 })}
						/>

						<ToggleField
							label="Variants available"
							checked={Boolean(form.has_variants)}
							disabled={!canEdit || !isNew}
							hint={
								isNew
									? 'Creates a template. Add Color/Size SKUs after saving.'
									: 'Cannot change after create. Use the Variants section below.'
							}
							onChange={(on) =>
								setForm({
									...form,
									has_variants: on ? 1 : 0,
									// Templates are not stocked themselves.
									...(on ? { is_stock_item: 1 } : {}),
								})
							}
						/>
					</div>

					<div className="space-y-4">
						<Input
							label="Sales price"
							type="number"
							min="0"
							step="0.01"
							disabled={!canEdit}
							value={form.standard_rate}
							onChange={(e) => setForm({ ...form, standard_rate: Number(e.target.value) })}
						/>
						<Input
							label="Cost"
							type="number"
							min="0"
							step="0.01"
							disabled={!canEdit}
							value={form.valuation_rate}
							onChange={(e) => setForm({ ...form, valuation_rate: Number(e.target.value) })}
						/>
						<Select
							label="Category"
							value={form.item_group}
							disabled={!canEdit}
							onChange={(e) => setForm({ ...form, item_group: e.target.value })}
						>
							{groups.map((g) => (
								<option key={g.name} value={g.name}>
									{g.name}
								</option>
							))}
						</Select>

						<label className="block space-y-1.5">
							<span className="text-sm font-medium text-ink">Reference</span>
							<div className="flex flex-wrap gap-2">
								<input
									className="min-w-0 flex-1 rounded-md border border-line bg-white px-3 py-2 font-mono text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
									value={form.item_code}
									disabled={!isNew || !canEdit}
									onChange={(e) => setForm({ ...form, item_code: e.target.value })}
									required
									placeholder="PRM-XXXXXXXX"
								/>
								{isNew && canEdit ? (
									<Button
										type="button"
										variant="secondary"
										disabled={generating}
										onClick={() => void handleGenerateCode()}
									>
										{generating ? 'Generating…' : 'Generate'}
									</Button>
								) : null}
							</div>
							<span className="text-xs text-ink-muted">
								Also used as the barcode (SKU and scan code are the same).
							</span>
						</label>

						<Input
							label="Barcode"
							value={form.item_code}
							disabled
							readOnly
						/>

						<Select
							label="Unit of measure"
							value={form.stock_uom}
							disabled={!canEdit}
							onChange={(e) => setForm({ ...form, stock_uom: e.target.value })}
						>
							{uoms.map((u) => (
								<option key={u.name} value={u.name}>
									{u.name}
								</option>
							))}
						</Select>
					</div>
				</section>

				<section className="border-t border-line pt-6">
					<Textarea
						label="Internal notes"
						disabled={!canEdit}
						value={form.description}
						onChange={(e) => setForm({ ...form, description: e.target.value })}
						placeholder="Notes for internal use only."
					/>
				</section>

				{canEdit ? (
					<div className="flex gap-2 border-t border-line pt-6">
						<Button type="submit" disabled={saving}>
							{isNew ? (saving ? 'Creating…' : 'Create product') : saving ? 'Saving…' : 'Save changes'}
						</Button>
					</div>
				) : (
					<p className="text-sm text-ink-muted">You have read-only access to products.</p>
				)}
						</motion.form>
					)}
				</AnimatePresence>
			</div>

			{!showPreview && showVariantBuilder ? (
				<section className="w-full space-y-3">
					<div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-ink">
						This product is a <strong>template</strong> and cannot be used in stock transactions. Create
						variant SKUs (e.g. Color / Size) below — same pattern as ERPNext Desk.
					</div>
					<ProductVariantBuilder itemCode={form.item_code || id || ''} canEdit={Boolean(canEdit)} />
				</section>
			) : null}
				</>
			) : null}
		</div>
	)
}
