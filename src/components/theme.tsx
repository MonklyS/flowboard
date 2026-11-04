import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'
const STORAGE_KEY = 'flowboard-theme'

interface ThemeCtx {
  theme: ThemeChoice
  resolvedTheme: 'light' | 'dark'
  setTheme: (t: ThemeChoice) => void
}

const Ctx = createContext<ThemeCtx | null>(null)
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function readStored(): ThemeChoice {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'light' || v === 'dark' ? v : 'system'
}

/**
 * Minimal light/dark/system theme provider. The initial class is applied by an
 * inline script in index.html (before React loads) so there is no flash.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>(readStored)
  const [systemDark, setSystemDark] = useState(() => media().matches)

  useEffect(() => {
    const mq = media()
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
  }, [resolvedTheme])

  const setTheme = useCallback((t: ThemeChoice) => {
    if (t === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, t)
    setThemeState(t)
  }, [])

  return <Ctx.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</Ctx.Provider>
}

export function useTheme() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
