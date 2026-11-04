import { differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO } from 'date-fns'

export type DueUrgency = 'overdue' | 'today' | 'soon' | 'later' | 'none'

export interface DueInfo {
  urgency: DueUrgency
  label: string
  title: string
}

/** Days ahead that still count as "due soon". */
export const DUE_SOON_DAYS = 2

export function dueInfo(due: string | null, done = false, now = new Date()): DueInfo {
  if (!due) return { urgency: 'none', label: '', title: '' }
  const date = parseISO(due)
  const days = differenceInCalendarDays(date, now)
  const full = format(date, 'EEEE, MMM d, yyyy')
  if (done) return { urgency: 'later', label: format(date, 'MMM d'), title: `Due ${full}` }
  if (days < 0) {
    const n = Math.abs(days)
    return { urgency: 'overdue', label: n === 1 ? 'Yesterday' : `${n}d overdue`, title: `Overdue · was due ${full}` }
  }
  if (days === 0) return { urgency: 'today', label: 'Today', title: `Due today · ${full}` }
  if (days === 1) return { urgency: 'soon', label: 'Tomorrow', title: `Due tomorrow · ${full}` }
  if (days <= DUE_SOON_DAYS) return { urgency: 'soon', label: format(date, 'EEE'), title: `Due soon · ${full}` }
  return { urgency: 'later', label: format(date, 'MMM d'), title: `Due ${full}` }
}

export function isOverdue(due: string | null, done: boolean) {
  return dueInfo(due, done).urgency === 'overdue'
}

export function isDueSoon(due: string | null, done: boolean) {
  const u = dueInfo(due, done).urgency
  return u === 'today' || u === 'soon'
}

export function timeAgo(iso: string) {
  const d = parseISO(iso)
  if (Date.now() - d.getTime() < 45_000) return 'just now'
  return `${formatDistanceToNowStrict(d)} ago`
}

export function fullTimestamp(iso: string) {
  return format(parseISO(iso), "MMM d, yyyy 'at' h:mm a")
}

/** Date → 'yyyy-MM-dd' in local time (Postgres `date`). */
export function toDateString(d: Date) {
  return format(d, 'yyyy-MM-dd')
}
