import type { Match, MatchResult, MatchStatus } from './types'

/** A match is confirmed once this many players record a corroborating result. */
export const RESULT_CONFIRM_MIN = 2

export const POST_MATCH_WINDOW_MS = 24 * 60 * 60 * 1000 // recording window
export const CANCEL_CUTOFF_MS = 2 * 60 * 60 * 1000 // cancel ≥2h before start, else no-show
export const ATTEND_CHECKIN_LEAD_MS = 30 * 60 * 1000 // attend check-in opens ~30 min before start

/**
 * Read-time match status (CLAUDE.md §5) — computed from timestamps,
 * never stored, no cron jobs. Mirrors the future Postgres view.
 */
export function computeStatus(match: Match, now: Date = new Date()): MatchStatus {
  if (match.status === 'cancelled') return 'cancelled'
  // `closed` is stored once results are corroborated — an early terminal state
  // that short-circuits the time-based 24h window.
  if (match.status === 'closed') return 'closed'
  const t = now.getTime()
  const start = new Date(match.start_time).getTime()
  const end = new Date(match.end_time).getTime()
  if (t < start) return match.spots_available > 0 ? 'open' : 'full'
  if (t < end) return 'live'
  if (t < end + POST_MATCH_WINDOW_MS) return 'completed'
  return 'closed'
}

/**
 * Read-time visibility of the NEXT UP "attend" check-in (CLAUDE.md §5).
 * The attend button is a low-friction POSITIVE presence signal, never a no-show
 * verdict — so it is only meaningful around match time. The window is derived
 * from `start_time`/status at read time (NO cron, NO triggers — consistent with
 * `computeStatus`):
 *  - opens ~30 min before `start_time` (an earlier tap is meaningless — never shows
 *    days ahead in NEXT UP),
 *  - stays open through the `live` state and the just-played (`completed`, ≤24h) window,
 *  - closed once the match is `closed`/`cancelled`.
 * A tap pre-fills the player as "Played" in the post-match step 1; it carries no
 * score (win/lose/draw is separate and still required for win rate).
 */
export function attendCheckInOpen(match: Match, now: Date = new Date()): boolean {
  const st = computeStatus(match, now)
  if (st === 'live' || st === 'completed') return true
  if (st === 'open' || st === 'full') {
    return new Date(match.start_time).getTime() - now.getTime() <= ATTEND_CHECKIN_LEAD_MS
  }
  return false // closed / cancelled — recording is over or the match never happened
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

/**
 * Do the recorded results corroborate a single outcome? (CLAUDE.md §5)
 * Each player records only their OWN win/loss/draw, so "the same result" means
 * the submissions are mutually CONSISTENT, not literally identical:
 *  - a clear win/loss — at least one `win` and one `loss`, no contradicting draw
 *  - a draw — everyone who recorded agrees it was a draw
 * Two `win`s with no `loss` (or two `loss`s) is a contradiction → not confirmed.
 * Mirrors the server-side trigger so client + DB agree on when to close.
 */
export function resultsCorroborated(results: Pick<MatchResult, 'result'>[]): boolean {
  if (results.length < RESULT_CONFIRM_MIN) return false
  const wins = results.filter((r) => r.result === 'win').length
  const losses = results.filter((r) => r.result === 'loss').length
  const draws = results.filter((r) => r.result === 'draw').length
  const decided = wins >= 1 && losses >= 1 && draws === 0
  const drawn = draws === results.length
  return decided || drawn
}
