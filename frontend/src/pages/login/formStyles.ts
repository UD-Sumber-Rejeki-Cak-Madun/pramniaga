/**
 * Purpose: Shared Tailwind class strings for login form controls.
 * Exports: pillInputClass, labelClass, accentLinkClass, blackButtonClass
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */

/** pillInputClass - Rounded filled input styles for login fields. */
export const pillInputClass =
	'w-full rounded-2xl border-0 bg-[#F3F3F3] px-4 py-3.5 text-sm text-ink outline-none transition placeholder:text-ink-muted/70 focus:ring-2 focus:ring-brand/25'

/** labelClass - Muted label text above login inputs. */
export const labelClass = 'mb-1.5 block text-sm font-medium text-ink-muted'

/** accentLinkClass - Accent text link (e.g. forgot password). */
export const accentLinkClass = 'text-sm font-medium text-[#A890FE] transition hover:text-brand'

/** blackButtonClass - Full-width primary black submit button. */
export const blackButtonClass =
	'inline-flex w-full items-center justify-center rounded-2xl bg-black px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50'
