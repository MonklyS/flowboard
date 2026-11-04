import {
  Copy,
  KanbanSquare,
  Loader2,
  Monitor,
  Moon,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Sun,
  UserRound,
} from 'lucide-react'
import { useTheme } from '@/components/theme'
import { toast } from 'sonner'
import { useBoardUI } from '@/components/board/board-ui'
import { Logo } from '@/components/common/icons'
import { MemberAvatar } from '@/components/common/member-avatar'
import type { ManageTab } from '@/components/team/manage-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth, useUserId } from '@/data/auth'
import { useLabels, useMembers, useTasks } from '@/data/queries'
import { cn } from '@/lib/utils'

function SectionHeader({ title, onAdd, addLabel }: { title: string; onAdd: () => void; addLabel: string }) {
  return (
    <div className="flex items-center justify-between px-2 pb-1">
      <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</span>
      <Button variant="ghost" size="icon-xs" className="text-muted-foreground" onClick={onAdd} aria-label={addLabel}>
        <Plus />
      </Button>
    </div>
  )
}

export function Sidebar({
  onManage,
  onSeed,
  seeding,
  onNavigate,
}: {
  onManage: (tab: ManageTab) => void
  onSeed: () => void
  seeding: boolean
  onNavigate?: () => void
}) {
  const { filters, setFilters } = useBoardUI()
  const { data: members, isPending: mLoading } = useMembers()
  const { data: labels, isPending: lLoading } = useLabels()
  const { data: tasks = [] } = useTasks()

  const toggleAssignee = (id: string) => {
    setFilters((f) => ({ ...f, assignees: f.assignees.includes(id) ? f.assignees.filter((x) => x !== id) : [...f.assignees, id] }))
    onNavigate?.()
  }
  const toggleLabel = (id: string) => {
    setFilters((f) => ({ ...f, labels: f.labels.includes(id) ? f.labels.filter((x) => x !== id) : [...f.labels, id] }))
    onNavigate?.()
  }

  return (
    <div className="flex h-full flex-col gap-5 p-3">
      <div className="flex items-center gap-2.5 px-2 pt-1">
        <Logo />
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Flowboard</p>
          <p className="text-[11px] text-muted-foreground">Guest workspace</p>
        </div>
      </div>

      <nav>
        <a href="#" aria-current="page" className="flex h-8 items-center gap-2 rounded-md bg-accent px-2 text-sm font-medium text-accent-foreground">
          <KanbanSquare className="size-4" /> Board
          <span className="ml-auto font-mono text-[11px] text-muted-foreground tabular-nums">{tasks.length}</span>
        </a>
      </nav>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto scrollbar-thin">
        <section>
          <SectionHeader title="Team" onAdd={() => onManage('team')} addLabel="Add team member" />
          {mLoading ? (
            <div className="space-y-2 px-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : members!.length === 0 ? (
            <button onClick={() => onManage('team')} className="mx-2 w-[calc(100%-1rem)] rounded-md border border-dashed px-3 py-2.5 text-left text-xs text-muted-foreground hover:border-foreground/20 hover:text-foreground">
              Add teammates to assign work
            </button>
          ) : (
            <ul className="space-y-px">
              {members!.map((m) => {
                const active = filters.assignees.includes(m.id)
                const count = tasks.filter((t) => t.assignee_ids.includes(m.id) && t.status !== 'done').length
                return (
                  <li key={m.id}>
                    <button
                      onClick={() => toggleAssignee(m.id)}
                      aria-pressed={active}
                      className={cn('flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm hover:bg-accent/70', active && 'bg-accent text-accent-foreground')}
                      title={`Filter by ${m.name}`}
                    >
                      <MemberAvatar member={m} size="xs" className="ring-0" />
                      <span className="truncate">{m.name}</span>
                      <span className="ml-auto font-mono text-[11px] text-muted-foreground tabular-nums">{count || ''}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section>
          <SectionHeader title="Labels" onAdd={() => onManage('labels')} addLabel="Create label" />
          {lLoading ? (
            <div className="space-y-2 px-2">{[0, 1].map((i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : labels!.length === 0 ? (
            <button onClick={() => onManage('labels')} className="mx-2 w-[calc(100%-1rem)] rounded-md border border-dashed px-3 py-2.5 text-left text-xs text-muted-foreground hover:border-foreground/20 hover:text-foreground">
              Create labels like Bug or Feature
            </button>
          ) : (
            <ul className="space-y-px">
              {labels!.map((l) => {
                const active = filters.labels.includes(l.id)
                const count = tasks.filter((t) => t.label_ids.includes(l.id)).length
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => toggleLabel(l.id)}
                      aria-pressed={active}
                      className={cn('flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm hover:bg-accent/70', active && 'bg-accent text-accent-foreground')}
                      title={`Filter by ${l.name}`}
                    >
                      <span className="ml-1 size-2 rounded-full" style={{ background: l.color }} />
                      <span className="truncate">{l.name}</span>
                      <span className="ml-auto font-mono text-[11px] text-muted-foreground tabular-nums">{count || ''}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-1 border-t pt-3">
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={onSeed} disabled={seeding}>
          {seeding ? <Loader2 className="animate-spin" /> : <Sparkles />} Load sample data
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => onManage('team')}>
          <Settings2 /> Manage workspace
        </Button>
        <AccountRow />
      </div>
    </div>
  )
}

function AccountRow() {
  const uid = useUserId()
  const { startNewGuest } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
      <span className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UserRound className="size-4" />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-sm font-medium">Guest</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">{uid.slice(0, 8)}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Account and appearance">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-60">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Appearance</DropdownMenuLabel>
          {([['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['system', Monitor, 'System']] as const).map(([v, Icon, label]) => (
            <DropdownMenuItem key={v} onSelect={() => setTheme(v)}>
              <Icon /> {label}
              {theme === v && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              void navigator.clipboard.writeText(uid)
              toast.success('Guest ID copied')
            }}
          >
            <Copy /> Copy guest ID
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              void startNewGuest()
              toast('Started a fresh guest session', { description: 'Your previous board stays with the old guest.' })
            }}
          >
            <RotateCcw /> Start as a new guest
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
