import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { ThemeProvider } from '@/components/theme'
import { BoardUIProvider } from '@/components/board/board-ui'
import { Logo } from '@/components/common/icons'
import { ErrorState } from '@/components/common/states'
import { Workspace } from '@/components/layout/workspace'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/data/auth'
import { supabaseConfigured } from '@/lib/supabase'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: true },
    mutations: { retry: 0 },
  },
})

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={300}>
        {supabaseConfigured ? (
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <SessionGate />
            </AuthProvider>
          </QueryClientProvider>
        ) : (
          <MissingConfig />
        )}
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  )
}

function SessionGate() {
  const { state, retry } = useAuth()

  if (state.status === 'loading') {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4" role="status">
        <Logo className="size-10 animate-pulse" />
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Setting up your guest workspace…
        </p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex h-dvh items-center justify-center">
        <ErrorState title="Couldn't start your guest session" message={state.message} onRetry={retry} />
      </div>
    )
  }

  // Keyed by user so switching guests resets all board UI state.
  return (
    <BoardUIProvider key={state.session.user.id}>
      <Workspace />
    </BoardUIProvider>
  )
}

function MissingConfig() {
  return (
    <div className="flex h-dvh items-center justify-center p-6">
      <div className="max-w-md rounded-xl border bg-card p-6 shadow-card">
        <Logo className="mb-4 size-9" />
        <h1 className="text-lg font-semibold">Connect Supabase</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This build has no Supabase credentials. Copy <code className="rounded bg-muted px-1 font-mono text-xs">.env.example</code> to{' '}
          <code className="rounded bg-muted px-1 font-mono text-xs">.env.local</code> and set{' '}
          <code className="rounded bg-muted px-1 font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-muted px-1 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>, then restart the dev server.
        </p>
      </div>
    </div>
  )
}
