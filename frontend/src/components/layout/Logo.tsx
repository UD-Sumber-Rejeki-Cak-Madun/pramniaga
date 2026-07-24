/**
 * Purpose: Pramniaga brand mark image.
 * Exports: Logo
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import { cn } from '@/lib/utils'

/**
 * Logo - Pramniaga brand mark image.
 *
 * @param props.className - Optional extra class names.
 * @param props.size - Width/height in pixels (default 40).
 * @returns Brand logo image element.
 */
export function Logo({ className, size = 40 }: { className?: string; size?: number }) {
	return (
		<img
			src="/assets/pramniaga/logo.svg"
			alt="Pramniaga"
			width={size}
			height={size}
			className={cn('rounded-xl', className)}
		/>
	)
}
