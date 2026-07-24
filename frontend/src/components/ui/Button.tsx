/**
 * Purpose: Primary button with brand variants.
 * Exports: Button
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import { cn } from '@/lib/utils'

/**
 * Button - Primary button with brand variants.
 *
 * @param props - Native button attributes plus variant.
 * @param props.variant - Visual variant: primary | secondary | ghost | danger.
 * @param props.className - Optional extra class names.
 * @returns Styled button element.
 */
export function Button({
	className,
	variant = 'primary',
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
	const variants = {
		primary: 'bg-brand text-white hover:bg-brand-dark shadow-sm',
		secondary: 'bg-white text-ink border border-line hover:bg-surface-2',
		ghost: 'text-ink-muted hover:bg-surface-2',
		danger: 'bg-danger text-white hover:bg-red-700',
	}
	return (
		<button
			className={cn(
				'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
				variants[variant],
				className,
			)}
			{...props}
		/>
	)
}
