import type { MouseEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bookmark, CalendarCheck, Check, Clock, Eye, Hourglass, ListPlus, Lock, MapPin, Pencil, Plus, Send, X } from 'lucide-react'
import type { Match, MatchStatus, User } from '@/lib/types'
import { artType, courtLabel, hm, matchKind, sportLabel, timeRange, whenLabel, initials as userInitials } from '@/lib/format'
import { computeStatus } from '@/lib/status'
import { VENUES } from '@/lib/mock/venues'
import { AvatarStack } from './Avatar'
import { SportArt } from './SportArt'
import { LifecycleAction, LifecycleNote, StatusBadge, lifecycleHasAction, lifecycleSpots } from './lifecycle'

/** THE canonical match card (home-screens.jsx MatchCard) — one component
 *  reused on Home, Discover, All Matches and first-timer surfaces.
 *  Never create per-page card variants (CLAUDE.md §4/§8).
 *
 *  action: 'view'   – matches you're already in (outlined View pill, card links)
 *          'join'   – open matches (filled Join; Request when approval mode)
 *          'cancel' – pending request (outlined Cancel)
 *          'edit'   – matches you host (outlined pencil Edit → edit screen)
 *          'attend' – imminent joined match (filled Attend ⇄ subdued Attended)
 *  badge:  optional { text, pulse } dark pill on the image (e.g. Awaiting host) */
export interface MatchCardProps {
  match: Match
  host?: User | null
  players?: User[]
  action?: 'view' | 'join' | 'cancel' | 'edit' | 'attend'
  /** attend-toggle state (action='attend') */
  attended?: boolean
  /** join-state override after acting: null | 'joined' | 'requested' | 'waitlisted' */
  joinStatus?: 'joined' | 'requested' | 'waitlisted' | null
  /** 1-based FIFO queue position (joinStatus='waitlisted') */
  waitlistPosition?: number | null
  onAct?: () => void
  badge?: { text: string; pulse?: boolean; bg?: string }
  /** dim + desaturate the art (e.g. cancelled rows in Past) */
  dimImage?: boolean
  featured?: boolean
  showStatusBadge?: boolean
  /** computed elsewhere when lists share one clock; defaults to read-time */
  status?: MatchStatus
  saved?: boolean
  onToggleSave?: () => void
  metaText?: string
  hostNote?: string
}

