import { format, parseISO } from 'date-fns'
import {
  ArrowRight,
  CalendarDays,
  MessageSquare,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  UserMinus,
  UserPlus,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { PriorityIcon, StatusIcon } from '@/components/common/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { useActivity } from '@/data/queries'
import { PRIORITY_BY_ID, STATUS_BY_ID } from '@/lib/constants'
import { fullTimestamp, timeAgo } from '@/lib/dates'
import type { Activity, Priority, TaskStatus } from '@/lib/types'
import { ErrorState } from '@/components/common/states'

function StatusChip({ s }: { s: string | null | undefined }) {
  if (!s || !(s in STATUS_BY_ID)) return null
  return (
    <span className="inline-flex items-center gap-1 font-medium text-foreground">
      <StatusIcon status={s as TaskStatus} className="size-3" />
      {STATUS_BY_ID[s as TaskStatus].label}
    </span>
  )
}

function describe(a: Activity): { icon: ReactNode; text: ReactNode } {
  const p = a.payload
  switch (a.type) {
    case 'created':
      return { icon: <Sparkles />, text: <>Created the task in <StatusChip s={p.status} /></> }
    case 'status_changed':
      return {
        icon: <ArrowRight />,
        text: (
          <>
            Moved from <StatusChip s={p.from} /> <span className="text-muted-foreground">→</span> <StatusChip s={p.to} />
          </>
        ),
      }
    case 'title_changed':
      return { icon: <Pencil />, text: <>Renamed to <span className="font-medium text-foreground">“{p.to}”</span></> }
    case 'description_changed':
      return { icon: <Pencil />, text: <>Updated the description</> }
    case 'priority_changed':
      return {
        icon: <PriorityIcon priority={(p.to as Priority) ?? 'normal'} />,
        text: (
          <>
            Changed priority from {PRIORITY_BY_ID[p.from as Priority]?.label ?? p.from} to{' '}
            <span className="font-medium text-foreground">{PRIORITY_BY_ID[p.to as Priority]?.label ?? p.to}</span>
          </>
        ),
      }
    case 'due_date_changed':
      return {
        icon: <CalendarDays />,
        text: p.to ? (
          <>Set due date to <span className="font-medium text-foreground">{format(parseISO(p.to), 'MMM d, yyyy')}</span></>
        ) : (
          <>Removed the due date</>
        ),
      }
    case 'assignee_added':
      return { icon: <UserPlus />, text: <>Assigned <span className="font-medium text-foreground">{p.name ?? 'a member'}</span></> }
    case 'assignee_removed':
      return { icon: <UserMinus />, text: <>Unassigned <span className="font-medium text-foreground">{p.name ?? 'a member'}</span></> }
    case 'label_added':
      return {
        icon: <Tag />,
        text: (
          <>
            Added label{' '}
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <span className="size-2 rounded-full" style={{ background: p.color ?? undefined }} />
              {p.name}
            </span>
          </>
        ),
      }
    case 'label_removed':
      return { icon: <Tag />, text: <>Removed label <span className="font-medium text-foreground">{p.name}</span></> }
    case 'commented':
      return { icon: <MessageSquare />, text: <>Left a comment</> }
    default:
      return { icon: <Plus />, text: <>Updated the task</> }
  }
}

export function ActivityFeed({ taskId }: { taskId: string }) {
  const { data, isPending, isError, error, refetch } = useActivity(taskId)

  if (isPending)
    return (
      <div className="space-y-4 py-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        ))}
      </div>
    )
  if (isError) return <ErrorState title="Couldn't load activity" message={error.message} onRetry={() => void refetch()} />
  if (data.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>

  return (
    <ol className="relative space-y-4 py-1 before:absolute before:top-3 before:bottom-3 before:left-[11px] before:w-px before:bg-border">
      {[...data].reverse().map((a) => {
        const { icon, text } = describe(a)
        return (
          <li key={a.id} className="relative flex gap-3 text-[13px] leading-6">
            <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground [&_svg]:size-3">
              {icon}
            </span>
            <p className="min-w-0 flex-1 text-muted-foreground">
              {text}
              <span className="mx-1.5 text-muted-foreground/50">·</span>
              <time dateTime={a.created_at} title={fullTimestamp(a.created_at)} className="whitespace-nowrap text-muted-foreground/80">
                {timeAgo(a.created_at)}
              </time>
            </p>
          </li>
        )
      })}
    </ol>
  )
}
