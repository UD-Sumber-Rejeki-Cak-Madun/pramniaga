/**
 * Purpose: Classname helper and router basename for Frappe/Vite mounts.
 * Exports: cn, getRouterBasename, session/boot helpers, formatters
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import type { SessionData } from './types'

declare global {
	interface Window {
		csrf_token?: string
		boot?: {
			session?: SessionData
			default_company?: string | null
			site_name?: string
		}
	}
}

/**
 * getRouterBasename - Router basename when served under /frontend.
 *
 * @returns `/frontend` when on that path, otherwise empty string.
 */
export function getRouterBasename(): string {
	const path = window.location.pathname
	if (path === '/frontend' || path.startsWith('/frontend/')) {
		return '/frontend'
	}
	return ''
}

/**
 * applySessionBoot - Write session CSRF and boot payload onto window.
 *
 * @param data - Session payload from the server.
 * @returns void
 */
export function applySessionBoot(data: SessionData) {
	if (data.csrf_token) {
		window.csrf_token = data.csrf_token
	}
	window.boot = {
		...window.boot,
		session: data,
		default_company: data.default_company,
	}
}

/**
 * getCsrfToken - Read CSRF token from window.
 *
 * @returns CSRF token string or empty string.
 */
export function getCsrfToken(): string {
	return window.csrf_token || ''
}

/**
 * getInitialSession - Session embedded in page boot, if any.
 *
 * @returns SessionData or null.
 */
export function getInitialSession(): SessionData | null {
	return window.boot?.session ?? null
}

/**
 * getDefaultCompany - Default company from boot or session.
 *
 * @returns Company name or null.
 */
export function getDefaultCompany(): string | null {
	return window.boot?.default_company ?? window.boot?.session?.default_company ?? null
}

/**
 * cn - Join truthy class name fragments.
 *
 * @param classes - Class strings or falsy values to skip.
 * @returns Space-joined class string.
 */
export function cn(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(' ')
}

/**
 * formatQty - Format a quantity for display.
 *
 * @param value - Numeric or string quantity.
 * @returns Integer string or two-decimal fixed string.
 */
export function formatQty(value: number | string | undefined) {
	const num = Number(value || 0)
	return Number.isInteger(num) ? String(num) : num.toFixed(2)
}

/**
 * docstatusLabel - Human label for Frappe docstatus.
 *
 * @param docstatus - 0 draft, 1 submitted, 2 cancelled.
 * @returns Label string.
 */
export function docstatusLabel(docstatus: number) {
	if (docstatus === 0) return 'Draft'
	if (docstatus === 1) return 'Submitted'
	if (docstatus === 2) return 'Cancelled'
	return 'Unknown'
}
