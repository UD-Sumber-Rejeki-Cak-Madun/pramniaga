/**
 * Purpose: Authenticated app chrome — header, sidebar, mobile drawer, outlet.
 * Exports: Shell
 * Contents:
 *  - SidebarNav (home + apps + inventory sublinks)
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
	X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Logo } from '@/components/layout/Logo'
import { NavSearch } from '@/components/layout/NavSearch'
import { Button } from '@/components/ui'
import { API, useApiCall } from '@/lib/api'
import { inventoryAppIcon, inventoryNavItems } from '@/lib/inventoryNav'
import type { AppTile } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

const inventoryLinks = inventoryNavItems
const InventoryAppIcon = inventoryAppIcon

const navActiveSpring = { type: 'spring' as const, stiffness: 420, damping: 34 }
const ignoredSessionRoles = new Set(['All', 'Guest', 'Desk User'])
const preferredSessionRoles = [
	'System Manager',
	'Stock Manager',
	'Item Manager',
	'Stock User',
	'Sales Manager',
	'Sales User',
	'Purchase Manager',
	'Purchase User',
]

/**
 * primaryRoleLabel - Pick a single role label for the header (skip Frappe defaults).
 *
 * @param roles - Roles from the session payload.
 * @returns Best display role, or "User" when none remain.
 */
function primaryRoleLabel(roles: string[] | undefined): string {
	if (!roles?.length) return 'User'
	const meaningfulRoles = roles.filter((role) => !ignoredSessionRoles.has(role))
	for (const preferred of preferredSessionRoles) {
		if (meaningfulRoles.includes(preferred)) return preferred
	}
	return meaningfulRoles[0] || 'User'
}

/**
 * SidebarNavLink - Sidebar route link with a sliding active indicator.
 *
 * @param props.to - Destination path.
 * @param props.end - Match route exactly when true.
 * @param props.onClick - Optional click handler.
 * @param props.layoutId - Shared layout id for the active pill within a nav group.
 * @param props.activeIndicatorClass - Background classes for the active pill.
 * @param props.activeTextClass - Text classes when the link is active.
 * @param props.inactiveClass - Text/background classes when inactive.
 * @param props.className - Additional link classes.
 * @param props.rounded - Corner radius utility for link and pill.
 * @param props.children - Link label content.
 * @returns Animated sidebar NavLink.
 */
function SidebarNavLink({
	to,
	end,
	onClick,
	layoutId,
	activeIndicatorClass,
	activeTextClass,
	inactiveClass,
	className,
	rounded = 'rounded-lg',
	children,
}: {
	to: string
	end?: boolean
	onClick?: () => void
	layoutId: string
	activeIndicatorClass: string
	activeTextClass: string
	inactiveClass: string
	className?: string
	rounded?: string
	children: ReactNode
}) {
	return (
		<NavLink
			to={to}
			end={end}
			onClick={onClick}
			className={({ isActive }) =>
				cn(
					'group relative flex items-center gap-2 px-3 py-2 text-sm transition-colors',
					rounded,
					isActive ? activeTextClass : inactiveClass,
					className,
				)
			}
		>
			{({ isActive }) => (
				<>
					{isActive ? (
						<motion.span
							layoutId={layoutId}
							className={cn('absolute inset-0', rounded, activeIndicatorClass)}
							transition={navActiveSpring}
						/>
					) : null}
					<span className="relative z-10 flex min-w-0 items-center gap-2">{children}</span>
				</>
			)}
		</NavLink>
	)
}

/**
 * SidebarNav - Desktop/mobile sidebar with home, apps, and inventory links.
 *
 * @param props.apps - App tiles from list_apps.
 * @param props.inventoryOpen - Whether inventory sublinks are expanded.
 * @param props.onToggleInventory - Toggle/navigate inventory section.
 * @param props.onNavigate - Optional callback after a nav click (closes mobile menu).
 * @returns Sidebar navigation element.
 */
