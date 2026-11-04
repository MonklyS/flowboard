import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  getFirstCollision,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMoveTask } from '@/data/queries'
import { STATUS_BY_ID, STATUSES } from '@/lib/constants'
import { positionBetween } from '@/lib/position'
import type { Label, Task, TaskStatus, TeamMember } from '@/lib/types'
import { useBoardUI } from './board-ui'
import { Column } from './column'
import { TaskCardBody } from './task-card'

type Columns = Record<TaskStatus, string[]>

const STATUS_IDS = new Set<string>(STATUSES.map((s) => s.id))
const isColumnId = (id: UniqueIdentifier): id is TaskStatus => STATUS_IDS.has(String(id))

function groupByStatus(tasks: Task[]): Columns {
  const cols: Columns = { todo: [], in_progress: [], in_review: [], done: [] }
  for (const t of [...tasks].sort((a, b) => a.position - b.position)) cols[t.status].push(t.id)
  return cols
}

const dropAnimation: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
}

interface BoardProps {
  allTasks: Task[]
  visibleTasks: Task[]
  filtered: boolean
  members: TeamMember[]
  labels: Label[]
  /** Exposes whether a drag is in progress (used to hold back realtime refreshes). */
  draggingRef: React.RefObject<boolean>
}

export function Board({ allTasks, visibleTasks, filtered, members, labels, draggingRef }: BoardProps) {
  const { openTask, openCreate } = useBoardUI()
  const { move } = useMoveTask()

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const labelMap = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels])
  const taskMap = useMemo(() => new Map(allTasks.map((t) => [t.id, t])), [allTasks])
  const totals = useMemo(() => groupByStatus(allTasks), [allTasks])
  const derived = useMemo(() => groupByStatus(visibleTasks), [visibleTasks])

  // While dragging we work on a local copy of the columns so cards can move
  // between lists live; on drop the result is committed to the cache + server.
  const [dragColumns, setDragColumns] = useState<Columns | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const columns = dragColumns ?? derived
  const columnsRef = useRef(columns)
  useLayoutEffect(() => {
    columnsRef.current = columns
  })
  const origin = useRef<{ status: TaskStatus; index: number } | null>(null)
  const lastOverId = useRef<UniqueIdentifier | null>(null)
  const lastDropAt = useRef(0)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  )

  const findColumn = useCallback((id: UniqueIdentifier, cols: Columns = columnsRef.current): TaskStatus | null => {
    if (isColumnId(id)) return id
    for (const s of STATUSES) if (cols[s.id].includes(String(id))) return s.id
    return null
  }, [])

  /**
   * Pointer-first collision detection tuned for multiple lists: prefer what is
   * under the pointer; if that is a column with cards, snap to its closest card.
   */
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerHits = pointerWithin(args)
    const hits = pointerHits.length > 0 ? pointerHits : rectIntersection(args)
    let overId = getFirstCollision(hits, 'id')
    if (overId != null) {
      if (isColumnId(overId)) {
        const items = columnsRef.current[overId]
        if (items.length > 0) {
          const closest = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter((c) => items.includes(String(c.id))),
          })
          overId = closest[0]?.id ?? overId
        }
      }
      lastOverId.current = overId
      return [{ id: overId }]
    }
    return lastOverId.current ? [{ id: lastOverId.current }] : []
  }, [])

  function handleDragStart({ active }: DragStartEvent) {
    const id = String(active.id)
    const status = findColumn(id, derived)
    if (!status) return
    draggingRef.current = true
    origin.current = { status, index: derived[status].indexOf(id) }
    setActiveId(id)
    setDragColumns(derived)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const from = findColumn(active.id)
    const to = findColumn(over.id)
    if (!from || !to || from === to) return

    setDragColumns((prev) => {
      const cols = prev ?? derived
      const fromItems = cols[from].filter((id) => id !== active.id)
      const toItems = cols[to].filter((id) => id !== active.id)
      let index = toItems.length
      if (!isColumnId(over.id)) {
        const overIndex = toItems.indexOf(String(over.id))
        const translated = active.rect.current.translated
        const below = translated && translated.top > over.rect.top + over.rect.height / 2
        index = overIndex >= 0 ? overIndex + (below ? 1 : 0) : toItems.length
      }
      toItems.splice(index, 0, String(active.id))
      return { ...cols, [from]: fromItems, [to]: toItems }
    })
  }

  function reset() {
    draggingRef.current = false
    origin.current = null
    lastOverId.current = null
    setActiveId(null)
    setDragColumns(null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    lastDropAt.current = Date.now()
    const start = origin.current
    if (!over || !start || !dragColumns) return reset()

    const id = String(active.id)
    let cols = dragColumns
    const status = findColumn(id, cols)
    if (!status) return reset()

    if (!isColumnId(over.id) && findColumn(over.id, cols) === status) {
      const oldIndex = cols[status].indexOf(id)
      const newIndex = cols[status].indexOf(String(over.id))
      if (oldIndex !== newIndex) cols = { ...cols, [status]: arrayMove(cols[status], oldIndex, newIndex) }
    }

    const list = cols[status]
    const index = list.indexOf(id)
    if (status === start.status && index === start.index) return reset()

    const before = taskMap.get(list[index - 1])?.position
    const after = taskMap.get(list[index + 1])?.position
    move(id, status, positionBetween(before, after))
    reset()
  }

  const handleOpen = useCallback(
    (id: string) => {
      if (Date.now() - lastDropAt.current < 250) return // ignore the click that ends a drag
      openTask(id)
    },
    [openTask],
  )

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${taskMap.get(String(active.id))?.title ?? 'task'}.`,
    onDragOver: ({ over }) => {
      if (!over) return 'Not over a column.'
      const col = findColumn(over.id)
      return col ? `Over ${STATUS_BY_ID[col].label}.` : ''
    },
    onDragEnd: ({ active, over }) => {
      const col = over ? findColumn(over.id) : null
      const title = taskMap.get(String(active.id))?.title ?? 'Task'
      return col ? `${title} dropped in ${STATUS_BY_ID[col].label}.` : `${title} dropped.`
    },
    onDragCancel: ({ active }) => `Cancelled. ${taskMap.get(String(active.id))?.title ?? 'Task'} returned.`,
  }

  const activeTask = activeId ? taskMap.get(activeId) : undefined
  const visibleMap = useMemo(() => new Map(visibleTasks.map((t) => [t.id, t])), [visibleTasks])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={reset}
      accessibility={{ announcements }}
    >
      <div className="scrollbar-thin flex h-full snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:snap-none sm:px-6 lg:gap-4">
        {STATUSES.map((meta) => (
          <Column
            key={meta.id}
            meta={meta}
            tasks={columns[meta.id].map((id) => visibleMap.get(id) ?? taskMap.get(id)!).filter(Boolean)}
            total={totals[meta.id].length}
            filtered={filtered}
            members={memberMap}
            labels={labelMap}
            onAdd={() => openCreate(meta.id)}
            onOpen={handleOpen}
          />
        ))}
      </div>

      {createPortal(
        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? (
            <TaskCardBody task={activeTask} members={memberMap} labels={labelMap} dragging />
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  )
}
