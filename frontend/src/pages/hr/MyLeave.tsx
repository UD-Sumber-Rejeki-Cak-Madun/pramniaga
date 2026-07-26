/**
 * Purpose: ESS leave stub — honest empty until leave APIs ship.
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
import { HrModuleStub } from '@/components/hr/HrModuleStub'

/**
 * HrMyLeavePage - Self-service leave placeholder.
 *
 * @returns Stub page element.
 */
export default function HrMyLeavePage() {
	return (
		<HrModuleStub
			title="My leave"
			subtitle="Request leave and track open applications."
			emptyTitle="Leave requests will appear here"
			emptyDescription="Self-service leave apply and balance land in a later phase. Nothing is hidden behind this empty state."
			capability="can_self_service"
		/>
	)
}
