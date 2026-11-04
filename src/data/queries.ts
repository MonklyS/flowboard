import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type {
  Activity,
  Comment,
  Label,
  Priority,
  Task,
  TaskDraft,
  TaskStatus,
  TeamMember,
} from '@/lib/types'
import { positionBetween } from '@/lib/position'
import { useUserId } from './auth'

// -----------------------------------------------------------------------------
// Query keys
// -----------------------------------------------------------------------------

export const keys = {
  tasks: (uid: string) => ['tasks', uid] as const,
  members: (uid: string) => ['members', uid] as const,
  labels: (uid: string) => ['labels', uid] as const,
  comments: (taskId: string) => ['comments', taskId] as const,
  activity: (taskId: string) => ['activity', taskId] as const,
}

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message)
}

// -----------------------------------------------------------------------------
// Reads
// -----------------------------------------------------------------------------

interface TaskRow extends Omit<Task, 'assignee_ids' | 'label_ids' | 'comment_count'> {
  task_assignees: { member_id: string }[]
  task_labels: { label_id: string }[]
  comments: { count: number }[]
}

const TASK_SELECT =
  'id, user_id, title, description, status, priority, due_date, position, created_at, updated_at, task_assignees(member_id), task_labels(label_id), comments(count)'

function mapTask(row: TaskRow): Task {
  const { task_assignees, task_labels, comments, ...rest } = row
  return {
    ...rest,
    assignee_ids: task_assignees.map((a) => a.member_id),
    label_ids: task_labels.map((l) => l.label_id),
    comment_count: comments[0]?.count ?? 0,
  }
}

export function useTasks() {
  const uid = useUserId()
  return useQuery({
    queryKey: keys.tasks(uid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_SELECT)
        .order('position', { ascending: true })
      fail(error)
      return (data as unknown as TaskRow[]).map(mapTask)
    },
  })
}

export function useMembers() {
  const uid = useUserId()
  return useQuery({
    queryKey: keys.members(uid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, color, avatar_url, created_at')
        .order('created_at')
      fail(error)
      return data as TeamMember[]
    },
  })
}

export function useLabels() {
  const uid = useUserId()
  return useQuery({
    queryKey: keys.labels(uid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labels')
        .select('id, name, color, created_at')
        .order('name')
      fail(error)
      return data as Label[]
    },
  })
}

export function useComments(taskId: string) {
  return useQuery({
    queryKey: keys.comments(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('id, task_id, body, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      fail(error)
      return data as Comment[]
    },
  })
}

export function useActivity(taskId: string) {
  return useQuery({
    queryKey: keys.activity(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_activity')
        .select('id, task_id, type, payload, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      fail(error)
      return data as Activity[]
    },
  })
}

// -----------------------------------------------------------------------------
// Task mutations (optimistic)
// -----------------------------------------------------------------------------

function patchTaskInCache(qc: QueryClient, uid: string, id: string, patch: Partial<Task>) {
  qc.setQueryData<Task[]>(keys.tasks(uid), (old) =>
    old?.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  )
}

/** Runs an optimistic cache update and returns a rollback function. */
async function optimistic(qc: QueryClient, uid: string, apply: () => void) {
  await qc.cancelQueries({ queryKey: keys.tasks(uid) })
  const previous = qc.getQueryData<Task[]>(keys.tasks(uid))
  apply()
  return () => qc.setQueryData(keys.tasks(uid), previous)
}

export function useCreateTask() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (draft: TaskDraft) => {
      const tasks = qc.getQueryData<Task[]>(keys.tasks(uid)) ?? []
      const top = tasks.filter((t) => t.status === draft.status).sort((a, b) => a.position - b.position)[0]
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: draft.title.trim(),
          description: draft.description?.trim() || null,
          status: draft.status,
          priority: draft.priority,
          due_date: draft.due_date,
          position: positionBetween(undefined, top?.position),
        })
        .select('id')
        .single()
      fail(error)
      const id = data!.id as string
      await linkRows(id, draft.assignee_ids, draft.label_ids)
      return id
    },
    onError: (err) => toast.error('Could not create task', { description: err.message }),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.tasks(uid) }),
  })
}

