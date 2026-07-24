/**
 * Purpose: Compact status chip.
 * Exports: Badge
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import { cn } from '@/lib/utils'

/**
 * Badge - Compact status chip with tone variants.
 *
 * @param props.children - Badge label content.
 * @param props.tone - Visual tone: neutral | success | warning | danger.
 * @returns Badge element.
 */
export function Badge({
	children,
	tone = 'neutral',
}: {
	children: React.ReactNode
	tone?: 'neutral' | 'success' | 'warning' | 'danger'
}) {
	const tones = {
		neutral: 'bg-surface-2 text-ink-muted',
		success: 'bg-emerald-50 text-emerald-700',
		warning: 'bg-amber-50 text-amber-700',
		danger: 'bg-red-50 text-danger',
	}
	return <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
}
