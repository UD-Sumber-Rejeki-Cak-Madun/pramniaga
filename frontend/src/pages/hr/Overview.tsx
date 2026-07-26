/**
 * Purpose: HR overview — role-aware counts and persona quick links.
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { API, useApiCall } from '@/lib/api'
import type { HrOverviewCounts } from '@/lib/types'
import { Card, ErrorBanner, LoadingState, PageHeader, PermissionDenied } from '@/components/ui'
import { useAuth } from '@/lib/auth'

interface OverviewCard {
	key: keyof HrOverviewCounts | 'profile'
	title: string
	href: string
	color: string
	hint: string
	show: boolean
}

/**
 * HrOverview - Role-aware HR home with scoped counts (no fake KPIs).
 *
 * @returns Overview page, loading/error state, or PermissionDenied.
 */
export default function HrOverview() {
	const { session } = useAuth()
	const caps = session?.capabilities
	const [counts, setCounts] = useState<HrOverviewCounts | null>(null)
	const [error, setError] = useState<string | null>(null)
	const { call, loading } = useApiCall<HrOverviewCounts>(API.hr.overviewCounts)

	useEffect(() => {
		if (!caps?.can_use_hr) return
		setError(null)
		call({ company: session?.default_company })
			.then(setCounts)
			.catch((err) => setError(err.message || 'Unable to load HR overview'))
	}, [call, caps?.can_use_hr, session?.default_company])

	const cards = useMemo<OverviewCard[]>(() => {
		if (!caps) return []
		return [
			{
				key: 'profile',
				title: 'My profile',
				href: '/hr/me/profile',
				color: 'bg-teal-700',
				hint: session?.employee ? session.employee.employee_name : 'No employee linked',
				show: caps.can_self_service || Boolean(session?.employee),
			},
			{
				key: 'my_leave_open',
				title: 'My leave',
				href: '/hr/me/leave',
				color: 'bg-sky-700',
				hint: 'Open requests',
				show: caps.can_self_service,
			},
			{
				key: 'my_payslips',
				title: 'My payslips',
				href: '/hr/me/payslips',
				color: 'bg-slate-700',
				hint: 'Submitted slips',
				show: caps.can_self_service,
			},
			{
				key: 'people',
				title: 'People',
				href: '/hr/manage/people',
				color: 'bg-brand',
				hint: 'Active employees',
				show: caps.can_view_employees,
			},
			{
				key: 'leave_approvals_open',
				title: 'Leave approvals',
				href: '/hr/manage/leave',
				color: 'bg-amber-600',
				hint: 'Awaiting decision',
				show: caps.can_approve_leave,
			},
		].filter((card) => card.show)
	}, [caps, session?.employee])

	if (!caps?.can_use_hr) {
		return (
			<PermissionDenied
				description="You do not have access to HR."
				backTo="/"
				backLabel="Back to dashboard"
			/>
		)
	}

	return (
		<div>
			<PageHeader
				title="HR Overview"
				subtitle={
					session?.employee
						? `Signed in as ${session.employee.employee_name}.`
						: 'People, leave, attendance, and payroll — modules open as you gain access.'
				}
			/>
			{error ? <ErrorBanner message={error} /> : null}
			{loading && !counts && !error ? <LoadingState label="Loading HR overview…" /> : null}
			{!loading && !error && cards.length === 0 ? (
				<p className="mt-6 text-sm text-ink-muted">
					No HR modules are available for your account yet. Ask an administrator to link an Employee
					record or assign an HR role.
				</p>
			) : null}
			{!error && cards.length > 0 ? (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{cards.map((card, index) => {
						const value =
							card.key === 'profile'
								? session?.employee?.status || '—'
								: counts && card.key in counts
									? counts[card.key as keyof HrOverviewCounts]
									: loading
										? '—'
										: '—'
						return (
							<motion.div
								key={card.key}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: index * 0.04 }}
							>
								<Link to={card.href}>
									<Card className="group p-5 transition hover:-translate-y-0.5 hover:border-brand/30">
										<div className="flex items-start justify-between">
											<div>
												<p className="text-sm text-ink-muted">{card.hint}</p>
												<h2 className="mt-1 font-display text-xl font-semibold">{card.title}</h2>
											</div>
											<div
												className={`rounded-lg px-3 py-1 text-sm font-semibold text-white ${card.color}`}
											>
												{value ?? '—'}
											</div>
										</div>
										<p className="mt-4 text-sm font-medium text-brand group-hover:underline">Open</p>
									</Card>
								</Link>
							</motion.div>
						)
					})}
				</div>
			) : null}
			{counts && !counts.hrms_available ? (
				<p className="mt-4 text-sm text-ink-muted">
					HRMS is not installed on this site. Leave, attendance, and payroll counts stay unavailable
					until it is installed.
				</p>
			) : null}
		</div>
	)
}
