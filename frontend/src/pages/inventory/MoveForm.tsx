/**
 * Purpose: Create / view / submit Material Receipt, Issue, or Transfer Stock Entries.
 * Exports: default MoveFormPage
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { API, useApiCall } from '@/lib/api'
import type { Item, Warehouse } from '@/lib/types'
import { MoveSuccessPanel, type MoveSuccessSummary } from '@/components/inventory/MoveSuccessPanel'
import { ReceiptComposeForm } from '@/components/inventory/ReceiptComposeForm'
import { type ReceiptLine } from '@/components/inventory/ReceiptLinesEditor'
import { Button, ErrorBanner, Input, PageHeader, Select } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useNotify } from '@/lib/notifications'

type MoveKind = 'receipt' | 'delivery' | 'transfer'

type MoveDoc = {
	name: string
	docstatus: number
	to_warehouse?: string
	from_warehouse?: string
	items: {
		item_code: string
		qty: number
		s_warehouse?: string
		t_warehouse?: string
		basic_rate?: number
	}[]
}

type LocationState = {
	justPosted?: boolean
	summary?: MoveSuccessSummary
}

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

const RECEIPT_WAREHOUSE_KEY = 'pramniaga.receipt.to_warehouse'

/**
 * receiptWarehouseStorageKey - Session key for last-used receipt warehouse.
 *
 * @param company - Company name used for scoping.
 * @returns sessionStorage key.
 */
function receiptWarehouseStorageKey(company: string) {
	return `${RECEIPT_WAREHOUSE_KEY}.${company}`
}

/**
 * newReceiptLine - Build a blank receipt line with optional item defaults.
 *
 * @param item - Optional product to prefill code and unit cost.
 * @returns Receipt line row.
 */
function newReceiptLine(item?: Item | null): ReceiptLine {
	return {
		key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		item_code: item?.item_code || '',
		qty: 1,
		basic_rate: Number(item?.valuation_rate || 0),
	}
}

/**
 * summaryFromDoc - Derive success-panel summary from a Stock Entry dict.
 *
 * @param doc - Loaded or just-created move document.
 * @returns Summary for MoveSuccessPanel.
 */
function summaryFromDoc(doc: MoveDoc): MoveSuccessSummary {
	const totalQty = (doc.items || []).reduce((sum, line) => sum + Number(line.qty || 0), 0)
	const totalValue = (doc.items || []).reduce(
		(sum, line) => sum + Number(line.qty || 0) * Number(line.basic_rate || 0),
		0,
	)
	return {
		name: doc.name,
		warehouse: doc.to_warehouse || doc.items?.[0]?.t_warehouse,
		lineCount: doc.items?.length || 0,
		totalQty,
		totalValue,
	}
}

/**
 * MoveFormPage - Kind-parameterized create / view / submit form for stock moves.
 *
 * @param props.kind - receipt | delivery | transfer.
 * @returns Move form page.
 */
