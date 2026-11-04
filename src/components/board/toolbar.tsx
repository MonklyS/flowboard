import { CalendarClock, Check, ListFilter, Search, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Kbd, PriorityIcon } from '@/components/common/icons'
import { MemberAvatar } from '@/components/common/member-avatar'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PRIORITIES, PRIORITY_BY_ID } from '@/lib/constants'
import type { Label, Priority, TeamMember } from '@/lib/types'
import { activeFilterCount, hasAnyFilter, useBoardUI, type Filters } from './board-ui'

function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export function Toolbar({ members, labels, shown, total }: { members: TeamMember[]; labels: Label[]; shown: number; total: number }) {
  const { filters, setFilters, clearFilters } = useBoardUI()
  const searchRef = useRef<HTMLInputElement>(null)
  const count = activeFilterCount(filters)

  // "/" focuses search, like Linear and GitHub.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement
      if (e.key === '/' && !t.closest('input, textarea, [contenteditable], [role=dialog]')) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const chips: { key: string; label: React.ReactNode; remove: () => void }[] = [
    ...filters.priorities.map((p) => ({
      key: `p-${p}`,
      label: <><PriorityIcon priority={p} /> {PRIORITY_BY_ID[p].label}</>,
      remove: () => setFilters((f) => ({ ...f, priorities: f.priorities.filter((x) => x !== p) })),
    })),
    ...filters.assignees.map((id) => {
      const m = members.find((x) => x.id === id)
      return {
        key: `a-${id}`,
        label: m ? <><MemberAvatar member={m} size="xs" className="size-4 ring-0" /> {m.name}</> : 'Unassigned',
        remove: () => setFilters((f) => ({ ...f, assignees: f.assignees.filter((x) => x !== id) })),
      }
    }),
    ...filters.labels.map((id) => {
      const l = labels.find((x) => x.id === id)
      return {
        key: `l-${id}`,
        label: <><span className="size-2 rounded-full" style={{ background: l?.color }} /> {l?.name ?? 'Label'}</>,
        remove: () => setFilters((f) => ({ ...f, labels: f.labels.filter((x) => x !== id) })),
      }
    }),
    ...(filters.due
      ? [{
          key: 'due',
          label: <><CalendarClock className="size-3" /> {filters.due === 'overdue' ? 'Overdue' : 'Due soon'}</>,
          remove: () => setFilters((f) => ({ ...f, due: null })),
        }]
      : []),
  ]

  return (
    <div className="flex flex-col gap-2 px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setFilters((f) => ({ ...f, query: '' }))
                e.currentTarget.blur()
              }
            }}
            placeholder="Search tasks"
            aria-label="Search tasks"
            className="h-8 bg-background pr-8 pl-8 text-sm"
          />
          {filters.query ? (
            <button
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => setFilters((f) => ({ ...f, query: '' }))}
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <Kbd className="absolute top-1/2 right-2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>
          )}
        </div>

        <FilterMenu filters={filters} setFilters={setFilters} members={members} labels={labels} count={count} />

        {hasAnyFilter(filters) && (
          <span className="hidden text-xs whitespace-nowrap text-muted-foreground md:inline">
            Showing {shown} of {total}
          </span>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <span key={c.key} className="inline-flex h-6 items-center gap-1.5 rounded-full border bg-card pr-1 pl-2 text-xs shadow-card">
              {c.label}
              <button onClick={c.remove} className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Remove filter">
                <X className="size-3" />
              </button>
            </span>
          ))}
          <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}

function FilterMenu({
  filters,
  setFilters,
  members,
  labels,
  count,
}: {
  filters: Filters
  setFilters: (u: (f: Filters) => Filters) => void
  members: TeamMember[]
  labels: Label[]
  count: number
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 bg-background">
          <ListFilter /> Filter
          {count > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground tabular-nums">{count}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Filter by…" />
          <CommandList className="max-h-80">
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup heading="Due">
              {(['overdue', 'soon'] as const).map((d) => (
                <CommandItem key={d} value={`due ${d}`} onSelect={() => setFilters((f) => ({ ...f, due: f.due === d ? null : d }))}>
                  <CalendarClock className={d === 'overdue' ? 'text-destructive' : 'text-[var(--status-progress)]'} />
                  {d === 'overdue' ? 'Overdue' : 'Due within 2 days'}
                  {filters.due === d && <Check className="ml-auto" />}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Priority">
              {PRIORITIES.map((p) => (
                <CommandItem key={p.id} value={`priority ${p.label}`} onSelect={() => setFilters((f) => ({ ...f, priorities: toggle<Priority>(f.priorities, p.id) }))}>
                  <PriorityIcon priority={p.id} />
                  {p.label}
                  {filters.priorities.includes(p.id) && <Check className="ml-auto" />}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Assignee">
              <CommandItem value="assignee unassigned" onSelect={() => setFilters((f) => ({ ...f, assignees: toggle(f.assignees, 'none') }))}>
                <span className="size-5 rounded-full border border-dashed" />
                Unassigned
                {filters.assignees.includes('none') && <Check className="ml-auto" />}
              </CommandItem>
              {members.map((m) => (
                <CommandItem key={m.id} value={`assignee ${m.name}`} onSelect={() => setFilters((f) => ({ ...f, assignees: toggle(f.assignees, m.id) }))}>
                  <MemberAvatar member={m} size="xs" className="ring-0" />
                  <span className="truncate">{m.name}</span>
                  {filters.assignees.includes(m.id) && <Check className="ml-auto" />}
                </CommandItem>
              ))}
            </CommandGroup>
            {labels.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Label">
                  {labels.map((l) => (
                    <CommandItem key={l.id} value={`label ${l.name}`} onSelect={() => setFilters((f) => ({ ...f, labels: toggle(f.labels, l.id) }))}>
                      <span className="size-2.5 rounded-full" style={{ background: l.color }} />
                      <span className="truncate">{l.name}</span>
                      {filters.labels.includes(l.id) && <Check className="ml-auto" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
