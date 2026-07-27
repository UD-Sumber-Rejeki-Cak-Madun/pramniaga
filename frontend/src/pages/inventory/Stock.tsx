import { useEffect, useState } from 'react'
import { API, useApiCall } from '@/lib/api'
import type { BinRow } from '@/lib/types'
import { DataTable, EmptyState, ErrorBanner, PageHeader } from '@/components/ui'
import { formatQty } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

export default function StockPage() {
	const { session } = useAuth()
	const [rows, setRows] = useState<BinRow[]>([])
	const [error, setError] = useState<string | null>(null)
	const { call, loading } = useApiCall<BinRow[]>(API.inventory.stockOnHand)

	useEffect(() => {
		call({ company: session?.default_company })
			.then(setRows)
			.catch((err) => setError(err.message || 'Unable to load stock'))
	}, [call, session?.default_company])

	return (
		<div>
			<PageHeader
				title="On Hand"
				loading={loading}
			/>
			{error ? <ErrorBanner message={error} /> : null}
			{!loading && rows.length === 0 ? (
				<EmptyState title="No stock on hand" description="Create products and post a receipt to see quantities here." />
			) : null}
			{rows.length > 0 ? (
				<DataTable
					columns={[
						{ key: 'item_code', label: 'Product' },
						{ key: 'warehouse', label: 'Warehouse' },
						{ key: 'actual_qty', label: 'On hand' },
						{ key: 'stock_uom', label: 'UOM' },
						{ key: 'valuation_rate', label: 'Rate' },
					]}
					rows={rows.map((row) => ({
						item_code: row.item_code,
						warehouse: row.warehouse,
						actual_qty: formatQty(row.actual_qty),
						stock_uom: row.stock_uom,
						valuation_rate: formatQty(row.valuation_rate),
					}))}
				/>
			) : null}
		</div>
	)
}
