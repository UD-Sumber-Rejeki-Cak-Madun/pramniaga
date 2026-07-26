/**
 * Purpose: Manage leave approvals stub — honest empty until approve APIs ship.
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
import { HrModuleStub } from '@/components/hr/HrModuleStub'

/**
 * HrManageLeavePage - Leave approvals placeholder for managers.
 *
 * @returns Stub page element.
 */
export default function HrManageLeavePage() {
	return (
		<HrModuleStub
			title="Leave approvals"
			subtitle="Review open leave applications for your team."
			emptyTitle="Leave approvals will appear here"
			emptyDescription="Approval queues ship after the shell. No placeholder rows are shown."
			capability="can_approve_leave"
		/>
	)
}
