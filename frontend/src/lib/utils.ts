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

export function getRouterBasename(): string {
	const path = window.location.pathname
	if (path === '/frontend' || path.startsWith('/frontend/')) {
		return '/frontend'
	}
	return ''
}

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

export function getCsrfToken(): string {
	return window.csrf_token || ''
}

export function getInitialSession(): SessionData | null {
	return window.boot?.session ?? null
}

export function getDefaultCompany(): string | null {
	return window.boot?.default_company ?? window.boot?.session?.default_company ?? null
}

export function cn(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(' ')
}

export function formatQty(value: number | string | undefined) {
	const num = Number(value || 0)
	return Number.isInteger(num) ? String(num) : num.toFixed(2)
}

export function docstatusLabel(docstatus: number) {
	if (docstatus === 0) return 'Draft'
	if (docstatus === 1) return 'Submitted'
	if (docstatus === 2) return 'Cancelled'
	return 'Unknown'
}
