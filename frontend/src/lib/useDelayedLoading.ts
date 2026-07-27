/**
 * Purpose: Phase page loading UI — quiet, then inline, then overlay.
 * Exports: useDelayedLoading
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { useEffect, useState } from 'react'

const INLINE_DELAY_MS = 500
const OVERLAY_DELAY_MS = 2000

/**
 * useDelayedLoading - Derive delayed inline/overlay flags from a loading boolean.
 *
 * Quiet for 500ms, show inline through 2s, then escalate to overlay (inline hides).
 *
 * @param loading - Whether an async wait is in progress.
 * @returns Flags for inline spinner and full-viewport overlay.
 */
export function useDelayedLoading(loading: boolean): {
	showInline: boolean
	showOverlay: boolean
} {
	const [showInline, setShowInline] = useState(false)
	const [showOverlay, setShowOverlay] = useState(false)

	useEffect(() => {
		if (!loading) {
			setShowInline(false)
			setShowOverlay(false)
			return
		}

		const inlineTimer = window.setTimeout(() => setShowInline(true), INLINE_DELAY_MS)
		const overlayTimer = window.setTimeout(() => {
			setShowInline(false)
			setShowOverlay(true)
		}, OVERLAY_DELAY_MS)

		return () => {
			window.clearTimeout(inlineTimer)
			window.clearTimeout(overlayTimer)
		}
	}, [loading])

	return { showInline, showOverlay }
}
