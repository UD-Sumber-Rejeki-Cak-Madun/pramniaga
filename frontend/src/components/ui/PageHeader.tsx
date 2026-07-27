/**
 * Purpose: Page title, optional actions, and delayed loading cues.
 * Exports: PageHeader
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { useDelayedLoading } from '@/lib/useDelayedLoading'
import { LoadingOverlay } from './LoadingOverlay'

/**
 * PageHeader - Page title row with optional actions and delayed loading UI.
 *
 * @param props.title - Main heading text.
 * @param props.actions - Optional action controls (usually buttons).
 * @param props.loading - When true, show delayed inline then overlay loading.
 * @returns Header layout element.
 */
export function PageHeader({
	title,
	actions,
	loading = false,
}: {
	title: string
	actions?: React.ReactNode
	loading?: boolean
}) {
	const { showInline, showOverlay } = useDelayedLoading(loading)

	return (
		<>
			<div className="mb-6 space-y-1">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
					{actions ? <div className="flex items-center gap-2">{actions}</div> : null}
				</div>
				{showInline ? (
					<div className="flex items-center justify-end gap-2 text-sm text-ink-muted" role="status" aria-live="polite">
						<span
							className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent"
							aria-hidden
						/>
						<span>Loading</span>
					</div>
				) : null}
			</div>
			{showOverlay ? <LoadingOverlay /> : null}
		</>
	)
}
