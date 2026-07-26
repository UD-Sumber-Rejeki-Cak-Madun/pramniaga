/**
 * Purpose: Centered spinner + label for async waits.
 * Exports: LoadingState
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */

/**
 * LoadingState - Centered spinner with status label.
 *
 * @param props.label - Text shown beside the spinner (default "Loading…").
 * @returns Loading indicator element.
 */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
	return (
		<div className="flex items-center justify-center py-16 text-sm text-ink-muted">
			<span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
			{label}
		</div>
	)
}
