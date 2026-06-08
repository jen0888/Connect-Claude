import { useSyncExternalStore } from 'react'
import type { Sport } from './types'

/** Single source of truth for the host's own match.
 *
 *  Both the Create/Edit form (EditMatchScreen) and Home read/write THIS object
 *  — never a hardcoded placeholder — so the two surfaces can't drift. Persisted
 *  to localStorage under a stable key so a created/edited match survives a full
 *  page reload, and exposed as a reactive hook (useSyncExternalStore) so Home
 *  updates the instant the form writes. Swap the localStorage internals for a
 *  Supabase row later without changing call sites. */

const KEY = 'connect:hostedMatch'

export interface HostedMatch {
  sport: Sport
  name: string
  dateKey: string // ISO yyyy-mm-dd
  dateLabel: string // "Thu · May 23"
  startTime: string // "19:00" (24h storage; displayed via to24h)
  endTime: string // "20:00"
  matchType: 'casual' | 'competition'
  gender: 'mixed' | 'ladies'
  requireApproval: boolean
  isFree: boolean
  pricePerPlayer: string // digits only
  players: number // total spots
  filled: number // spots taken (host counts as 1)
  minLevel: number
  maxLevel: number
  waitlistOpen: boolean
  waitlistSize: number
  description: string
  // location — court sports use venueName/area/setting/court; runs use the route
  venueName: string
  area: string
  setting: string
  court: string
  isRoute: boolean
  routeEnd?: string
  loop?: boolean
  km?: number | ''
}

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

// cache so getSnapshot returns a stable reference until the raw string changes
// (useSyncExternalStore loops forever if every read is a fresh object).
let cachedRaw: string | null = null
let cachedVal: HostedMatch | null = null

function getSnapshot(): HostedMatch | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    raw = null
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedVal = raw ? (JSON.parse(raw) as HostedMatch) : null
  }
  return cachedVal
}

export function readHostedMatch(): HostedMatch | null {
  return getSnapshot()
}

export function writeHostedMatch(m: HostedMatch): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(m))
  } catch {
    /* storage unavailable — match lives only for this session */
  }
  emit()
}

export function clearHostedMatch(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to clear */
  }
  emit()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', onStorage)
  }
}

/** Reactive read of the hosted match — re-renders on write/clear and on
 *  cross-tab storage events. SSR snapshot is null (no localStorage). */
export function useHostedMatch(): HostedMatch | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}
