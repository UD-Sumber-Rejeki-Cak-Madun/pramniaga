/**
 * Purpose: Session bootstrap, CSRF, and credential login against Frappe.
 * Exports: fetchSession, loginWithCredentials, logoutSession, resetPassword, signUp, getGoogleLoginUrl, remember-email helpers
 * Contents: CSRF cookie/bootstrap, stock /api/method/login, session payload fetch
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import type { SessionData } from './types'
import { applySessionBoot } from './utils'
import { API } from './api'

/**
 * siteHeaders - Build Accept / site / CSRF headers for API fetches.
 *
 * @returns HeadersInit for fetch calls.
 */
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

/**
 * parseMessage - Parse Frappe JSON response and throw on error payloads.
 *
 * @param response - Fetch Response.
 * @returns Unwrapped `message` value.
 */
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

/**
 * fetchSession - GET session payload and apply CSRF boot (CSRF-safe).
 *
 * @returns SessionData for the current user (or guest).
 */
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
 * loginWithCredentials - Login via stock Frappe /api/method/login, then load session.
 *
 * @param usr - Username or email.
 * @param pwd - Password.
 * @returns SessionData after successful login.
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

/**
 * logoutSession - POST logout and clear local CSRF.
 *
 * @returns void
 */
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

/**
 * ensureCsrf - Ensure window.csrf_token exists before POST.
 *
 * @returns void
 */
async function ensureCsrf() {
	if (!window.csrf_token) {
		await fetchSession()
	}
}

/**
 * postMethod - POST a Frappe method with JSON body after ensuring CSRF.
 *
 * @param method - Dotted method path.
 * @param body - JSON body params.
 * @returns Unwrapped message payload.
 */
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

/**
 * resetPassword - Request a password reset email for a user.
 *
 * @param user - Email or username.
 * @returns User-facing confirmation string.
 */
export async function resetPassword(user: string): Promise<string> {
	await postMethod(API.auth.resetPassword, { user })
	return 'If this email is registered with us, we have sent password reset instructions to it. Please check your inbox.'
}

/**
 * signUp - Create a user via Frappe sign_up.
 *
 * @param email - New user email.
 * @param fullName - Full name.
 * @param redirectTo - Post-signup redirect path.
 * @returns Status code and message from Frappe.
 */
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

/**
 * getGoogleLoginUrl - Fetch Google OAuth authorize URL when configured.
 *
 * @param redirectTo - Post-login redirect path.
 * @returns Authorize URL or null.
 */
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

/**
 * loadRememberedEmail - Read remembered login email from localStorage.
 *
 * @returns Stored email or empty string.
 */
export function loadRememberedEmail(): string {
	try {
		return localStorage.getItem(REMEMBER_EMAIL_KEY) || ''
	} catch {
		return ''
	}
}

/**
 * saveRememberedEmail - Persist or clear remembered login email.
 *
 * @param email - Email to store, or null to clear.
 * @returns void
 */
export function saveRememberedEmail(email: string | null) {
	try {
		if (email) localStorage.setItem(REMEMBER_EMAIL_KEY, email)
		else localStorage.removeItem(REMEMBER_EMAIL_KEY)
	} catch {
		/* ignore quota / private mode */
	}
}
