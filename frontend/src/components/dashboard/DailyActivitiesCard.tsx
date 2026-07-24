import type { ActivityItem } from '@/lib/types'
import { Card, EmptyState, LoadingState } from '@/components/ui'
import { cn } from '@/lib/utils'

const toneClass: Record<string, string> = {
	brand: 'bg-brand',
	pink: 'bg-pink-400',
	teal: 'bg-teal-500',
	amber: 'bg-amber-400',
}

function formatTime(value: string) {
	try {
		const d = new Date(value)
		return d.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	} catch {
		return value
	}
}

export function DailyActivitiesCard({
	items,
	loading,
}: {
	items: ActivityItem[]
	loading?: boolean
}) {
	return (
		<Card className="p-5">
			<h2 className="font-display text-lg font-semibold text-ink">Daily activities</h2>
			<p className="mt-1 text-xs text-ink-muted">Recent invoices, payments, and stock moves</p>

			{loading ? <LoadingState label="Loading activities…" /> : null}

			{!loading && items.length === 0 ? (
				<div className="mt-4">
					<EmptyState
						className="py-8"
						title="No recent activity"
						description="Updates will show up as work happens."
					/>
				</div>
			) : null}

			{!loading && items.length > 0 ? (
				<ul className="mt-5 space-y-4">
					{items.map((item) => (
						<li key={item.id} className="flex gap-3">
							<div className="flex w-16 shrink-0 flex-col items-end pt-0.5">
								<span className="text-[11px] font-medium text-ink-muted">{formatTime(item.time)}</span>
							</div>
							<div className="relative flex flex-1 gap-3 border-l border-line pl-4">
								<span
									className={cn(
										'absolute -left-1.5 top-1.5 h-3 w-3 rounded-full ring-2 ring-white',
										toneClass[item.tone] || 'bg-slate-400',
									)}
								/>
								<p className="text-sm leading-snug text-ink">{item.title}</p>
							</div>
						</li>
					))}
				</ul>
			) : null}
		</Card>
	)
}
