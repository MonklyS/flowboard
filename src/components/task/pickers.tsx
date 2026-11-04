import { format, parseISO } from 'date-fns'
import { CalendarDays, Check, Plus, Tag, UserPlus, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PriorityIcon, StatusIcon } from '@/components/common/icons'
import { MemberAvatar } from '@/components/common/member-avatar'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCreateLabel } from '@/data/queries'
import { PRIORITIES, PRIORITY_BY_ID, STATUS_BY_ID, STATUSES, SWATCHES } from '@/lib/constants'
import { dueInfo, toDateString } from '@/lib/dates'
import type { Label, Priority, TaskStatus, TeamMember } from '@/lib/types'
import { cn } from '@/lib/utils'

const triggerClass =
  'h-8 justify-start gap-2 rounded-md px-2.5 font-normal text-foreground data-[empty=true]:text-muted-foreground'

function Picker({
  trigger,
  children,
  open,
  onOpenChange,
  width = 'w-60',
}: {
  trigger: ReactNode
  children: ReactNode
  open?: boolean
  onOpenChange?: (o: boolean) => void
  width?: string
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className={cn('p-0', width)} align="start">
        {children}
      </PopoverContent>
    </Popover>
  )
}

export function StatusPicker({ value, onChange }: { value: TaskStatus; onChange: (s: TaskStatus) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Picker
      open={open}
      onOpenChange={setOpen}
      width="w-52"
      trigger={
        <Button variant="outline" size="sm" className={triggerClass}>
          <StatusIcon status={value} />
          {STATUS_BY_ID[value].label}
        </Button>
      }
    >
      <Command>
        <CommandList>
          <CommandGroup>
            {STATUSES.map((s) => (
              <CommandItem key={s.id} onSelect={() => { onChange(s.id); setOpen(false) }}>
                <StatusIcon status={s.id} />
                {s.label}
                {value === s.id && <Check className="ml-auto" />}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </Picker>
  )
}

export function PriorityPicker({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Picker
      open={open}
      onOpenChange={setOpen}
      width="w-44"
      trigger={
        <Button variant="outline" size="sm" className={triggerClass}>
          <PriorityIcon priority={value} />
          {PRIORITY_BY_ID[value].label}
        </Button>
      }
    >
      <Command>
        <CommandList>
          <CommandGroup>
            {PRIORITIES.map((p) => (
              <CommandItem key={p.id} onSelect={() => { onChange(p.id); setOpen(false) }}>
                <PriorityIcon priority={p.id} />
                {p.label}
                {value === p.id && <Check className="ml-auto" />}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </Picker>
  )
}

export function DuePicker({
  value,
  onChange,
  done = false,
}: {
  value: string | null
  onChange: (d: string | null) => void
  done?: boolean
}) {
  const [open, setOpen] = useState(false)
  const info = dueInfo(value, done)
  return (
    <div className="flex items-center">
      <Picker
        open={open}
        onOpenChange={setOpen}
        width="w-auto"
        trigger={
          <Button
            variant="outline"
            size="sm"
            data-empty={!value}
            className={cn(
              triggerClass,
              info.urgency === 'overdue' && 'border-destructive/40 text-destructive',
              (info.urgency === 'today' || info.urgency === 'soon') && 'border-[color-mix(in_oklch,var(--status-progress)_45%,transparent)]',
            )}
          >
            <CalendarDays />
            {value ? format(parseISO(value), 'MMM d, yyyy') : 'No due date'}
          </Button>
        }
      >
        <Calendar
          mode="single"
          selected={value ? parseISO(value) : undefined}
          onSelect={(d) => {
            onChange(d ? toDateString(d) : null)
            setOpen(false)
          }}
          autoFocus
        />
        {value && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { onChange(null); setOpen(false) }}>
              <X /> Clear due date
            </Button>
          </div>
        )}
      </Picker>
    </div>
  )
}

function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

export function AssigneePicker({
  members,
  value,
  onChange,
  onManageTeam,
}: {
  members: TeamMember[]
  value: string[]
  onChange: (ids: string[]) => void
  onManageTeam?: () => void
}) {
  const selected = members.filter((m) => value.includes(m.id))
  return (
    <Picker
      width="w-64"
      trigger={
        <Button variant="outline" size="sm" data-empty={selected.length === 0} className={cn(triggerClass, 'max-w-full')}>
          {selected.length === 0 ? (
            <>
              <UserPlus /> Assign
            </>
          ) : (
            <>
              <span className="flex -space-x-1.5">
                {selected.slice(0, 3).map((m) => (
                  <MemberAvatar key={m.id} member={m} size="xs" className="ring-background" />
                ))}
              </span>
              <span className="truncate">
                {selected.length === 1 ? selected[0].name : `${selected.length} people`}
              </span>
            </>
          )}
        </Button>
      }
    >
      <Command>
        <CommandInput placeholder="Assign to…" />
        <CommandList>
          <CommandEmpty>
            {members.length === 0 ? 'Your team is empty.' : 'No one by that name.'}
          </CommandEmpty>
          <CommandGroup>
            {members.map((m) => (
              <CommandItem key={m.id} value={m.name} onSelect={() => onChange(toggle(value, m.id))}>
                <MemberAvatar member={m} size="xs" className="ring-0" />
                <span className="truncate">{m.name}</span>
                {value.includes(m.id) && <Check className="ml-auto" />}
              </CommandItem>
            ))}
          </CommandGroup>
          {onManageTeam && (
            <>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={onManageTeam}>
                  <Plus /> Add team member
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </Picker>
  )
}

export function LabelPicker({
  labels,
  value,
  onChange,
}: {
  labels: Label[]
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const [search, setSearch] = useState('')
  const createLabel = useCreateLabel()
  const selected = labels.filter((l) => value.includes(l.id))
  const trimmed = search.trim()
  const exists = labels.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())

  async function create() {
    const color = SWATCHES[labels.length % SWATCHES.length]
    const label = await createLabel.mutateAsync({ name: trimmed, color }).catch(() => null)
    if (label) {
      onChange([...value, label.id])
      setSearch('')
    }
  }

  return (
    <Picker
      width="w-64"
      trigger={
        <Button variant="outline" size="sm" data-empty={selected.length === 0} className={cn(triggerClass, 'h-auto min-h-8 flex-wrap py-1')}>
          {selected.length === 0 ? (
            <>
              <Tag /> Add labels
            </>
          ) : (
            selected.map((l) => (
              <span key={l.id} className="inline-flex items-center gap-1.5 text-xs">
                <span className="size-2 rounded-full" style={{ background: l.color }} />
                {l.name}
              </span>
            ))
          )}
        </Button>
      }
    >
      <Command>
        <CommandInput placeholder="Search or create…" value={search} onValueChange={setSearch} />
        <CommandList>
          <CommandEmpty className="p-1">
            {trimmed ? null : <p className="py-5 text-center text-sm text-muted-foreground">No labels yet.</p>}
          </CommandEmpty>
          <CommandGroup>
            {labels.map((l) => (
              <CommandItem key={l.id} value={l.name} onSelect={() => onChange(toggle(value, l.id))}>
                <span className="size-2.5 rounded-full" style={{ background: l.color }} />
                <span className="truncate">{l.name}</span>
                {value.includes(l.id) && <Check className="ml-auto" />}
              </CommandItem>
            ))}
          </CommandGroup>
          {trimmed && !exists && (
            <CommandGroup forceMount>
              <CommandItem forceMount value={`__create__${trimmed}`} onSelect={create} disabled={createLabel.isPending}>
                <Plus /> Create label “{trimmed}”
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </Picker>
  )
}
