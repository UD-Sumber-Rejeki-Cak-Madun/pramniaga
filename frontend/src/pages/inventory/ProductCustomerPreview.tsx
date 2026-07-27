/**
 * Purpose: Legacy /preview URLs redirect into the product form with inline preview open.
 * Exports: default ProductCustomerPreviewPage
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { Navigate, useParams } from 'react-router-dom'

/**
 * ProductCustomerPreviewPage - Redirect /preview routes to the form with openPreview state.
 *
 * Preview now lives inline on the product form so the card and actions stay mounted.
 *
 * @returns Redirect to the matching product form route.
 */
export default function ProductCustomerPreviewPage() {
	const { id } = useParams()
	const isNew = !id || id === 'new'
	const to = isNew ? '/inventory/products/new' : `/inventory/products/${id}`
	return <Navigate to={to} replace state={{ openPreview: true }} />
}
