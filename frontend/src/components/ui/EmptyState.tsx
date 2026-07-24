/**
 * Purpose: Empty list/section placeholder.
 * Exports: EmptyState
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import { cn } from '@/lib/utils'

/**
 * EmptyState - Placeholder when a list or section has no data.
 *
 * @param props.title - Primary empty-state message.
 * @param props.description - Optional supporting text.
 * @param props.className - Optional extra class names.
 * @returns Empty-state panel element.
 */
export function EmptyState({
	title,
	description,
	className,
}: {
	title: string
	description?: string
	className?: string
}) {
	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface-2 px-6 py-16 text-center',
				className,
			)}
		>
			<h3 className="font-medium text-ink">{title}</h3>
			{description ? <p className="mt-2 max-w-md text-sm text-ink-muted">{description}</p> : null}
		</div>
	)
}
