import { Link } from 'react-router-dom'
import { Lock, MessageCircle, Star, X } from 'lucide-react'
import type { Match, MatchStatus } from '@/lib/types'

/** Match lifecycle presentation — ported from match-lifecycle.jsx.
 *  In the prototype the badge was a tappable StatusCycler for previewing
 *  states; in the app the status is computed at read time and displayed.
 *  Colors are the semantic lifecycle tokens (CLAUDE.md §3). */

export interface LifecycleInfo {
  key: MatchStatus
  label: string
  color: string
  pulse: boolean
  note: string | null
  dim: boolean
}

export const LIFECYCLE: Record<MatchStatus, LifecycleInfo> = {
  open: { key: 'open', label: 'Open', color: 'var(--color-success)', pulse: false, note: null, dim: false },
  full: { key: 'full', label: 'Full', color: 'var(--color-info)', pulse: false, note: null, dim: false },
  cancelled: { key: 'cancelled', label: 'Cancelled', color: 'var(--color-danger)', pulse: false, note: 'Host or system cancelled', dim: true },
  live: { key: 'live', label: 'Live now', color: 'var(--color-live)', pulse: true, note: 'Happening now · joining is locked', dim: false },
  completed: { key: 'completed', label: 'Just played', color: 'var(--color-warning)', pulse: false, note: 'Post-match window open · record result', dim: false },
  closed: { key: 'closed', label: 'Closed', color: 'var(--color-neutral)', pulse: false, note: '24h passed · no-show window closed', dim: true },
}

/** glass status pill on the card image */
export function StatusBadge({ status }: { status: MatchStatus }) {
  const lc = LIFECYCLE[status]
  return (
    <span
      className="absolute bottom-[11px] start-3.5 z-4 inline-flex items-center gap-2 rounded-pill px-2.5 py-[5px] text-[9.5px] font-semibold uppercase tracking-[0.16em] text-onbrand backdrop-blur-[8px]"
      style={{
        background: 'rgba(26,26,26,0.56)',
        boxShadow: '0 6px 16px -8px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(244,240,232,0.10)',
      }}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${lc.pulse ? 'conn-pulse' : ''}`}
        style={{ background: lc.color, boxShadow: `0 0 0 3px color-mix(in srgb, ${lc.color} 23%, transparent)` }}
      />
      {lc.label}
    </span>
  )
}

/** inline (non-absolute) status pill — dot + label, tinted in the state's token.
 *  Used in the brief card's bottom-right corner on the Past archives, where the
 *  lifecycle (Just played / Closed / Cancelled) replaces the chevron. */
export function LifecycleChip({ status }: { status: MatchStatus }) {
  const lc = LIFECYCLE[status]
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.14em]"
      style={{ background: `color-mix(in srgb, ${lc.color} 13%, transparent)`, color: lc.color }}
    >
      <span className={`h-[5px] w-[5px] rounded-full ${lc.pulse ? 'conn-pulse' : ''}`} style={{ background: lc.color }} />
      {lc.label}
    </span>
  )
}

/** explanatory line in the card body for informative states */
export function LifecycleNote({ status }: { status: MatchStatus }) {
  const lc = LIFECYCLE[status]
  if (!lc.note) return null
  return (
    <div className="mt-[11px] inline-flex items-center gap-[7px] text-[11.5px] tracking-[0.01em]" style={{ color: 'rgba(26,26,26,0.6)' }}>
      <span className="h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: lc.color }} />
      {lc.note}
    </div>
  )
}

/** do these states replace the card's primary action? */
export function lifecycleHasAction(status: MatchStatus): boolean {
  return status === 'cancelled' || status === 'live' || status === 'completed' || status === 'closed'
}

/** avatar-row caption per state */
export function lifecycleSpots(status: MatchStatus, m: Pick<Match, 'spots_available'>): string {
  switch (status) {
    case 'open':
      return `${m.spots_available} spot${m.spots_available !== 1 ? 's' : ''} left`
    case 'full':
      return 'Full match'
    case 'cancelled':
      return 'Match cancelled'
    case 'live':
      return 'In progress'
    case 'completed':
      return 'Just played'
    case 'closed':
      return 'Match closed'
  }
}

/** state-driven footer action for the 4 override states */
export function LifecycleAction({ status, matchId }: { status: MatchStatus; matchId: string }) {
  const base =
    'inline-flex h-10 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-pill px-[18px] text-[13px] font-semibold tracking-[0.01em] no-underline'
  if (status === 'live') {
    return (
      <Link to={`/chat/match/${matchId}`} className={`${base} bg-brand text-onbrand shadow-cta`}>
        <MessageCircle size={14} strokeWidth={2} /> Open chat
      </Link>
    )
  }
  if (status === 'completed') {
    return (
      <Link to={`/post-match/${matchId}`} className={`${base} bg-brand text-onbrand shadow-cta`}>
        <Star size={14} strokeWidth={2} /> Record result
      </Link>
    )
  }
  if (status === 'closed') {
    return (
      <Link to={`/post-match/${matchId}`} className={`${base} border border-ink/16 bg-transparent`} style={{ color: 'rgba(26,26,26,0.6)' }}>
        <Lock size={13} strokeWidth={2} /> Completed
      </Link>
    )
  }
  // cancelled — inert, muted
  return (
    <span
      className={`${base} cursor-default border`}
      style={{ background: 'rgba(162,59,44,0.08)', color: 'var(--color-danger)', borderColor: 'rgba(162,59,44,0.22)' }}
    >
      <X size={13} strokeWidth={2.2} /> Cancelled
    </span>
  )
}