async function linkRows(taskId: string, assigneeIds: string[], labelIds: string[]) {
  const ops = []
  if (assigneeIds.length)
    ops.push(supabase.from('task_assignees').insert(assigneeIds.map((member_id) => ({ task_id: taskId, member_id }))))
  if (labelIds.length)
    ops.push(supabase.from('task_labels').insert(labelIds.map((label_id) => ({ task_id: taskId, label_id }))))
  const results = await Promise.all(ops)
  for (const r of results) fail(r.error)
}

export interface TaskPatch {
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: Priority
  due_date?: string | null
  position?: number
}

export function useUpdateTask() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TaskPatch }) => {
      const { error } = await supabase.from('tasks').update(patch).eq('id', id)
      fail(error)
    },
    onMutate: ({ id, patch }) => optimistic(qc, uid, () => patchTaskInCache(qc, uid, id, patch)),
    onError: (err, _vars, rollback) => {
      rollback?.()
      toast.error('Could not save changes', { description: err.message })
    },
    onSettled: (_d, _e, { id }) => {
      void qc.invalidateQueries({ queryKey: keys.tasks(uid) })
      void qc.invalidateQueries({ queryKey: keys.activity(id) })
    },
  })
}

/**
 * Moves a card. The cache is patched synchronously (before the mutation's
 * async lifecycle starts) so the card never flashes back to its old column
 * between the drop and the optimistic update.
 */
export function useMoveTask() {
  const uid = useUserId()
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({ id, status, position }: MoveVars) => {
      const { error } = await supabase.from('tasks').update({ status, position }).eq('id', id)
      fail(error)
    },
    onMutate: async ({ previous }) => {
      await qc.cancelQueries({ queryKey: keys.tasks(uid) })
      return () => qc.setQueryData(keys.tasks(uid), previous)
    },
    onError: (err, _vars, rollback) => {
      rollback?.()
      toast.error('Could not move task. It was put back.', { description: err.message })
    },
    onSettled: (_d, _e, { id }) => {
      void qc.invalidateQueries({ queryKey: keys.tasks(uid) })
      void qc.invalidateQueries({ queryKey: keys.activity(id) })
    },
  })

  const move = (id: string, status: TaskStatus, position: number) => {
    const previous = qc.getQueryData<Task[]>(keys.tasks(uid))
    patchTaskInCache(qc, uid, id, { status, position })
    mutation.mutate({ id, status, position, previous })
  }

  return { move, isPending: mutation.isPending }
}

interface MoveVars {
  id: string
  status: TaskStatus
  position: number
  previous: Task[] | undefined
}

export function useDeleteTask() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      fail(error)
    },
    onMutate: (id) =>
      optimistic(qc, uid, () =>
        qc.setQueryData<Task[]>(keys.tasks(uid), (old) => old?.filter((t) => t.id !== id)),
      ),
    onError: (err, _id, rollback) => {
      rollback?.()
      toast.error('Could not delete task', { description: err.message })
    },
    onSuccess: () => toast.success('Task deleted'),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.tasks(uid) }),
  })
}

