import { Skeleton } from '@/components/ui/skeleton'
import { STATUSES } from '@/lib/constants'

const CARD_COUNTS = [3, 2, 2, 1]

export function BoardSkeleton() {
  return (
    <div className="flex h-full gap-3 overflow-hidden px-4 sm:px-6 lg:gap-4" aria-busy="true" aria-label="Loading board">
      {STATUSES.map((s, i) => (
        <div key={s.id} className="flex w-[85vw] shrink-0 flex-col gap-2 rounded-xl border bg-column/80 p-2 sm:w-[300px] lg:w-auto lg:min-w-[260px] lg:flex-1">
          <div className="flex items-center gap-2 px-1 py-1.5">
            <span className="h-4 w-1 rounded-full opacity-50" style={{ background: s.color }} />
            <Skeleton className="h-3.5 w-20" />
          </div>
          {Array.from({ length: CARD_COUNTS[i] }).map((_, j) => (
            <div key={j} className="space-y-2.5 rounded-lg bg-card p-3 shadow-card" style={{ opacity: 1 - j * 0.2 }}>
              <Skeleton className="h-3 w-14 rounded-full" />
              <Skeleton className="h-3.5 w-11/12" />
              <Skeleton className="h-3.5 w-2/3" />
              <div className="flex justify-between pt-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="size-5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
