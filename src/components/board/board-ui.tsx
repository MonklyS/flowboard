import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { isDueSoon, isOverdue } from '@/lib/dates'
import type { Priority, Task, TaskStatus } from '@/lib/types'

export type DueFilter = 'overdue' | 'soon' | null

export interface Filters {
  query: string
  priorities: Priority[]
  /** Member ids, or "none" for unassigned tasks. */
  assignees: string[]
  labels: string[]
  due: DueFilter
}

export const EMPTY_FILTERS: Filters = { query: '', priorities: [], assignees: [], labels: [], due: null }

export function activeFilterCount(f: Filters) {
  return f.priorities.length + f.assignees.length + f.labels.length + (f.due ? 1 : 0)
}

export function hasAnyFilter(f: Filters) {
  return activeFilterCount(f) > 0 || f.query.trim().length > 0
}

export function filterTasks(tasks: Task[], f: Filters) {
  const q = f.query.trim().toLowerCase()
  return tasks.filter((t) => {
    if (q && !t.title.toLowerCase().includes(q) && !(t.description ?? '').toLowerCase().includes(q)) return false
    if (f.priorities.length && !f.priorities.includes(t.priority)) return false
    if (f.labels.length && !f.labels.some((l) => t.label_ids.includes(l))) return false
    if (f.assignees.length) {
      const wantsNone = f.assignees.includes('none') && t.assignee_ids.length === 0
      if (!wantsNone && !f.assignees.some((a) => t.assignee_ids.includes(a))) return false
    }
    if (f.due === 'overdue' && !isOverdue(t.due_date, t.status === 'done')) return false
    if (f.due === 'soon' && !isDueSoon(t.due_date, t.status === 'done')) return false
    return true
  })
}

interface BoardUI {
  filters: Filters
  setFilters: (updater: (f: Filters) => Filters) => void
  clearFilters: () => void
  openTaskId: string | null
  openTask: (id: string | null) => void
  createFor: TaskStatus | null
  openCreate: (status?: TaskStatus) => void
  closeCreate: () => void
}

const Ctx = createContext<BoardUI | null>(null)

export function BoardUIProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [createFor, setCreateFor] = useState<TaskStatus | null>(null)

  const setFilters = useCallback((u: (f: Filters) => Filters) => setFiltersState(u), [])
  const clearFilters = useCallback(() => setFiltersState(EMPTY_FILTERS), [])
  const openCreate = useCallback((status: TaskStatus = 'todo') => setCreateFor(status), [])
  const closeCreate = useCallback(() => setCreateFor(null), [])

  const value = useMemo(
    () => ({ filters, setFilters, clearFilters, openTaskId, openTask: setOpenTaskId, createFor, openCreate, closeCreate }),
    [filters, setFilters, clearFilters, openTaskId, createFor, openCreate, closeCreate],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useBoardUI() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBoardUI must be used inside <BoardUIProvider>')
  return ctx
}
