/**
 * Purpose: Global toast notification context and hook (iOS-style transient messages).
 * Exports: NotificationProvider, useNotify
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react'

export type NotificationTone = 'success' | 'error' | 'info'

export interface NotificationItem {
	id: string
	title: string
	message?: string
	tone: NotificationTone
	createdAt: number
}

export interface NotifyOptions {
	title: string
	message?: string
	durationMs?: number
}

interface NotificationContextValue {
	notifications: NotificationItem[]
	notify: {
		success: (options: NotifyOptions) => string
		error: (options: NotifyOptions) => string
		info: (options: NotifyOptions) => string
		dismiss: (id: string) => void
	}
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const DEFAULT_DURATION_MS = 4200

/**
 * NotificationProvider - Hosts transient notification state for the SPA.
 *
 * @param props.children - App tree.
 * @returns Provider element.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
	const [notifications, setNotifications] = useState<NotificationItem[]>([])
	const timersRef = useRef<Map<string, number>>(new Map())

	const dismiss = useCallback((id: string) => {
		const timer = timersRef.current.get(id)
		if (timer) {
			window.clearTimeout(timer)
			timersRef.current.delete(id)
		}
		setNotifications((current) => current.filter((item) => item.id !== id))
	}, [])

	const push = useCallback(
		(tone: NotificationTone, options: NotifyOptions) => {
			const id = crypto.randomUUID()
			const item: NotificationItem = {
				id,
				title: options.title,
				message: options.message,
				tone,
				createdAt: Date.now(),
			}
			setNotifications((current) => [item, ...current].slice(0, 4))
			const durationMs = options.durationMs ?? DEFAULT_DURATION_MS
			const timer = window.setTimeout(() => dismiss(id), durationMs)
			timersRef.current.set(id, timer)
			return id
		},
		[dismiss],
	)

	const notify = useMemo(
		() => ({
			success: (options: NotifyOptions) => push('success', options),
			error: (options: NotifyOptions) => push('error', options),
			info: (options: NotifyOptions) => push('info', options),
			dismiss,
		}),
		[dismiss, push],
	)

	const value = useMemo(() => ({ notifications, notify }), [notifications, notify])

	return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

/**
 * useNotify - Access the global notification API.
 *
 * @returns Notification list and notify helpers.
 */
export function useNotify() {
	const context = useContext(NotificationContext)
	if (!context) {
		throw new Error('useNotify must be used within NotificationProvider')
	}
	return context
}
