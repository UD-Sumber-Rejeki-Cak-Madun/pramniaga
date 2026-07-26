import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API, useApiCall } from '@/lib/api'
import type { Item } from '@/lib/types'
import { Button, ErrorBanner, Input, LoadingState, PageHeader, Select, Textarea } from '@/components/ui'
import { useAuth } from '@/lib/auth'

export default function ProductFormPage() {
	const { id } = useParams()
	const isNew = !id || id === 'new'
	const navigate = useNavigate()
	const { session } = useAuth()
	const canEdit = session?.capabilities.can_manage_items

	const [form, setForm] = useState({
		item_code: '',
		item_name: '',
		item_group: '',
		stock_uom: 'Nos',
		is_stock_item: 1,
		has_variants: 0,
		valuation_rate: 0,
		standard_rate: 0,
		description: '',
	})
	const [groups, setGroups] = useState<{ name: string }[]>([])
	const [uoms, setUoms] = useState<{ name: string }[]>([])
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(!isNew)

	const { call: getItem } = useApiCall<Item>(API.inventory.itemsGet)
	const { call: createItem } = useApiCall<Item>(API.inventory.itemsCreate)
	const { call: updateItem } = useApiCall<Item>(API.inventory.itemsUpdate)
	const { call: listGroups } = useApiCall<{ name: string }[]>(API.inventory.itemGroupsList)
	const { call: listUoms } = useApiCall<{ name: string }[]>(API.inventory.uomsList)

	useEffect(() => {
		Promise.all([listGroups({}), listUoms({})]).then(([g, u]) => {
			setGroups(g)
			setUoms(u)
			if (isNew && g[0]) {
				setForm((prev) => ({ ...prev, item_group: g[0].name }))
			}
		})
	}, [isNew, listGroups, listUoms])

	useEffect(() => {
		if (isNew) return
		setLoading(true)
		getItem({ item_code: id })
			.then((item) => {
				setForm({
					item_code: item.item_code,
					item_name: item.item_name,
					item_group: item.item_group,
					stock_uom: item.stock_uom,
					is_stock_item: item.is_stock_item,
					has_variants: item.has_variants,
					valuation_rate: item.valuation_rate || 0,
					standard_rate: item.standard_rate || 0,
					description: item.description || '',
				})
			})
			.catch((err) => setError(err.message || 'Unable to load product'))
			.finally(() => setLoading(false))
	}, [getItem, id, isNew])

	if (loading) return <LoadingState />

	return (
		<div>
			<PageHeader
				title={isNew ? 'New product' : `Edit ${form.item_code}`}
				subtitle="Configure product type, category, and stock settings."
				actions={<Button variant="secondary" onClick={() => navigate('/inventory/products')}>Back</Button>}
			/>
			{error ? <ErrorBanner message={error} /> : null}
			<form
				className="max-w-2xl space-y-4 rounded-xl border border-line bg-white p-6"
				onSubmit={async (e) => {
					e.preventDefault()
					setError(null)
					try {
						if (isNew) {
							await createItem({ data: form })
						} else {
							await updateItem({ item_code: id, data: form })
						}
						navigate('/inventory/products')
					} catch (err) {
						setError(err instanceof Error ? err.message : 'Unable to save product')
					}
				}}
			>
				<div className="grid gap-4 md:grid-cols-2">
					<Input
						label="Item code"
						value={form.item_code}
						disabled={!isNew || !canEdit}
						onChange={(e) => setForm({ ...form, item_code: e.target.value })}
						required
					/>
					<Input
						label="Item name"
						value={form.item_name}
						disabled={!canEdit}
						onChange={(e) => setForm({ ...form, item_name: e.target.value })}
						required
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
					<Select
						label="Product type"
						value={String(form.is_stock_item)}
						disabled={!canEdit}
						onChange={(e) => setForm({ ...form, is_stock_item: Number(e.target.value) })}
					>
						<option value="1">Storable product</option>
						<option value="0">Consumable / non-stock</option>
					</Select>
					<Select
						label="Variants"
						value={String(form.has_variants)}
						disabled={!canEdit || !isNew}
						onChange={(e) => setForm({ ...form, has_variants: Number(e.target.value) })}
					>
						<option value="0">Single product</option>
						<option value="1">Template with variants</option>
					</Select>
					<Input
						label="Valuation rate"
						type="number"
						min="0"
						step="0.01"
						disabled={!canEdit}
						value={form.valuation_rate}
						onChange={(e) => setForm({ ...form, valuation_rate: Number(e.target.value) })}
					/>
					<Input
						label="Sales price"
						type="number"
						min="0"
						step="0.01"
						disabled={!canEdit}
						value={form.standard_rate}
						onChange={(e) => setForm({ ...form, standard_rate: Number(e.target.value) })}
					/>
				</div>
				<Textarea
					label="Description"
					disabled={!canEdit}
					value={form.description}
					onChange={(e) => setForm({ ...form, description: e.target.value })}
				/>
				{canEdit ? (
					<div className="flex gap-2">
						<Button type="submit">{isNew ? 'Create product' : 'Save changes'}</Button>
					</div>
				) : (
					<p className="text-sm text-ink-muted">You have read-only access to products.</p>
				)}
			</form>
		</div>
	)
}
