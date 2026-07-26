import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API, useApiCall } from '@/lib/api'
import type { Item, Warehouse } from '@/lib/types'
import { Button, ErrorBanner, Input, LoadingState, PageHeader, Select } from '@/components/ui'
import { useAuth } from '@/lib/auth'

export default function AdjustmentFormPage() {
	const navigate = useNavigate()
	const { session } = useAuth()
	const canAdjust = session?.capabilities.can_adjust_stock

	const [items, setItems] = useState<Item[]>([])
	const [warehouses, setWarehouses] = useState<Warehouse[]>([])
	const [error, setError] = useState<string | null>(null)
	const [form, setForm] = useState({ item_code: '', warehouse: '', qty: 0, valuation_rate: 0 })

	const { call: listItems } = useApiCall<Item[]>(API.inventory.itemsList)
	const { call: listWarehouses } = useApiCall<Warehouse[]>(API.inventory.warehousesList)
	const { call: createAdjustment } = useApiCall(API.inventory.adjustmentsCreate)

	useEffect(() => {
		Promise.all([
			listItems({}),
			listWarehouses({ company: session?.default_company, leaf_only: 1 }),
		]).then(([itemRows, whRows]) => {
			setItems(itemRows.filter((item) => !item.has_variants))
			setWarehouses(whRows)
			setForm((prev) => ({
				...prev,
				item_code: itemRows[0]?.item_code || '',
				warehouse: whRows[0]?.name || '',
				valuation_rate: itemRows[0]?.valuation_rate || 0,
			}))
		})
	}, [listItems, listWarehouses, session?.default_company])

	return (
		<div>
			<PageHeader
				title="New adjustment"
				subtitle="Set the absolute on-hand quantity for a product in a warehouse."
				actions={<Button variant="secondary" onClick={() => navigate('/inventory/adjustments')}>Back</Button>}
			/>
			{error ? <ErrorBanner message={error} /> : null}
			<form
				className="max-w-2xl space-y-4 rounded-xl border border-line bg-white p-6"
				onSubmit={async (e) => {
					e.preventDefault()
					setError(null)
					try {
						await createAdjustment({
							data: {
								company: session?.default_company,
								submit: 1,
								items: [form],
							},
						})
						navigate('/inventory/adjustments')
					} catch (err) {
						setError(err instanceof Error ? err.message : 'Unable to create adjustment')
					}
				}}
			>
				<Select label="Product" value={form.item_code} disabled={!canAdjust} onChange={(e) => setForm({ ...form, item_code: e.target.value })}>
					{items.map((item) => (
						<option key={item.item_code} value={item.item_code}>
							{item.item_code} — {item.item_name}
						</option>
					))}
				</Select>
				<Select label="Warehouse" value={form.warehouse} disabled={!canAdjust} onChange={(e) => setForm({ ...form, warehouse: e.target.value })}>
					{warehouses.map((wh) => (
						<option key={wh.name} value={wh.name}>
							{wh.name}
						</option>
					))}
				</Select>
				<Input label="Counted quantity" type="number" min="0" step="0.01" disabled={!canAdjust} value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
				<Input label="Valuation rate" type="number" min="0" step="0.01" disabled={!canAdjust} value={form.valuation_rate} onChange={(e) => setForm({ ...form, valuation_rate: Number(e.target.value) })} />
				{canAdjust ? <Button type="submit">Apply adjustment</Button> : <p className="text-sm text-ink-muted">Stock Manager role required.</p>}
			</form>
		</div>
	)
}
