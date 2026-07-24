/**
 * Purpose: Labeled select with inline error.
 * Exports: Select
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import { cn } from '@/lib/utils'

/**
 * Select - Labeled select with optional error text.
 *
 * @param props - Native select attributes plus label, error, and children.
 * @param props.label - Optional field label.
 * @param props.error - Optional error message shown below the select.
 * @param props.children - Option elements.
 * @returns Labeled select element.
 */
export function Select({
	className,
	label,
	error,
	children,
	...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
	return (
		<label className="block space-y-1.5">
			{label ? <span className="text-sm font-medium text-ink">{label}</span> : null}
			<select
				className={cn(
					'w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20',
					error && 'border-danger',
					className,
				)}
				{...props}
			>
				{children}
			</select>
			{error ? <span className="text-xs text-danger">{error}</span> : null}
		</label>
	)
}
