import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
	ChevronDown,
	LayoutDashboard,
	LogOut,
	Menu,
	Package,
	X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui'
import { API, useApiCall } from '@/lib/api'
import type { AppTile } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

const inventoryLinks = [
	{ to: '/inventory', label: 'Overview', end: true },
	{ to: '/inventory/products', label: 'Products' },
	{ to: '/inventory/receipts', label: 'Receipts' },
	{ to: '/inventory/deliveries', label: 'Deliveries' },
	{ to: '/inventory/transfers', label: 'Transfers' },
	{ to: '/inventory/adjustments', label: 'Adjustments' },
	{ to: '/inventory/stock', label: 'On Hand' },
	{ to: '/inventory/warehouses', label: 'Warehouses' },
]

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
						const isInventory = app.name === 'inventory' || app.route.startsWith('/inventory')
						const showInventoryLinks = inInventory || inventoryOpen
						if (isInventory) {
							return (
								<div key={app.name}>
									<button
										type="button"
										onClick={onToggleInventory}
										className={cn(
											'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
											inInventory
												? 'bg-brand/10 font-medium text-brand'
												: 'text-ink-muted hover:bg-surface-2',
										)}
									>
										<span
											className="flex h-6 w-6 items-center justify-center rounded-md text-white"
											style={{ backgroundColor: app.color }}
										>
											<Package className="h-3.5 w-3.5" />
										</span>
										<span className="flex-1 text-left">{app.title}</span>
										<ChevronDown
											className={cn('h-4 w-4 transition', showInventoryLinks ? 'rotate-180' : '')}
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
													{inventoryLinks.map((link) => (
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
											</motion.div>
										) : null}
									</AnimatePresence>
								</div>
							)
						}

						return (
							<NavLink
								key={app.name}
								to={app.route}
								onClick={onNavigate}
								className={({ isActive }) =>
									cn(
										'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
										isActive ? 'bg-brand/10 font-medium text-brand' : 'text-ink-muted hover:bg-surface-2',
									)
								}
							>
								<span
									className="flex h-6 w-6 items-center justify-center rounded-md text-white"
									style={{ backgroundColor: app.color }}
								>
									<img src={app.logo} alt="" className="h-3.5 w-3.5" />
								</span>
								{app.title}
							</NavLink>
						)
					})}
				</div>
			</div>
		</nav>
	)
}

export function Shell() {
	const { session, logout } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const [menuOpen, setMenuOpen] = useState(false)
	const [apps, setApps] = useState<AppTile[]>([])
	const [inventoryOpen, setInventoryOpen] = useState(false)
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
								<div className="text-xs text-ink-muted">
									{location.pathname.startsWith('/inventory') ? 'Inventory' : 'Dashboard'}
								</div>
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
