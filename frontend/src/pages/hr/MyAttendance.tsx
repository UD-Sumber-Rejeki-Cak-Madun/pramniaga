/**
 * Purpose: ESS attendance stub — honest empty until attendance APIs ship.
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
import { HrModuleStub } from '@/components/hr/HrModuleStub'

/**
 * HrMyAttendancePage - Self-service attendance placeholder.
 *
 * @returns Stub page element.
 */
export default function HrMyAttendancePage() {
	return (
		<HrModuleStub
			title="My attendance"
			subtitle="View your attendance and check-ins."
			emptyTitle="Attendance will appear here"
			emptyDescription="Personal attendance history ships after the HR shell. This page is intentionally empty."
			capability="can_self_service"
		/>
	)
}
