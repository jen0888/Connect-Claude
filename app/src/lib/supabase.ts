import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase browser client — the single instance the whole app shares
 * (`AuthContext`, and future repository accessors in `store.ts`).
 *
 * The app is UI-first (CLAUDE.md §7): until a real project is wired, the env
 * vars below are absent. Rather than throw at import time and take the whole
 * app down, we export `null` when unconfigured and surface
 * `isSupabaseConfigured` so callers (AuthContext) fall back to the dev-mock
 * path. Once `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are set
 * (`.env.local`, gitignored), the real client is created and auth goes live —
 * no other code change needed.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        // persist the session in localStorage and refresh it transparently so
        // a returning user stays signed in across reloads
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