function SidebarNav({
	apps,
	inventoryOpen,
	onToggleInventory,
	onNavigate,
}: {
	apps: AppTile[]
	inventoryOpen: boolean
	onToggleInventory: () => void
	onNavigate?: () => void
}) {
	const location = useLocation()
	const inInventory = location.pathname.startsWith('/inventory')

	return (
		<LayoutGroup>
			<nav className="space-y-6">
			<div>
				<p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Home</p>
				<SidebarNavLink
					to="/"
					end
					onClick={onNavigate}
					layoutId="sidebar-home-active"
					activeIndicatorClass="bg-brand"
					activeTextClass="font-medium text-white"
					inactiveClass="text-ink-muted hover:bg-surface-2"
				>
					<LayoutDashboard className="icon-shake h-4 w-4" />
					Dashboard
				</SidebarNavLink>
			</div>

			<div>
				<p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Apps</p>
				<div className="space-y-1">
					{apps.map((app) => {
						const isInventory = app.name === 'inventory' || app.route.startsWith('/inventory')
						const showInventoryLinks = inInventory || inventoryOpen
						if (isInventory) {
							return (
								<div key={app.name}>
									<button
										type="button"
										onClick={onToggleInventory}
										className={cn(
											'group relative flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
											inInventory ? 'font-medium text-brand' : 'text-ink-muted hover:bg-surface-2',
										)}
									>
										{inInventory ? (
											<motion.span
												layoutId="sidebar-apps-active"
												className="absolute inset-0 rounded-lg bg-brand/10"
												transition={navActiveSpring}
											/>
										) : null}
										<span
											className="relative z-10 flex h-6 w-6 items-center justify-center rounded-md text-white"
											style={{ backgroundColor: app.color }}
										>
											<InventoryAppIcon className="icon-shake h-3.5 w-3.5" />
										</span>
										<span className="relative z-10 flex-1 text-left">{app.title}</span>
										<ChevronDown
											className={cn(
												'relative z-10 h-4 w-4 transition-transform duration-200',
												showInventoryLinks ? 'rotate-180' : '',
											)}
										/>
									</button>
									<AnimatePresence initial={false}>
										{showInventoryLinks ? (
											<motion.div
												initial={{ height: 0, opacity: 0 }}
												animate={{ height: 'auto', opacity: 1 }}
												exit={{ height: 0, opacity: 0 }}
												className="overflow-hidden"
											>
												<div className="ml-3 mt-1 space-y-0.5 border-l border-line pl-3">
													{inventoryLinks.map((link) => {
														const LinkIcon = link.icon
														return (
															<SidebarNavLink
																key={link.to}
																to={link.to}
																end={link.end}
																onClick={onNavigate}
																layoutId="sidebar-inventory-active"
																activeIndicatorClass="bg-brand/10"
																activeTextClass="font-medium text-brand"
																inactiveClass="text-ink-muted hover:bg-surface-2"
																rounded="rounded-md"
																className="px-2 py-1.5"
															>
																<span
																	className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
																	style={{ backgroundColor: link.accent }}
																>
																	<LinkIcon className="icon-shake h-3.5 w-3.5" />
																</span>
																<span className="truncate">{link.label}</span>
															</SidebarNavLink>
														)
													})}
												</div>
											</motion.div>
										) : null}
									</AnimatePresence>
								</div>
							)
						}

						return (
							<SidebarNavLink
								key={app.name}
								to={app.route}
								onClick={onNavigate}
								layoutId="sidebar-apps-active"
								activeIndicatorClass="bg-brand/10"
								activeTextClass="font-medium text-brand"
								inactiveClass="text-ink-muted hover:bg-surface-2"
							>
								<span
									className="flex h-6 w-6 items-center justify-center rounded-md text-white"
									style={{ backgroundColor: app.color }}
								>
									<img src={app.logo} alt="" className="icon-shake h-3.5 w-3.5" />
								</span>
								{app.title}
							</SidebarNavLink>
						)
					})}
				</div>
			</div>
		</nav>
		</LayoutGroup>
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
	const [inventoryOpen, setInventoryOpen] = useState(false)
	const [topbarScrolled, setTopbarScrolled] = useState(false)
	const { call } = useApiCall<AppTile[]>(API.apps.list)
	const inInventory = location.pathname.startsWith('/inventory')

	useEffect(() => {
		call({})
			.then((data) => setApps(Array.isArray(data) ? data : []))
			.catch(() => setApps([]))
	}, [call])

	useEffect(() => {
		if (!inInventory) setInventoryOpen(false)
	}, [inInventory])

	useEffect(() => {
		/**
		 * syncTopbarScroll - Firm the frosted topbar once the page leaves the top.
		 *
		 * @returns void
		 */
		const syncTopbarScroll = () => {
			setTopbarScrolled(window.scrollY > 12)
		}
		syncTopbarScroll()
		window.addEventListener('scroll', syncTopbarScroll, { passive: true })
		return () => window.removeEventListener('scroll', syncTopbarScroll)
	}, [])

	/**
	 * toggleInventory - Expand inventory nav and/or jump to overview.
	 *
	 * @returns void
	 */
	const toggleInventory = () => {
		if (inInventory) {
			navigate('/inventory')
			return
		}
		if (!inventoryOpen) {
			setInventoryOpen(true)
			navigate('/inventory')
			return
		}
		setInventoryOpen(false)
	}

	const closeMenu = () => setMenuOpen(false)

	/**
	 * handleSearchNavigate - Keep inventory sidebar expanded after jumping via search.
	 *
	 * @param to - Destination path from NavSearch.
	 * @returns void
	 */
	const handleSearchNavigate = (to: string) => {
		if (to.startsWith('/inventory')) setInventoryOpen(true)
	}

	return (
		<div className="min-h-screen bg-canvas text-ink">
			<header
				className={cn(
					'shell-topbar sticky top-0 z-20 border-b transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300 ease-out',
					topbarScrolled
						? 'shell-topbar--scrolled border-line/80 shadow-[0_1px_0_rgb(15_23_42/0.04)]'
						: 'border-transparent',
				)}
			>
				<div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-2 sm:h-14 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,28rem)_minmax(0,1fr)] sm:gap-4 sm:py-0">
					<div className="flex min-w-0 items-center gap-3 justify-self-start">
						<Button variant="ghost" className="px-2 md:hidden" onClick={() => setMenuOpen((v) => !v)}>
							{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
						</Button>
						<button type="button" className="flex min-w-0 items-center gap-3" onClick={() => navigate('/')}>
							<Logo size={32} />
							<span className="font-display text-sm font-semibold">Pramtek</span>
						</button>
					</div>
					<div className="col-start-2 flex items-center justify-end gap-3 justify-self-end sm:col-start-3">
						<div className="hidden text-right text-sm md:block">
							<div className="font-medium">{session?.user?.full_name}</div>
							<div className="text-xs text-ink-muted">{primaryRoleLabel(session?.roles)}</div>
						</div>
						<button
							type="button"
							className="group inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger"
							onClick={async () => {
								await logout()
								navigate('/login')
							}}
						>
							<LogOut className="icon-shake h-4 w-4" />
							<span className="hidden sm:inline">Logout</span>
						</button>
					</div>
					<div className="col-span-2 min-w-0 w-full sm:col-span-1 sm:col-start-2 sm:row-start-1">
						<NavSearch apps={apps} onNavigate={handleSearchNavigate} />
					</div>
				</div>
			</header>

			<div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
				<aside className="hidden w-60 shrink-0 md:block">
					<SidebarNav apps={apps} inventoryOpen={inventoryOpen} onToggleInventory={toggleInventory} />
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
									inventoryOpen={inventoryOpen}
									onToggleInventory={() => {
										toggleInventory()
										if (!inInventory) closeMenu()
									}}
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
