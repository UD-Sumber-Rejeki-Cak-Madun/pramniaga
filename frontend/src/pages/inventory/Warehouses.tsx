import { useEffect, useState } from 'react'
import { API, useApiCall } from '@/lib/api'
import type { Warehouse } from '@/lib/types'
import { Button, DataTable, EmptyState, ErrorBanner, Input, LoadingState, PageHeader } from '@/components/ui'
import { useAuth } from '@/lib/auth'

export default function WarehousesPage() {
	const { session } = useAuth()
	const [rows, setRows] = useState<Warehouse[]>([])
	const [error, setError] = useState<string | null>(null)
	const [showForm, setShowForm] = useState(false)
	const [form, setForm] = useState({ warehouse_name: '', company: session?.default_company || '' })
	const { call, loading } = useApiCall<Warehouse[]>(API.inventory.warehousesList)
	const { call: createWarehouse } = useApiCall<Warehouse>(API.inventory.warehousesCreate)

	const load = () => {
		call({ company: session?.default_company, leaf_only: 1 })
			.then(setRows)
			.catch((err) => setError(err.message || 'Unable to load warehouses'))
	}

	useEffect(() => {
		load()
	}, [session?.default_company])

	return (
		<div>
			<PageHeader
				title="Warehouses"
				subtitle="Storage locations used for receipts, deliveries, and transfers."
				actions={
					session?.capabilities.can_manage_warehouses ? (
						<Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'New warehouse'}</Button>
					) : null
				}
			/>
			{error ? <ErrorBanner message={error} /> : null}
			{showForm ? (
				<form
					className="mb-6 grid max-w-xl gap-3 rounded-xl border border-line bg-white p-4 md:grid-cols-2"
					onSubmit={async (e) => {
						e.preventDefault()
						try {
							await createWarehouse({ data: { ...form, is_group: 0 } })
							setShowForm(false)
							setForm({ warehouse_name: '', company: session?.default_company || '' })
							load()
						} catch (err) {
							setError(err instanceof Error ? err.message : 'Unable to create warehouse')
						}
					}}
				>
					<Input label="Warehouse name" value={form.warehouse_name} onChange={(e) => setForm({ ...form, warehouse_name: e.target.value })} required />
					<Input label="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
					<div className="md:col-span-2">
						<Button type="submit">Create warehouse</Button>
					</div>
				</form>
			) : null}
			{loading ? <LoadingState /> : null}
			{!loading && rows.length === 0 ? <EmptyState title="No warehouses" description="Create a warehouse to receive stock." /> : null}
			{rows.length > 0 ? (
				<DataTable
					columns={[
						{ key: 'name', label: 'Name' },
						{ key: 'warehouse_name', label: 'Label' },
						{ key: 'company', label: 'Company' },
					]}
					rows={rows.map((row) => ({
						name: row.name,
						warehouse_name: row.warehouse_name,
						company: row.company,
					}))}
				/>
			) : null}
		</div>
	)
}
