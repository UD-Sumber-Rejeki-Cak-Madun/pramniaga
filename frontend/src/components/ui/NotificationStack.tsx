/**
 * Purpose: iOS-inspired top-right notification stack with hover emphasis.
 * Exports: NotificationStack
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useNotify, type NotificationItem, type NotificationTone } from '@/lib/notifications'
import { cn } from '@/lib/utils'

const toneStyles: Record<
	NotificationTone,
	{ ring: string; icon: typeof CheckCircle2; textClass: string; glow: string }
> = {
	success: {
		ring: 'ring-emerald-500/20',
		icon: CheckCircle2,
		textClass: 'text-emerald-600',
		glow: 'group-hover:shadow-[0_20px_40px_-18px_rgba(16,185,129,0.45)]',
	},
	error: {
		ring: 'ring-red-500/20',
		icon: XCircle,
		textClass: 'text-red-600',
		glow: 'group-hover:shadow-[0_20px_40px_-18px_rgba(239,68,68,0.4)]',
	},
	info: {
		ring: 'ring-sky-500/20',
		icon: Info,
		textClass: 'text-sky-600',
		glow: 'group-hover:shadow-[0_20px_40px_-18px_rgba(14,165,233,0.4)]',
	},
}

/**
 * NotificationCard - Single notification with white icon circle and tone-colored text.
 *
 * @param props.item - Notification payload.
 * @param props.onDismiss - Dismiss handler.
 * @returns Notification card element.
 */
function NotificationCard({
	item,
	onDismiss,
}: {
	item: NotificationItem
	onDismiss: (id: string) => void
}) {
	const tone = toneStyles[item.tone]
	const Icon = tone.icon

	return (
		<motion.div
			layout
			initial={{ opacity: 0, x: 48, scale: 0.94 }}
			animate={{ opacity: 1, x: 0, scale: 1 }}
			exit={{ opacity: 0, x: 32, scale: 0.95 }}
			transition={{ type: 'spring', stiffness: 420, damping: 32 }}
			className={cn(
				'group pointer-events-auto w-[min(92vw,22rem)] rounded-2xl border border-line bg-white/95 p-4 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.45)] ring-1 transition duration-300 hover:-translate-y-1 hover:scale-[1.02]',
				tone.ring,
				tone.glow,
			)}
		>
			<div className="flex items-start gap-3">
				<div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
					<Icon className={cn('h-5 w-5', tone.textClass)} />
				</div>
				<div className="min-w-0 flex-1">
					<p className={cn('font-display text-sm font-semibold', tone.textClass)}>{item.title}</p>
					{item.message ? (
						<p className={cn('mt-1 text-sm opacity-90', tone.textClass)}>{item.message}</p>
					) : null}
				</div>
				<button
					type="button"
					onClick={() => onDismiss(item.id)}
					className={cn(
						'rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100',
						tone.textClass,
					)}
					aria-label="Dismiss notification"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</motion.div>
	)
}

/**
 * NotificationStack - Fixed top-right notification host.
 *
 * @returns Portal-like fixed notification stack.
 */
export function NotificationStack() {
	const { notifications, notify } = useNotify()

	return (
		<div
			aria-live="polite"
			className="pointer-events-none fixed right-4 top-4 z-[60] flex flex-col gap-3"
		>
			<AnimatePresence initial={false} mode="popLayout">
				{notifications.map((item) => (
					<NotificationCard key={item.id} item={item} onDismiss={notify.dismiss} />
				))}
			</AnimatePresence>
		</div>
	)
}