export default function MoveFormPage({ kind }: { kind: MoveKind }) {
	const cfg = config[kind]
	const { id } = useParams()
	const isNew = !id || id === 'new'
	const navigate = useNavigate()
	const location = useLocation()
	const locationState = (location.state || {}) as LocationState
	const { session } = useAuth()
	const canSubmit = Boolean(session?.capabilities.can_submit_moves)
	const { notify } = useNotify()

	const [items, setItems] = useState<Item[]>([])
	const [warehouses, setWarehouses] = useState<Warehouse[]>([])
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(!isNew)
	const [saving, setSaving] = useState(false)
	const [docstatus, setDocstatus] = useState(0)
	const [loadedDoc, setLoadedDoc] = useState<MoveDoc | null>(null)
	const [showPostedSuccess, setShowPostedSuccess] = useState(Boolean(locationState.justPosted))
	const [postedSummary, setPostedSummary] = useState<MoveSuccessSummary | null>(
		locationState.summary || null,
	)

	const [form, setForm] = useState({
		item_code: '',
		qty: 1,
		basic_rate: 0,
		from_warehouse: '',
		to_warehouse: '',
	})
	const [receiptLines, setReceiptLines] = useState<ReceiptLine[]>([newReceiptLine()])

	const { call: listItems } = useApiCall<Item[]>(API.inventory.itemsList)
	const { call: listWarehouses } = useApiCall<Warehouse[]>(API.inventory.warehousesList)
	const { call: createMove } = useApiCall<MoveDoc>(cfg.createMethod)
	const { call: getMove } = useApiCall<MoveDoc>(API.inventory.movesGet)
	const { call: submitMove } = useApiCall<MoveDoc>(cfg.submitMethod)

	useEffect(() => {
		Promise.all([
			listItems({ exclude_templates: 1, limit: 500 }),
			listWarehouses({ company: session?.default_company, leaf_only: 1 }),
		]).then(([itemRows, whRows]) => {
			const usableItems = itemRows.filter((item) => !item.has_variants)
			setItems(usableItems)
			setWarehouses(whRows)

			const company = session?.default_company || ''
			const remembered =
				kind === 'receipt' && company
					? window.sessionStorage.getItem(receiptWarehouseStorageKey(company))
					: null
			const defaultWarehouse =
				(remembered && whRows.some((wh) => wh.name === remembered) ? remembered : null) ||
				whRows[0]?.name ||
				''

			setForm((prev) => ({
				...prev,
				from_warehouse: prev.from_warehouse || defaultWarehouse,
				to_warehouse: prev.to_warehouse || defaultWarehouse,
				item_code: prev.item_code || usableItems[0]?.item_code || '',
				basic_rate: prev.basic_rate || Number(usableItems[0]?.valuation_rate || 0),
			}))

			if (isNew && kind === 'receipt') {
				setReceiptLines((prev) => {
					if (prev.length === 1 && !prev[0].item_code && usableItems[0]) {
						return [newReceiptLine(usableItems[0])]
					}
					return prev
				})
			}
		})
	}, [isNew, kind, listItems, listWarehouses, session?.default_company])

	useEffect(() => {
		if (isNew) return
		setLoading(true)
		getMove({ name: id })
			.then((doc) => {
				setDocstatus(doc.docstatus)
				setLoadedDoc(doc)
				const line = doc.items?.[0]
				if (line) {
					setForm({
						item_code: line.item_code,
						qty: line.qty,
						basic_rate: line.basic_rate || 0,
						from_warehouse: line.s_warehouse || doc.from_warehouse || '',
						to_warehouse: line.t_warehouse || doc.to_warehouse || '',
					})
				}
				if (kind === 'receipt') {
					const lines = (doc.items || []).map((row, index) => ({
						key: `loaded-${index}-${row.item_code}`,
						item_code: row.item_code,
						qty: row.qty,
						basic_rate: Number(row.basic_rate || 0),
					}))
					setReceiptLines(lines.length ? lines : [newReceiptLine()])
					setPostedSummary((prev) => prev || (doc.docstatus === 1 ? summaryFromDoc(doc) : null))
				}
			})
			.catch((err) => setError(err.message || 'Unable to load record'))
			.finally(() => setLoading(false))
	}, [getMove, id, isNew, kind])

	if (kind === 'receipt') {
		const successSummary =
			postedSummary || (loadedDoc && docstatus === 1 ? summaryFromDoc(loadedDoc) : null)
		const showSuccessPanel = Boolean(successSummary) && !isNew && docstatus === 1

		return (
			<div>
				<PageHeader
					title={isNew ? 'New receipt' : `Receipt ${id}`}
					loading={loading}
					actions={
						<div className="flex items-center gap-2">
							<span
								className="hidden h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white sm:inline-flex"
								aria-hidden
							>
								<Receipt className="h-4 w-4" />
							</span>
							<Button variant="secondary" onClick={() => navigate(cfg.listPath)}>
								Back
							</Button>
						</div>
					}
				/>
				{error ? <ErrorBanner message={error} /> : null}

				{!loading ? (
					<>
				{showSuccessPanel && successSummary ? (
					<div className="mb-6">
						<MoveSuccessPanel
							summary={successSummary}
							animated={showPostedSuccess}
							onReceiveAnother={() => {
								const company = session?.default_company || ''
								if (company && successSummary.warehouse) {
									window.sessionStorage.setItem(
										receiptWarehouseStorageKey(company),
										successSummary.warehouse,
									)
								}
								navigate('/inventory/receipts/new')
							}}
							onBackToList={() => navigate(cfg.listPath)}
						/>
					</div>
				) : null}

				{isNew || docstatus === 0 ? (
					<ReceiptComposeForm
						toWarehouse={form.to_warehouse}
						onToWarehouseChange={(warehouse) => setForm({ ...form, to_warehouse: warehouse })}
						warehouses={warehouses}
						lines={receiptLines}
						onLinesChange={setReceiptLines}
						items={items}
						canEdit={isNew && canSubmit}
						isNew={isNew}
						canSubmit={canSubmit}
						saving={saving}
						onPost={async () => {
							setError(null)
							setSaving(true)
							try {
								const company = session?.default_company || ''
								if (company && form.to_warehouse) {
									window.sessionStorage.setItem(
										receiptWarehouseStorageKey(company),
										form.to_warehouse,
									)
								}
								const doc = await createMove({
									data: {
										company: session?.default_company,
										to_warehouse: form.to_warehouse,
										submit: 1,
										items: receiptLines.map((line) => ({
											item_code: line.item_code,
											qty: line.qty,
											warehouse: form.to_warehouse,
											t_warehouse: form.to_warehouse,
											basic_rate: line.basic_rate,
										})),
									},
								})
								const summary = summaryFromDoc(doc)
								notify.success({
									title: 'Receipt posted',
									message: 'Stock levels have been updated.',
								})
								navigate(`${cfg.listPath}/${doc.name}`, {
									state: { justPosted: true, summary },
									replace: true,
								})
							} catch (err) {
								setError(err instanceof Error ? err.message : 'Unable to save operation')
							} finally {
								setSaving(false)
							}
						}}
						onSubmitDraft={async () => {
							setSaving(true)
							setError(null)
							try {
								await submitMove({ name: id })
								const summary = summaryFromDoc(
									loadedDoc || {
										name: String(id),
										docstatus: 1,
										to_warehouse: form.to_warehouse,
										items: receiptLines.map((line) => ({
											item_code: line.item_code,
											qty: line.qty,
											basic_rate: line.basic_rate,
											t_warehouse: form.to_warehouse,
										})),
									},
								)
								notify.success({
									title: 'Receipt submitted',
									message: 'Stock has been updated.',
								})
								setDocstatus(1)
								setPostedSummary(summary)
								setShowPostedSuccess(true)
							} catch (err) {
								setError(err instanceof Error ? err.message : 'Unable to submit')
							} finally {
								setSaving(false)
							}
						}}
					/>
				) : null}
					</>
				) : null}
			</div>
		)
	}

	return (
		<div>
			<PageHeader
				title={isNew ? `New ${cfg.title.toLowerCase()}` : `${cfg.title} ${id}`}
				loading={loading}
				actions={
					<Button variant="secondary" onClick={() => navigate(cfg.listPath)}>
						Back
					</Button>
				}
			/>
			{error ? <ErrorBanner message={error} /> : null}
			{!loading ? (
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
						notify.success({
							title: `${cfg.title} validated`,
							message: 'Stock levels have been updated.',
						})
						navigate(`${cfg.listPath}/${doc.name}`)
					} catch (err) {
						setError(err instanceof Error ? err.message : 'Unable to save operation')
					}
				}}
			>
				<Select
					label="Product"
					value={form.item_code}
					disabled={!isNew || !canSubmit}
					onChange={(e) => setForm({ ...form, item_code: e.target.value })}
				>
					{items.map((item) => (
						<option key={item.item_code} value={item.item_code}>
							{item.item_code} — {item.item_name}
						</option>
					))}
				</Select>
				<Input
					label="Quantity"
					type="number"
					min="0.01"
					step="0.01"
					disabled={!isNew || !canSubmit}
					value={form.qty}
					onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
				/>
				{(cfg.warehouseMode === 'from' || cfg.warehouseMode === 'both') && (
					<Select
						label="From warehouse"
						value={form.from_warehouse}
						disabled={!isNew || !canSubmit}
						onChange={(e) => setForm({ ...form, from_warehouse: e.target.value })}
					>
						{warehouses.map((wh) => (
							<option key={wh.name} value={wh.name}>
								{wh.name}
							</option>
						))}
					</Select>
				)}
				{(cfg.warehouseMode === 'to' || cfg.warehouseMode === 'both') && (
					<Select
						label="To warehouse"
						value={form.to_warehouse}
						disabled={!isNew || !canSubmit}
						onChange={(e) => setForm({ ...form, to_warehouse: e.target.value })}
					>
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
							notify.success({
								title: `${cfg.title} submitted`,
								message: 'Stock has been updated.',
							})
							navigate(cfg.listPath)
						}}
					>
						Submit draft
					</Button>
				) : null}
				{!isNew && docstatus === 1 ? (
					<p className="text-sm text-emerald-700">Submitted — stock has been updated.</p>
				) : null}
			</form>
			) : null}
		</div>
	)
}
