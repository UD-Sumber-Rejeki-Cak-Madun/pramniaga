/**
 * Purpose: HR sidebar link metadata with persona buckets (My HR vs Manage).
 * Exports: HrNavLink, HrNavSection, getHrNavSections
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */

import type { Capabilities } from '@/lib/types'

export interface HrNavLink {
	to: string
	label: string
	end?: boolean
	/** Capability required to show this link; omit for Overview (any can_use_hr). */
	capability?: keyof Capabilities
}

export interface HrNavSection {
	id: string
	label: string
	links: HrNavLink[]
}

const overviewLink: HrNavLink = { to: '/hr', label: 'Overview', end: true }

const myHrLinks: HrNavLink[] = [
	{ to: '/hr/me/profile', label: 'Profile', capability: 'can_self_service' },
	{ to: '/hr/me/leave', label: 'Leave', capability: 'can_self_service' },
	{ to: '/hr/me/attendance', label: 'Attendance', capability: 'can_self_service' },
	{ to: '/hr/me/payslips', label: 'Payslips', capability: 'can_self_service' },
]

const manageLinks: HrNavLink[] = [
	{ to: '/hr/manage/people', label: 'People', capability: 'can_view_employees' },
	{ to: '/hr/manage/leave', label: 'Leave Approvals', capability: 'can_approve_leave' },
	{ to: '/hr/manage/attendance', label: 'Attendance', capability: 'can_manage_attendance' },
	{ to: '/hr/manage/payroll', label: 'Payroll', capability: 'can_view_payroll' },
]

/**
 * getHrNavSections - Build HR nav sections filtered by session capabilities.
 *
 * @param capabilities - Session capability flags.
 * @returns Sections to render under the HR app (Overview always first when can_use_hr).
 */
export function getHrNavSections(capabilities: Capabilities | undefined): HrNavSection[] {
	if (!capabilities?.can_use_hr) return []

	const sections: HrNavSection[] = [
		{ id: 'overview', label: '', links: [overviewLink] },
	]

	const myLinks = myHrLinks.filter((link) => !link.capability || capabilities[link.capability])
	if (myLinks.length) {
		sections.push({ id: 'my-hr', label: 'My HR', links: myLinks })
	}

	const adminLinks = manageLinks.filter((link) => {
		if (!link.capability) return true
		if (link.to === '/hr/manage/payroll') {
			return capabilities.can_view_payroll && (capabilities.can_run_payroll || capabilities.can_view_employees)
		}
		return Boolean(capabilities[link.capability])
	})
	if (adminLinks.length) {
		sections.push({ id: 'manage', label: 'Manage', links: adminLinks })
	}

	return sections
}

/**
 * flattenHrNavLinks - Flat list of visible HR links for Shell expand state.
 *
 * @param capabilities - Session capability flags.
 * @returns Visible HR nav links.
 */
export function flattenHrNavLinks(capabilities: Capabilities | undefined): HrNavLink[] {
	return getHrNavSections(capabilities).flatMap((section) => section.links)
}
