/**
 * Purpose: Simple column/row table with optional row click.
 * Exports: DataTable
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import { cn } from '@/lib/utils'

/**
 * DataTable - Simple column/row table with optional row click handler.
 *
 * @param props.columns - Column definitions (key, label, optional className).
 * @param props.rows - Row data keyed by column key.
 * @param props.onRowClick - Optional click handler for a row.
 * @returns Table element.
 */
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
