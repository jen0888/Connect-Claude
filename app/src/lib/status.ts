import type { Match, MatchStatus } from './types'

export const POST_MATCH_WINDOW_MS = 24 * 60 * 60 * 1000 // recording + result-edit window
export const CANCEL_CUTOFF_MS = 2 * 60 * 60 * 1000 // cancel ≥2h before start, else auto no-show

/**
 * Read-time match status (CLAUDE.md §5) — computed from timestamps,
 * never stored, no cron jobs. Light model: nothing stores `closed` anymore
 * (a finished match just rides the 24h window), but we still honour any LEGACY
 * stored `closed` row so old data reads correctly.
 */
export function computeStatus(match: Match, now: Date = new Date()): MatchStatus {
  if (match.status === 'cancelled') return 'cancelled'
  if (match.status === 'closed') return 'closed' // legacy rows only — see types.ts
  const t = now.getTime()
  const start = new Date(match.start_time).getTime()
  const end = new Date(match.end_time).getTime()
  if (t < start) return match.spots_available > 0 ? 'open' : 'full'
  if (t < end) return 'live'
  if (t < end + POST_MATCH_WINDOW_MS) return 'completed'
  return 'closed'
}

/** Can this participant still cancel without it counting as a no-show? (≥2h) */
export function canCancelCleanly(match: Match, now: Date = new Date()): boolean {
  return new Date(match.start_time).getTime() - now.getTime() >= CANCEL_CUTOFF_MS
}
