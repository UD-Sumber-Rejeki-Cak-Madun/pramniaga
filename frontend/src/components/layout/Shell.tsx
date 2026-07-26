/**
 * Purpose: Authenticated app chrome — header, sidebar, mobile drawer, outlet.
 * Exports: Shell
 * Contents:
 *  - SidebarNav (home + expandable apps with domain sublinks)
 *  - Shell (session header, desktop aside, mobile menu, main outlet)
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
	ChevronDown,
	LayoutDashboard,
	LogOut,
	Menu,
	Package,
	Users,
	X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui'
import { API, useApiCall } from '@/lib/api'
import type { AppTile, Capabilities } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { inventoryLinks } from '@/lib/inventoryNav'
import { getHrNavSections } from '@/lib/hrNav'

interface AppNavLink {
	to: string
	label: string
	end?: boolean
}

interface AppNavSection {
	id: string
	label: string
	links: AppNavLink[]
}

/**
 * getAppSections - Resolve expandable sub-nav for a known SPA app.
 *
 * @param appName - App tile name (inventory | hr).
 * @param capabilities - Session capabilities for HR filtering.
 * @returns Nav sections or empty when the app has no expandable links.
 */
function getAppSections(appName: string, capabilities: Capabilities | undefined): AppNavSection[] {
	if (appName === 'inventory') {
		return [{ id: 'inventory', label: '', links: inventoryLinks }]
	}
	if (appName === 'hr') {
		return getHrNavSections(capabilities)
	}
	return []
}

/**
 * appIcon - Icon for a known SPA app tile.
 *
 * @param appName - App tile name.
 * @returns Lucide icon element.
 */
function appIcon(appName: string): ReactNode {
	if (appName === 'hr') return <Users className="h-3.5 w-3.5" />
	return <Package className="h-3.5 w-3.5" />
}

/**
 * SidebarNav - Desktop/mobile sidebar with home, apps, and expandable domain links.
 *
 * @param props.apps - App tiles from list_apps.
 * @param props.openApps - Map of app name → expanded.
 * @param props.onToggleApp - Toggle/navigate an expandable app section.
 * @param props.capabilities - Session capabilities for HR nav filtering.
 * @param props.onNavigate - Optional callback after a nav click (closes mobile menu).
 * @returns Sidebar navigation element.
 */
function SidebarNav({
	apps,
	openApps,
	onToggleApp,
	capabilities,
	onNavigate,
}: {
	apps: AppTile[]
	openApps: Record<string, boolean>
	onToggleApp: (app: AppTile) => void
	capabilities: Capabilities | undefined
	onNavigate?: () => void
}) {
	const location = useLocation()

	return (
		<nav className="space-y-6">
			<div>
				<p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Home</p>
				<NavLink
					to="/"
					end
					onClick={onNavigate}
					className={({ isActive }) =>
						cn(
							'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
							isActive ? 'bg-brand font-medium text-white' : 'text-ink-muted hover:bg-surface-2',
						)
					}
				>
					<LayoutDashboard className="h-4 w-4" />
					Dashboard
				</NavLink>
			</div>

			<div>
				<p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Apps</p>
				<div className="space-y-1">
					{apps.map((app) => {
						const sections = getAppSections(app.name, capabilities)
						const inApp = location.pathname.startsWith(app.route)
						const expanded = inApp || Boolean(openApps[app.name])
						const hasSections = sections.some((section) => section.links.length > 0)

						if (!hasSections) {
							return (
								<NavLink
									key={app.name}
									to={app.route}
									onClick={onNavigate}
									className={({ isActive }) =>
										cn(
											'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
											isActive
												? 'bg-brand/10 font-medium text-brand'
												: 'text-ink-muted hover:bg-surface-2',
										)
									}
								>
									<span
										className="flex h-6 w-6 items-center justify-center rounded-md text-white"
										style={{ backgroundColor: app.color }}
									>
										{appIcon(app.name)}
									</span>
									{app.title}
								</NavLink>
							)
						}

						return (
							<div key={app.name}>
								<button
									type="button"
									onClick={() => onToggleApp(app)}
									className={cn(
										'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
										inApp ? 'bg-brand/10 font-medium text-brand' : 'text-ink-muted hover:bg-surface-2',
									)}
								>
									<span
										className="flex h-6 w-6 items-center justify-center rounded-md text-white"
										style={{ backgroundColor: app.color }}
									>
										{appIcon(app.name)}
									</span>
									<span className="flex-1 text-left">{app.title}</span>
									<ChevronDown className={cn('h-4 w-4 transition', expanded ? 'rotate-180' : '')} />
								</button>
								<AnimatePresence initial={false}>
									{expanded ? (
										<motion.div
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: 'auto', opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											className="overflow-hidden"
										>
											<div className="ml-3 mt-1 space-y-2 border-l border-line pl-3">
												{sections.map((section) => (
													<div key={section.id}>
														{section.label ? (
															<p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
																{section.label}
															</p>
														) : null}
														<div className="space-y-0.5">
															{section.links.map((link) => (
																<NavLink
																	key={link.to}
																	to={link.to}
																	end={link.end}
																	onClick={onNavigate}
																	className={({ isActive }) =>
																		cn(
																			'block rounded-md px-2 py-1.5 text-sm transition',
																			isActive
																				? 'bg-brand/10 font-medium text-brand'
																				: 'text-ink-muted hover:bg-surface-2',
																		)
																	}
																>
																	{link.label}
																</NavLink>
															))}
														</div>
													</div>
												))}
											</div>
										</motion.div>
									) : null}
								</AnimatePresence>
							</div>
						)
					})}
				</div>
			</div>
		</nav>
	)
}

