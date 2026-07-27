/**
 * Purpose: Full-viewport blur overlay for long page waits.
 * Exports: LoadingOverlay
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { createPortal } from 'react-dom'

/**
 * LoadingOverlay - Non-dismissible blur modal with circular spinner and wait copy.
 *
 * @param props.label - Status text under the spinner (default "Please wait").
 * @returns Portal overlay element, or null when document is unavailable.
 */
export function LoadingOverlay({ label = 'Please wait' }: { label?: string }) {
	if (typeof document === 'undefined') return null

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md"
			role="status"
			aria-live="polite"
			aria-busy="true"
		>
			<div className="flex flex-col items-center gap-4 rounded-2xl bg-white/90 px-10 py-8 shadow-lg ring-1 ring-black/5">
				<span
					className="inline-block h-10 w-10 animate-spin rounded-full border-[3px] border-brand border-t-transparent"
					aria-hidden
				/>
				<p className="font-display text-base font-medium tracking-tight text-ink">{label}</p>
			</div>
		</div>,
		document.body,
	)
}
