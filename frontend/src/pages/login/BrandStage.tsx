/**
 * Purpose: Login brand panel that morphs between desktop image and mobile logo bar.
 * Exports: BrandStage
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Logo } from '@/components/layout/Logo'
import { cn } from '@/lib/utils'

type BrandStageProps = {
	phase: 'splash' | 'settled'
	isDesktop: boolean
	reduceMotion: boolean
	onMorphComplete?: () => void
}

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * BrandStage - Login brand panel that morphs between desktop image and mobile logo bar.
 *
 * @param props.phase - Animation phase: splash | settled.
 * @param props.isDesktop - Whether layout is desktop.
 * @param props.reduceMotion - Disable morph animation when true.
 * @param props.onMorphComplete - Optional callback when morph finishes.
 * @returns Brand stage element.
 */
export function BrandStage({ phase, isDesktop, reduceMotion, onMorphComplete }: BrandStageProps) {
	const splash = phase === 'splash'
	const duration = reduceMotion ? 0 : 0.85
	const delay = reduceMotion || !splash ? 0 : 0.28
	const [mobilePlainBar, setMobilePlainBar] = useState(reduceMotion && !isDesktop)

	// Desktop: morph into right image panel. Mobile: morph into plain logo top bar (no image).
	const panel = isDesktop
		? splash
			? { top: 0, right: 0, bottom: 0, left: 0, borderRadius: 0 }
			: { top: 24, right: 24, bottom: 24, left: '52%', borderRadius: 28 }
		: splash
			? { top: 0, right: 0, left: 0, height: '100vh', borderRadius: 0 }
			: { top: 0, right: 0, left: 0, height: 64, borderRadius: 0 }

	const logoSize = splash ? 72 : isDesktop ? 48 : 32
	const logo = isDesktop
		? splash
			? { opacity: 1, top: '50%', left: '50%', x: '-50%', y: '-50%', scale: 1 }
			: { opacity: 0, top: '50%', left: '50%', x: '-50%', y: '-50%', scale: 0.7 }
		: splash
			? { opacity: 1, top: '50%', left: '50%', x: '-50%', y: '-50%', scale: 1 }
			: { opacity: 1, top: 16, left: 20, x: 0, y: 0, scale: 1 }

	// Desktop keeps the mesh image; mobile only uses it for the splash, then a plain top bar.
	const showMesh = isDesktop || !mobilePlainBar

	return (
		<motion.div
			className={cn(
				'pointer-events-none fixed z-20 overflow-hidden',
				showMesh ? 'login-brand-mesh' : 'border-b border-line bg-white',
			)}
			initial={false}
			animate={panel}
			transition={{ duration, ease: EASE, delay }}
			onAnimationComplete={() => {
				if (phase !== 'settled') return
				if (!isDesktop) setMobilePlainBar(true)
				onMorphComplete?.()
			}}
		>
			<motion.div
				className="absolute"
				initial={false}
				animate={logo}
				transition={{ duration, ease: EASE, delay }}
			>
				<Logo
					size={logoSize}
					className={showMesh ? 'ring-2 ring-white/15' : 'ring-1 ring-line'}
				/>
			</motion.div>

			{isDesktop ? (
				<motion.div
					className="absolute bottom-8 left-8 right-8 max-w-sm"
					initial={false}
					animate={{
						opacity: phase === 'settled' ? 1 : 0,
						y: phase === 'settled' ? 0 : 16,
					}}
					transition={{ duration: reduceMotion ? 0 : 0.45, ease: EASE, delay: reduceMotion ? 0 : 0.55 }}
				>
					<div className="rounded-2xl border border-white/25 bg-white/15 p-4 text-white shadow-lg backdrop-blur-md">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 text-sm font-semibold">
								PN
							</div>
							<div>
								<div className="text-sm font-semibold">Pramniaga Ops</div>
								<div className="text-xs text-white/70">@inventory</div>
							</div>
						</div>
						<p className="mt-3 text-sm leading-relaxed text-white/90">
							Professional inventory operations with receipts, deliveries, transfers, and adjustments —
							exactly what our warehouse team needed.
						</p>
					</div>
				</motion.div>
			) : null}
		</motion.div>
	)
}
