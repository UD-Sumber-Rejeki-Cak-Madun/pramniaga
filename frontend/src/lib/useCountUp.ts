/**
 * Purpose: Animate an integer from 0 to a target when enabled (overview card counts).
 * Exports: useCountUp
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { useEffect, useState } from 'react'

/**
 * useCountUp - Interpolate from 0 to target with optional stagger delay.
 *
 * @param target - Final count value.
 * @param enabled - When true, start (or restart) the animation.
 * @param options.durationMs - Animation length in milliseconds.
 * @param options.delayMs - Delay before the animation starts.
 * @returns Current displayed integer during/after the animation.
 */
export function useCountUp(
	target: number,
	enabled: boolean,
	options: { durationMs?: number; delayMs?: number } = {},
): number {
	const durationMs = options.durationMs ?? 900
	const delayMs = options.delayMs ?? 0
	const [value, setValue] = useState(0)

	useEffect(() => {
		if (!enabled) {
			setValue(0)
			return
		}

		let frameId = 0
		let startTime: number | null = null
		const delayTimer = window.setTimeout(() => {
			const tick = (now: number) => {
				if (startTime === null) startTime = now
				const progress = Math.min(1, (now - startTime) / durationMs)
				const eased = 1 - Math.pow(1 - progress, 3)
				setValue(Math.round(target * eased))
				if (progress < 1) {
					frameId = window.requestAnimationFrame(tick)
				}
			}
			frameId = window.requestAnimationFrame(tick)
		}, delayMs)

		return () => {
			window.clearTimeout(delayTimer)
			window.cancelAnimationFrame(frameId)
		}
	}, [target, enabled, durationMs, delayMs])

	return value
}
