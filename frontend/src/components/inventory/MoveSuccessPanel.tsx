/**
 * Purpose: Post-submit confirmation panel for inventory moves (receipt-first).
 * Exports: MoveSuccessSummary, MoveSuccessPanel
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui'
import { formatMoney, formatQty } from '@/lib/utils'

export interface MoveSuccessSummary {
	name: string
	warehouse?: string
	lineCount: number
	totalQty: number
	totalValue?: number
}

/**
 * MoveSuccessPanel - Emerald confirmation with summary and recovery actions.
 *
 * @param props.summary - Posted document summary.
 * @param props.animated - When true, play the check spring entrance.
 * @param props.onReceiveAnother - Navigate back to compose (same warehouse).
 * @param props.onBackToList - Navigate to the receipts list.
 * @returns Success panel element.
 */
export function MoveSuccessPanel({
	summary,
	animated = false,
	onReceiveAnother,
	onBackToList,
}: {
	summary: MoveSuccessSummary
	animated?: boolean
	onReceiveAnother?: () => void
	onBackToList?: () => void
}) {
	const reduceMotion = useReducedMotion()
	const showActions = Boolean(onReceiveAnother || onBackToList)

	return (
		<div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-6 md:p-8">
			<div className="flex items-start gap-4">
				<motion.span
					className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm"
					initial={animated && !reduceMotion ? { scale: 0.6, opacity: 0 } : false}
					animate={{ scale: 1, opacity: 1 }}
					transition={
						reduceMotion
							? { duration: 0 }
							: { type: 'spring', stiffness: 420, damping: 32 }
					}
					aria-hidden
				>
					<Check className="h-5 w-5" strokeWidth={2.5} />
				</motion.span>
				<div className="min-w-0 flex-1">
					<h2 className="font-display text-xl font-semibold text-emerald-900">Stock updated</h2>
					<p className="mt-1 text-sm text-emerald-800/90">
						{summary.name}
						{summary.warehouse ? ` · received into ${summary.warehouse}` : ''}
					</p>
					<ul className="mt-4 space-y-1 text-sm text-emerald-900/90">
						<li>
							{summary.lineCount === 1 ? '1 product' : `${summary.lineCount} products`}
							{' · '}
							{formatQty(summary.totalQty)} units
						</li>
						{summary.totalValue != null ? (
							<li>Value {formatMoney(summary.totalValue)}</li>
						) : null}
					</ul>
					{showActions ? (
						<div className="mt-6 flex flex-wrap gap-2">
							{onReceiveAnother ? (
								<Button type="button" onClick={onReceiveAnother}>
									Receive another
								</Button>
							) : null}
							{onBackToList ? (
								<Button type="button" variant="secondary" onClick={onBackToList}>
									Back to receipts
								</Button>
							) : null}
						</div>
					) : null}
				</div>
			</div>
		</div>
	)
}
