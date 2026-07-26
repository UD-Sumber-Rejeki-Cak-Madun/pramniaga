import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API, useApiCall } from '@/lib/api'
import type { StockEntrySummary } from '@/lib/types'
import { Badge, Button, DataTable, EmptyState, ErrorBanner, LoadingState, PageHeader } from '@/components/ui'
import { docstatusLabel } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

type MoveKind = 'receipt' | 'delivery' | 'transfer'

const config: Record<
	MoveKind,
	{ title: string; subtitle: string; listMethod: string; createPath: string; createLabel: string }
> = {
	receipt: {
		title: 'Receipts',
		subtitle: 'Receive products into your warehouses.',
		listMethod: API.inventory.receiptsList,
		createPath: '/inventory/receipts/new',
		createLabel: 'New receipt',
	},
	delivery: {
		title: 'Deliveries',
		subtitle: 'Issue products out of stock.',
		listMethod: API.inventory.deliveriesList,
		createPath: '/inventory/deliveries/new',
		createLabel: 'New delivery',
	},
	transfer: {
		title: 'Transfers',
		subtitle: 'Move stock between warehouses.',
		listMethod: API.inventory.transfersList,
		createPath: '/inventory/transfers/new',
		createLabel: 'New transfer',
	},
}

export default function MovesListPage({ kind }: { kind: MoveKind }) {
	const cfg = config[kind]
	const navigate = useNavigate()
	const { session } = useAuth()
	const [rows, setRows] = useState<StockEntrySummary[]>([])
	const [error, setError] = useState<string | null>(null)
	const { call, loading } = useApiCall<StockEntrySummary[]>(cfg.listMethod)

	useEffect(() => {
		call({ company: session?.default_company })
			.then(setRows)
			.catch((err) => setError(err.message || 'Unable to load records'))
	}, [call, session?.default_company])

	return (
		<div>
			<PageHeader
				title={cfg.title}
				subtitle={cfg.subtitle}
				actions={
					session?.capabilities.can_submit_moves ? (
						<Button onClick={() => navigate(cfg.createPath)}>{cfg.createLabel}</Button>
					) : null
				}
			/>
			{error ? <ErrorBanner message={error} /> : null}
			{loading ? <LoadingState /> : null}
			{!loading && rows.length === 0 ? (
				<EmptyState title={`No ${cfg.title.toLowerCase()} yet`} description="Create your first operation to update stock." />
			) : null}
			{rows.length > 0 ? (
				<DataTable
					columns={[
						{ key: 'name', label: 'Reference' },
						{ key: 'posting_date', label: 'Date' },
						{ key: 'status', label: 'Status' },
						{ key: 'warehouses', label: 'Warehouses' },
					]}
					rows={rows.map((row) => ({
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
					onRowClick={(row) => navigate(`${cfg.createPath.replace('/new', '')}/${row.name}`)}
				/>
			) : null}
		</div>
	)
}
