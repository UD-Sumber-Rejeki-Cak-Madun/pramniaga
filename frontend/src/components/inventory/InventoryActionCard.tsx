/**
 * Purpose: Solid-accent inventory action card — title, count, corner icon, hover See more.
 * Exports: InventoryActionCard
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { useCountUp } from '@/lib/useCountUp'
import { cn } from '@/lib/utils'

export interface InventoryActionCardProps {
	title: string
	href: string
	icon: LucideIcon
	accent?: string
	count?: number | null
	countEnabled?: boolean
	countDelayMs?: number
	className?: string
}

const cardHover = {
	rest: { scale: 1 },
	hover: {
		scale: 1.02,
		transition: { duration: 0.3 },
	},
}

const ctaReveal = {
	rest: {
		opacity: 0,
		x: -16,
		transition: { duration: 0.25, ease: 'easeInOut' as const },
	},
	hover: {
		opacity: 1,
		x: 0,
		transition: { duration: 0.3, ease: 'easeOut' as const },
	},
}

const iconHover = {
	rest: {
		scale: 1,
		rotate: 0,
		transition: { duration: 0.35, ease: 'easeOut' as const },
	},
	hover: {
		scale: 1.28,
		rotate: [0, -12, 12, -10, 10, -6, 6, 0],
		transition: {
			scale: { duration: 0.35, ease: 'easeOut' as const },
			rotate: {
				duration: 0.55,
				ease: 'easeInOut' as const,
				repeat: Infinity,
				repeatDelay: 0.12,
			},
		},
	},
}

/**
 * InventoryActionCard - Accent card with corner icon (enlarge + shake on hover) and See more CTA.
 *
 * @param props.title - Card heading.
 * @param props.href - Route target.
 * @param props.icon - Lucide icon shown bottom-right (same as sidebar).
 * @param props.accent - Solid background color.
 * @param props.count - Optional count target (hidden when null/undefined).
 * @param props.countEnabled - When true, animate count from 0.
 * @param props.countDelayMs - Stagger delay before count animation.
 * @param props.className - Optional wrapper classes.
 * @returns Linked inventory action card.
 */
export function InventoryActionCard({
	title,
	href,
	icon: Icon,
	accent = '#714B67',
	count,
	countEnabled = false,
	countDelayMs = 0,
	className,
}: InventoryActionCardProps) {
	const showCount = count !== undefined && count !== null
	const animatedCount = useCountUp(showCount ? count : 0, countEnabled && showCount, {
		delayMs: countDelayMs,
	})

	return (
		<Link to={href} className={cn('group block h-full', className)} aria-label={`See more about ${title}`}>
			<motion.article
				className="relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-xl p-6 text-white shadow-sm transition-shadow duration-300 ease-in-out hover:shadow-lg"
				style={{ backgroundColor: accent }}
				variants={cardHover}
				initial="rest"
				whileHover="hover"
				animate="rest"
			>
				<motion.div
					variants={iconHover}
					className="pointer-events-none absolute -bottom-4 -right-4 z-0 text-white/90"
					aria-hidden
				>
					<Icon className="h-36 w-36 stroke-[1.25]" />
				</motion.div>

				<div className="relative z-10 flex h-full flex-col">
					<div className="min-w-0">
						<h3 className="font-display text-2xl font-bold tracking-tight">{title}</h3>
						{showCount ? (
							<p className="mt-2 font-display text-3xl font-semibold tabular-nums text-white/95">
								{countEnabled ? animatedCount : count}
							</p>
						) : null}
					</div>

					<motion.div
						variants={ctaReveal}
						className="mt-auto flex items-center pt-6 font-display text-lg font-bold tracking-tight"
					>
						<span>See more</span>
						<ArrowRight className="ml-2 h-5 w-5" />
					</motion.div>
				</div>
			</motion.article>
		</Link>
	)
}
