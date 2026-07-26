/**
 * Purpose: ESS profile — show linked Employee summary or honest empty state.
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
import { EmptyState, PageHeader, PermissionDenied } from '@/components/ui'
import { useAuth } from '@/lib/auth'

/**
 * HrProfilePage - Self-service profile view for the linked Employee.
 *
 * @returns Profile summary, empty state, or PermissionDenied.
 */
export default function HrProfilePage() {
	const { session } = useAuth()

	if (!session?.capabilities.can_use_hr) {
		return <PermissionDenied description="You do not have access to HR." backTo="/" />
	}

	if (!session.capabilities.can_self_service || !session.employee) {
		return (
			<div>
				<PageHeader title="My profile" subtitle="Your employee record linked to this account." />
				<div className="mt-6">
					<EmptyState
						title="No employee record linked"
						description="Ask HR to link your User to an Employee so self-service features can appear here."
					/>
				</div>
			</div>
		)
	}

	const emp = session.employee

	return (
		<div>
			<PageHeader title="My profile" subtitle="Your employee record linked to this account." />
			<dl className="mt-6 grid max-w-xl gap-4 rounded-xl border border-line bg-white p-6 shadow-panel sm:grid-cols-2">
				<div>
					<dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Name</dt>
					<dd className="mt-1 text-sm text-ink">{emp.employee_name}</dd>
				</div>
				<div>
					<dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">ID</dt>
					<dd className="mt-1 text-sm text-ink">{emp.name}</dd>
				</div>
				<div>
					<dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Company</dt>
					<dd className="mt-1 text-sm text-ink">{emp.company}</dd>
				</div>
				<div>
					<dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Status</dt>
					<dd className="mt-1 text-sm text-ink">{emp.status}</dd>
				</div>
				<div>
					<dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Department</dt>
					<dd className="mt-1 text-sm text-ink">{emp.department || '—'}</dd>
				</div>
				<div>
					<dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Designation</dt>
					<dd className="mt-1 text-sm text-ink">{emp.designation || '—'}</dd>
				</div>
			</dl>
		</div>
	)
}
