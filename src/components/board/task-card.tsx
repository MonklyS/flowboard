import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarClock, MessageSquare } from 'lucide-react'
import { memo, type CSSProperties } from 'react'
import { AvatarStack } from '@/components/common/member-avatar'
import { PriorityIcon } from '@/components/common/icons'
import { PRIORITY_BY_ID } from '@/lib/constants'
import { dueInfo, type DueUrgency } from '@/lib/dates'
import type { Label, Task, TeamMember } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CardProps {
  task: Task
  members: Map<string, TeamMember>
  labels: Map<string, Label>
  onOpen?: (id: string) => void
}

const DUE_STYLES: Record<DueUrgency, string> = {
  overdue: 'bg-destructive/12 text-destructive border-destructive/25',
  today: 'bg-[color-mix(in_oklch,var(--status-progress)_16%,transparent)] text-[color-mix(in_oklch,var(--status-progress)_75%,var(--foreground))] border-[color-mix(in_oklch,var(--status-progress)_35%,transparent)]',
  soon: 'bg-[color-mix(in_oklch,var(--status-progress)_10%,transparent)] text-[color-mix(in_oklch,var(--status-progress)_70%,var(--foreground))] border-[color-mix(in_oklch,var(--status-progress)_25%,transparent)]',
  later: 'bg-transparent text-muted-foreground border-border',
  none: '',
}

/** The visual card. Shared by the sortable list item and the drag overlay. */
export const TaskCardBody = memo(function TaskCardBody({
  task,
  members,
  labels,
  dragging = false,
}: Omit<CardProps, 'onOpen'> & { dragging?: boolean }) {
  const done = task.status === 'done'
  const due = dueInfo(task.due_date, done)
  const taskLabels = task.label_ids.map((id) => labels.get(id)).filter((l): l is Label => !!l)
  const assignees = task.assignee_ids.map((id) => members.get(id)).filter((m): m is TeamMember => !!m)
  const hasFooter = due.urgency !== 'none' || assignees.length > 0 || task.comment_count > 0 || task.priority !== 'normal'

  return (
    <div
      className={cn(
        'group/card relative rounded-lg border border-transparent bg-card p-3 text-left text-card-foreground shadow-card transition-[box-shadow,transform,border-color] duration-150',
        'hover:border-border hover:shadow-[var(--shadow-card),0_4px_12px_-4px_oklch(0.2_0.02_275/12%)]',
        dragging && 'rotate-[1.5deg] scale-[1.02] cursor-grabbing shadow-lift',
        due.urgency === 'overdue' && 'before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-destructive',
      )}
    >
      {taskLabels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {taskLabels.slice(0, 3).map((l) => (
            <span
              key={l.id}
              className="inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[11px] font-medium text-foreground/80"
              style={{ borderColor: `color-mix(in oklch, ${l.color} 35%, transparent)`, background: `color-mix(in oklch, ${l.color} 10%, transparent)` }}
            >
              <span className="size-1.5 rounded-full" style={{ background: l.color }} />
              {l.name}
            </span>
          ))}
          {taskLabels.length > 3 && (
            <span className="inline-flex h-5 items-center rounded-full border px-1.5 text-[11px] text-muted-foreground">
              +{taskLabels.length - 3}
            </span>
          )}
        </div>
      )}

      <p className={cn('line-clamp-3 text-[13.5px] font-medium leading-snug', done && 'text-muted-foreground line-through decoration-muted-foreground/40')}>
        {task.title}
      </p>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{task.description}</p>
      )}

      {hasFooter && (
        <div className="mt-3 flex items-center gap-2">
          {task.priority !== 'normal' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" title={`${PRIORITY_BY_ID[task.priority].label} priority`}>
              <PriorityIcon priority={task.priority} />
              {task.priority === 'high' && <span className="font-medium" style={{ color: 'var(--priority-high)' }}>High</span>}
            </span>
          )}
          {due.urgency !== 'none' && (
            <span
              title={due.title}
              className={cn('inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-[11px] font-medium', DUE_STYLES[due.urgency])}
            >
              <CalendarClock className="size-3" />
              {due.label}
            </span>
          )}
          {task.comment_count > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" title={`${task.comment_count} comments`}>
              <MessageSquare className="size-3" />
              {task.comment_count}
            </span>
          )}
          <div className="ml-auto">
            <AvatarStack members={assignees} size="xs" />
          </div>
        </div>
      )}
    </div>
  )
})

/** Sortable wrapper: wires the card into dnd-kit and opens details on click/Enter. */
export function SortableTaskCard({ task, members, labels, onOpen }: CardProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', status: task.status },
  })

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen?.(task.id)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e)
        if (e.key === 'Enter' && !e.defaultPrevented) onOpen?.(task.id)
      }}
      aria-roledescription="Draggable task"
      aria-label={`${task.title}. Press space to pick up, enter to open.`}
      className={cn(
        'touch-manipulation rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging ? 'cursor-grabbing' : 'cursor-grab',
      )}
    >
      {isDragging ? (
        <div className="rounded-lg border-2 border-dashed border-primary/35 bg-primary/5">
          <div className="invisible">
            <TaskCardBody task={task} members={members} labels={labels} />
          </div>
        </div>
      ) : (
        <TaskCardBody task={task} members={members} labels={labels} />
      )}
    </div>
  )
}
