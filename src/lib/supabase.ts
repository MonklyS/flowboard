import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when the public Supabase URL + anon key were provided at build time. */
export const supabaseConfigured = Boolean(url && anonKey)

/**
 * Browser Supabase client. Only the public anon/publishable key is ever used
 * here; all data access is scoped by Row Level Security on the server.
 */
export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'flowboard-auth' },
    })
  : (null as unknown as SupabaseClient)
