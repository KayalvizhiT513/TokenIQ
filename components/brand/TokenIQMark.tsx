import { cn } from '@/lib/utils'

export function TokenIQMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn('shrink-0', className)} fill="none">
      <defs>
        <linearGradient id="tokeniq-gradient" x1="8" y1="7" x2="40" y2="41" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <path d="M24 4 40 13v22L24 44 8 35V13L24 4Z" fill="url(#tokeniq-gradient)" />
      <path d="M17 17.5h10.2a5.3 5.3 0 0 1 0 10.6H22.5" stroke="white" strokeWidth="3.3" strokeLinecap="round" />
      <path d="M17 30.5h5.7" stroke="white" strokeWidth="3.3" strokeLinecap="round" />
      <circle cx="31.5" cy="30.5" r="2.5" fill="#A5F3FC" />
      <path d="M31.5 33v3.5M15 14.5v-3M15 36.5v-3" stroke="#A5F3FC" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