/** Replaces the set of assignees or labels on a task (diffs against the current set). */
export function useSetTaskRelations(kind: 'assignees' | 'labels') {
  const uid = useUserId()
  const qc = useQueryClient()
  const table = kind === 'assignees' ? 'task_assignees' : 'task_labels'
  const column = kind === 'assignees' ? 'member_id' : 'label_id'
  const field = kind === 'assignees' ? 'assignee_ids' : 'label_ids'

  return useMutation({
    mutationFn: async ({ task, next }: { task: Task; next: string[] }) => {
      const current = new Set(task[field])
      const target = new Set(next)
      const toAdd = next.filter((id) => !current.has(id))
      const toRemove = task[field].filter((id) => !target.has(id))
      if (toAdd.length) {
        const { error } = await supabase
          .from(table)
          .insert(toAdd.map((id) => ({ task_id: task.id, [column]: id })))
        fail(error)
      }
      if (toRemove.length) {
        const { error } = await supabase.from(table).delete().eq('task_id', task.id).in(column, toRemove)
        fail(error)
      }
    },
    onMutate: ({ task, next }) => optimistic(qc, uid, () => patchTaskInCache(qc, uid, task.id, { [field]: next })),
    onError: (err, _vars, rollback) => {
      rollback?.()
      toast.error(`Could not update ${kind}`, { description: err.message })
    },
    onSettled: (_d, _e, { task }) => {
      void qc.invalidateQueries({ queryKey: keys.tasks(uid) })
      void qc.invalidateQueries({ queryKey: keys.activity(task.id) })
    },
  })
}

// -----------------------------------------------------------------------------
// Team members & labels
// -----------------------------------------------------------------------------

export function useCreateMember() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; color: string }) => {
      const { error } = await supabase.from('team_members').insert({ name: input.name.trim(), color: input.color })
      fail(error)
    },
    onError: (err) => toast.error('Could not add team member', { description: err.message }),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.members(uid) }),
  })
}

export function useDeleteMember() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_members').delete().eq('id', id)
      fail(error)
    },
    onError: (err) => toast.error('Could not remove team member', { description: err.message }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.members(uid) })
      void qc.invalidateQueries({ queryKey: keys.tasks(uid) })
    },
  })
}

export function useCreateLabel() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from('labels')
        .insert({ name: input.name.trim(), color: input.color })
        .select('id, name, color, created_at')
        .single()
      if (error?.code === '23505') throw new Error(`A label named “${input.name.trim()}” already exists.`)
      fail(error)
      return data as Label
    },
    onError: (err) => toast.error('Could not create label', { description: err.message }),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.labels(uid) }),
  })
}

export function useDeleteLabel() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('labels').delete().eq('id', id)
      fail(error)
    },
    onError: (err) => toast.error('Could not delete label', { description: err.message }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.labels(uid) })
      void qc.invalidateQueries({ queryKey: keys.tasks(uid) })
    },
  })
}

// -----------------------------------------------------------------------------
// Comments
// -----------------------------------------------------------------------------

export function useAddComment(taskId: string) {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.from('comments').insert({ task_id: taskId, body: body.trim() })
      fail(error)
    },
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: keys.comments(taskId) })
      const previous = qc.getQueryData<Comment[]>(keys.comments(taskId))
      const temp: Comment = {
        id: `temp-${crypto.randomUUID()}`,
        task_id: taskId,
        body: body.trim(),
        created_at: new Date().toISOString(),
      }
      qc.setQueryData<Comment[]>(keys.comments(taskId), (old) => [...(old ?? []), temp])
      return () => qc.setQueryData(keys.comments(taskId), previous)
    },
    onError: (err, _body, rollback) => {
      rollback?.()
      toast.error('Could not post comment', { description: err.message })
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.comments(taskId) })
      void qc.invalidateQueries({ queryKey: keys.activity(taskId) })
      void qc.invalidateQueries({ queryKey: keys.tasks(uid) })
    },
  })
}

export function useDeleteComment(taskId: string) {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', id)
      fail(error)
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: keys.comments(taskId) })
      const previous = qc.getQueryData<Comment[]>(keys.comments(taskId))
      qc.setQueryData<Comment[]>(keys.comments(taskId), (old) => old?.filter((c) => c.id !== id))
      return () => qc.setQueryData(keys.comments(taskId), previous)
    },
    onError: (err, _id, rollback) => {
      rollback?.()
      toast.error('Could not delete comment', { description: err.message })
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.comments(taskId) })
      void qc.invalidateQueries({ queryKey: keys.tasks(uid) })
    },
  })
}
