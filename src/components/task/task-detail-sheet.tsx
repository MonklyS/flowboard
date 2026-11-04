import { Clock, Trash2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useBoardUI } from '@/components/board/board-ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  useDeleteTask,
  useLabels,
  useMembers,
  useSetTaskRelations,
  useTasks,
  useUpdateTask,
} from '@/data/queries'
import { fullTimestamp, timeAgo } from '@/lib/dates'
import { positionBetween } from '@/lib/position'
import type { Task, TaskStatus } from '@/lib/types'
import { ActivityFeed } from './activity-feed'
import { Comments } from './comments'
import { AssigneePicker, DuePicker, LabelPicker, PriorityPicker, StatusPicker } from './pickers'

export function TaskDetailSheet({ onManageTeam }: { onManageTeam: () => void }) {
  const { openTaskId, openTask } = useBoardUI()
  const { data: tasks } = useTasks()
  const task = tasks?.find((t) => t.id === openTaskId)

  // If the open task disappears (deleted here or in another tab), close the panel.
  useEffect(() => {
    if (openTaskId && tasks && !task) openTask(null)
  }, [openTaskId, tasks, task, openTask])

  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && openTask(null)}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl" aria-describedby={undefined}>
        {task && <TaskDetail key={task.id} task={task} tasks={tasks!} onManageTeam={onManageTeam} />}
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[92px_1fr] items-center gap-3 sm:grid-cols-[110px_1fr]">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function TaskDetail({ task, tasks, onManageTeam }: { task: Task; tasks: Task[]; onManageTeam: () => void }) {
  const { openTask } = useBoardUI()
  const update = useUpdateTask()
  const setAssignees = useSetTaskRelations('assignees')
  const setLabels = useSetTaskRelations('labels')
  const del = useDeleteTask()
  const { data: members = [] } = useMembers()
  const { data: labels = [] } = useLabels()

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Pick up edits saved elsewhere (e.g. another tab) when the server value changes.
  const [syncedTitle, setSyncedTitle] = useState(task.title)
  if (task.title !== syncedTitle) {
    setSyncedTitle(task.title)
    setTitle(task.title)
  }
  const [syncedDescription, setSyncedDescription] = useState(task.description)
  if (task.description !== syncedDescription) {
    setSyncedDescription(task.description)
    setDescription(task.description ?? '')
  }

  function saveTitle() {
    const next = title.trim()
    if (!next) return setTitle(task.title)
    if (next !== task.title) update.mutate({ id: task.id, patch: { title: next } })
  }

  function saveDescription() {
    const next = description.trim() || null
    if (next !== (task.description ?? null)) update.mutate({ id: task.id, patch: { description: next } })
  }

  function changeStatus(status: TaskStatus) {
    if (status === task.status) return
    const top = tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position)[0]
    update.mutate({ id: task.id, patch: { status, position: positionBetween(undefined, top?.position) } })
  }

  return (
    <div className="flex min-h-full flex-col">
      <SheetHeader className="gap-1 border-b px-5 pt-5 pb-4 sm:px-6">
        <SheetTitle className="sr-only">{task.title}</SheetTitle>
        <SheetDescription className="sr-only">Task details, comments and activity</SheetDescription>
        <Textarea
          value={title}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ''))}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.blur()
            }
            if (e.key === 'Escape') {
              setTitle(task.title)
            }
          }}
          aria-label="Task title"
          maxLength={200}
          rows={1}
          className="min-h-0 resize-none border-0 bg-transparent p-0 pr-8 text-xl font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-xl dark:bg-transparent"
        />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3" />
          <span title={fullTimestamp(task.created_at)}>Created {timeAgo(task.created_at)}</span>
          {task.updated_at !== task.created_at && (
            <>
              <span>·</span>
              <span title={fullTimestamp(task.updated_at)}>updated {timeAgo(task.updated_at)}</span>
            </>
          )}
        </p>
      </SheetHeader>

      <div className="space-y-3 border-b px-5 py-4 sm:px-6">
        <Field label="Status">
          <StatusPicker value={task.status} onChange={changeStatus} />
        </Field>
        <Field label="Priority">
          <PriorityPicker value={task.priority} onChange={(priority) => update.mutate({ id: task.id, patch: { priority } })} />
        </Field>
        <Field label="Due date">
          <DuePicker value={task.due_date} done={task.status === 'done'} onChange={(due_date) => update.mutate({ id: task.id, patch: { due_date } })} />
        </Field>
        <Field label="Assignees">
          <AssigneePicker
            members={members}
            value={task.assignee_ids}
            onChange={(next) => setAssignees.mutate({ task, next })}
            onManageTeam={onManageTeam}
          />
        </Field>
        <Field label="Labels">
          <LabelPicker labels={labels} value={task.label_ids} onChange={(next) => setLabels.mutate({ task, next })} />
        </Field>
      </div>

      <div className="border-b px-5 py-4 sm:px-6">
        <label htmlFor="task-description" className="mb-2 block text-xs font-medium text-muted-foreground">
          Description
        </label>
        <Textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          placeholder="Add more detail…"
          rows={4}
          maxLength={10000}
          className="resize-y text-sm leading-relaxed"
        />
      </div>

      <Tabs defaultValue="comments" className="flex-1 px-5 py-4 sm:px-6">
        <TabsList className="mb-3">
          <TabsTrigger value="comments">Comments{task.comment_count > 0 && ` (${task.comment_count})`}</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="comments">
          <Comments taskId={task.id} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityFeed taskId={task.id} />
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 flex justify-end border-t bg-background/90 px-5 py-3 backdrop-blur sm:px-6">
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2 /> Delete task
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              “{task.title}” and its comments and history will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                openTask(null)
                del.mutate(task.id)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
