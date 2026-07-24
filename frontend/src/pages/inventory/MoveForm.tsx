import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API, useApiCall } from '@/lib/api'
import type { Item, Warehouse } from '@/lib/types'
import { Button, ErrorBanner, Input, LoadingState, PageHeader, Select } from '@/components/ui'
import { useAuth } from '@/lib/auth'

type MoveKind = 'receipt' | 'delivery' | 'transfer'

const config: Record<
	MoveKind,
	{
		title: string
		createMethod: string
		submitMethod: string
		listPath: string
		warehouseMode: 'to' | 'from' | 'both'
	}
> = {
	receipt: {
		title: 'Receipt',
		createMethod: API.inventory.receiptsCreate,
		submitMethod: API.inventory.movesSubmit,
		listPath: '/inventory/receipts',
		warehouseMode: 'to',
	},
	delivery: {
		title: 'Delivery',
		createMethod: API.inventory.deliveriesCreate,
		submitMethod: API.inventory.movesSubmit,
		listPath: '/inventory/deliveries',
		warehouseMode: 'from',
	},
	transfer: {
		title: 'Transfer',
		createMethod: API.inventory.transfersCreate,
		submitMethod: API.inventory.movesSubmit,
		listPath: '/inventory/transfers',
		warehouseMode: 'both',
	},
}

export default function MoveFormPage({ kind }: { kind: MoveKind }) {
	const cfg = config[kind]
	const { id } = useParams()
	const isNew = !id || id === 'new'
	const navigate = useNavigate()
	const { session } = useAuth()
	const canSubmit = session?.capabilities.can_submit_moves

	const [items, setItems] = useState<Item[]>([])
	const [warehouses, setWarehouses] = useState<Warehouse[]>([])
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(!isNew)
	const [docstatus, setDocstatus] = useState(0)
	const [form, setForm] = useState({
		item_code: '',
		qty: 1,
		basic_rate: 0,
		from_warehouse: '',
		to_warehouse: '',
	})

	const { call: listItems } = useApiCall<Item[]>(API.inventory.itemsList)
	const { call: listWarehouses } = useApiCall<Warehouse[]>(API.inventory.warehousesList)
	const { call: createMove } = useApiCall<{ name: string }>(cfg.createMethod)
	const { call: getMove } = useApiCall<{ name: string; docstatus: number; items: { item_code: string; qty: number; s_warehouse?: string; t_warehouse?: string; basic_rate?: number }[] }>(
		API.inventory.movesGet,
	)
	const { call: submitMove } = useApiCall(cfg.submitMethod)

	useEffect(() => {
		Promise.all([
			listItems({}),
			listWarehouses({ company: session?.default_company, leaf_only: 1 }),
		]).then(([itemRows, whRows]) => {
			setItems(itemRows.filter((item) => !item.has_variants))
			setWarehouses(whRows)
			if (whRows[0]) {
				setForm((prev) => ({
					...prev,
					from_warehouse: prev.from_warehouse || whRows[0].name,
					to_warehouse: prev.to_warehouse || whRows[0].name,
					item_code: itemRows[0]?.item_code || '',
				}))
			}
		})
	}, [listItems, listWarehouses, session?.default_company])

	useEffect(() => {
		if (isNew) return
		setLoading(true)
		getMove({ name: id })
			.then((doc) => {
				setDocstatus(doc.docstatus)
				const line = doc.items?.[0]
				if (line) {
					setForm({
						item_code: line.item_code,
						qty: line.qty,
						basic_rate: line.basic_rate || 0,
						from_warehouse: line.s_warehouse || '',
						to_warehouse: line.t_warehouse || '',
					})
				}
			})
			.catch((err) => setError(err.message || 'Unable to load record'))
			.finally(() => setLoading(false))
	}, [getMove, id, isNew])

	if (loading) return <LoadingState />

	return (
		<div>
			<PageHeader
				title={isNew ? `New ${cfg.title.toLowerCase()}` : `${cfg.title} ${id}`}
				subtitle="Validate to update stock levels."
				actions={<Button variant="secondary" onClick={() => navigate(cfg.listPath)}>Back</Button>}
			/>
			{error ? <ErrorBanner message={error} /> : null}
			<form
				className="max-w-2xl space-y-4 rounded-xl border border-line bg-white p-6"
				onSubmit={async (e) => {
					e.preventDefault()
					setError(null)
					try {
						const payload = {
							company: session?.default_company,
							from_warehouse: form.from_warehouse,
							to_warehouse: form.to_warehouse,
							submit: 1,
							items: [
								{
									item_code: form.item_code,
									qty: form.qty,
									warehouse: cfg.warehouseMode === 'to' ? form.to_warehouse : form.from_warehouse,
									s_warehouse: form.from_warehouse,
									t_warehouse: form.to_warehouse,
									basic_rate: form.basic_rate,
								},
							],
						}
						const doc = await createMove({ data: payload })
						navigate(`${cfg.listPath}/${doc.name}`)
					} catch (err) {
						setError(err instanceof Error ? err.message : 'Unable to save operation')
					}
				}}
			>
				<Select label="Product" value={form.item_code} disabled={!isNew || !canSubmit} onChange={(e) => setForm({ ...form, item_code: e.target.value })}>
					{items.map((item) => (
						<option key={item.item_code} value={item.item_code}>
							{item.item_code} — {item.item_name}
						</option>
					))}
				</Select>
				<Input label="Quantity" type="number" min="0.01" step="0.01" disabled={!isNew || !canSubmit} value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
				{kind === 'receipt' ? (
					<Input label="Valuation rate" type="number" min="0" step="0.01" disabled={!isNew || !canSubmit} value={form.basic_rate} onChange={(e) => setForm({ ...form, basic_rate: Number(e.target.value) })} />
				) : null}
				{(cfg.warehouseMode === 'from' || cfg.warehouseMode === 'both') && (
					<Select label="From warehouse" value={form.from_warehouse} disabled={!isNew || !canSubmit} onChange={(e) => setForm({ ...form, from_warehouse: e.target.value })}>
						{warehouses.map((wh) => (
							<option key={wh.name} value={wh.name}>
								{wh.name}
							</option>
						))}
					</Select>
				)}
				{(cfg.warehouseMode === 'to' || cfg.warehouseMode === 'both') && (
					<Select label="To warehouse" value={form.to_warehouse} disabled={!isNew || !canSubmit} onChange={(e) => setForm({ ...form, to_warehouse: e.target.value })}>
						{warehouses.map((wh) => (
							<option key={wh.name} value={wh.name}>
								{wh.name}
							</option>
						))}
					</Select>
				)}
				{isNew && canSubmit ? <Button type="submit">Validate</Button> : null}
				{!isNew && docstatus === 0 && canSubmit ? (
					<Button
						type="button"
						onClick={async () => {
							await submitMove({ name: id })
							navigate(cfg.listPath)
						}}
					>
						Submit draft
					</Button>
				) : null}
				{!isNew && docstatus === 1 ? <p className="text-sm text-emerald-700">Submitted — stock has been updated.</p> : null}
			</form>
		</div>
	)
}
