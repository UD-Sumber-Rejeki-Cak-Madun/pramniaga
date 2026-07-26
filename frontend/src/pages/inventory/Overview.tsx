/**
 * Purpose: Inventory overview cards — draft queues and master-data totals.
 * Exports: default InventoryOverview
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { API, useApiCall } from '@/lib/api'
import type { OverviewCounts } from '@/lib/types'
import { inventoryOverviewCards } from '@/lib/inventoryNav'
import { InventoryActionCard } from '@/components/inventory/InventoryActionCard'
import { ErrorBanner, LoadingState, PageHeader } from '@/components/ui'
import { useAuth } from '@/lib/auth'

/**
 * InventoryOverview - Grid of inventory draft queues and active master-data counts.
 *
 * @returns Overview page element.
 */
export default function InventoryOverview() {
	const { session } = useAuth()
	const [counts, setCounts] = useState<OverviewCounts | null>(null)
	const [error, setError] = useState<string | null>(null)
	const { call, loading } = useApiCall<OverviewCounts>(API.inventory.overviewCounts)
	const countsReady = !loading && counts !== null

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
			<div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
				{inventoryOverviewCards.map((card, index) => (
					<motion.div
						key={card.key}
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.12, duration: 0.35, ease: 'easeOut' }}
						className="h-full"
					>
						<InventoryActionCard
							title={card.label}
							href={card.to}
							icon={card.icon}
							accent={card.accent}
							count={card.countKey && counts ? counts[card.countKey] : card.countKey ? null : undefined}
							countEnabled={countsReady && Boolean(card.countKey)}
							countDelayMs={index * 120}
						/>
					</motion.div>
				))}
			</div>
		</div>
	)
}
