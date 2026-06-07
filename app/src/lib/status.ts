import type { Match, MatchStatus } from './types'

export const POST_MATCH_WINDOW_MS = 24 * 60 * 60 * 1000 // recording window
export const CANCEL_CUTOFF_MS = 2 * 60 * 60 * 1000 // cancel ≥2h before start, else no-show

/**
 * Read-time match status (CLAUDE.md §5) — computed from timestamps,
 * never stored, no cron jobs. Mirrors the future Postgres view.
 */
export function computeStatus(match: Match, now: Date = new Date()): MatchStatus {
  if (match.status === 'cancelled') return 'cancelled'
  const t = now.getTime()
  const start = new Date(match.start_time).getTime()
  const end = new Date(match.end_time).getTime()
  if (t < start) return match.spots_available > 0 ? 'open' : 'full'
  if (t < end) return 'live'
  if (t < end + POST_MATCH_WINDOW_MS) return 'completed'
  return 'closed'
}

/** Can this participant still cancel without it counting as a no-show? */
export function canCancelCleanly(match: Match, now: Date = new Date()): boolean {
  return new Date(match.start_time).getTime() - now.getTime() >= CANCEL_CUTOFF_MS
}

/**
 * Scaled "didn't turn up" report threshold (CLAUDE.md §5):
 * 2 players → 1 · 3–4 → 2 · 5–8 → 3 · 9+ → 4, clamped to players who showed.
 */
export function noShowReportThreshold(totalPlayers: number, showedUp: number): number {
  const base = totalPlayers <= 2 ? 1 : totalPlayers <= 4 ? 2 : totalPlayers <= 8 ? 3 : 4
  return Math.max(1, Math.min(base, showedUp))
}
