/**
 * Purpose: Marketplace-style product catalog card — image hover zoom, click opens product.
 * Exports: ProductCard
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import type { Item } from '@/lib/types'
import { Badge } from '@/components/ui'
import { cn, formatMoney, productImageSrc } from '@/lib/utils'
import productsFallback from '@/assets/inventory/products.jpg'

export interface ProductCardProps {
	item: Item
	onOpen: (itemCode: string) => void
	className?: string
}

/**
 * ProductCard - Marketplace-style catalog tile with image zoom on hover.
 *
 * @param props.item - Template or standalone Item from the products list.
 * @param props.onOpen - Navigate to product detail/edit for a code.
 * @param props.className - Optional wrapper classes.
 * @returns Catalog product card.
 */
export function ProductCard({ item, onOpen, className }: ProductCardProps) {
	const imageSrc = productImageSrc(item.image, productsFallback)
	const isTemplate = Boolean(item.has_variants)
	const typeLabel = isTemplate ? 'Template' : item.is_stock_item ? 'Storable' : 'Consumable'
	const typeTone = isTemplate ? 'warning' : item.is_stock_item ? 'success' : 'neutral'
	const priceLabel = formatMoney(item.standard_rate)

	return (
		<button
			type="button"
			className={cn(
				'product-card group flex w-full flex-col overflow-hidden rounded-lg border border-line/70 bg-white text-left shadow-sm',
				'transition-shadow duration-300 ease-out hover:shadow-md',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
				className,
			)}
			onClick={() => onOpen(item.item_code)}
		>
			<div className="relative aspect-square overflow-hidden bg-surface-2">
				<img
					src={imageSrc}
					alt={item.item_name}
					className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
				/>
				<div className="absolute left-1.5 top-1.5 z-10 scale-90 origin-top-left">
					<Badge tone={typeTone}>{typeLabel}</Badge>
				</div>
			</div>

			<div className="flex flex-1 flex-col gap-0.5 px-2.5 pb-2.5 pt-2">
				<h3 className="line-clamp-2 min-h-[2rem] text-[13px] font-semibold leading-snug text-ink">
					{item.item_name}
				</h3>
				<p className="truncate font-mono text-[10px] font-medium uppercase tracking-wide text-ink-muted">
					{item.item_code}
				</p>
				<div className="mt-1 flex items-end justify-between gap-1.5">
					<p className="text-sm font-bold text-brand">{priceLabel}</p>
					<p className="truncate text-[11px] text-ink-muted">
						{isTemplate ? 'Has variants' : item.category_path || item.item_group}
					</p>
				</div>
			</div>
		</button>
	)
}
