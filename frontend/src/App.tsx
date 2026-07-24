/**
 * Purpose: Router, FrappeProvider, auth gate, and inventory/dashboard routes.
 * Exports: default App
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { FrappeProvider } from 'frappe-react-sdk'
import { getRouterBasename } from '@/lib/utils'
import { AuthProvider, useAuth } from '@/lib/auth'
import { Shell } from '@/components/layout/Shell'
import { LoadingState } from '@/components/ui'
import LoginPage from '@/pages/Login'
import HomeDashboard from '@/pages/HomeDashboard'
import InventoryOverview from '@/pages/inventory/Overview'
import ProductsPage from '@/pages/inventory/Products'
import ProductFormPage from '@/pages/inventory/ProductForm'
import StockPage from '@/pages/inventory/Stock'
import WarehousesPage from '@/pages/inventory/Warehouses'
import MovesListPage from '@/pages/inventory/MovesList'
import MoveFormPage from '@/pages/inventory/MoveForm'
import AdjustmentsPage from '@/pages/inventory/Adjustments'
import AdjustmentFormPage from '@/pages/inventory/AdjustmentForm'

/**
 * ProtectedRoute - Redirect guests to /login; show loading while session boots.
 *
 * @param props.children - Protected route tree.
 * @returns Children, Navigate, or LoadingState.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const { session, loading } = useAuth()
	if (loading && !session) return <LoadingState label="Checking session…" />
	if (!session?.logged_in) return <Navigate to="/login" replace />
	return <>{children}</>
}

/**
 * AppRoutes - Top-level route table for login, dashboard, and inventory.
 *
 * @returns Routes element.
 */
function AppRoutes() {
	return (
		<Routes>
			<Route path="/login" element={<LoginPage />} />
			<Route
				element={
					<ProtectedRoute>
						<Shell />
					</ProtectedRoute>
				}
			>
				<Route index element={<HomeDashboard />} />
				<Route path="inventory" element={<Outlet />}>
					<Route index element={<InventoryOverview />} />
					<Route path="products" element={<ProductsPage />} />
					<Route path="products/new" element={<ProductFormPage />} />
					<Route path="products/:id" element={<ProductFormPage />} />
					<Route path="stock" element={<StockPage />} />
					<Route path="warehouses" element={<WarehousesPage />} />
					<Route path="receipts" element={<MovesListPage kind="receipt" />} />
					<Route path="receipts/new" element={<MoveFormPage kind="receipt" />} />
					<Route path="receipts/:id" element={<MoveFormPage kind="receipt" />} />
					<Route path="deliveries" element={<MovesListPage kind="delivery" />} />
					<Route path="deliveries/new" element={<MoveFormPage kind="delivery" />} />
					<Route path="deliveries/:id" element={<MoveFormPage kind="delivery" />} />
					<Route path="transfers" element={<MovesListPage kind="transfer" />} />
					<Route path="transfers/new" element={<MoveFormPage kind="transfer" />} />
					<Route path="transfers/:id" element={<MoveFormPage kind="transfer" />} />
					<Route path="adjustments" element={<AdjustmentsPage />} />
					<Route path="adjustments/new" element={<AdjustmentFormPage />} />
				</Route>
			</Route>
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	)
}

/**
 * App - Root provider stack (Frappe, auth, router).
 *
 * @returns Application root element.
 */
export default function App() {
	const siteName =
		window.boot?.site_name ||
		import.meta.env.VITE_SITE_NAME ||
		'development.localhost'

	return (
		<FrappeProvider siteName={siteName}>
			<AuthProvider>
				<BrowserRouter basename={getRouterBasename()}>
					<AppRoutes />
				</BrowserRouter>
			</AuthProvider>
		</FrappeProvider>
	)
}