/**
 * Shell - Authenticated app chrome with header, sidebar, and route outlet.
 *
 * @returns Layout wrapping child routes via Outlet.
 */
export function Shell() {
	const { session, logout } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const [menuOpen, setMenuOpen] = useState(false)
	const [apps, setApps] = useState<AppTile[]>([])
	const [openApps, setOpenApps] = useState<Record<string, boolean>>({})
	const { call } = useApiCall<AppTile[]>(API.apps.list)

	const activeAppTitle = useMemo(() => {
		if (location.pathname.startsWith('/inventory')) return 'Inventory'
		if (location.pathname.startsWith('/hr')) return 'HR'
		return 'Dashboard'
	}, [location.pathname])

	useEffect(() => {
		call({})
			.then((data) => setApps(Array.isArray(data) ? data : []))
			.catch(() => setApps([]))
	}, [call])

	useEffect(() => {
		setOpenApps((prev) => {
			const next = { ...prev }
			for (const app of apps) {
				if (!location.pathname.startsWith(app.route)) {
					next[app.name] = false
				}
			}
			return next
		})
	}, [location.pathname, apps])

	/**
	 * toggleApp - Expand an app nav and/or jump to its overview.
	 *
	 * @param app - App tile being toggled.
	 * @returns void
	 */
	const toggleApp = (app: AppTile) => {
		const inApp = location.pathname.startsWith(app.route)
		if (inApp) {
			navigate(app.route)
			return
		}
		if (!openApps[app.name]) {
			setOpenApps((prev) => ({ ...prev, [app.name]: true }))
			navigate(app.route)
			return
		}
		setOpenApps((prev) => ({ ...prev, [app.name]: false }))
	}

	const closeMenu = () => setMenuOpen(false)

	return (
		<div className="min-h-screen bg-canvas text-ink">
			<header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
				<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
					<div className="flex items-center gap-3">
						<Button variant="ghost" className="px-2 md:hidden" onClick={() => setMenuOpen((v) => !v)}>
							{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
						</Button>
						<button type="button" className="flex items-center gap-3" onClick={() => navigate('/')}>
							<Logo size={32} />
							<div className="text-left">
								<div className="font-display text-sm font-semibold">Pramniaga</div>
								<div className="text-xs text-ink-muted">{activeAppTitle}</div>
							</div>
						</button>
					</div>
					<div className="flex items-center gap-3">
						<div className="hidden text-right text-sm md:block">
							<div className="font-medium">{session?.user?.full_name}</div>
							<div className="text-xs text-ink-muted">{session?.default_company}</div>
						</div>
						<Button
							variant="ghost"
							onClick={async () => {
								await logout()
								navigate('/login')
							}}
						>
							<LogOut className="h-4 w-4" />
							<span className="hidden sm:inline">Logout</span>
						</Button>
					</div>
				</div>
			</header>

			<div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
				<aside className="hidden w-60 shrink-0 md:block">
					<SidebarNav
						apps={apps}
						openApps={openApps}
						onToggleApp={toggleApp}
						capabilities={session?.capabilities}
					/>
				</aside>

				<AnimatePresence>
					{menuOpen ? (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 z-30 bg-black/30 md:hidden"
							onClick={closeMenu}
						>
							<motion.nav
								initial={{ x: -280 }}
								animate={{ x: 0 }}
								exit={{ x: -280 }}
								className="h-full w-72 overflow-y-auto bg-white p-4 shadow-panel"
								onClick={(e) => e.stopPropagation()}
							>
								<div className="mb-4 flex items-center justify-between">
									<span className="font-display text-sm font-semibold">Menu</span>
									<Button variant="ghost" className="px-2" onClick={closeMenu}>
										<X className="h-4 w-4" />
									</Button>
								</div>
								<SidebarNav
									apps={apps}
									openApps={openApps}
									onToggleApp={(app) => {
										toggleApp(app)
										if (!location.pathname.startsWith(app.route)) closeMenu()
									}}
									capabilities={session?.capabilities}
									onNavigate={closeMenu}
								/>
							</motion.nav>
						</motion.div>
					) : null}
				</AnimatePresence>

				<main className="min-w-0 flex-1">
					<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
						<Outlet />
					</motion.div>
				</main>
			</div>
		</div>
	)
}
