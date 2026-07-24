/**
 * Purpose: Dashboard card — upcoming calendar events.
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import { CalendarDays } from 'lucide-react'
import type { CalendarEventItem } from '@/lib/types'
import { Card, EmptyState, LoadingState } from '@/components/ui'

function formatEventWhen(event: CalendarEventItem) {
	if (!event.starts_on) return 'Scheduled'
	try {
		const start = new Date(event.starts_on)
		if (event.all_day) {
			return start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
		}
		return start.toLocaleString(undefined, {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	} catch {
		return event.starts_on
	}
}

/**
 * UpcomingEventsCard - Dashboard card for upcoming calendar events.
 *
 * @param props - Events list plus loading/canRead flags.
 * @returns Card element.
 */
export function UpcomingEventsCard({
	items,
	loading,
	canRead,
}: {
	items: CalendarEventItem[]
	loading?: boolean
	canRead: boolean
}) {
	return (
		<Card className="p-5">
			<div className="flex items-center gap-2">
				<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
					<CalendarDays className="h-4 w-4" />
				</div>
				<div>
					<h2 className="font-display text-lg font-semibold text-ink">Calendar</h2>
					<p className="text-xs text-ink-muted">Upcoming events · next 14 days</p>
				</div>
			</div>

			{loading ? <LoadingState label="Loading events…" /> : null}

			{!loading && !canRead ? (
				<div className="mt-4">
					<EmptyState className="py-8" title="Calendar unavailable" description="You need permission to read Events." />
				</div>
			) : null}

			{!loading && canRead && items.length === 0 ? (
				<div className="mt-4">
					<EmptyState
						className="py-8"
						title="No upcoming events"
						description="Events from your calendar will appear here."
					/>
				</div>
			) : null}

			{!loading && canRead && items.length > 0 ? (
				<ul className="mt-5 space-y-3">
					{items.map((event) => (
						<li key={event.name} className="flex gap-3 rounded-lg border border-line bg-surface-2/60 px-3 py-2.5">
							<span
								className="mt-1 h-8 w-1 shrink-0 rounded-full"
								style={{ backgroundColor: event.color || '#714B67' }}
							/>
							<div className="min-w-0">
								<p className="truncate text-sm font-medium text-ink">{event.subject}</p>
								<p className="mt-0.5 text-xs text-ink-muted">{formatEventWhen(event)}</p>
							</div>
						</li>
					))}
				</ul>
			) : null}
		</Card>
	)
}
