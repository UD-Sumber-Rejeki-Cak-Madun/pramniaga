/**
 * Purpose: Topbar menu search combobox — filter and navigate to app chrome links.
 * Exports: NavSearch
 *
 * Last updated: 2026-07-25
 * Author: Pramniaga
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import {
	buildNavSearchItems,
	filterNavSearchItems,
	type NavSearchGroup,
	type NavSearchItem,
} from '@/lib/navSearch'
import type { AppTile } from '@/lib/types'
import { cn } from '@/lib/utils'

const GROUP_ORDER: NavSearchGroup[] = ['Home', 'Apps', 'Inventory']
const resultsPanelTransition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const }

/**
 * NavSearch - Transparent-header menu search with live filter and keyboard nav.
 *
 * @param props.apps - App tiles from list_apps (same source as the sidebar).
 * @param props.onNavigate - Optional callback after a menu selection (e.g. expand inventory).
 * @returns Search field and results dropdown for the Shell header.
 */
export function NavSearch({
	apps,
	onNavigate,
}: {
	apps: AppTile[]
	onNavigate?: (to: string) => void
}) {
	const navigate = useNavigate()
	const rootRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const [query, setQuery] = useState('')
	const [open, setOpen] = useState(false)
	const [highlightIndex, setHighlightIndex] = useState(0)

	const allItems = useMemo(() => buildNavSearchItems(apps), [apps])
	const matches = useMemo(() => filterNavSearchItems(allItems, query), [allItems, query])

	useEffect(() => {
		setHighlightIndex(0)
	}, [query, open])

	useEffect(() => {
		/**
		 * handleGlobalShortcut - Focus search on Ctrl/Cmd+K.
		 *
		 * @param event - Keyboard event.
		 * @returns void
		 */
		const handleGlobalShortcut = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return
			event.preventDefault()
			inputRef.current?.focus()
			setOpen(true)
		}
		window.addEventListener('keydown', handleGlobalShortcut)
		return () => window.removeEventListener('keydown', handleGlobalShortcut)
	}, [])

	useEffect(() => {
		if (!open) return

		/**
		 * handlePointerDown - Close the panel when clicking outside the search root.
		 *
		 * @param event - Pointer event.
		 * @returns void
		 */
		const handlePointerDown = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false)
			}
		}
		document.addEventListener('mousedown', handlePointerDown)
		return () => document.removeEventListener('mousedown', handlePointerDown)
	}, [open])

	/**
	 * selectItem - Navigate to a menu entry and reset the search UI.
	 *
	 * @param item - Selected search result.
	 * @returns void
	 */
	const selectItem = (item: NavSearchItem) => {
		navigate(item.to)
		onNavigate?.(item.to)
		setQuery('')
		setOpen(false)
		inputRef.current?.blur()
	}

	/**
	 * handleKeyDown - Arrow keys, Enter, and Escape while the panel is open.
	 *
	 * @param event - Input keyboard event.
	 * @returns void
	 */
	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Escape') {
			event.preventDefault()
			setOpen(false)
			inputRef.current?.blur()
			return
		}

		if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
			setOpen(true)
			return
		}

		if (!open || matches.length === 0) return

		if (event.key === 'ArrowDown') {
			event.preventDefault()
			setHighlightIndex((index) => (index + 1) % matches.length)
			return
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault()
			setHighlightIndex((index) => (index - 1 + matches.length) % matches.length)
			return
		}

		if (event.key === 'Enter') {
			event.preventDefault()
			const item = matches[highlightIndex]
			if (item) selectItem(item)
		}
	}

	const grouped = GROUP_ORDER.map((group) => ({
		group,
		items: matches.filter((item) => item.group === group),
	})).filter((section) => section.items.length > 0)

	let flatIndex = -1

	return (
		<div ref={rootRef} className="relative w-full">
			<div
				className={cn(
					'flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 shadow-sm transition',
					open && 'ring-2 ring-brand/20 border-brand',
				)}
			>
				<Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
				<input
					ref={inputRef}
					type="search"
					value={query}
					placeholder="Search menus…"
					aria-label="Search menus"
					aria-expanded={open}
					aria-controls="nav-search-results"
					autoComplete="off"
					className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
					onFocus={() => setOpen(true)}
					onChange={(event) => {
						setQuery(event.target.value)
						setOpen(true)
					}}
					onKeyDown={handleKeyDown}
				/>
				<kbd className="hidden shrink-0 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted sm:inline">
					⌘K
				</kbd>
			</div>

			<AnimatePresence>
				{open ? (
					<motion.div
						id="nav-search-results"
						role="listbox"
						initial={{ opacity: 0, y: -6, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -4, scale: 0.98 }}
						transition={resultsPanelTransition}
						className="absolute left-0 right-0 top-full z-40 mt-2 origin-top max-h-80 overflow-y-auto rounded-xl border border-line bg-white py-2 shadow-panel"
					>
						{matches.length === 0 ? (
							<p className="px-3 py-6 text-center text-sm text-ink-muted">No menus found</p>
						) : (
							grouped.map((section) => (
								<div key={section.group} className="mb-1 last:mb-0">
									<p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
										{section.group}
									</p>
									<ul>
										{section.items.map((item) => {
											flatIndex += 1
											const index = flatIndex
											const ItemIcon = item.icon
											const isHighlighted = index === highlightIndex
											return (
												<li key={item.id}>
													<button
														type="button"
														role="option"
														aria-selected={isHighlighted}
														className={cn(
															'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition',
															isHighlighted
																? 'bg-brand/10 font-medium text-brand'
																: 'text-ink hover:bg-surface-2',
														)}
														onMouseEnter={() => setHighlightIndex(index)}
														onClick={() => selectItem(item)}
													>
														<span
															className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
															style={{
																backgroundColor: item.accent || '#714B67',
															}}
														>
															{ItemIcon ? (
																<ItemIcon className="h-3.5 w-3.5" />
															) : item.logo ? (
																<img src={item.logo} alt="" className="h-3.5 w-3.5" />
															) : null}
														</span>
														<span className="min-w-0 flex-1 truncate">{item.label}</span>
														<span className="shrink-0 text-xs text-ink-muted">{item.group}</span>
													</button>
												</li>
											)
										})}
									</ul>
								</div>
							))
						)}
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	)
}
