// Verifies Row Level Security end-to-end using only the public anon key:
// two independent anonymous guests must never see or modify each other's data.
//
//   node --env-file=.env.local scripts/verify-rls.mjs
//
// Creates two throwaway anonymous users plus a few rows, and deletes the rows
// again at the end.
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (e.g. --env-file=.env.local)')

const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
let failures = 0
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`)
  if (!ok) failures++
}

const a = client()
const b = client()
const anon = client() // never signs in
const { data: sa, error: ea } = await a.auth.signInAnonymously()
const { data: sb, error: eb } = await b.auth.signInAnonymously()
if (ea || eb) throw ea ?? eb
const userA = sa.user.id
const userB = sb.user.id
check(userA !== userB, 'two guests get distinct user ids')

// A creates data
const { data: taskA, error: e1 } = await a.from('tasks').insert({ title: 'RLS probe: A secret task' }).select().single()
check(!e1 && taskA.user_id === userA, 'guest A can create a task (user_id stamped automatically)')
const { data: memberA } = await a.from('team_members').insert({ name: 'A teammate' }).select().single()
const { data: labelA } = await a.from('labels').insert({ name: `A label ${Date.now()}` }).select().single()
await a.from('comments').insert({ task_id: taskA.id, body: 'A private comment' })

// A sees own data, including the trigger-written activity row
const { data: aTasks } = await a.from('tasks').select('id')
check(aTasks.some((t) => t.id === taskA.id), 'guest A can read their own task')
const { data: aAct } = await a.from('task_activity').select('type').eq('task_id', taskA.id)
check(aAct.some((r) => r.type === 'created') && aAct.some((r) => r.type === 'commented'), 'activity log rows were written by triggers and are visible to A')

// B cannot see any of A's data
for (const table of ['tasks', 'team_members', 'labels', 'comments', 'task_activity']) {
  const { data } = await b.from(table).select('*')
  check(!data.some((r) => r.user_id === userA), `guest B sees none of A's ${table}`)
}
const { data: bById } = await b.from('tasks').select('*').eq('id', taskA.id)
check(bById.length === 0, "guest B cannot fetch A's task even by exact id")

// B cannot modify A's data
const { data: upd } = await b.from('tasks').update({ title: 'hijacked', status: 'done' }).eq('id', taskA.id).select()
check(upd.length === 0, "guest B's update of A's task affects 0 rows")
const { data: del } = await b.from('tasks').delete().eq('id', taskA.id).select()
check(del.length === 0, "guest B's delete of A's task affects 0 rows")
const { data: still } = await a.from('tasks').select('title, status').eq('id', taskA.id).single()
check(still.title === 'RLS probe: A secret task' && still.status === 'todo', "A's task is unchanged afterwards")

// B cannot attach things to A's task, or spoof ownership
const { error: c1 } = await b.from('comments').insert({ task_id: taskA.id, body: 'sneaky' })
check(!!c1, "guest B cannot comment on A's task")
const { error: c2 } = await b.from('tasks').insert({ title: 'spoofed', user_id: userA })
check(!!c2, 'guest B cannot insert a task owned by A (user_id spoofing)')
const { data: taskB } = await b.from('tasks').insert({ title: 'RLS probe: B task' }).select().single()
const { error: c3 } = await b.from('task_assignees').insert({ task_id: taskB.id, member_id: memberA.id })
check(!!c3, "guest B cannot assign A's team member to their own task")
const { error: c4 } = await b.from('task_labels').insert({ task_id: taskB.id, label_id: labelA.id })
check(!!c4, "guest B cannot attach A's label to their own task")
const { error: c5 } = await b.from('task_activity').insert({ task_id: taskB.id, type: 'created' })
check(!!c5, 'clients cannot forge activity log entries')

// Requests with no session at all get nothing
const { data: anonRows, error: anonErr } = await anon.from('tasks').select('*')
check(!!anonErr || anonRows.length === 0, 'requests without a session cannot read any tasks')

// Clean up probe rows (cascades to comments/activity)
await a.from('tasks').delete().eq('id', taskA.id)
await a.from('team_members').delete().eq('id', memberA.id)
await a.from('labels').delete().eq('id', labelA.id)
await b.from('tasks').delete().eq('id', taskB.id)

console.log(failures === 0 ? '\nAll RLS checks passed.' : `\n${failures} check(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)
