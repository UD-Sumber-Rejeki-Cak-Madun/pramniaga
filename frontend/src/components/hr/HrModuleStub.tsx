/**
 * Purpose: Shared honest stub page for HR modules not yet implemented.
 * Exports: HrModuleStub
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
import { EmptyState, PageHeader, PermissionDenied } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import type { Capabilities } from '@/lib/types'

/**
 * HrModuleStub - Honest empty module shell with optional capability gate.
 *
 * @param props.title - Page title.
 * @param props.subtitle - Page subtitle.
 * @param props.emptyTitle - Empty-state title.
 * @param props.emptyDescription - Empty-state supporting text.
 * @param props.capability - Optional capability required to view the module.
 * @param props.backTo - PermissionDenied recovery path.
 * @returns Stub page or PermissionDenied.
 */
export function HrModuleStub({
	title,
	subtitle,
	emptyTitle,
	emptyDescription,
	capability,
	backTo = '/hr',
}: {
	title: string
	subtitle: string
	emptyTitle: string
	emptyDescription: string
	capability?: keyof Capabilities
	backTo?: string
}) {
	const { session } = useAuth()

	if (!session?.capabilities.can_use_hr) {
		return (
			<PermissionDenied
				description="You do not have access to HR."
				backTo="/"
				backLabel="Back to dashboard"
			/>
		)
	}

	if (capability && !session.capabilities[capability]) {
		return (
			<PermissionDenied
				description="You do not have permission for this HR module."
				backTo={backTo}
				backLabel="Back to HR"
			/>
		)
	}

	return (
		<div>
			<PageHeader title={title} subtitle={subtitle} />
			<div className="mt-6">
				<EmptyState title={emptyTitle} description={emptyDescription} />
			</div>
		</div>
	)
}