export function MatchCard({
  match,
  host,
  players = [],
  action = 'view',
  attended = false,
  joinStatus = null,
  waitlistPosition = null,
  onAct,
  badge,
  dimImage = false,
  featured = false,
  showStatusBadge = true,
  status,
  saved,
  onToggleSave,
  metaText,
  hostNote,
}: MatchCardProps) {
  const navigate = useNavigate()
  const st = status ?? computeStatus(match)
  const dim = st === 'cancelled' || st === 'closed'
  const filled = match.total_spots - match.spots_available
  const imgH = featured ? 140 : 118
  const detailHref = `/matches/${match.id}`

  /* Location line on the card art: court name · court no. · indoor/outdoor.
     Never repeat the venue name (courtLabel falls back to it), and pull the
     indoor/outdoor setting from the curated venue when we know it. */
  const setting = match.venue_id ? VENUES.find((v) => v.id === match.venue_id)?.setting ?? null : null
  const locationLine = match.sport === 'running'
    ? [match.venue_name, match.route_end].filter(Boolean).join(' · ')
    : [match.venue_name, match.court_number, setting].filter(Boolean).join(' · ')

  const done = joinStatus === 'joined' || joinStatus === 'requested'
  const joinLabel = joinStatus === 'joined' ? 'Joined' : joinStatus === 'requested' ? 'Requested' : match.join_mode === 'approval' ? 'Request' : 'Join'

  const onCardClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('a,button')) return
    navigate(detailHref)
  }

  /* footer action */
  let actionEl: ReactNode
  if (lifecycleHasAction(st)) {
    actionEl = <LifecycleAction status={st} matchId={match.id} />
  } else if (action === 'join' && joinStatus !== 'joined' && st === 'full') {
    // full match → the join CTA becomes the waitlist (any join_mode, §5)
    actionEl =
      joinStatus === 'waitlisted' ? (
        <span
          className="inline-flex h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border-none px-[15px] text-[12.5px] font-semibold tracking-[0.01em]"
          style={{ background: 'rgba(26,26,26,0.10)', color: 'rgba(26,26,26,0.6)' }}
        >
          <Hourglass size={12} strokeWidth={2.1} />
          On waitlist{waitlistPosition != null && (
            <span className="nums-tabular ltr-nums">· #{waitlistPosition}</span>
          )}
        </span>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAct?.()
          }}
          className="inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-pill border-none px-[17px] text-[12.5px] font-semibold tracking-[0.01em] transition-colors"
          style={{
            background: 'var(--color-info)', // full · locked-in lifecycle token
            color: 'var(--color-text-onbrand)',
            boxShadow: '0 8px 18px -8px var(--color-info)',
          }}
        >
          <ListPlus size={13} strokeWidth={2.2} />
          Join waitlist
        </button>
      )
  } else if (action === 'join' && joinStatus !== 'joined' && joinStatus !== 'requested' && match.join_mode === 'invite') {
    // invite is a personal offer, not a public listing slot (§5) — no public join CTA
    actionEl = (
      <span
        className="inline-flex h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border bg-transparent px-[15px] text-[12.5px] font-semibold tracking-[0.01em]"
        style={{ borderColor: 'rgba(26,26,26,0.14)', color: 'var(--color-text-faint)' }}
      >
        <Lock size={12} strokeWidth={2.1} />
        Invite only
      </span>
    )
  } else if (action === 'join') {
    actionEl = (
      <button
        disabled={done}
        onClick={(e) => {
          e.stopPropagation()
          if (!done) onAct?.()
        }}
        className="inline-flex h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border-none px-[17px] text-[12.5px] font-semibold tracking-[0.01em] transition-colors"
        style={{
          cursor: done ? 'default' : 'pointer',
          background: joinStatus === 'requested' ? 'var(--color-text)' : done ? 'rgba(26,26,26,0.10)' : 'var(--color-brand)',
          color: joinStatus === 'joined' ? 'rgba(26,26,26,0.6)' : 'var(--color-text-onbrand)',
          boxShadow: done ? 'none' : '0 8px 18px -8px var(--color-brand)',
        }}
      >
        {done ? (
          <Check size={12} strokeWidth={2.6} />
        ) : match.join_mode === 'approval' ? (
          <Send size={12} strokeWidth={2.1} className="-me-px" />
        ) : (
          <Plus size={13} strokeWidth={2.5} />
        )}
        {joinLabel}
      </button>
    )
  } else if (action === 'edit') {
    actionEl = (
      <Link
        to={`/matches/${match.id}/edit`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex h-10 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-pill border-[1.5px] bg-transparent px-[18px] text-[13px] font-medium tracking-[0.01em] text-brand no-underline transition-colors hover:bg-brand/6"
        style={{ borderColor: 'color-mix(in srgb, var(--color-brand) 33%, transparent)' }}
      >
        <Pencil size={12} strokeWidth={1.9} /> Edit
      </Link>
    )
  } else if (action === 'attend') {
    actionEl = (
      <button
        onClick={(e) => {
          e.stopPropagation()
          onAct?.()
        }}
        className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-pill border-none px-[18px] text-[13px] font-semibold tracking-[0.01em] transition-colors"
        style={{
          background: attended ? 'rgba(26,26,26,0.10)' : 'var(--color-brand)',
          color: attended ? 'rgba(26,26,26,0.6)' : 'var(--color-text-onbrand)',
          boxShadow: attended ? 'none' : '0 8px 20px -6px var(--color-brand)',
        }}
      >
        {attended ? <Check size={13} strokeWidth={2.6} /> : <CalendarCheck size={14} strokeWidth={2} />}
        {attended ? 'Attended' : 'Attend'}
      </button>
    )
  } else if (action === 'cancel') {
    actionEl = (
      <button
        onClick={(e) => {
          e.stopPropagation()
          onAct?.()
        }}
        className="inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-[5px] whitespace-nowrap rounded-pill border bg-transparent px-[15px] text-[12.5px] font-semibold tracking-[0.01em] transition-colors hover:bg-ink/4 hover:text-ink"
        style={{ borderColor: 'rgba(26,26,26,0.16)', color: 'rgba(26,26,26,0.6)' }}
      >
        <X size={13} strokeWidth={2.2} />
        Cancel
      </button>
    )
  } else {
    actionEl = (
      <span
        className="inline-flex h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border-[1.5px] bg-transparent px-4 text-[12.5px] font-semibold tracking-[0.01em] text-brand"
        style={{ borderColor: 'color-mix(in srgb, var(--color-brand) 33%, transparent)' }}
      >
        <Eye size={13} strokeWidth={2} />
        View
      </span>
    )
  }

  return (
    <div
      onClick={onCardClick}
      className="block cursor-pointer overflow-hidden rounded-[22px] border bg-card shadow-card transition-transform hover:-translate-y-px"
      style={{ borderColor: 'rgba(26,26,26,0.08)' }}
    >
      {/* image header */}
      <div
        className="relative transition-[filter] duration-250"
        style={{
          height: imgH,
          opacity: dimImage ? 0.55 : 1,
          filter: dim ? 'grayscale(0.6) brightness(0.92)' : dimImage ? 'grayscale(0.5)' : 'none',
        }}
      >
        <SportArt type={artType(match)} />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 20%, transparent) 0%, transparent 50%)' }}
        />
        <div className="absolute start-3.5 top-3 text-[10.5px] font-medium uppercase tracking-[0.18em]" style={{ color: 'rgba(244,240,232,0.92)' }}>
          {locationLine}
        </div>
        {onToggleSave && (
          <button
            aria-label={saved ? 'Remove from saved' : 'Save'}
            onClick={(e) => {
              e.stopPropagation()
              onToggleSave()
            }}
            className="absolute end-2.5 top-2.5 z-2 inline-flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border-none text-onbrand backdrop-blur-[8px] transition-colors"
            style={{
              background: saved ? 'var(--color-brand)' : 'rgba(26,26,26,0.42)',
              boxShadow: saved ? '0 6px 14px -6px var(--color-brand)' : 'none',
            }}
          >
            <Bookmark size={13} strokeWidth={1.8} fill={saved ? 'currentColor' : 'none'} />
          </button>
        )}
        {showStatusBadge && !badge && <StatusBadge status={st} />}
        {badge && (
          <div
            className="absolute bottom-[11px] start-3.5 inline-flex items-center gap-[7px] rounded-pill py-1 ps-[9px] pe-2.5 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-onbrand backdrop-blur-[8px]"
            style={{ background: badge.bg ?? 'rgba(26,26,26,0.62)' }}
          >
            <span className={`h-[4.5px] w-[4.5px] rounded-full bg-onbrand ${badge.pulse ? 'conn-pulse' : ''}`} />
            {badge.text}
          </div>
        )}
        <div className="absolute bottom-2.5 end-3.5 text-[10.5px] font-medium uppercase tracking-[0.16em]" style={{ color: 'rgba(244,240,232,0.7)' }}>
          {sportLabel(match.sport)}
        </div>
      </div>

      {/* body */}
      <div className="px-[18px] pt-[18px] pb-4">
        <h2
          className="m-0 font-display font-normal transition-colors"
          style={{
            fontSize: featured ? 30 : 26,
            lineHeight: 1.05,
            letterSpacing: '-0.015em',
            color: dim ? 'var(--color-text-faint)' : 'var(--color-text)',
          }}
        >
          {matchKind(match)} <span className="italic" style={{ color: dim ? 'var(--color-text-faint)' : 'var(--color-brand)' }}>at</span>{' '}
          {courtLabel(match)}
        </h2>
        <div className="mt-3 flex items-center gap-3.5 text-[12.5px] nums-tabular" style={{ color: 'rgba(26,26,26,0.62)' }}>
          <span className="inline-flex items-center gap-[5px]">
            <Clock size={12} strokeWidth={2} />
            <span className="ltr-nums">{`${whenLabel(match.start_time)} · ${match.end_time ? timeRange(match) : hm(match.start_time)}`}</span>
          </span>
          <span className="inline-flex items-center gap-[5px]">
            <MapPin size={12} strokeWidth={2} />
            {match.venue_name.split(' ')[0]}
          </span>
        </div>
        {host && (
          <div className="mt-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            Hosted by <span className="font-semibold" style={{ color: 'rgba(26,26,26,0.78)' }}>{host.name}</span>
            {hostNote ? ` · ${hostNote}` : ''}
          </div>
        )}
        <LifecycleNote status={st} />
        <div className="mt-3.5 flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <AvatarStack initials={players.map(userInitials)} filled={filled} max={match.total_spots} />
            <span className="whitespace-nowrap text-[11.5px] nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
              {metaText ?? lifecycleSpots(st, match)}
            </span>
          </div>
          {actionEl}
        </div>
      </div>
    </div>
  )
}
