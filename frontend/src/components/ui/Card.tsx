/**
 * Purpose: Surface panel container for dashboard/page sections.
 * Exports: Card
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import { cn } from '@/lib/utils'

/**
 * Card - Bordered panel container.
 *
 * @param props.className - Optional extra class names.
 * @param props.children - Panel content.
 * @returns Card container element.
 */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
	return <div className={cn('rounded-xl border border-line bg-white shadow-panel', className)}>{children}</div>
}
