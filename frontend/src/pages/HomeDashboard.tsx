/**
 * Purpose: Home dashboard — revenue, activities, and upcoming events.
 * Exports: default HomeDashboard
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { API, useApiCall } from '@/lib/api'
import type { DailyActivities, RevenueSummary, UpcomingEvents } from '@/lib/types'
import { DailyActivitiesCard } from '@/components/dashboard/DailyActivitiesCard'
import { RevenueForecastCard } from '@/components/dashboard/RevenueForecastCard'
import { TotalIncomeCard } from '@/components/dashboard/TotalIncomeCard'
import { UpcomingEventsCard } from '@/components/dashboard/UpcomingEventsCard'
import { Card, ErrorBanner, PageHeader } from '@/components/ui'
import { useAuth } from '@/lib/auth'

/**
 * HomeDashboard - Loads dashboard slices independently so one failure does not blank the page.
 *
 * @returns Dashboard page element.
 */
export default function HomeDashboard() {
	const { session } = useAuth()
	const company = session?.default_company || undefined

	const [revenue, setRevenue] = useState<RevenueSummary | null>(null)
	const [activities, setActivities] = useState<DailyActivities | null>(null)
	const [events, setEvents] = useState<UpcomingEvents | null>(null)
	const [error, setError] = useState<string | null>(null)

	const revenueApi = useApiCall<RevenueSummary>(API.dashboard.revenueSummary)
	const activitiesApi = useApiCall<DailyActivities>(API.dashboard.dailyActivities)
	const eventsApi = useApiCall<UpcomingEvents>(API.dashboard.upcomingEvents)

	useEffect(() => {
		let cancelled = false
		setError(null)
		setRevenue(null)
		setActivities(null)
		setEvents(null)

		const failures: string[] = []

		const noteFailure = (label: string, err: unknown) => {
			const message = err instanceof Error ? err.message : `Unable to load ${label}`
			failures.push(`${label}: ${message}`)
		}

		Promise.allSettled([
			revenueApi.call({ company }).then((rev) => {
				if (!cancelled) setRevenue(rev)
			}),
			activitiesApi.call({ company, limit: 12 }).then((act) => {
				if (!cancelled) setActivities(act)
			}),
			eventsApi.call({ days: 14 }).then((ev) => {
				if (!cancelled) setEvents(ev)
			}),
		]).then((results) => {
			if (cancelled) return
			const labels = ['Revenue', 'Activities', 'Events'] as const
			results.forEach((result, index) => {
				if (result.status === 'rejected') {
					noteFailure(labels[index], result.reason)
				}
			})
			if (failures.length) {
				setError(failures.join(' · '))
			}
		})

		return () => {
			cancelled = true
		}
		// intentionally refresh when company changes; call identities are stable enough via useCallback
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [company])

	const loading = !revenue && !activities && !events && !error
	const activityCount = activities?.items.length ?? 0

	return (
		<div>
			<PageHeader title="Dashboard" />

			{error ? (
				<div className="mb-4">
					<ErrorBanner message={error} />
				</div>
			) : null}

			<div className="grid gap-4 xl:grid-cols-3">
				<div className="space-y-4 xl:col-span-2">
					<RevenueForecastCard
						months={revenue?.months || []}
						loading={loading || revenueApi.loading}
						canRead={Boolean(revenue?.can_read)}
						currency={revenue?.currency}
					/>
					<DailyActivitiesCard items={activities?.items || []} loading={loading || activitiesApi.loading} />
				</div>

				<div className="space-y-4">
					<TotalIncomeCard
						mtdTotal={revenue?.mtd_total ?? 0}
						momPercent={revenue?.mom_percent ?? null}
						currency={revenue?.currency}
						loading={loading || revenueApi.loading}
						canRead={Boolean(revenue?.can_read)}
					/>

					<Card className="p-5">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
								<Users className="h-5 w-5" />
							</div>
							<div>
								<p className="text-sm text-ink-muted">Recent activity</p>
								<p className="font-display text-2xl font-semibold">{activityCount}</p>
							</div>
						</div>
						<p className="mt-3 text-xs text-ink-muted">Items in your activity feed right now</p>
					</Card>

					<UpcomingEventsCard
						items={events?.items || []}
						loading={loading || eventsApi.loading}
						canRead={Boolean(events?.can_read)}
					/>
				</div>
			</div>
		</div>
	)
}
