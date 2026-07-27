/**
 * Purpose: Session boot helpers, classnames, qty formatting, and media file helpers.
 * Exports: getRouterBasename, applySessionBoot, getCsrfToken, getInitialSession,
 *   getDefaultCompany, cn, productImageSrc, fileToBase64, formatQty, formatMoney, docstatusLabel
 *
 * Last updated: 2026-07-26
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

/**
 * productImageSrc - Resolve Item.image to a usable img src, with optional fallback.
 *
 * @param image - ERPNext Item.image path or absolute URL.
 * @param fallback - Optional fallback asset URL when image is empty.
 * @returns Browser-ready image URL.
 */
export function productImageSrc(image?: string | null, fallback?: string) {
	if (!image) return fallback || ''
	if (image.startsWith('http') || image.startsWith('data:') || image.startsWith('/')) return image
	return `/${image}`
}

/**
 * fileToBase64 - Read a File as a base64 string (no data-URL prefix).
 *
 * @param file - Browser File to encode.
 * @returns Promise resolving to raw base64 content.
 */
export function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const result = String(reader.result || '')
			const comma = result.indexOf(',')
			resolve(comma >= 0 ? result.slice(comma + 1) : result)
		}
		reader.onerror = () => reject(reader.error || new Error('Unable to read file'))
		reader.readAsDataURL(file)
	})
}

export function formatQty(value: number | string | undefined) {
	const num = Number(value || 0)
	return Number.isInteger(num) ? String(num) : num.toFixed(2)
}

/**
 * formatMoney - Format a rate/price for catalog and list display.
 *
 * @param value - Numeric rate or undefined.
 * @returns Formatted currency-like string, or em dash when unset/zero-empty.
 */
export function formatMoney(value: number | string | undefined | null) {
	if (value === undefined || value === null || value === '') return '—'
	const num = Number(value)
	if (!Number.isFinite(num)) return '—'
	return num.toLocaleString(undefined, {
		minimumFractionDigits: num % 1 === 0 ? 0 : 2,
		maximumFractionDigits: 2,
	})
}

export function docstatusLabel(docstatus: number) {
	if (docstatus === 0) return 'Draft'
	if (docstatus === 1) return 'Submitted'
	if (docstatus === 2) return 'Cancelled'
	return 'Unknown'
}
