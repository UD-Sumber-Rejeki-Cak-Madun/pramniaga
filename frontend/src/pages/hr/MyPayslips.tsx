/**
 * Purpose: ESS payslips stub — honest empty until payslip APIs ship.
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
import { HrModuleStub } from '@/components/hr/HrModuleStub'

/**
 * HrMyPayslipsPage - Self-service payslips placeholder.
 *
 * @returns Stub page element.
 */
export default function HrMyPayslipsPage() {
	return (
		<HrModuleStub
			title="My payslips"
			subtitle="View your submitted salary slips."
			emptyTitle="Payslips will appear here"
			emptyDescription="Self-service payslip list and detail ship later. Net pay is never previewed on stub screens."
			capability="can_self_service"
		/>
	)
}
