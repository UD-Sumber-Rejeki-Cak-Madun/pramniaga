import type { SessionData } from './types'
import { applySessionBoot } from './utils'
import { API } from './api'

function siteHeaders(): HeadersInit {
	const headers: Record<string, string> = {
		Accept: 'application/json',
		'X-Frappe-Site-Name':
			window.boot?.site_name || import.meta.env.VITE_SITE_NAME || 'development.localhost',
	}
	if (window.csrf_token) {
		headers['X-Frappe-CSRF-Token'] = window.csrf_token
	}
	return headers
}

async function parseMessage<T>(response: Response): Promise<T> {
	const data = await response.json()
	if (!response.ok) {
		let message =
			typeof data.message === 'string'
				? data.message
				: data.exception || data._error_message || 'Request failed'
		if (data._server_messages) {
			try {
				const raw = JSON.parse(data._server_messages as string) as string[]
				const first = JSON.parse(raw[0] || '{}') as { message?: string }
				if (first.message) message = first.message
			} catch {
				/* keep fallback */
			}
		}
		throw new Error(typeof message === 'string' ? message.replace(/<[^>]+>/g, '') : 'Request failed')
	}
	return data.message as T
}

/** GET is CSRF-safe — use this to bootstrap csrf_token before any POST. */
export async function fetchSession(): Promise<SessionData> {
	const response = await fetch(`/api/method/${API.auth.session}`, {
		method: 'GET',
		credentials: 'include',
		headers: siteHeaders(),
	})
	const data = await parseMessage<SessionData>(response)
	applySessionBoot(data)
	return data
}

/**
 * Login via stock Frappe /api/method/login (same as Desk), then load our session payload.
 * Ensures CSRF is present first (critical for yarn/Vite where index.html has no Jinja token).
 */
export async function loginWithCredentials(usr: string, pwd: string): Promise<SessionData> {
	if (!window.csrf_token) {
		await fetchSession()
	}

	const response = await fetch('/api/method/login', {
		method: 'POST',
		credentials: 'include',
		headers: {
			...siteHeaders(),
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ usr, pwd }),
	})
	await parseMessage(response)
	return fetchSession()
}

export async function logoutSession(): Promise<void> {
	if (!window.csrf_token) {
		await fetchSession()
	}
	await fetch('/api/method/logout', {
		method: 'POST',
		credentials: 'include',
		headers: {
			...siteHeaders(),
			'Content-Type': 'application/json',
		},
		body: '{}',
	})
	window.csrf_token = ''
}

async function ensureCsrf() {
	if (!window.csrf_token) {
		await fetchSession()
	}
}

async function postMethod<T>(method: string, body: Record<string, unknown>): Promise<T> {
	await ensureCsrf()
	const response = await fetch(`/api/method/${method}`, {
		method: 'POST',
		credentials: 'include',
		headers: {
			...siteHeaders(),
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	})
	return parseMessage<T>(response)
}

export async function resetPassword(user: string): Promise<string> {
	await postMethod(API.auth.resetPassword, { user })
	return 'If this email is registered with us, we have sent password reset instructions to it. Please check your inbox.'
}

export async function signUp(
	email: string,
	fullName: string,
	redirectTo = '/frontend',
): Promise<{ status: number; message: string }> {
	const result = await postMethod<unknown>(API.auth.signUp, {
		email,
		full_name: fullName,
		redirect_to: redirectTo,
	})
	if (Array.isArray(result) && result.length >= 2) {
		return { status: Number(result[0]), message: String(result[1]) }
	}
	if (result && typeof result === 'object' && 'message' in result) {
		const nested = (result as { message: unknown }).message
		if (Array.isArray(nested) && nested.length >= 2) {
			return { status: Number(nested[0]), message: String(nested[1]) }
		}
	}
	return { status: 0, message: 'Unable to create account. Please try again.' }
}

export async function getGoogleLoginUrl(redirectTo = '/frontend'): Promise<string | null> {
	await ensureCsrf()
	const response = await fetch(
		`/api/method/${API.auth.googleLoginUrl}?redirect_to=${encodeURIComponent(redirectTo)}`,
		{
			method: 'GET',
			credentials: 'include',
			headers: siteHeaders(),
		},
	)
	return parseMessage<string | null>(response)
}

export const REMEMBER_EMAIL_KEY = 'pramniaga.login.remember'

export function loadRememberedEmail(): string {
	try {
		return localStorage.getItem(REMEMBER_EMAIL_KEY) || ''
	} catch {
		return ''
	}
}

export function saveRememberedEmail(email: string | null) {
	try {
		if (email) localStorage.setItem(REMEMBER_EMAIL_KEY, email)
		else localStorage.removeItem(REMEMBER_EMAIL_KEY)
	} catch {
		/* ignore quota / private mode */
	}
}
