import { cn } from '@/lib/utils'

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

export function Input({
	className,
	label,
	error,
	...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
	return (
		<label className="block space-y-1.5">
			{label ? <span className="text-sm font-medium text-ink">{label}</span> : null}
			<input
				className={cn(
					'w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20',
					error && 'border-danger',
					className,
				)}
				{...props}
			/>
			{error ? <span className="text-xs text-danger">{error}</span> : null}
		</label>
	)
}

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

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
	return <div className={cn('rounded-xl border border-line bg-white shadow-panel', className)}>{children}</div>
}

export function PageHeader({
	title,
	subtitle,
	actions,
}: {
	title: string
	subtitle?: string
	actions?: React.ReactNode
}) {
	return (
		<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
			<div>
				<h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{title}</h1>
				{subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
			</div>
			{actions ? <div className="flex items-center gap-2">{actions}</div> : null}
		</div>
	)
}

export function EmptyState({
	title,
	description,
	className,
}: {
	title: string
	description?: string
	className?: string
}) {
	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface-2 px-6 py-16 text-center',
				className,
			)}
		>
			<h3 className="font-medium text-ink">{title}</h3>
			{description ? <p className="mt-2 max-w-md text-sm text-ink-muted">{description}</p> : null}
		</div>
	)
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
	return (
		<div className="flex items-center justify-center py-16 text-sm text-ink-muted">
			<span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
			{label}
		</div>
	)
}

export function ErrorBanner({ message }: { message: string }) {
	return (
		<div className="rounded-md border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{message}</div>
	)
}

export function Badge({
	children,
	tone = 'neutral',
}: {
	children: React.ReactNode
	tone?: 'neutral' | 'success' | 'warning' | 'danger'
}) {
	const tones = {
		neutral: 'bg-surface-2 text-ink-muted',
		success: 'bg-emerald-50 text-emerald-700',
		warning: 'bg-amber-50 text-amber-700',
		danger: 'bg-red-50 text-danger',
	}
	return <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
}

export function DataTable({
	columns,
	rows,
	onRowClick,
}: {
	columns: { key: string; label: string; className?: string }[]
	rows: Record<string, React.ReactNode>[]
	onRowClick?: (row: Record<string, React.ReactNode>) => void
}) {
	return (
		<div className="overflow-hidden rounded-xl border border-line bg-white">
			<table className="min-w-full text-left text-sm">
				<thead className="bg-surface-2 text-ink-muted">
					<tr>
						{columns.map((col) => (
							<th key={col.key} className={cn('px-4 py-3 font-medium', col.className)}>
								{col.label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, idx) => (
						<tr
							key={idx}
							className={cn('border-t border-line', onRowClick && 'cursor-pointer hover:bg-surface-2/70')}
							onClick={() => onRowClick?.(row)}
						>
							{columns.map((col) => (
								<td key={col.key} className={cn('px-4 py-3 text-ink', col.className)}>
									{row[col.key]}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
