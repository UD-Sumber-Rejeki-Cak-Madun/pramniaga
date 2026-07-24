/**
 * Purpose: Login, signup, and forgot-password forms.
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { ErrorBanner } from '@/components/ui'
import { accentLinkClass, blackButtonClass, labelClass, pillInputClass } from './formStyles'

type LoginFormProps = {
	usr: string
	pwd: string
	remember: boolean
	loading: boolean
	error: string | null
	onUsr: (v: string) => void
	onPwd: (v: string) => void
	onRemember: (v: boolean) => void
	onSubmit: () => void
	onForgot: () => void
}

/**
 * LoginFormView - Email/password login form with remember-me.
 *
 * @param props - Login form controlled fields and handlers.
 * @returns Login form element.
 */
export function LoginFormView({
	usr,
	pwd,
	remember,
	loading,
	error,
	onUsr,
	onPwd,
	onRemember,
	onSubmit,
	onForgot,
}: LoginFormProps) {
	const [showPwd, setShowPwd] = useState(false)

	return (
		<form
			className="space-y-5"
			onSubmit={(e) => {
				e.preventDefault()
				onSubmit()
			}}
		>
			<div>
				<h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Welcome</h1>
				<p className="mt-2 text-sm text-ink-muted">
					Access your account and continue your journey with us.
				</p>
			</div>

			<label className="block">
				<span className={labelClass}>Email Address</span>
				<input
					className={pillInputClass}
					type="text"
					autoComplete="username"
					placeholder="Enter your email address"
					value={usr}
					onChange={(e) => onUsr(e.target.value)}
					required
				/>
			</label>

			<label className="block">
				<span className={labelClass}>Password</span>
				<div className="relative">
					<input
						className={`${pillInputClass} pr-12`}
						type={showPwd ? 'text' : 'password'}
						autoComplete="current-password"
						placeholder="Enter your password"
						value={pwd}
						onChange={(e) => onPwd(e.target.value)}
						required
					/>
					<button
						type="button"
						className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-muted hover:text-ink"
						aria-label={showPwd ? 'Hide password' : 'Show password'}
						onClick={() => setShowPwd((v) => !v)}
					>
						{showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
					</button>
				</div>
			</label>

			<div className="flex items-center justify-between gap-3">
				<label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
					<input
						type="checkbox"
						className="h-4 w-4 rounded-full border-line text-brand focus:ring-brand/30"
						checked={remember}
						onChange={(e) => onRemember(e.target.checked)}
					/>
					Keep me signed in
				</label>
				<button type="button" className={accentLinkClass} onClick={onForgot}>
					Reset password
				</button>
			</div>

			{error ? <ErrorBanner message={error} /> : null}

			<button type="submit" className={blackButtonClass} disabled={loading}>
				{loading ? 'Signing in…' : 'Sign In'}
			</button>
		</form>
	)
}

type ForgotFormProps = {
	email: string
	loading: boolean
	error: string | null
	success: string | null
	onEmail: (v: string) => void
	onSubmit: () => void
	onBack: () => void
}

/**
 * ForgotFormView - Password reset request form.
 *
 * @param props - Forgot-password controlled fields and handlers.
 * @returns Forgot-password form element.
 */
export function ForgotFormView({
	email,
	loading,
	error,
	success,
	onEmail,
	onSubmit,
	onBack,
}: ForgotFormProps) {
	return (
		<form
			className="space-y-5"
			onSubmit={(e) => {
				e.preventDefault()
				onSubmit()
			}}
		>
			<div>
				<h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Reset password</h1>
				<p className="mt-2 text-sm text-ink-muted">
					Enter your email and we will send reset instructions if the account exists.
				</p>
			</div>

			<label className="block">
				<span className={labelClass}>Email Address</span>
				<input
					className={pillInputClass}
					type="email"
					autoComplete="email"
					placeholder="Enter your email address"
					value={email}
					onChange={(e) => onEmail(e.target.value)}
					required
				/>
			</label>

			{error ? <ErrorBanner message={error} /> : null}
			{success ? (
				<div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
					{success}
				</div>
			) : null}

			<button type="submit" className={blackButtonClass} disabled={loading || !!success}>
				{loading ? 'Sending…' : 'Send reset link'}
			</button>

			<button type="button" className={`${accentLinkClass} w-full text-center`} onClick={onBack}>
				Back to sign in
			</button>
		</form>
	)
}
