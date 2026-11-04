import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUserId } from './auth'
import { keys } from './queries'

/**
 * Subscribes to row changes for the current guest and refreshes the affected
 * queries, so a second tab (or device sharing the session) stays in sync.
 * Supabase Realtime applies the same RLS policies, so only this user's rows
 * are ever delivered. Refreshes are debounced to coalesce bursts, and held
 * back while a drag is in progress so cards never jump under the cursor.
 */
export function useRealtimeSync(isPaused: () => boolean) {
  const uid = useUserId()
  const qc = useQueryClient()

  useEffect(() => {
    const pending = new Set<string>()
    let timer: ReturnType<typeof setTimeout> | undefined

    const flush = () => {
      if (isPaused()) {
        timer = setTimeout(flush, 400)
        return
      }
      for (const key of pending) {
        if (key === 'tasks') void qc.invalidateQueries({ queryKey: keys.tasks(uid) })
        else if (key === 'members') void qc.invalidateQueries({ queryKey: keys.members(uid) })
        else if (key === 'labels') void qc.invalidateQueries({ queryKey: keys.labels(uid) })
        else void qc.invalidateQueries({ queryKey: key.split(':') })
      }
      pending.clear()
      timer = undefined
    }
    const schedule = (key: string) => {
      pending.add(key)
      if (!timer) timer = setTimeout(flush, 250)
    }

    const filter = `user_id=eq.${uid}`
    const channel = supabase
      .channel(`board:${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter }, () => schedule('tasks'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees', filter }, () =>
        schedule('tasks'),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_labels', filter }, () =>
        schedule('tasks'),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter }, () =>
        schedule('members'),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'labels', filter }, () => schedule('labels'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter }, (p) => {
        const row = (p.new && 'task_id' in p.new ? p.new : p.old) as { task_id?: string }
        schedule('tasks')
        if (row?.task_id) schedule(`comments:${row.task_id}`)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_activity', filter }, (p) => {
        const row = p.new as { task_id?: string }
        if (row?.task_id) schedule(`activity:${row.task_id}`)
      })
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [uid, qc, isPaused])
}
