import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

/**
 * Drop-in `useState` that persists the value to `localStorage`, scoped to the
 * signed-in user so two accounts on the same browser never share state.
 *
 * The user id comes from `supabase.auth.getSession()`. That call is async, so
 * the scoped key isn't known on the first render — we start from `initialValue`
 * and hydrate from storage once the session resolves (one tick later). When
 * Supabase isn't configured yet (CLAUDE.md §7 — `supabase` is `null` in the
 * UI-first build) we fall back to a `guest` scope so the hook still works.
 *
 * Usage mirrors useState exactly:
 *   const [filter, setFilter] = usePersistedState('chat:filter', 'all')
 *
 * Pass `null` as the key to disable persistence — the hook then behaves as a
 * plain useState. Useful for a component shared across modes (e.g. a form used
 * for both "create" and "edit") where only one mode should keep a draft.
 */

const SCOPE_PREFIX = 'connect:state'

async function resolveUserScope(): Promise<string> {
  if (!supabase) return 'guest' // unconfigured — no session to read
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? 'guest'
}

export function usePersistedState<T>(key: string | null, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue)
  // the fully-scoped key (`connect:state:<userId>:<key>`), known only after the
  // session resolves; held in a ref so the persist effect can read the latest.
  const storageKey = useRef<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // 1. resolve the user-scoped key, then hydrate from localStorage (once).
  //    A null key opts out of persistence entirely (acts as plain useState).
  useEffect(() => {
    if (key === null) return
    let active = true
    resolveUserScope().then((scope) => {
      if (!active) return
      const k = `${SCOPE_PREFIX}:${scope}:${key}`
      storageKey.current = k
      try {
        const raw = localStorage.getItem(k)
        if (raw !== null) setValue(JSON.parse(raw) as T)
      } catch {
        /* storage unavailable or malformed JSON — keep initialValue */
      }
      setHydrated(true)
    })
    return () => {
      active = false
    }
  }, [key])

  // 2. write back on every change — but only after we know the scoped key,
  //    so the initial render doesn't clobber stored data before it's read.
  useEffect(() => {
    if (key === null || !hydrated || !storageKey.current) return
    try {
      localStorage.setItem(storageKey.current, JSON.stringify(value))
    } catch {
      /* storage unavailable (private mode / quota) — value lives in memory */
    }
  }, [value, hydrated, key])

  return [value, setValue] as const
}

/**
 * Drop a persisted draft once it's been committed (e.g. after a form submits).
 * Removes every persisted key whose name contains `contains` — across user
 * scopes, which is fine for a draft reset on a shared dev browser (users switch
 * by reloading). Synchronous; no session lookup needed.
 */
export function clearPersistedState(contains: string): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && k.startsWith(SCOPE_PREFIX) && k.includes(contains)) localStorage.removeItem(k)
    }
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
