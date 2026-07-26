/**
 * Purpose: Auth context — session state, login/logout for the SPA.
 * Exports: AuthProvider, useAuth
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { SessionData } from '@/lib/types'
import { getInitialSession } from '@/lib/utils'
import { fetchSession, loginWithCredentials, logoutSession } from '@/lib/session'

interface AuthContextValue {
	session: SessionData | null
	loading: boolean
	error: string | null
	refresh: () => Promise<SessionData | null>
	login: (usr: string, pwd: string) => Promise<void>
	logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * AuthProvider - Provides session state and auth actions to the SPA tree.
 * Boot session is provisional until the first refresh() completes.
 *
 * @param props.children - React children wrapped by the provider.
 * @returns Auth context provider element.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
	const initial = getInitialSession()
	const [session, setSession] = useState<SessionData | null>(initial)
	// Always start loading so ProtectedRoute waits for refresh even when boot exists.
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const bootstrapped = useRef(false)

	const refresh = useCallback(async () => {
		setError(null)
		try {
			const data = await fetchSession()
			setSession(data)
			return data
		} catch (err) {
			setSession(null)
			setError(err instanceof Error ? err.message : 'Unable to load session')
			return null
		}
	}, [])

	const login = useCallback(async (usr: string, pwd: string) => {
		setLoading(true)
		setError(null)
		try {
			const data = await loginWithCredentials(usr, pwd)
			setSession(data)
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Unable to sign in. Check your email and password.'
			setError(message)
			throw err
		} finally {
			setLoading(false)
		}
	}, [])

	const logout = useCallback(async () => {
		await logoutSession()
		setSession(null)
		setError(null)
	}, [])

	useEffect(() => {
		if (bootstrapped.current) return
		bootstrapped.current = true
		setLoading(true)
		refresh().finally(() => setLoading(false))
	}, [refresh])

	const value = useMemo(
		() => ({ session, loading, error, refresh, login, logout }),
		[session, loading, error, refresh, login, logout],
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * useAuth - Read auth context (session, login, logout, refresh).
 *
 * @returns Auth context value.
 * @throws Error if used outside AuthProvider.
 */
export function useAuth() {
	const ctx = useContext(AuthContext)
	if (!ctx) throw new Error('useAuth must be used within AuthProvider')
	return ctx
}
