import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type AuthState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; session: Session }

interface AuthContextValue {
  state: AuthState
  retry: () => void
  /** Signs out and immediately starts a brand-new guest (empty board). */
  startNewGuest: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Ensures there is always a Supabase session. On first launch (no stored
 * session) it creates an anonymous guest user; afterwards the persisted
 * session is reused, so the same browser keeps seeing the same tasks.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const signingIn = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function ensureSession() {
      setState({ status: 'loading' })
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (data.session) {
          if (!cancelled) setState({ status: 'ready', session: data.session })
          return
        }
        if (signingIn.current) return
        signingIn.current = true
        const { data: anon, error: anonError } = await supabase.auth.signInAnonymously()
        signingIn.current = false
        if (anonError) throw anonError
        if (!anon.session) throw new Error('Supabase did not return a session.')
        if (!cancelled) setState({ status: 'ready', session: anon.session })
      } catch (err) {
        signingIn.current = false
        const message =
          err instanceof Error ? err.message : 'Something went wrong while starting your guest session.'
        if (!cancelled) setState({ status: 'error', message: friendlyAuthError(message) })
      }
    }

    void ensureSession()

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        setState({ status: 'ready', session })
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  const startNewGuest = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' })
    setAttempt((n) => n + 1)
  }, [])

  return <AuthContext.Provider value={{ state, retry, startNewGuest }}>{children}</AuthContext.Provider>
}

function friendlyAuthError(message: string) {
  if (/anonymous sign-ins are disabled/i.test(message)) {
    return 'Anonymous sign-ins are disabled for this Supabase project. Enable them under Authentication → Sign In / Providers.'
  }
  if (/failed to fetch|network/i.test(message)) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  return message
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** The signed-in guest's user id. Only call below the "ready" gate. */
export function useUserId() {
  const { state } = useAuth()
  if (state.status !== 'ready') throw new Error('useUserId called before the session was ready')
  return state.session.user.id
}
