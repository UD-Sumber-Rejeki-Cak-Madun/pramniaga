/**
 * Purpose: Full-page / section permission-denied state for gated routes.
 * Exports: PermissionDenied
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * PermissionDenied - Access-denied panel with optional recovery link.
 *
 * @param props.title - Primary heading (default: Permission denied).
 * @param props.description - Supporting explanation.
 * @param props.backTo - Optional recovery path (default /).
 * @param props.backLabel - Recovery link label.
 * @param props.className - Optional extra class names.
 * @returns Permission-denied panel element.
 */
export function PermissionDenied({
	title = 'Permission denied',
	description = 'You do not have access to this area. Contact your administrator if you need access.',
	backTo = '/',
	backLabel = 'Back to dashboard',
	className,
}: {
	title?: string
	description?: string
	backTo?: string
	backLabel?: string
	className?: string
}) {
	return (
		<div
			role="alert"
			aria-labelledby="permission-denied-title"
			className={cn(
				'flex flex-col items-center justify-center rounded-xl border border-line bg-white px-6 py-16 text-center shadow-panel',
				className,
			)}
		>
			<h2 id="permission-denied-title" className="font-display text-xl font-semibold text-ink">
				{title}
			</h2>
			<p className="mt-2 max-w-md text-sm text-ink-muted">{description}</p>
			<Link
				to={backTo}
				className="mt-6 inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
			>
				{backLabel}
			</Link>
		</div>
	)
}
