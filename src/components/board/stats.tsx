import { AlertCircle, CalendarClock, CheckCircle2, Layers } from 'lucide-react'
import type { ReactNode } from 'react'
import { isDueSoon, isOverdue } from '@/lib/dates'
import type { Task } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useBoardUI } from './board-ui'

export function computeStats(tasks: Task[]) {
  const done = tasks.filter((t) => t.status === 'done').length
  return {
    total: tasks.length,
    done,
    inProgress: tasks.filter((t) => t.status === 'in_progress' || t.status === 'in_review').length,
    overdue: tasks.filter((t) => isOverdue(t.due_date, t.status === 'done')).length,
    dueSoon: tasks.filter((t) => isDueSoon(t.due_date, t.status === 'done')).length,
    pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  }
}

function Stat({
  icon,
  label,
  value,
  sub,
  tone,
  onClick,
  active,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: string
  onClick?: () => void
  active?: boolean
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={cn(
        'flex min-w-[140px] flex-1 items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-left shadow-card transition-colors',
        onClick && 'cursor-pointer hover:border-foreground/15',
        active && 'border-primary/50 ring-2 ring-primary/20',
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4" style={{ background: `color-mix(in oklch, ${tone ?? 'var(--muted-foreground)'} 14%, transparent)`, color: tone }}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-lg leading-tight font-semibold tabular-nums">{value}</span>
          {sub && <span className="truncate text-xs text-muted-foreground">{sub}</span>}
        </span>
      </span>
    </Comp>
  )
}

export function StatsBar({ tasks }: { tasks: Task[] }) {
  const s = computeStats(tasks)
  const { filters, setFilters } = useBoardUI()

  return (
    <div className="scrollbar-thin flex gap-2.5 overflow-x-auto px-4 pb-1 sm:px-6">
      <Stat icon={<Layers />} label="Total" value={s.total} sub={`${s.inProgress} active`} tone="var(--primary)" />
      <div className="flex min-w-[180px] flex-1 items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 shadow-card">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'color-mix(in oklch, var(--status-done) 14%, transparent)', color: 'var(--status-done)' }}>
          <CheckCircle2 className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Completed</span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-lg leading-tight font-semibold tabular-nums">{s.done}</span>
            <span className="text-xs text-muted-foreground">{s.pct}%</span>
          </span>
          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={s.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Completion">
            <span className="block h-full rounded-full bg-[var(--status-done)] transition-[width] duration-500" style={{ width: `${s.pct}%` }} />
          </span>
        </span>
      </div>
      <Stat
        icon={<AlertCircle />}
        label="Overdue"
        value={s.overdue}
        tone="var(--destructive)"
        onClick={() => setFilters((f) => ({ ...f, due: f.due === 'overdue' ? null : 'overdue' }))}
        active={filters.due === 'overdue'}
      />
      <Stat
        icon={<CalendarClock />}
        label="Due soon"
        value={s.dueSoon}
        sub="next 2 days"
        tone="var(--status-progress)"
        onClick={() => setFilters((f) => ({ ...f, due: f.due === 'soon' ? null : 'soon' }))}
        active={filters.due === 'soon'}
      />
    </div>
  )
}
