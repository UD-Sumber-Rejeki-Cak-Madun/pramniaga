/**
 * Purpose: Shared Tailwind class strings for login form controls.
 * Exports: pillInputClass, labelClass, accentLinkClass, blackButtonClass
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */

/** Soft gray pill input used on the login forms. */
export const pillInputClass =
	'w-full rounded-2xl border-0 bg-surface-2 px-4 py-3.5 text-sm text-ink outline-none transition placeholder:text-ink-muted/70 focus:ring-2 focus:ring-brand/25'

/** Field label above login inputs. */
export const labelClass = 'mb-1.5 block text-sm font-medium text-ink-muted'

/** Lavender accent text link (forgot password / switch form). */
export const accentLinkClass = 'text-sm font-medium text-accent transition hover:text-brand'

/** Full-width black primary CTA on login. */
export const blackButtonClass =
	'inline-flex w-full items-center justify-center rounded-2xl bg-ink px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:opacity-50'
