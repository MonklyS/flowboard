import { Loader2 } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { useBoardUI } from '@/components/board/board-ui'
import { Kbd } from '@/components/common/icons'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useCreateTask, useLabels, useMembers } from '@/data/queries'
import type { TaskDraft, TaskStatus } from '@/lib/types'
import { AssigneePicker, DuePicker, LabelPicker, PriorityPicker, StatusPicker } from './pickers'

const blank = (status: TaskStatus): TaskDraft => ({
  title: '',
  description: '',
  status,
  priority: 'normal',
  due_date: null,
  assignee_ids: [],
  label_ids: [],
})

export function CreateTaskDialog({ onManageTeam }: { onManageTeam: () => void }) {
  const { createFor, closeCreate } = useBoardUI()
  const open = createFor !== null
  const [draft, setDraft] = useState<TaskDraft>(blank('todo'))
  const [touched, setTouched] = useState(false)
  const [createMore, setCreateMore] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const create = useCreateTask()
  const { data: members = [] } = useMembers()
  const { data: labels = [] } = useLabels()

  // Start from a clean draft for the requested column every time the dialog opens.
  const [lastFor, setLastFor] = useState(createFor)
  if (createFor !== lastFor) {
    setLastFor(createFor)
    if (createFor) {
      setDraft(blank(createFor))
      setTouched(false)
    }
  }

  const titleError = touched && draft.title.trim().length === 0 ? 'Give the task a title.' : null
  const set = <K extends keyof TaskDraft>(k: K, v: TaskDraft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    setTouched(true)
    if (!draft.title.trim()) {
      titleRef.current?.focus()
      return
    }
    try {
      await create.mutateAsync(draft)
    } catch {
      return // toast already shown; keep the dialog open with the user's input
    }
    if (createMore) {
      setDraft({ ...blank(draft.status), priority: draft.priority, label_ids: draft.label_ids })
      setTouched(false)
      titleRef.current?.focus()
    } else {
      closeCreate()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeCreate()}>
      <DialogContent className="gap-0 p-0 sm:max-w-xl" onOpenAutoFocus={(e) => { e.preventDefault(); titleRef.current?.focus() }}>
        <form onSubmit={submit} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit() }}>
          <DialogHeader className="px-5 pt-5">
            <DialogTitle className="text-base">New task</DialogTitle>
            <DialogDescription className="sr-only">Create a task on your board.</DialogDescription>
          </DialogHeader>

          <div className="space-y-1 px-5 pt-3">
            <Textarea
              ref={titleRef}
              value={draft.title}
              onChange={(e) => set('title', e.target.value.replace(/\n/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); void submit() } }}
              onBlur={() => draft.title && setTouched(true)}
              placeholder="Task title"
              aria-label="Title"
              aria-invalid={!!titleError}
              maxLength={200}
              rows={1}
              className="min-h-0 resize-none border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
            {titleError && <p className="text-xs text-destructive">{titleError}</p>}
            <Textarea
              value={draft.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Add a description…"
              aria-label="Description"
              rows={3}
              className="resize-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-2 px-5 pt-2 pb-4">
            <StatusPicker value={draft.status} onChange={(v) => set('status', v)} />
            <PriorityPicker value={draft.priority} onChange={(v) => set('priority', v)} />
            <DuePicker value={draft.due_date} onChange={(v) => set('due_date', v)} />
            <AssigneePicker members={members} value={draft.assignee_ids} onChange={(v) => set('assignee_ids', v)} onManageTeam={onManageTeam} />
            <LabelPicker labels={labels} value={draft.label_ids} onChange={(v) => set('label_ids', v)} />
          </div>

          <DialogFooter className="flex-row items-center border-t bg-muted/40 px-5 py-3 sm:justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
              <input type="checkbox" checked={createMore} onChange={(e) => setCreateMore(e.target.checked)} className="accent-primary" />
              Create more
            </label>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                <Kbd>Ctrl</Kbd><Kbd>↵</Kbd>
              </span>
              <Button type="submit" size="sm" disabled={create.isPending}>
                {create.isPending && <Loader2 className="animate-spin" />}
                Create task
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
