import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { StatusIcon } from '@/components/common/icons'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { StatusMeta } from '@/lib/constants'
import type { Label, Task, TeamMember } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SortableTaskCard } from './task-card'

interface ColumnProps {
  meta: StatusMeta
  tasks: Task[]
  /** Total tasks in this column before filters, for the "x of y" count. */
  total: number
  filtered: boolean
  members: Map<string, TeamMember>
  labels: Map<string, Label>
  onAdd: () => void
  onOpen: (id: string) => void
}

export function Column({ meta, tasks, total, filtered, members, labels, onAdd, onOpen }: ColumnProps) {
  const { setNodeRef, isOver, active } = useDroppable({ id: meta.id, data: { type: 'column' } })
  const isDragActive = !!active
  const ids = tasks.map((t) => t.id)

  return (
    <section
      aria-label={`${meta.label} column`}
      className={cn(
        'flex max-h-full w-[85vw] shrink-0 snap-center flex-col rounded-xl border bg-column/80 backdrop-blur-sm transition-colors duration-200 sm:w-[300px] lg:w-auto lg:min-w-[260px] lg:flex-1',
        isOver && 'border-primary/40 bg-[color-mix(in_oklch,var(--primary)_5%,var(--column))]',
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="h-4 w-1 rounded-full" style={{ background: meta.color }} aria-hidden />
        <StatusIcon status={meta.id} />
        <h2 className="text-[13px] font-semibold tracking-tight">{meta.label}</h2>
        <span className="rounded-md bg-background/70 px-1.5 py-px font-mono text-[11px] tabular-nums text-muted-foreground ring-1 ring-border">
          {filtered ? `${tasks.length}/${total}` : total}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="ml-auto text-muted-foreground" onClick={onAdd} aria-label={`Add task to ${meta.label}`}>
              <Plus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add to {meta.label}</TooltipContent>
        </Tooltip>
      </header>

      <div ref={setNodeRef} className="scrollbar-thin flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        <SortableContext id={meta.id} items={ids} strategy={verticalListSortingStrategy}>
          {tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: Math.min(i * 0.025, 0.2), ease: 'easeOut' }}
            >
              <SortableTaskCard task={task} members={members} labels={labels} onOpen={onOpen} />
            </motion.div>
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div
            className={cn(
              'flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center transition-colors',
              isDragActive ? 'border-primary/40 bg-primary/5' : 'border-border',
            )}
          >
            {isDragActive ? (
              <p className="text-xs font-medium text-primary">Drop here to move to {meta.label}</p>
            ) : filtered && total > 0 ? (
              <p className="text-xs text-muted-foreground">No tasks match your filters</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{meta.hint}</p>
                <Button variant="ghost" size="xs" className="mt-2 text-muted-foreground" onClick={onAdd}>
                  <Plus /> Add task
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
