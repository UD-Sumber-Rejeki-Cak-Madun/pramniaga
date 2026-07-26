/**
 * Purpose: Frappe method registry and useApiCall unwrap helper.
 * Exports: API, useApiCall, unwrapMessage
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */

import { useCallback } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'

/**
 * unwrapMessage - Unwrap the message from the Frappe response.
 *
 * @param data - The Frappe response (often `{ message: T }`).
 * @returns The unwrapped message payload.
 */
export function unwrapMessage<T>(data: unknown): T {
	if (data && typeof data === 'object' && 'message' in data) {
		return (data as { message: T }).message
	}
	return data as T
}

/**
 * useApiCall - A custom hook to call Frappe methods.
 *
 * @param method - The Frappe method path to call.
 * @returns An object containing the call function, loading state, error, result, reset, and isCompleted.
 */
export function useApiCall<T = unknown>(method: string) {
	const { call: rawCall, loading, error, result, reset, isCompleted } = useFrappePostCall(method)
	const call = useCallback(
		async (params: Record<string, unknown> = {}) => unwrapMessage<T>(await rawCall(params)),
		[rawCall],
	)
	return { call, loading, error, result, reset, isCompleted }
}

/**
 * API - Registry of Frappe method paths used by the SPA.
 *
 * Groups:
 *  - auth
 *  - apps
 *  - dashboard
 *  - inventory
 *  - hr
 */
export const API = {
	auth: {
		login: 'pramniaga.api.auth.login',
		logout: 'pramniaga.api.auth.logout',
		session: 'pramniaga.api.auth.session',
		googleLoginUrl: 'pramniaga.api.auth.get_google_login_url',
		resetPassword: 'frappe.core.doctype.user.user.reset_password',
		signUp: 'frappe.core.doctype.user.user.sign_up',
	},
	apps: {
		list: 'pramniaga.api.apps.list_apps',
	},
	dashboard: {
		revenueSummary: 'pramniaga.api.dashboard.revenue_summary',
		dailyActivities: 'pramniaga.api.dashboard.daily_activities',
		upcomingEvents: 'pramniaga.api.dashboard.upcoming_events',
	},
	hr: {
		employeeMe: 'pramniaga.api.hr.employee_me',
		employeesList: 'pramniaga.api.hr.employees_list',
		overviewCounts: 'pramniaga.api.hr.overview_counts',
	},
	inventory: {
		itemsList: 'pramniaga.api.inventory.items_list',
		itemsGet: 'pramniaga.api.inventory.items_get',
		itemsCreate: 'pramniaga.api.inventory.items_create',
		itemsUpdate: 'pramniaga.api.inventory.items_update',
		itemGroupsList: 'pramniaga.api.inventory.item_groups_list',
		uomsList: 'pramniaga.api.inventory.uoms_list',
		attributesList: 'pramniaga.api.inventory.attributes_list',
		attributesCreate: 'pramniaga.api.inventory.attributes_create',
		variantsCreate: 'pramniaga.api.inventory.variants_create',
		warehousesList: 'pramniaga.api.inventory.warehouses_list',
		warehousesCreate: 'pramniaga.api.inventory.warehouses_create',
		stockOnHand: 'pramniaga.api.inventory.stock_on_hand',
		stockBalance: 'pramniaga.api.inventory.stock_balance',
		receiptsList: 'pramniaga.api.inventory.receipts_list',
		receiptsCreate: 'pramniaga.api.inventory.receipts_create',
		deliveriesList: 'pramniaga.api.inventory.deliveries_list',
		deliveriesCreate: 'pramniaga.api.inventory.deliveries_create',
		transfersList: 'pramniaga.api.inventory.transfers_list',
		transfersCreate: 'pramniaga.api.inventory.transfers_create',
		movesGet: 'pramniaga.api.inventory.moves_get',
		movesSubmit: 'pramniaga.api.inventory.moves_submit',
		movesCancel: 'pramniaga.api.inventory.moves_cancel',
		adjustmentsList: 'pramniaga.api.inventory.adjustments_list',
		adjustmentsGet: 'pramniaga.api.inventory.adjustments_get',
		adjustmentsCreate: 'pramniaga.api.inventory.adjustments_create',
		adjustmentsSubmit: 'pramniaga.api.inventory.adjustments_submit',
		overviewCounts: 'pramniaga.api.inventory.overview_counts',
	},
} as const
