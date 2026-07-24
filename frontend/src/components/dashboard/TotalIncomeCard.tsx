import { TrendingUp } from 'lucide-react'
import { Badge, Card } from '@/components/ui'

function formatMoney(value: number, currency?: string | null) {
	try {
		return new Intl.NumberFormat(undefined, {
			style: currency ? 'currency' : 'decimal',
			currency: currency || undefined,
			maximumFractionDigits: 0,
		}).format(value)
	} catch {
		return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
	}
}

export function TotalIncomeCard({
	mtdTotal,
	momPercent,
	currency,
	loading,
	canRead,
}: {
	mtdTotal: number
	momPercent: number | null
	currency?: string | null
	loading?: boolean
	canRead: boolean
}) {
	return (
		<Card className="p-5">
			<div className="flex items-start justify-between gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 text-pink-600">
					<TrendingUp className="h-5 w-5" />
				</div>
				{canRead && momPercent != null ? (
					<Badge tone={momPercent >= 0 ? 'success' : 'danger'}>
						{momPercent >= 0 ? '+' : ''}
						{momPercent}%
					</Badge>
				) : null}
			</div>
			<p className="mt-4 text-sm text-ink-muted">Total Income</p>
			{loading ? (
				<p className="mt-2 text-sm text-ink-muted">Loading…</p>
			) : (
				<p className="mt-1 font-display text-3xl font-semibold tracking-tight">
					{canRead ? formatMoney(mtdTotal, currency) : '—'}
				</p>
			)}
			<p className="mt-2 text-xs text-ink-muted">Month to date vs same days last month</p>
		</Card>
	)
}
