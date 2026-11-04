import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Loader2, Menu, Plus, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Board } from '@/components/board/board'
import { BoardSkeleton } from '@/components/board/board-skeleton'
import { filterTasks, hasAnyFilter, useBoardUI } from '@/components/board/board-ui'
import { StatsBar } from '@/components/board/stats'
import { Toolbar } from '@/components/board/toolbar'
import { Kbd } from '@/components/common/icons'
import { ErrorState } from '@/components/common/states'
import { CreateTaskDialog } from '@/components/task/create-task-dialog'
import { TaskDetailSheet } from '@/components/task/task-detail-sheet'
import { ManageDialog, type ManageTab } from '@/components/team/manage-dialog'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useLabels, useMembers, useTasks } from '@/data/queries'
import { useRealtimeSync } from '@/data/realtime'
import { seedSampleBoard } from '@/data/sample-data'
import { Sidebar } from './sidebar'

export function Workspace() {
  const tasksQ = useTasks()
  const membersQ = useMembers()
  const labelsQ = useLabels()
  const qc = useQueryClient()
  const { filters, openCreate, createFor, openTaskId } = useBoardUI()

  const draggingRef = useRef(false)
  const isPaused = useCallback(() => draggingRef.current, [])
  useRealtimeSync(isPaused)

  const [manageTab, setManageTab] = useState<ManageTab | null>(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const allTasks = useMemo(() => tasksQ.data ?? [], [tasksQ.data])
  const visible = useMemo(() => filterTasks(allTasks, filters), [allTasks, filters])
  const filtered = hasAnyFilter(filters)

  // "C" opens the create dialog (when not typing and nothing else is open).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (t.closest('input, textarea, [contenteditable], [role=dialog], [role=menu]')) return
      if ((e.key === 'c' || e.key === 'C') && !createFor && !openTaskId && !manageTab) {
        e.preventDefault()
        openCreate('todo')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openCreate, createFor, openTaskId, manageTab])

  async function seed() {
    setSeeding(true)
    setMobileNav(false)
    try {
      await seedSampleBoard()
      toast.success('Sample board loaded', { description: 'Drag the cards around, open one to comment, or try the filters.' })
    } catch (err) {
      toast.error('Could not load sample data', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setSeeding(false)
      void qc.invalidateQueries()
    }
  }

  const openManage = (tab: ManageTab) => {
    setMobileNav(false)
    setManageTab(tab)
  }

  const loadError = tasksQ.error ?? membersQ.error ?? labelsQ.error
  const loading = tasksQ.isPending || membersQ.isPending || labelsQ.isPending

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-60 shrink-0 border-r bg-surface lg:block">
        <Sidebar onManage={openManage} onSeed={seed} seeding={seeding} />
      </aside>

      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-72 bg-surface p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Team, labels and settings</SheetDescription>
          <Sidebar onManage={openManage} onSeed={seed} seeding={seeding} onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>

      <main className="board-backdrop flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 px-4 pt-4 pb-3 sm:px-6 sm:pt-5">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation">
            <Menu />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Board</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">Drag cards between columns to update their status.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" onClick={() => openCreate('todo')} className="shadow-sm">
              <Plus /> <span className="hidden sm:inline">New task</span><span className="sm:hidden">New</span>
              <Kbd className="ml-1 hidden border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground sm:inline-flex">C</Kbd>
            </Button>
          </div>
        </header>

        {loadError ? (
          <ErrorState
            className="flex-1"
            title="We couldn't load your board"
            message={loadError.message}
            onRetry={() => {
              void tasksQ.refetch()
              void membersQ.refetch()
              void labelsQ.refetch()
            }}
          />
        ) : loading ? (
          <>
            <div className="flex gap-2.5 px-4 pb-3 sm:px-6">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-[58px] min-w-[140px] flex-1 animate-pulse rounded-xl border bg-card/60" />)}
            </div>
            <div className="min-h-0 flex-1 pt-3"><BoardSkeleton /></div>
          </>
        ) : (
          <>
            <StatsBar tasks={allTasks} />
            <div className="pt-3 pb-3">
              <Toolbar members={membersQ.data!} labels={labelsQ.data!} shown={visible.length} total={allTasks.length} />
            </div>

            {allTasks.length === 0 && <WelcomeBanner onCreate={() => openCreate('todo')} onSeed={seed} seeding={seeding} />}

            <div className="min-h-0 flex-1">
              <Board
                allTasks={allTasks}
                visibleTasks={visible}
                filtered={filtered}
                members={membersQ.data!}
                labels={labelsQ.data!}
                draggingRef={draggingRef}
              />
            </div>
          </>
        )}
      </main>

      <CreateTaskDialog onManageTeam={() => openManage('team')} />
      <TaskDetailSheet onManageTeam={() => openManage('team')} />
      <ManageDialog tab={manageTab} onClose={() => setManageTab(null)} />
    </div>
  )
}

function WelcomeBanner({ onCreate, onSeed, seeding }: { onCreate: () => void; onSeed: () => void; seeding: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-3 overflow-hidden rounded-xl border bg-card shadow-card sm:mx-6"
    >
      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: 'radial-gradient(600px 160px at 0% 0%, color-mix(in oklch, var(--primary) 16%, transparent), transparent)' }}
        />
        <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <Sparkles className="size-5" />
        </div>
        <div className="relative min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Your board is ready</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            You're signed in as a private guest, so only you can see these tasks. Create your first task, or load a sample board to explore.
          </p>
        </div>
        <div className="relative flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={onSeed} disabled={seeding}>
            {seeding ? <Loader2 className="animate-spin" /> : <Sparkles />} Sample board
          </Button>
          <Button size="sm" onClick={onCreate}>
            <Plus /> Create task
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
