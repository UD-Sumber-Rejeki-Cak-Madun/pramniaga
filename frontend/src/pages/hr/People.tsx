/**
 * Purpose: HR People directory — Active employees, identity/org fields only.
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
import { useEffect, useState } from 'react'
import { API, useApiCall } from '@/lib/api'
import type { EmployeeSummary } from '@/lib/types'
import {
	Button,
	DataTable,
	EmptyState,
	ErrorBanner,
	LoadingState,
	PageHeader,
	PermissionDenied,
} from '@/components/ui'
import { useAuth } from '@/lib/auth'

/**
 * HrPeoplePage - HR directory list without salary or bank fields.
 *
 * @returns People list page or PermissionDenied.
 */
export default function HrPeoplePage() {
	const { session } = useAuth()
	const [rows, setRows] = useState<EmployeeSummary[]>([])
	const [search, setSearch] = useState('')
	const [error, setError] = useState<string | null>(null)
	const { call, loading } = useApiCall<EmployeeSummary[]>(API.hr.employeesList)

	const load = () => {
		setError(null)
		call({
			company: session?.default_company || undefined,
			search: search || undefined,
		})
			.then((data) => setRows(Array.isArray(data) ? data : []))
			.catch((err) => setError(err.message || 'Unable to load people'))
	}

	useEffect(() => {
		if (!session?.capabilities.can_view_employees) return
		load()
		// eslint-disable-next-line react-hooks/exhaustive-deps -- initial load by capability/company
	}, [session?.capabilities.can_view_employees, session?.default_company])

	if (!session?.capabilities.can_use_hr) {
		return <PermissionDenied description="You do not have access to HR." backTo="/" />
	}

	if (!session.capabilities.can_view_employees) {
		return (
			<PermissionDenied
				description="You do not have permission to view the people directory."
				backTo="/hr"
				backLabel="Back to HR"
			/>
		)
	}

	return (
		<div>
			<PageHeader title="People" subtitle="Active employees in your company. Salary and bank details are never listed here." />
			<div className="mb-4 flex gap-2">
				<input
					className="w-full max-w-sm rounded-md border border-line px-3 py-2 text-sm"
					placeholder="Search by name or ID"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					aria-label="Search people"
				/>
				<Button variant="secondary" onClick={load}>
					Search
				</Button>
			</div>
			{error ? <ErrorBanner message={error} /> : null}
			{loading && !error ? <LoadingState label="Loading people…" /> : null}
			{!loading && !error && rows.length === 0 ? (
				<EmptyState title="No people found" description="No active employees match this company and search." />
			) : null}
			{!loading && rows.length > 0 ? (
				<DataTable
					columns={[
						{ key: 'name', label: 'ID' },
						{ key: 'employee_name', label: 'Name' },
						{ key: 'department', label: 'Department' },
						{ key: 'designation', label: 'Designation' },
						{ key: 'status', label: 'Status' },
					]}
					rows={rows.map((row) => ({
						name: row.name,
						employee_name: row.employee_name,
						department: row.department || '—',
						designation: row.designation || '—',
						status: row.status,
					}))}
				/>
			) : null}
		</div>
	)
}
