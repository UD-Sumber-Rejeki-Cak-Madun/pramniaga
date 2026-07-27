/**
 * Purpose: List Stock Entry moves (receipts / deliveries / transfers) with kind-specific chrome.
 * Exports: default MovesListPage
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { API, useApiCall } from '@/lib/api'
import type { StockEntrySummary } from '@/lib/types'
import { Badge, Button, DataTable, EmptyState, ErrorBanner, PageHeader } from '@/components/ui'
import { cn, docstatusLabel } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

type MoveKind = 'receipt' | 'delivery' | 'transfer'

const config: Record<
	MoveKind,
	{ title: string; listMethod: string; createPath: string; createLabel: string }
> = {
	receipt: {
		title: 'Receipts',
		listMethod: API.inventory.receiptsList,
		createPath: '/inventory/receipts/new',
		createLabel: 'New receipt',
	},
	delivery: {
		title: 'Deliveries',
		listMethod: API.inventory.deliveriesList,
		createPath: '/inventory/deliveries/new',
		createLabel: 'New delivery',
	},
	transfer: {
		title: 'Transfers',
		listMethod: API.inventory.transfersList,
		createPath: '/inventory/transfers/new',
		createLabel: 'New transfer',
	},
}

const easeOut = [0.22, 1, 0.36, 1] as const

/**
 * MovesListPage - Kind-parameterized list of Material Receipt / Issue / Transfer entries.
 *
 * @param props.kind - Move kind controlling copy, API, and receipt-only chrome.
 * @returns Moves list page.
 */
export default function MovesListPage({ kind }: { kind: MoveKind }) {
	const cfg = config[kind]
	const navigate = useNavigate()
	const { session } = useAuth()
	const reduceMotion = useReducedMotion()
	const [rows, setRows] = useState<StockEntrySummary[]>([])
	const [error, setError] = useState<string | null>(null)
	const [draftsOnly, setDraftsOnly] = useState(false)
	const { call, loading } = useApiCall<StockEntrySummary[]>(cfg.listMethod)
	const canSubmit = Boolean(session?.capabilities.can_submit_moves)
	const isReceipt = kind === 'receipt'

	useEffect(() => {
		call({ company: session?.default_company })
			.then(setRows)
			.catch((err) => setError(err.message || 'Unable to load records'))
	}, [call, session?.default_company])

	const draftCount = useMemo(() => rows.filter((row) => row.docstatus === 0).length, [rows])
	const visibleRows = useMemo(() => {
		if (isReceipt && draftsOnly) return rows.filter((row) => row.docstatus === 0)
		return rows
	}, [draftsOnly, isReceipt, rows])

	const detailBase = cfg.createPath.replace('/new', '')

	return (
		<div>
			<PageHeader
				title={cfg.title}
				loading={loading}
				actions={
					canSubmit ? (
						<Button onClick={() => navigate(cfg.createPath)}>{cfg.createLabel}</Button>
					) : null
				}
			/>
			{error ? <ErrorBanner message={error} /> : null}

			{isReceipt && !loading && draftCount > 0 ? (
				<div className="mb-4 flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={() => setDraftsOnly(false)}
						className={cn(
							'rounded-full px-3 py-1 text-xs font-medium transition-colors',
							!draftsOnly ? 'bg-brand text-white' : 'bg-surface-2 text-ink-muted hover:text-ink',
						)}
					>
						All
					</button>
					<button
						type="button"
						onClick={() => setDraftsOnly(true)}
						className={cn(
							'rounded-full px-3 py-1 text-xs font-medium transition-colors',
							draftsOnly ? 'bg-emerald-700 text-white' : 'bg-surface-2 text-ink-muted hover:text-ink',
						)}
					>
						Drafts only ({draftCount})
					</button>
				</div>
			) : null}

			{!loading && rows.length === 0 ? (
				<motion.div
					initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.25, ease: easeOut }}
				>
					<EmptyState
						title={isReceipt ? 'No receipts yet' : `No ${cfg.title.toLowerCase()} yet`}
						description={
							isReceipt
								? 'Receive your first products into stock.'
								: 'Create your first operation to update stock.'
						}
						action={
							isReceipt && canSubmit ? (
								<Button onClick={() => navigate(cfg.createPath)}>{cfg.createLabel}</Button>
							) : null
						}
					/>
				</motion.div>
			) : null}

			{!loading && rows.length > 0 && visibleRows.length === 0 ? (
				<EmptyState title="No drafts" description="All receipts on this list are already submitted." />
			) : null}

			{visibleRows.length > 0 && isReceipt ? (
				<div className="overflow-hidden rounded-xl border border-line bg-white">
					<table className="min-w-full text-left text-sm">
						<thead className="bg-surface-2 text-ink-muted">
							<tr>
								<th className="px-4 py-3 font-medium">Reference</th>
								<th className="px-4 py-3 font-medium">Date</th>
								<th className="px-4 py-3 font-medium">Status</th>
								<th className="px-4 py-3 font-medium">Received into</th>
								<th className="px-4 py-3 font-medium">Lines</th>
							</tr>
						</thead>
						<tbody>
							<AnimatePresence initial={false}>
								{visibleRows.map((row, index) => (
									<motion.tr
										key={row.name}
										initial={reduceMotion ? false : { opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
										transition={{
											duration: 0.22,
											ease: easeOut,
											delay: reduceMotion ? 0 : Math.min(index, 8) * 0.04,
										}}
										className="cursor-pointer border-t border-line transition-colors hover:bg-surface-2/70"
										onClick={() => navigate(`${detailBase}/${row.name}`)}
									>
										<td className="px-4 py-3 font-medium text-ink">{row.name}</td>
										<td className="px-4 py-3 text-ink">{row.posting_date}</td>
										<td className="px-4 py-3">
											<Badge
												tone={row.docstatus === 1 ? 'success' : row.docstatus === 2 ? 'danger' : 'warning'}
											>
												{docstatusLabel(row.docstatus)}
											</Badge>
										</td>
										<td className="px-4 py-3 text-ink">{row.to_warehouse || '—'}</td>
										<td className="px-4 py-3 text-ink">{row.lines_summary || '—'}</td>
									</motion.tr>
								))}
							</AnimatePresence>
						</tbody>
					</table>
				</div>
			) : null}

			{visibleRows.length > 0 && !isReceipt ? (
				<DataTable
					columns={[
						{ key: 'name', label: 'Reference' },
						{ key: 'posting_date', label: 'Date' },
						{ key: 'status', label: 'Status' },
						{ key: 'warehouses', label: 'Warehouses' },
					]}
					rows={visibleRows.map((row) => ({
						name: row.name,
						posting_date: row.posting_date,
						status: (
							<Badge tone={row.docstatus === 1 ? 'success' : row.docstatus === 2 ? 'danger' : 'warning'}>
								{docstatusLabel(row.docstatus)}
							</Badge>
						),
						warehouses: [row.from_warehouse, row.to_warehouse].filter(Boolean).join(' → '),
						_raw: row,
					}))}
					onRowClick={(row) => navigate(`${detailBase}/${row.name}`)}
				/>
			) : null}
		</div>
	)
}
