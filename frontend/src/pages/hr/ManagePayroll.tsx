/**
 * Purpose: Manage payroll stub — honest empty until payroll run APIs ship.
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
import { HrModuleStub } from '@/components/hr/HrModuleStub'
import { PermissionDenied } from '@/components/ui'
import { useAuth } from '@/lib/auth'

/**
 * HrManagePayrollPage - Payroll ops placeholder (managers / payroll viewers only).
 *
 * @returns Stub page or PermissionDenied.
 */
export default function HrManagePayrollPage() {
	const { session } = useAuth()
	const caps = session?.capabilities

	if (!caps?.can_use_hr) {
		return <PermissionDenied description="You do not have access to HR." backTo="/" />
	}

	// Manage payroll is for admin scopes — not ESS-only payslip viewers.
	if (!(caps.can_run_payroll || caps.can_view_employees)) {
		return (
			<PermissionDenied
				description="You do not have permission for payroll operations."
				backTo="/hr"
				backLabel="Back to HR"
			/>
		)
	}

	return (
		<HrModuleStub
			title="Payroll"
			subtitle="Run and review company payroll."
			emptyTitle="Payroll tools will appear here"
			emptyDescription="Payroll runs are high-friction and ship last. No salary figures are shown on this stub."
			capability="can_view_payroll"
		/>
	)
}
