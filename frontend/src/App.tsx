/**
 * Purpose: Router, FrappeProvider, auth gate, inventory/HR/dashboard routes.
 * Exports: default App
 *
 * Last updated: 2026-07-25
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
import HrOverview from '@/pages/hr/Overview'
import HrProfilePage from '@/pages/hr/Profile'
import HrMyLeavePage from '@/pages/hr/MyLeave'
import HrMyAttendancePage from '@/pages/hr/MyAttendance'
import HrMyPayslipsPage from '@/pages/hr/MyPayslips'
import HrPeoplePage from '@/pages/hr/People'
import HrManageLeavePage from '@/pages/hr/ManageLeave'
import HrManageAttendancePage from '@/pages/hr/ManageAttendance'
import HrManagePayrollPage from '@/pages/hr/ManagePayroll'

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
 * AppRoutes - Top-level route table for login, dashboard, inventory, and HR.
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
				<Route path="hr" element={<Outlet />}>
					<Route index element={<HrOverview />} />
					<Route path="me/profile" element={<HrProfilePage />} />
					<Route path="me/leave" element={<HrMyLeavePage />} />
					<Route path="me/attendance" element={<HrMyAttendancePage />} />
					<Route path="me/payslips" element={<HrMyPayslipsPage />} />
					<Route path="manage/people" element={<HrPeoplePage />} />
					<Route path="manage/leave" element={<HrManageLeavePage />} />
					<Route path="manage/attendance" element={<HrManageAttendancePage />} />
					<Route path="manage/payroll" element={<HrManagePayrollPage />} />
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
