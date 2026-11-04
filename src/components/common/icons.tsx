import { useId } from 'react'
import { cn } from '@/lib/utils'
import { PRIORITY_BY_ID, STATUS_BY_ID } from '@/lib/constants'
import type { Priority, TaskStatus } from '@/lib/types'

/** Linear-style status glyph: an empty ring that fills as work progresses. */
export function StatusIcon({ status, className }: { status: TaskStatus; className?: string }) {
  const color = STATUS_BY_ID[status].color
  const fill = { todo: 0, in_progress: 0.5, in_review: 0.75, done: 1 }[status]
  const r = 5
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 16 16" className={cn('size-3.5 shrink-0', className)} aria-hidden>
      <circle cx="8" cy="8" r="6.25" fill="none" stroke={color} strokeWidth="1.5"
        strokeDasharray={status === 'todo' ? '2.4 1.6' : undefined} />
      {status === 'done' ? (
        <>
          <circle cx="8" cy="8" r="6.25" fill={color} />
          <path d="M5.2 8.2 7.1 10l3.7-3.9" fill="none" stroke="var(--background)" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : fill > 0 ? (
        <circle cx="8" cy="8" r={r / 2} fill="none" stroke={color} strokeWidth={r}
          strokeDasharray={`${(c / 2) * fill} ${c}`} transform="rotate(-90 8 8)" />
      ) : null}
    </svg>
  )
}

/** Signal-bars priority glyph. */
export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const meta = PRIORITY_BY_ID[priority]
  return (
    <svg viewBox="0 0 16 16" className={cn('size-3.5 shrink-0', className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={2 + i * 4.5} y={10 - i * 3.5} width="3" height={4 + i * 3.5} rx="1"
          fill={i < meta.rank ? meta.color : 'currentColor'} opacity={i < meta.rank ? 1 : 0.18} />
      ))}
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  // Unique per instance: a duplicate id inside a hidden (display:none) copy
  // would otherwise break the gradient for every visible copy.
  const gradientId = useId()
  return (
    <svg viewBox="0 0 24 24" className={cn('size-6', className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.66 0.2 285)" />
          <stop offset="1" stopColor="oklch(0.55 0.22 265)" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="7" fill={`url(#${gradientId})`} />
      <rect x="5.5" y="6" width="3.6" height="12" rx="1.6" fill="white" opacity=".95" />
      <rect x="10.2" y="6" width="3.6" height="8" rx="1.6" fill="white" opacity=".75" />
      <rect x="14.9" y="6" width="3.6" height="5" rx="1.6" fill="white" opacity=".55" />
    </svg>
  )
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cn(
      'pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground',
      className,
    )}>
      {children}
    </kbd>
  )
}
