/**
 * Purpose: Manage attendance stub — honest empty until admin attendance APIs ship.
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
import { HrModuleStub } from '@/components/hr/HrModuleStub'

/**
 * HrManageAttendancePage - Attendance admin placeholder.
 *
 * @returns Stub page element.
 */
export default function HrManageAttendancePage() {
	return (
		<HrModuleStub
			title="Attendance"
			subtitle="Review and correct team attendance."
			emptyTitle="Team attendance will appear here"
			emptyDescription="Attendance admin tools ship after the shell. This module is intentionally empty."
			capability="can_manage_attendance"
		/>
	)
}
