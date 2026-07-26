/**
 * Purpose: Inline error message banner.
 * Exports: ErrorBanner
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */

/**
 * ErrorBanner - Inline error message for forms and pages.
 *
 * @param props.message - Error text to display.
 * @returns Error banner element.
 */
export function ErrorBanner({ message }: { message: string }) {
	return (
		<div className="rounded-md border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{message}</div>
	)
}
