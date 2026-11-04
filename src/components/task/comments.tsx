import { Loader2, MessageSquare, SendHorizonal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAddComment, useComments, useDeleteComment } from '@/data/queries'
import { fullTimestamp, timeAgo } from '@/lib/dates'
import { cn } from '@/lib/utils'

export function Comments({ taskId }: { taskId: string }) {
  const { data, isPending, isError, error, refetch } = useComments(taskId)
  const add = useAddComment(taskId)
  const remove = useDeleteComment(taskId)
  const [body, setBody] = useState('')

  function submit() {
    const text = body.trim()
    if (!text) return
    add.mutate(text)
    setBody('')
  }

  return (
    <div className="flex flex-col gap-4">
      {isPending ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2 rounded-lg border p-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3.5 w-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="Couldn't load comments" message={error.message} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <MessageSquare className="size-5 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((c) => {
            const pending = c.id.startsWith('temp-')
            return (
              <li key={c.id} className={cn('group rounded-lg border bg-card p-3 shadow-card transition-opacity', pending && 'opacity-60')}>
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">You</span>
                  <time dateTime={c.created_at} title={fullTimestamp(c.created_at)}>
                    {pending ? 'Posting…' : timeAgo(c.created_at)}
                  </time>
                  {!pending && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
                      onClick={() => remove.mutate(c.id)}
                      aria-label="Delete comment"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{c.body}</p>
              </li>
            )
          })}
        </ul>
      )}

      <div className="rounded-lg border bg-card p-2 shadow-card focus-within:ring-2 focus-within:ring-ring">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Write a comment…"
          aria-label="Write a comment"
          rows={2}
          maxLength={5000}
          className="min-h-0 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="flex items-center justify-between pt-1">
          <span className="pl-1 text-[11px] text-muted-foreground">Ctrl + Enter to send</span>
          <Button size="sm" onClick={submit} disabled={!body.trim() || add.isPending}>
            {add.isPending ? <Loader2 className="animate-spin" /> : <SendHorizonal />}
            Comment
          </Button>
        </div>
      </div>
    </div>
  )
}
