/**
 * Purpose: Material Receipt compose / draft-submit form with multi-line products.
 * Exports: ReceiptComposeForm
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { motion, useReducedMotion } from 'framer-motion'
import type { Item, Warehouse } from '@/lib/types'
import { ReceiptLinesEditor, type ReceiptLine } from '@/components/inventory/ReceiptLinesEditor'
import { Button, Select } from '@/components/ui'
import { formatMoney, formatQty } from '@/lib/utils'

const easeOut = [0.22, 1, 0.36, 1] as const

/**
 * ReceiptComposeForm - Destination + lines + live summary + post/submit actions.
 *
 * @param props.toWarehouse - Selected destination warehouse.
 * @param props.onToWarehouseChange - Warehouse change handler.
 * @param props.warehouses - Leaf warehouses for the company.
 * @param props.lines - Receipt product lines.
 * @param props.onLinesChange - Replace lines array.
 * @param props.items - Selectable products.
 * @param props.canEdit - Whether fields are editable (new + capability).
 * @param props.isNew - Create vs draft-detail mode.
 * @param props.canSubmit - Capability gate for actions.
 * @param props.saving - Disable actions while posting.
 * @param props.onPost - Create + submit handler (new only).
 * @param props.onSubmitDraft - Submit existing draft handler.
 * @returns Receipt compose form element.
 */
export function ReceiptComposeForm({
	toWarehouse,
	onToWarehouseChange,
	warehouses,
	lines,
	onLinesChange,
	items,
	canEdit,
	isNew,
	canSubmit,
	saving,
	onPost,
	onSubmitDraft,
}: {
	toWarehouse: string
	onToWarehouseChange: (warehouse: string) => void
	warehouses: Warehouse[]
	lines: ReceiptLine[]
	onLinesChange: (next: ReceiptLine[]) => void
	items: Item[]
	canEdit: boolean
	isNew: boolean
	canSubmit: boolean
	saving: boolean
	onPost: () => void
	onSubmitDraft: () => void
}) {
	const reduceMotion = useReducedMotion()
	const totalQty = lines.reduce((sum, line) => sum + Number(line.qty || 0), 0)
	const totalValue = lines.reduce(
		(sum, line) => sum + Number(line.qty || 0) * Number(line.basic_rate || 0),
		0,
	)

	return (
		<motion.form
			className={`max-w-3xl space-y-6 rounded-xl border border-line bg-white p-6 md:p-8 ${saving ? 'opacity-70' : ''}`}
			initial={reduceMotion ? false : { opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.28, ease: easeOut }}
			onSubmit={(e) => {
				e.preventDefault()
				if (!isNew || !canSubmit || saving) return
				onPost()
			}}
		>
			<div className="h-1 w-16 rounded-full bg-emerald-600" aria-hidden />

			<section className="space-y-3">
				<h2 className="font-display text-base font-semibold text-ink">Destination</h2>
				<Select
					label="Receive into"
					value={toWarehouse}
					disabled={!canEdit}
					onChange={(e) => onToWarehouseChange(e.target.value)}
				>
					{warehouses.map((wh) => (
						<option key={wh.name} value={wh.name}>
							{wh.name}
						</option>
					))}
				</Select>
			</section>

			<ReceiptLinesEditor lines={lines} items={items} disabled={!canEdit} onChange={onLinesChange} />

			<div className="sticky bottom-0 -mx-6 border-t border-line bg-white/95 px-6 py-4 backdrop-blur md:-mx-8 md:px-8">
				<p className="text-sm text-ink-muted">
					Receiving <span className="font-medium text-ink">{formatQty(totalQty)}</span> units into{' '}
					<span className="font-medium text-ink">{toWarehouse || '—'}</span>
					{' · '}value <span className="font-medium text-ink">{formatMoney(totalValue)}</span>
				</p>
				<div className="mt-3 flex flex-wrap gap-2">
					{isNew && canSubmit ? (
						<Button type="submit" disabled={saving}>
							{saving ? 'Posting…' : 'Post to stock'}
						</Button>
					) : null}
					{!isNew && canSubmit ? (
						<Button type="button" disabled={saving} onClick={onSubmitDraft}>
							{saving ? 'Submitting…' : 'Submit draft'}
						</Button>
					) : null}
				</div>
			</div>
		</motion.form>
	)
}
