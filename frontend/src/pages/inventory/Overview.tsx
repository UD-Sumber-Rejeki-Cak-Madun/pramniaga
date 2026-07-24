/**
 * Purpose: Inventory overview — draft counts and quick links.
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { API, useApiCall } from '@/lib/api'
import type { OverviewCounts } from '@/lib/types'
import { Card, ErrorBanner, LoadingState, PageHeader } from '@/components/ui'
import { useAuth } from '@/lib/auth'

const cards = [
	{ key: 'receipt', title: 'Receipts', href: '/inventory/receipts', color: 'bg-emerald-600' },
	{ key: 'delivery', title: 'Deliveries', href: '/inventory/deliveries', color: 'bg-amber-600' },
	{ key: 'transfer', title: 'Transfers', href: '/inventory/transfers', color: 'bg-sky-600' },
	{ key: 'adjustment', title: 'Adjustments', href: '/inventory/adjustments', color: 'bg-violet-600' },
	{ key: 'products', title: 'Products', href: '/inventory/products', color: 'bg-brand' },
	{ key: 'warehouses', title: 'Warehouses', href: '/inventory/warehouses', color: 'bg-slate-700' },
] as const

/**
 * InventoryOverview - Inventory overview with draft counts and quick links.
 *
 * @returns Page or card element.
 */
export default function InventoryOverview() {
	const { session } = useAuth()
	const [counts, setCounts] = useState<OverviewCounts | null>(null)
	const [error, setError] = useState<string | null>(null)
	const { call, loading } = useApiCall<OverviewCounts>(API.inventory.overviewCounts)

	useEffect(() => {
		call({ company: session?.default_company })
			.then(setCounts)
			.catch((err) => setError(err.message || 'Unable to load overview'))
	}, [call, session?.default_company])

	return (
		<div>
			<PageHeader
				title="Inventory Overview"
				subtitle="Track operations, stock, and master data from one place."
			/>
			{error ? <ErrorBanner message={error} /> : null}
			{loading ? <LoadingState /> : null}
			<div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{cards.map((card, index) => (
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
										<p className="text-sm text-ink-muted">To process</p>
										<h2 className="mt-1 font-display text-xl font-semibold">{card.title}</h2>
									</div>
									<div className={`rounded-lg px-3 py-1 text-sm font-semibold text-white ${card.color}`}>
										{counts ? counts[card.key as keyof OverviewCounts] : '—'}
									</div>
								</div>
								<p className="mt-4 text-sm font-medium text-brand group-hover:underline">Open</p>
							</Card>
						</Link>
					</motion.div>
				))}
			</div>
		</div>
	)
}
