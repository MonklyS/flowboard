import type { Priority, TaskStatus } from './types'

export interface StatusMeta {
  id: TaskStatus
  label: string
  /** CSS color token, e.g. var(--status-todo) */
  color: string
  hint: string
}

export const STATUSES: StatusMeta[] = [
  { id: 'todo', label: 'To Do', color: 'var(--status-todo)', hint: 'Ideas and queued work' },
  { id: 'in_progress', label: 'In Progress', color: 'var(--status-progress)', hint: 'Actively being worked on' },
  { id: 'in_review', label: 'In Review', color: 'var(--status-review)', hint: 'Waiting on feedback' },
  { id: 'done', label: 'Done', color: 'var(--status-done)', hint: 'Shipped and wrapped up' },
]

export const STATUS_BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s])) as Record<
  TaskStatus,
  StatusMeta
>

export interface PriorityMeta {
  id: Priority
  label: string
  color: string
  rank: number
}

export const PRIORITIES: PriorityMeta[] = [
  { id: 'high', label: 'High', color: 'var(--priority-high)', rank: 3 },
  { id: 'normal', label: 'Normal', color: 'var(--priority-normal)', rank: 2 },
  { id: 'low', label: 'Low', color: 'var(--priority-low)', rank: 1 },
]

export const PRIORITY_BY_ID = Object.fromEntries(PRIORITIES.map((p) => [p.id, p])) as Record<
  Priority,
  PriorityMeta
>

/** Swatches offered for team members and labels. Chosen to read on light and dark. */
export const SWATCHES = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#0ea5e9', // sky
  '#64748b', // slate
]
