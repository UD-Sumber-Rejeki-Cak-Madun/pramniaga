/**
 * Purpose: Login route — brand stage + auth forms layout.
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth'
import { loadRememberedEmail, resetPassword, saveRememberedEmail } from '@/lib/session'
import { BrandStage } from '@/pages/login/BrandStage'
import { ForgotFormView, LoginFormView } from '@/pages/login/AuthForms'

type View = 'login' | 'forgot'

function useIsDesktop() {
	const [isDesktop, setIsDesktop] = useState(() =>
		typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
	)

	useEffect(() => {
		const mq = window.matchMedia('(min-width: 1024px)')
		const onChange = () => setIsDesktop(mq.matches)
		mq.addEventListener('change', onChange)
		return () => mq.removeEventListener('change', onChange)
	}, [])

	return isDesktop
}

function usePrefersReducedMotion() {
	const [reduce, setReduce] = useState(() =>
		typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
	)

	useEffect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
		const onChange = () => setReduce(mq.matches)
		mq.addEventListener('change', onChange)
		return () => mq.removeEventListener('change', onChange)
	}, [])

	return reduce
}

/**
 * LoginPage - Login route layout with brand stage and auth forms.
 *
 * @returns Page or card element.
 */
export default function LoginPage() {
	const { session, login, error } = useAuth()
	const isDesktop = useIsDesktop()
	const reduceMotion = usePrefersReducedMotion()

	const remembered = useMemo(() => loadRememberedEmail(), [])
	const [usr, setUsr] = useState(remembered)
	const [pwd, setPwd] = useState('')
	const [remember, setRemember] = useState(Boolean(remembered))
	const [localError, setLocalError] = useState<string | null>(null)
	const [submitting, setSubmitting] = useState(false)
	const [view, setView] = useState<View>('login')

	const [forgotEmail, setForgotEmail] = useState(remembered)
	const [forgotLoading, setForgotLoading] = useState(false)
	const [forgotError, setForgotError] = useState<string | null>(null)
	const [forgotSuccess, setForgotSuccess] = useState<string | null>(null)

	// Lock animation path at first paint so resize mid-flight doesn't thrash.
	const [animDesktop] = useState(isDesktop)
	const [phase, setPhase] = useState<'splash' | 'settled'>(reduceMotion ? 'settled' : 'splash')
	const [formReady, setFormReady] = useState(reduceMotion)

	useEffect(() => {
		if (reduceMotion) {
			setPhase('settled')
			setFormReady(true)
			return
		}
		const start = window.setTimeout(() => setPhase('settled'), 320)
		return () => window.clearTimeout(start)
	}, [reduceMotion])

	useEffect(() => {
		if (phase !== 'settled') return
		const ready = window.setTimeout(() => setFormReady(true), reduceMotion ? 0 : 750)
		return () => window.clearTimeout(ready)
	}, [phase, reduceMotion])

	if (session?.logged_in) {
		return <Navigate to="/" replace />
	}

	const formError = localError || error

	return (
		<div className="relative min-h-screen overflow-hidden bg-white">
			<BrandStage
				phase={phase}
				isDesktop={animDesktop}
				reduceMotion={reduceMotion}
				onMorphComplete={() => setFormReady(true)}
			/>

			<div
				className={
					animDesktop
						? 'relative z-10 grid min-h-screen grid-cols-[1fr_0.95fr]'
						: 'relative z-10 flex min-h-screen flex-col'
				}
			>
				{!animDesktop ? <div className="h-16 shrink-0" aria-hidden /> : null}

				<motion.div
					className={
						animDesktop
							? 'flex items-center justify-center px-10 py-12 lg:px-16'
							: 'flex flex-1 items-start justify-center px-6 py-10'
					}
					initial={false}
					animate={{
						opacity: formReady ? 1 : 0,
						filter: formReady ? 'blur(0px)' : 'blur(12px)',
					}}
					transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
					style={{ pointerEvents: formReady ? 'auto' : 'none' }}
					aria-hidden={!formReady}
				>
					<div className="w-full max-w-md">
						{view === 'login' ? (
							<LoginFormView
								usr={usr}
								pwd={pwd}
								remember={remember}
								loading={submitting}
								error={formError}
								onUsr={setUsr}
								onPwd={setPwd}
								onRemember={setRemember}
								onForgot={() => {
									setForgotEmail(usr)
									setForgotError(null)
									setForgotSuccess(null)
									setView('forgot')
								}}
								onSubmit={async () => {
									setLocalError(null)
									setSubmitting(true)
									saveRememberedEmail(remember ? usr.trim() : null)
									try {
										await login(usr.trim(), pwd)
									} catch {
										setLocalError('Unable to sign in. Check your email and password.')
									} finally {
										setSubmitting(false)
									}
								}}
							/>
						) : null}

						{view === 'forgot' ? (
							<ForgotFormView
								email={forgotEmail}
								loading={forgotLoading}
								error={forgotError}
								success={forgotSuccess}
								onEmail={setForgotEmail}
								onBack={() => setView('login')}
								onSubmit={async () => {
									setForgotError(null)
									setForgotSuccess(null)
									setForgotLoading(true)
									try {
										const msg = await resetPassword(forgotEmail.trim())
										setForgotSuccess(msg)
									} catch (err) {
										setForgotError(err instanceof Error ? err.message : 'Unable to send reset link.')
									} finally {
										setForgotLoading(false)
									}
								}}
							/>
						) : null}
					</div>
				</motion.div>

				{animDesktop ? <div className="relative" aria-hidden /> : null}
			</div>
		</div>
	)
}
