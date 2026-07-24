import { cn } from '@/lib/utils'

export function Logo({ className, size = 40 }: { className?: string; size?: number }) {
	return (
		<img
			src="/assets/pramniaga/logo.svg"
			alt="Pramniaga"
			width={size}
			height={size}
			className={cn('rounded-xl', className)}
		/>
	)
}
