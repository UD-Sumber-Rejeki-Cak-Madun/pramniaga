/**
 * Purpose: Page title, optional subtitle, and action slot.
 * Exports: PageHeader
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */

/**
 * PageHeader - Page title row with optional subtitle and actions.
 *
 * @param props.title - Main heading text.
 * @param props.subtitle - Optional supporting text.
 * @param props.actions - Optional action controls (usually buttons).
 * @returns Header layout element.
 */
export function PageHeader({
	title,
	subtitle,
	actions,
}: {
	title: string
	subtitle?: string
	actions?: React.ReactNode
}) {
	return (
		<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
			<div>
				<h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{title}</h1>
				{subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
			</div>
			{actions ? <div className="flex items-center gap-2">{actions}</div> : null}
		</div>
	)
}
