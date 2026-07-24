/**
 * Purpose: Dashboard card — multi-month revenue bar chart.
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import {
	Bar,
	BarChart,
	CartesianGrid,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'
import type { RevenueMonth } from '@/lib/types'
import { Card, EmptyState, LoadingState } from '@/components/ui'

function formatCompact(value: number) {
	if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
	if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`
	return value.toFixed(0)
}

/**
 * RevenueForecastCard - Dashboard card for multi-month revenue chart.
 *
 * @param props - Revenue summary fields used by the chart (months, loading, canRead, currency).
 * @returns Card element.
 */
export function RevenueForecastCard({
	months,
	loading,
	canRead,
	currency,
}: {
	months: RevenueMonth[]
	loading?: boolean
	canRead: boolean
	currency?: string | null
}) {
	const chartData = months.map((m) => ({
		label: m.label,
		income: m.income,
		returns: -m.returns,
	}))
	const hasData = months.some((m) => m.income > 0 || m.returns > 0)

	return (
		<Card className="p-5">
			<div className="mb-4 flex items-center justify-between gap-3">
				<div>
					<h2 className="font-display text-lg font-semibold text-ink">Revenue Forecast</h2>
					<p className="text-xs text-ink-muted">Submitted sales vs returns{currency ? ` · ${currency}` : ''}</p>
				</div>
				<span className="rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-medium text-ink-muted">
					Last 9 months
				</span>
			</div>

			{loading ? <LoadingState label="Loading revenue…" /> : null}

			{!loading && !canRead ? (
				<EmptyState
					className="py-10"
					title="Revenue unavailable"
					description="You need permission to read Sales Invoices to see revenue."
				/>
			) : null}

			{!loading && canRead && !hasData ? (
				<EmptyState
					className="py-10"
					title="No revenue yet"
					description="Submitted sales invoices will appear here."
				/>
			) : null}

			{!loading && canRead && hasData ? (
				<div className="h-72 w-full">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={chartData} stackOffset="sign" barGap={2}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
							<XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
							<YAxis
								tickFormatter={formatCompact}
								tick={{ fontSize: 12, fill: '#64748b' }}
								axisLine={false}
								tickLine={false}
								width={40}
							/>
							<Tooltip
								formatter={(value, name) => {
									const n = typeof value === 'number' ? value : Number(value)
									const label = name === 'income' ? 'Income' : 'Returns'
									return [Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 }), label]
								}}
							/>
							<ReferenceLine y={0} stroke="#94a3b8" />
							<Bar dataKey="income" fill="#714B67" radius={[4, 4, 0, 0]} maxBarSize={28} />
							<Bar dataKey="returns" fill="#f9a8d4" radius={[0, 0, 4, 4]} maxBarSize={28} />
						</BarChart>
					</ResponsiveContainer>
				</div>
			) : null}
		</Card>
	)
}
