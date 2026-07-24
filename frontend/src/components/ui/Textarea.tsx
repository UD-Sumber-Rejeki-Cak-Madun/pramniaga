/**
 * Purpose: Labeled textarea with inline error.
 * Exports: Textarea
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import { cn } from '@/lib/utils'

/**
 * Textarea - Labeled multiline text field with optional error text.
 *
 * @param props - Native textarea attributes plus label and error.
 * @param props.label - Optional field label.
 * @param props.error - Optional error message shown below the field.
 * @returns Labeled textarea element.
 */
export function Textarea({
	className,
	label,
	error,
	...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }) {
	return (
		<label className="block space-y-1.5">
			{label ? <span className="text-sm font-medium text-ink">{label}</span> : null}
			<textarea
				className={cn(
					'min-h-24 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20',
					error && 'border-danger',
					className,
				)}
				{...props}
			/>
			{error ? <span className="text-xs text-danger">{error}</span> : null}
		</label>
	)
}
