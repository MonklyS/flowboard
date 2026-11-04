import { Check, Loader2, Plus, Tag, Trash2, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { EmptyState } from '@/components/common/states'
import { MemberAvatar } from '@/components/common/member-avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useCreateLabel,
  useCreateMember,
  useDeleteLabel,
  useDeleteMember,
  useLabels,
  useMembers,
  useTasks,
} from '@/data/queries'
import { SWATCHES } from '@/lib/constants'
import { cn } from '@/lib/utils'

export type ManageTab = 'team' | 'labels'

export function ManageDialog({ tab, onClose }: { tab: ManageTab | null; onClose: () => void }) {
  const [current, setCurrent] = useState<ManageTab>('team')
  const open = tab !== null
  // Jump to the requested tab each time the dialog is (re)opened.
  const [lastTab, setLastTab] = useState(tab)
  if (tab !== lastTab) {
    setLastTab(tab)
    if (tab) setCurrent(tab)
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Workspace</DialogTitle>
          <DialogDescription>Manage the people and labels you can attach to tasks.</DialogDescription>
        </DialogHeader>
        <Tabs value={current} onValueChange={(v) => setCurrent(v as ManageTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="team"><Users /> Team</TabsTrigger>
            <TabsTrigger value="labels"><Tag /> Labels</TabsTrigger>
          </TabsList>
          <TabsContent value="team" className="pt-2"><TeamPanel /></TabsContent>
          <TabsContent value="labels" className="pt-2"><LabelsPanel /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function SwatchPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Color">
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn(
            'flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            value === c && 'ring-2 ring-foreground/60',
          )}
          style={{ background: c }}
        >
          {value === c && <Check className="size-3.5 text-white" />}
        </button>
      ))}
    </div>
  )
}

function TeamPanel() {
  const { data: members = [], isPending } = useMembers()
  const { data: tasks = [] } = useTasks()
  const create = useCreateMember()
  const remove = useDeleteMember()
  const [name, setName] = useState('')
  const [color, setColor] = useState(SWATCHES[0])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await create.mutateAsync({ name, color }).catch(() => null)
    setName('')
    setColor(SWATCHES[(members.length + 1) % SWATCHES.length])
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3 rounded-lg border bg-muted/30 p-3">
        <div className="flex gap-2">
          <MemberAvatar member={{ name: name || '?', color, avatar_url: null }} size="md" className="ring-0" />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Jordan Lee" maxLength={60} aria-label="Member name" />
          <Button type="submit" disabled={!name.trim() || create.isPending}>
            {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />} Add
          </Button>
        </div>
        <SwatchPicker value={color} onChange={setColor} />
      </form>

      {isPending ? null : members.length === 0 ? (
        <EmptyState icon={<Users className="size-5" />} title="No teammates yet" description="Add people so you can assign them to tasks." className="py-6" />
      ) : (
        <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border">
          {members.map((m) => {
            const count = tasks.filter((t) => t.assignee_ids.includes(m.id)).length
            return (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2">
                <MemberAvatar member={m} size="sm" className="ring-0" />
                <span className="flex-1 truncate text-sm">{m.name}</span>
                <span className="text-xs text-muted-foreground">{count} {count === 1 ? 'task' : 'tasks'}</span>
                <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-destructive" aria-label={`Remove ${m.name}`} onClick={() => remove.mutate(m.id)}>
                  <Trash2 />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function LabelsPanel() {
  const { data: labels = [], isPending } = useLabels()
  const { data: tasks = [] } = useTasks()
  const create = useCreateLabel()
  const remove = useDeleteLabel()
  const [name, setName] = useState('')
  const [color, setColor] = useState(SWATCHES[4])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const ok = await create.mutateAsync({ name, color }).catch(() => null)
    if (ok) setName('')
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3 rounded-lg border bg-muted/30 p-3">
        <div className="flex gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
            <span className="size-3 rounded-full" style={{ background: color }} />
          </span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Label, e.g. Bug" maxLength={40} aria-label="Label name" />
          <Button type="submit" disabled={!name.trim() || create.isPending}>
            {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />} Add
          </Button>
        </div>
        <SwatchPicker value={color} onChange={setColor} />
      </form>

      {isPending ? null : labels.length === 0 ? (
        <EmptyState icon={<Tag className="size-5" />} title="No labels yet" description="Labels like Bug, Feature or Design help you group and filter work." className="py-6" />
      ) : (
        <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border">
          {labels.map((l) => {
            const count = tasks.filter((t) => t.label_ids.includes(l.id)).length
            return (
              <li key={l.id} className="flex items-center gap-3 px-3 py-2">
                <span className="size-2.5 rounded-full" style={{ background: l.color }} />
                <span className="flex-1 truncate text-sm">{l.name}</span>
                <span className="text-xs text-muted-foreground">{count} {count === 1 ? 'task' : 'tasks'}</span>
                <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${l.name}`} onClick={() => remove.mutate(l.id)}>
                  <Trash2 />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
