/**
 * Purpose: Multi-line product editor for Material Receipt compose.
 * Exports: ReceiptLine, ReceiptLinesEditor
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import type { Item } from '@/lib/types'
import { Button, Input, Select } from '@/components/ui'

export interface ReceiptLine {
	key: string
	item_code: string
	qty: number
	basic_rate: number
}

const easeOut = [0.22, 1, 0.36, 1] as const

/**
 * ReceiptLinesEditor - Editable receipt item lines with add/remove animation.
 *
 * @param props.lines - Current line rows.
 * @param props.items - Selectable products (non-template).
 * @param props.disabled - Lock fields when viewing submitted/draft-only.
 * @param props.onChange - Replace the full lines array.
 * @returns Lines editor section.
 */
export function ReceiptLinesEditor({
	lines,
	items,
	disabled,
	onChange,
}: {
	lines: ReceiptLine[]
	items: Item[]
	disabled?: boolean
	onChange: (next: ReceiptLine[]) => void
}) {
	const reduceMotion = useReducedMotion()

	const updateLine = (key: string, patch: Partial<ReceiptLine>) => {
		onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)))
	}

	const removeLine = (key: string) => {
		if (lines.length <= 1) return
		onChange(lines.filter((line) => line.key !== key))
	}

	const addLine = () => {
		const firstItem = items[0]
		onChange([
			...lines,
			{
				key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
				item_code: firstItem?.item_code || '',
				qty: 1,
				basic_rate: Number(firstItem?.valuation_rate || 0),
			},
		])
	}

	return (
		<section className="space-y-3">
			<div className="flex items-center justify-between gap-3">
				<h2 className="font-display text-base font-semibold text-ink">Products</h2>
				{!disabled ? (
					<Button type="button" variant="secondary" onClick={addLine}>
						<Plus className="h-4 w-4" aria-hidden />
						Add line
					</Button>
				) : null}
			</div>

			<div className="space-y-3">
				<AnimatePresence initial={false} mode="popLayout">
					{lines.map((line, index) => (
						<motion.div
							key={line.key}
							layout={!reduceMotion}
							initial={reduceMotion ? false : { opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
							transition={{ duration: 0.22, ease: easeOut }}
							className="overflow-hidden"
						>
							<div className="grid gap-3 rounded-lg border border-line bg-surface-2/40 p-3 sm:grid-cols-[minmax(0,1.4fr)_5.5rem_7rem_auto]">
								<Select
									label={index === 0 ? 'Product' : undefined}
									value={line.item_code}
									disabled={disabled}
									onChange={(e) => {
										const itemCode = e.target.value
										const item = items.find((row) => row.item_code === itemCode)
										const shouldAutofill = !line.basic_rate
										updateLine(line.key, {
											item_code: itemCode,
											...(shouldAutofill
												? { basic_rate: Number(item?.valuation_rate || 0) }
												: {}),
										})
									}}
								>
									{items.map((item) => (
										<option key={item.item_code} value={item.item_code}>
											{item.item_code} — {item.item_name}
										</option>
									))}
								</Select>
								<Input
									label={index === 0 ? 'Qty' : undefined}
									type="number"
									min="0.01"
									step="0.01"
									disabled={disabled}
									value={line.qty}
									onChange={(e) => updateLine(line.key, { qty: Number(e.target.value) })}
								/>
								<Input
									label={index === 0 ? 'Unit cost' : undefined}
									type="number"
									min="0"
									step="0.01"
									disabled={disabled}
									value={line.basic_rate}
									onChange={(e) => updateLine(line.key, { basic_rate: Number(e.target.value) })}
								/>
								{!disabled ? (
									<div className={index === 0 ? 'flex items-end' : 'flex items-center'}>
										<Button
											type="button"
											variant="ghost"
											className="text-danger hover:bg-danger/10"
											aria-label="Remove line"
											disabled={lines.length <= 1}
											onClick={() => removeLine(line.key)}
										>
											<Trash2 className="h-4 w-4" aria-hidden />
										</Button>
									</div>
								) : null}
							</div>
						</motion.div>
					))}
				</AnimatePresence>
			</div>
		</section>
	)
}
