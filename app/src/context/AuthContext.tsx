import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@/lib/types'
import { mockUser } from '@/lib/mockUser'
import { actions } from '@/lib/store'

/** Login state — UI-only stand-in for Supabase auth (CLAUDE.md §6).
 *  Hydration order: real session → dev mockUser fallback → signed out.
 *  When supabase-js lands, detectRealUser() becomes supabase.auth.getSession()
 *  + onAuthStateChange, and signIn/signOut wrap the real API — the dev
 *  fallback below only ever fires when no real session was found, so it
 *  won't shadow an actual login. */

interface AuthValue {
  user: User | null
  /** future: supabase.auth.signInWithPassword(...) */
  signIn: (user: User) => void
  /** future: supabase.auth.signOut() */
  signOut: () => void
}

/** real-session probe — always null until Supabase auth lands */
function detectRealUser(): User | null {
  return null
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const real = detectRealUser()
    if (real) return real
    // dev only: act as already signed in so features are testable without Supabase
    if (import.meta.env.MODE === 'development') return mockUser
    return null
  })

  // mirror the signed-in profile into the data layer (the store keeps the
  // seeded CURRENT_USER_ID so the relational mock graph stays intact)
  useEffect(() => {
    if (user) actions.setSignedInUser(user)
  }, [user])

  return <AuthContext.Provider value={{ user, signIn: setUser, signOut: () => setUser(null) }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
