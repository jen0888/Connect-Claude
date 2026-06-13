import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '@/lib/types'
import { mockUser } from '@/lib/mockUser'
import { actions, connectLive, disconnectLive } from '@/lib/store'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

/** Global auth — real Supabase Auth when a project is wired
 *  (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`), with a dev-mock fallback
 *  so the UI-first app (CLAUDE.md §7) keeps running with no backend.
 *
 *  Source of truth:
 *   • configured  → `supabase.auth` — `getSession()` on mount, then
 *     `onAuthStateChange` keeps `session`/`user` live across refresh, sign-in,
 *     sign-out, and token refresh. Real session always wins.
 *   • unconfigured + dev → fall back to `mockUser` so features stay testable.
 *   • unconfigured + prod → signed out.
 *
 *  The signed-in profile is mirrored into the data layer via
 *  `actions.setSignedInUser` (the store keeps the seeded CURRENT_USER_ID so the
 *  relational mock graph stays intact — see store.ts `withSignedIn`). */

interface AuthValue {
  /** app-domain profile (mapped from the Supabase user, or the dev mock) */
  user: User | null
  /** raw Supabase session — null in dev-mock mode */
  session: Session | null
  /** true until the initial `getSession()` resolves (configured mode only) */
  loading: boolean
  /** email/password sign-in. Resolves `{ error }`; on success the
   *  `onAuthStateChange` listener sets `user`. Returns an error when
   *  unconfigured. */
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  /** dev-only: sign in as a mock profile without Supabase (LoginScreen's
   *  VITE_DEV_PASSWORD path). Ignored when a real project is configured. */
  signInWithMock: (user: User) => void
  /** supabase.auth.signOut() when configured. Resolves `{ error }`; on success
   *  the local session/user are cleared (the data layer follows via the
   *  session→null effect). On failure nothing is cleared so the caller can stay
   *  put and report it (no half-signed-out state). */
  signOut: () => Promise<{ error: string | null }>
}

/** Map a Supabase auth user onto the app's `User` shape. Auth only carries
 *  id/email/metadata; the rich trust signals (matches_played, attendance_rate,
 *  …) live in a future `profiles` table — until that's wired we seed them from
 *  `mockUser` so screens render. TODO: replace the defaults with a profiles
 *  fetch (CLAUDE.md §7 — "future Supabase update goes here"). */
function toAppUser(su: SupabaseUser): User {
  const meta = su.user_metadata ?? {}
  return {
    ...mockUser,
    id: su.id,
    email: su.email ?? mockUser.email,
    name: (meta.name as string) ?? (meta.full_name as string) ?? su.email?.split('@')[0] ?? mockUser.name,
    avatar_url: (meta.avatar_url as string) ?? null,
    phone: su.phone || null,
    created_at: su.created_at ?? mockUser.created_at,
  }
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // unconfigured: act signed-in as mockUser in dev, signed-out in prod
  const devMock = !isSupabaseConfigured && import.meta.env.MODE === 'development' ? mockUser : null
  const [user, setUser] = useState<User | null>(devMock)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured)

  // hydrate from Supabase + subscribe to auth changes (configured mode only)
  useEffect(() => {
    if (!supabase) return // unconfigured — dev-mock state above is final

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setUser(data.session ? toAppUser(data.session.user) : null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setUser(next ? toAppUser(next.user) : null)
      setLoading(false)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // drive the data layer:
  //  • configured → hydrate from Supabase on a live session (and re-fetch on
  //    sign-in/out); the store's identity becomes the real session UUID.
  //  • unconfigured (dev mock) → mirror the mock profile onto the seeded user.
  useEffect(() => {
    if (isSupabaseConfigured) {
      if (session?.user) void connectLive(session.user.id)
      else disconnectLive()
    } else if (user) {
      actions.setSignedInUser(user)
    }
  }, [session, user])

  const signIn: AuthValue['signIn'] = async (email, password) => {
    if (!supabase) return { error: 'Auth is not configured' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signInWithMock: AuthValue['signInWithMock'] = (u) => {
    if (isSupabaseConfigured) return // real auth owns sign-in
    setUser(u)
  }

  const signOut: AuthValue['signOut'] = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut()
      // keep the session intact on failure so the caller can stay put
      if (error) return { error: error.message }
    }
    setSession(null)
    setUser(null)
    return { error: null }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signInWithMock, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
