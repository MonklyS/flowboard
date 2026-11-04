import { addDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { toDateString } from '@/lib/dates'
import type { Priority, TaskStatus } from '@/lib/types'

interface SampleTask {
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  /** Due date as days from today (negative = overdue). */
  due?: number
  who: string[]
  tags: string[]
}

const MEMBERS = [
  { name: 'Ava Chen', color: '#6366f1' },
  { name: 'Marcus Reed', color: '#f97316' },
  { name: 'Priya Nair', color: '#14b8a6' },
  { name: 'Leo Martins', color: '#ec4899' },
]

const LABELS = [
  { name: 'Bug', color: '#ef4444' },
  { name: 'Feature', color: '#6366f1' },
  { name: 'Design', color: '#ec4899' },
  { name: 'Research', color: '#0ea5e9' },
  { name: 'Infra', color: '#64748b' },
]

const TASKS: SampleTask[] = [
  {
    title: 'Audit onboarding funnel drop-off',
    description: 'Pull the last 30 days of signup events and find where people abandon the flow.',
    status: 'todo', priority: 'high', due: 3, who: ['Priya'], tags: ['Research'],
  },
  { title: 'Dark mode for email templates', status: 'todo', priority: 'low', due: 12, who: ['Leo'], tags: ['Design'] },
  {
    title: 'Rate-limit the public search endpoint',
    description: 'Token bucket per IP, 60 requests/minute. Return 429 with a Retry-After header.',
    status: 'todo', priority: 'normal', due: 6, who: ['Marcus'], tags: ['Infra'],
  },
  { title: 'Write release notes for v2.4', status: 'todo', priority: 'normal', who: [], tags: [] },
  {
    title: 'Fix avatar upload failing on Safari',
    description: 'HEIC images are rejected client-side; convert them or accept them.',
    status: 'in_progress', priority: 'high', due: -1, who: ['Ava'], tags: ['Bug'],
  },
  {
    title: 'Redesign settings page',
    description: 'Group settings into sections, add search, and match the new sidebar.',
    status: 'in_progress', priority: 'normal', due: 1, who: ['Leo', 'Ava'], tags: ['Design', 'Feature'],
  },
  { title: 'Migrate background jobs to queues', status: 'in_progress', priority: 'normal', due: 9, who: ['Marcus'], tags: ['Infra'] },
  {
    title: 'Keyboard shortcuts for the board',
    description: 'C to create, / to search, Esc to close panels.',
    status: 'in_review', priority: 'normal', due: 0, who: ['Ava'], tags: ['Feature'],
  },
  { title: 'Interview 5 power users about reporting', status: 'in_review', priority: 'low', due: 2, who: ['Priya', 'Leo'], tags: ['Research'] },
  { title: 'Set up error monitoring alerts', status: 'done', priority: 'high', due: -4, who: ['Marcus'], tags: ['Infra'] },
  { title: 'Ship drag-and-drop reordering', status: 'done', priority: 'normal', due: -2, who: ['Ava', 'Marcus'], tags: ['Feature'] },
  { title: 'Fix timezone bug in due dates', status: 'done', priority: 'normal', who: ['Priya'], tags: ['Bug'] },
]

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

/**
 * Seeds a realistic demo board for the current guest: a small team, a few
 * labels and a dozen tasks spread across columns with varied due dates.
 * Reuses existing members/labels with the same name instead of duplicating.
 */
export async function seedSampleBoard() {
  const existingMembers = check(await supabase.from('team_members').select('id, name'))
  const missingMembers = MEMBERS.filter((m) => !existingMembers.some((e) => e.name === m.name))
  if (missingMembers.length) check(await supabase.from('team_members').insert(missingMembers))
  const members = check(await supabase.from('team_members').select('id, name'))

  const existingLabels = check(await supabase.from('labels').select('id, name'))
  const missingLabels = LABELS.filter(
    (l) => !existingLabels.some((e) => e.name.toLowerCase() === l.name.toLowerCase()),
  )
  if (missingLabels.length) check(await supabase.from('labels').insert(missingLabels))
  const labels = check(await supabase.from('labels').select('id, name'))

  const memberId = (first: string) => members.find((m) => m.name.startsWith(first))!.id as string
  const labelId = (name: string) =>
    labels.find((l) => l.name.toLowerCase() === name.toLowerCase())!.id as string

  const today = new Date()
  const inserted = check(
    await supabase
      .from('tasks')
      .insert(
        TASKS.map((t, i) => ({
          title: t.title,
          description: t.description ?? null,
          status: t.status,
          priority: t.priority,
          due_date: t.due === undefined ? null : toDateString(addDays(today, t.due)),
          position: (i + 1) * 1024,
        })),
      )
      .select('id, title'),
  )
  const idOf = new Map(inserted.map((r) => [r.title as string, r.id as string]))

  const assigneeRows = TASKS.flatMap((t) =>
    t.who.map((w) => ({ task_id: idOf.get(t.title)!, member_id: memberId(w) })),
  )
  const labelRows = TASKS.flatMap((t) => t.tags.map((g) => ({ task_id: idOf.get(t.title)!, label_id: labelId(g) })))
  check(await supabase.from('task_assignees').insert(assigneeRows))
  check(await supabase.from('task_labels').insert(labelRows))

  const safariBug = idOf.get('Fix avatar upload failing on Safari')!
  check(
    await supabase.from('comments').insert([
      { task_id: safariBug, body: 'Reproduced on Safari 18 with an iPhone photo. The MIME check only allows jpeg/png.' },
      { task_id: safariBug, body: 'Plan: convert HEIC to JPEG in the browser before upload so the backend stays unchanged.' },
    ]),
  )
}
