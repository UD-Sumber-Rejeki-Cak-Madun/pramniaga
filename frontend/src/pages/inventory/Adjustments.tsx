import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API, useApiCall } from '@/lib/api'
import { Badge, Button, DataTable, EmptyState, ErrorBanner, LoadingState, PageHeader } from '@/components/ui'
import { docstatusLabel } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

interface AdjustmentSummary {
	name: string
	company: string
	purpose: string
	posting_date: string
	docstatus: number
}

export default function AdjustmentsPage() {
	const { session } = useAuth()
	const navigate = useNavigate()
	const [rows, setRows] = useState<AdjustmentSummary[]>([])
	const [error, setError] = useState<string | null>(null)
	const { call, loading } = useApiCall<AdjustmentSummary[]>(API.inventory.adjustmentsList)

	useEffect(() => {
		call({ company: session?.default_company })
			.then(setRows)
			.catch((err) => setError(err.message || 'Unable to load adjustments'))
	}, [call, session?.default_company])

	return (
		<div>
			<PageHeader
				title="Adjustments"
				subtitle="Set counted quantities to match physical inventory."
				actions={
					session?.capabilities.can_adjust_stock ? (
						<Button onClick={() => navigate('/inventory/adjustments/new')}>New adjustment</Button>
					) : null
				}
			/>
			{error ? <ErrorBanner message={error} /> : null}
			{loading ? <LoadingState /> : null}
			{!loading && rows.length === 0 ? (
				<EmptyState title="No adjustments" description="Create a physical inventory adjustment when counts differ from system stock." />
			) : null}
			{rows.length > 0 ? (
				<DataTable
					columns={[
						{ key: 'name', label: 'Reference' },
						{ key: 'posting_date', label: 'Date' },
						{ key: 'purpose', label: 'Purpose' },
						{ key: 'status', label: 'Status' },
					]}
					rows={rows.map((row) => ({
						name: row.name,
						posting_date: row.posting_date,
						purpose: row.purpose,
						status: (
							<Badge tone={row.docstatus === 1 ? 'success' : row.docstatus === 2 ? 'danger' : 'warning'}>
								{docstatusLabel(row.docstatus)}
							</Badge>
						),
					}))}
				/>
			) : null}
		</div>
	)
}
