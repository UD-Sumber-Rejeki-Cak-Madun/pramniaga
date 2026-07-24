import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API, useApiCall } from '@/lib/api'
import type { Item } from '@/lib/types'
import { Badge, Button, DataTable, EmptyState, ErrorBanner, LoadingState, PageHeader } from '@/components/ui'
import { useAuth } from '@/lib/auth'

export default function ProductsPage() {
	const { session } = useAuth()
	const navigate = useNavigate()
	const [items, setItems] = useState<Item[]>([])
	const [search, setSearch] = useState('')
	const [error, setError] = useState<string | null>(null)
	const { call, loading } = useApiCall<Item[]>(API.inventory.itemsList)

	const load = () => {
		call({ search: search || undefined })
			.then(setItems)
			.catch((err) => setError(err.message || 'Unable to load products'))
	}

	useEffect(() => {
		load()
	}, [])

	return (
		<div>
			<PageHeader
				title="Products"
				subtitle="Manage storable products, types, and item master data."
				actions={
					session?.capabilities.can_manage_items ? (
						<Button onClick={() => navigate('/inventory/products/new')}>New product</Button>
					) : null
				}
			/>
			<div className="mb-4 flex gap-2">
				<input
					className="w-full max-w-sm rounded-md border border-line px-3 py-2 text-sm"
					placeholder="Search by item code"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
				<Button variant="secondary" onClick={load}>
					Search
				</Button>
			</div>
			{error ? <ErrorBanner message={error} /> : null}
			{loading ? <LoadingState /> : null}
			{!loading && items.length === 0 ? (
				<EmptyState title="No products yet" description="Create your first product to start tracking stock." />
			) : null}
			{items.length > 0 ? (
				<DataTable
					columns={[
						{ key: 'item_code', label: 'Code' },
						{ key: 'item_name', label: 'Name' },
						{ key: 'item_group', label: 'Category' },
						{ key: 'stock_uom', label: 'UOM' },
						{ key: 'type', label: 'Type' },
					]}
					rows={items.map((item) => ({
						item_code: item.item_code,
						item_name: item.item_name,
						item_group: item.item_group,
						stock_uom: item.stock_uom,
						type: item.has_variants ? <Badge tone="warning">Template</Badge> : item.is_stock_item ? <Badge tone="success">Storable</Badge> : <Badge>Consumable</Badge>,
						_raw: item,
					}))}
					onRowClick={(row) => navigate(`/inventory/products/${row.item_code}`)}
				/>
			) : null}
			<p className="mt-4 text-xs text-ink-muted">
				Need categories? Configure item groups in ERPNext or create products with an existing group.
			</p>
		</div>
	)
}
