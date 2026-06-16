import type { MouseEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bookmark, CalendarCheck, Check, ChevronRight, Clock, Eye, Gauge, Hourglass, ListPlus, Lock, MapPin, Pencil, Plus, Send, UserPlus, UserRound, X } from 'lucide-react'
import type { Match, MatchStatus, User } from '@/lib/types'
import { artType, courtLabel, courtNumberLabel, dayDateLabel, hm, matchKind, skillRangeText, sportLabel, timeRange, whenLabel, initials as userInitials } from '@/lib/format'
import { computeStatus } from '@/lib/status'
import { useI18n } from '@/i18n'
import { VENUES } from '@/lib/mock/venues'
import { AvatarStack } from './Avatar'
import { SportArt } from './SportArt'
import { LadiesBadge } from './LadiesBadge'
import { LifecycleAction, LifecycleChip, LifecycleNote, StatusBadge, lifecycleHasAction, lifecycleSpots } from './lifecycle'

/** THE canonical match card (home-screens.jsx MatchCard) — one component
 *  reused on Home, Discover, All Matches and first-timer surfaces.
 *  Never create per-page card variants (CLAUDE.md §4/§8).
 *
 *  action: 'view'   – matches you're already in (outlined View pill, card links)
 *          'join'   – open matches (filled Join; Request when approval mode)
 *          'cancel' – pending request (outlined Cancel)
 *          'edit'   – matches you host (outlined pencil Edit → edit screen)
 *          'attend' – NEXT UP check-in (filled Attend ⇄ success "Checked in"); the
 *                     caller gates visibility by the read-time window (§5)
 *  badge:  optional { text, pulse } dark pill on the image (e.g. Awaiting host) */
export interface MatchCardProps {
  match: Match
  host?: User | null
  players?: User[]
  /** 'full' (default) = the tall image-header card; 'brief' = a condensed
   *  horizontal row (Home "This week" / "Matches you saved"). SAME component —
   *  never a separate per-section card (CLAUDE.md §4/§8). */
  variant?: 'brief' | 'full'
  action?: 'view' | 'join' | 'cancel' | 'edit' | 'attend'
  /** checked-in state (action='attend') — true once the viewer has tapped attend
   *  (match_players.attended === true). Positive-only; never reflects a no-show. */
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
  /** brief variant only: render the lifecycle status pill (Just played / Closed /
   *  Cancelled) in the card's bottom-right corner and DROP the left meta caption.
   *  Used by the Past archives (hosting + My Matches) — CLAUDE.md §4. */
  statusCorner?: boolean
  hostNote?: string
  /** host-only passive indicator: count of pending join requests on an approval
   *  match (Home "You're hosting"). Renders a count pill that taps through to
   *  Match Details. 0/undefined hides it. Never forks the card (CLAUDE.md §4). */
  requestCount?: number
  /** viewer is barred by the match's 'ladies' gender restriction (computed by the
   *  caller from the viewer's gender). Replaces the join/request/waitlist CTA with
   *  a disabled, non-judgmental "Women only" state (CLAUDE.md §6). */
  genderBlocked?: boolean
}

export function MatchCard({
  match,
  host,
  players = [],
  variant = 'full',
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
  statusCorner = false,
  hostNote,
  requestCount = 0,
  genderBlocked = false,
}: MatchCardProps) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const ladies = match.gender_restriction === 'ladies'
  // a male viewer on a 'ladies' match: no tappable join CTA — a disabled state instead
  const blocked = genderBlocked && action === 'join' && joinStatus !== 'joined'
  // pending approval request: shown on Home "This week" with a Requested badge +
  // a non-actionable "Request pending" CTA (never a Join button) — CLAUDE.md §5
  const requested = joinStatus === 'requested'
  // queued on a full match — shown on Home "My Matches" with an "On waitlist · #N"
  // badge (passive; leave from Chat Alerts / Match Details) — CLAUDE.md §5
  const waitlisted = joinStatus === 'waitlisted'
  const st = status ?? computeStatus(match)
  const dim = st === 'cancelled' || st === 'closed'
  const filled = match.total_spots - match.spots_available
  // The host always occupies a spot, so they should head the avatar stack even
  // if the joined-players list hasn't hydrated yet (e.g. a freshly created match).
  const roster = host && !players.some((p) => p.id === host.id) ? [host, ...players] : players
  const imgH = featured ? 140 : 118
  const detailHref = `/matches/${match.id}`

  /* Location line on the card art: court name · court no. · indoor/outdoor.
     Never repeat the venue name (courtLabel falls back to it), and pull the
     indoor/outdoor setting from the curated venue when we know it. */
  const setting = match.venue_id ? VENUES.find((v) => v.id === match.venue_id)?.setting ?? null : null
  // Running matches show a start → end route (or a loop) instead of a venue/court.
  const isRun = match.sport === 'running'
  const runStart = match.route_start ?? match.venue_name
  const runEnd = match.round_trip ? 'Loop · back to start' : match.route_end
  const locationLine = isRun ? (
    runEnd ? (
      <span className="min-w-0">
        {runStart}
        <span className="inline-block px-1 opacity-40 rtl:rotate-180">→</span>
        {runEnd}
      </span>
    ) : (
      runStart
    )
  ) : (
    [match.venue_name, setting].filter(Boolean).join(' · ')
  )
  // second line under the location: distance for runs, court no. for court sports
  const courtText = isRun
    ? match.distance_km
      ? `${match.distance_km} km`
      : null
    : courtNumberLabel(match.court_number)

  const done = joinStatus === 'joined' || joinStatus === 'requested'
  const joinLabel = joinStatus === 'joined' ? 'Joined' : joinStatus === 'requested' ? 'Requested' : match.join_mode === 'approval' ? 'Request' : 'Join'

  const onCardClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('a,button')) return
    navigate(detailHref)
  }

  /* footer action */
  let actionEl: ReactNode
  if (action === 'attend') {
    // NEXT UP attend check-in (§5): a low-friction POSITIVE presence signal,
    // never a no-show verdict. The caller (Home) gates *whether* this renders by
    // the read-time window (`attendCheckInOpen`); here it just reflects the
    // checked-in state. Takes priority over the lifecycle action so it is honored
    // through the live + just-played window too. Idempotent — once checked in it
    // shows a clear "Checked in" state; tapping again only returns to neutral.
    actionEl = (
      <button
        onClick={(e) => {
          e.stopPropagation()
          onAct?.()
        }}
        aria-pressed={attended}
        className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-pill border-none px-[18px] text-[13px] font-semibold tracking-[0.01em] transition-colors"
        style={{
          background: attended ? 'color-mix(in srgb, var(--color-success) 13%, transparent)' : 'var(--color-brand)',
          color: attended ? 'var(--color-success)' : 'var(--color-text-onbrand)',
          boxShadow: attended ? 'none' : '0 8px 20px -6px var(--color-brand)',
        }}
      >
        {attended ? <Check size={13} strokeWidth={2.6} /> : <CalendarCheck size={14} strokeWidth={2} />}
        {attended ? t('match.action.checkedIn') : t('match.action.attend')}
      </button>
    )
  } else if (requested) {
    // pending approval request → actionable "Cancel request" (withdraw, §5).
    // The Ladies-only badge stacks above this button in the render below.
    actionEl = (
      <button
        onClick={(e) => {
          e.stopPropagation()
          onAct?.()
        }}
        className="inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-pill border bg-transparent px-[15px] text-[12px] font-semibold tracking-[0.01em] transition-colors"
        style={{ borderColor: 'color-mix(in srgb, var(--color-warning) 40%, transparent)', color: 'var(--color-warning)' }}
      >
        <X size={12} strokeWidth={2.2} />
        {t('match.cancelRequest')}
      </button>
    )
  } else if (waitlisted) {
    // queued on a full match → passive "On waitlist · #N" (FIFO position, §5).
    // Works on any action (e.g. Home "My Matches" uses action="view").
    actionEl = (
      <span
        className="inline-flex h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border-none px-[15px] text-[12.5px] font-semibold tracking-[0.01em]"
        style={{ background: 'rgba(26,26,26,0.10)', color: 'rgba(26,26,26,0.6)' }}
      >
        <Hourglass size={12} strokeWidth={2.1} />
        On waitlist{waitlistPosition != null && (
          <span className="nums-tabular ltr-nums">&nbsp;· #{waitlistPosition}</span>
        )}
      </span>
    )
  } else if (lifecycleHasAction(st)) {
    actionEl = <LifecycleAction status={st} matchId={match.id} />
  } else if (blocked) {
    // ladies-only gate, surfaced kindly — disabled, no modal, no shaming (§6)
    actionEl = (
      <span
        className="inline-flex h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border bg-transparent px-[15px] text-[12px] font-semibold tracking-[0.01em]"
        style={{ borderColor: 'rgba(26,26,26,0.12)', color: 'var(--color-text-faint)' }}
      >
        <UserRound size={12} strokeWidth={2} />
        {t('match.gender.womenOnly')}
      </span>
    )
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
  } else if (action === 'join' && joinStatus !== 'joined' && match.join_mode === 'invite') {
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
          background: done ? 'rgba(26,26,26,0.10)' : 'var(--color-brand)',
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

  /* brief = condensed horizontal row (Home "This week" / "Matches you saved").
     Same component, same props (action / saved / onToggleSave) — just a
     compact layout (CLAUDE.md §4: never a per-section card). */
  if (variant === 'brief') {
    return (
      <div
        onClick={onCardClick}
        className="flex shrink-0 cursor-pointer items-stretch overflow-hidden rounded-[18px] border bg-card shadow-row transition-transform hover:-translate-y-px"
        style={{ borderColor: 'rgba(26,26,26,0.08)' }}
      >
        {/* left art panel — sport · day · time */}
        <div
          className="relative w-[96px] shrink-0"
          style={{ filter: dim ? 'grayscale(0.6) brightness(0.92)' : dimImage ? 'grayscale(0.5)' : 'none', opacity: dimImage ? 0.55 : 1 }}
        >
          <div className="absolute inset-0">
            <SportArt type={artType(match)} />
          </div>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 22%, transparent) 0%, transparent 55%)' }}
          />
          {/* Past archives show weekday + date + month ("Thu 23 May") so a
              finished match reads unambiguously; elsewhere the relative label
              ("Today"/"Mon"). */}
          <div className="absolute start-2 top-2 max-w-[80px] text-[9.5px] font-semibold uppercase leading-tight tracking-[0.16em]" style={{ color: 'rgba(244,240,232,0.92)' }}>
            {statusCorner ? dayDateLabel(match.start_time) : whenLabel(match.start_time)}
          </div>
          {/* result chip (e.g. Past archive: Won / Cancelled) — brief honors the
              same `badge` prop as the full card, so neither forks (CLAUDE.md §4) */}
          {badge && (
            <div
              className="absolute end-1.5 top-1.5 inline-flex items-center rounded-pill px-[7px] py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-onbrand backdrop-blur-[6px]"
              style={{ background: badge.bg ?? 'rgba(26,26,26,0.62)' }}
            >
              {badge.text}
            </div>
          )}
          <div className="absolute bottom-2 start-2 font-display text-[20px] leading-none text-onbrand ltr-nums">{hm(match.start_time)}</div>
        </div>

        {/* right content */}
        <div className="flex min-w-0 flex-1 flex-col justify-between px-3.5 pt-[11px] pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
                <span className="inline-flex items-center gap-[5px]">
                  <span className="h-[5px] w-[5px] rounded-full bg-accent" />
                  {sportLabel(match.sport)}
                </span>
                <span className="text-[16px] leading-none" style={{ color: 'var(--color-text)' }}>·</span>
                <span className="truncate">{match.venue_name}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 truncate font-display text-[19px] leading-[1.1]" style={{ letterSpacing: '-0.012em', color: dim ? 'var(--color-text-faint)' : 'var(--color-text)' }}>
                  {match.name ? (
                    match.name
                  ) : (
                    <>
                      {matchKind(match)} <span className="italic" style={{ color: dim ? 'var(--color-text-faint)' : 'var(--color-brand)' }}>at</span> {courtLabel(match)}
                    </>
                  )}
                </div>
                {/* Ladies-only badge, in line with the match name */}
                {ladies && <LadiesBadge />}
              </div>
            </div>
            {onToggleSave && (
              <button
                aria-label={saved ? 'Remove from saved' : 'Save'}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSave()
                }}
                className="-me-1 -mt-0.5 inline-flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none transition-colors"
                style={{
                  background: saved ? 'var(--color-brand)' : 'rgba(26,26,26,0.06)',
                  color: saved ? 'var(--color-text-onbrand)' : 'var(--color-text-muted)',
                }}
              >
                <Bookmark size={10} strokeWidth={1.8} fill={saved ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>

          <div className="mt-[9px] flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <AvatarStack initials={roster.map(userInitials)} filled={filled} max={match.total_spots} accent="var(--color-accent)" />
              {/* Past archives drop the caption — the lifecycle chip in the corner
                  carries the state instead (CLAUDE.md §4). */}
              {!statusCorner && (
                <span className="truncate whitespace-nowrap text-[11px] nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
                  {metaText ?? lifecycleSpots(st, match)}
                </span>
              )}
            </div>
            {statusCorner ? (
              <LifecycleChip status={st} />
            ) : action === 'view' && !requested && !waitlisted ? (
              <span
                className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border rtl:rotate-180"
                style={{ color: 'var(--color-text-muted)', borderColor: 'rgba(26,26,26,0.12)' }}
              >
                <ChevronRight size={14} strokeWidth={2.2} />
              </span>
            ) : (
              actionEl
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onCardClick}
      // shrink-0: the card always sizes to its content. Without it, in a flex
      // column scroll container (e.g. My Matches) many cards shrink to fit the
      // viewport — collapsing to a clipped sliver of the image, footer cut off.
      className="block shrink-0 cursor-pointer overflow-hidden rounded-[22px] border bg-card shadow-card transition-transform hover:-translate-y-px"
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
        {onToggleSave && (
          <button
            aria-label={saved ? 'Remove from saved' : 'Save'}
            onClick={(e) => {
              e.stopPropagation()
              onToggleSave()
            }}
            className="absolute end-2.5 top-2.5 z-2 inline-flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-full border-none text-onbrand backdrop-blur-[8px] transition-colors"
            style={{
              background: saved ? 'var(--color-brand)' : 'rgba(26,26,26,0.42)',
              boxShadow: saved ? '0 6px 14px -6px var(--color-brand)' : 'none',
            }}
          >
            <Bookmark size={10} strokeWidth={1.8} fill={saved ? 'currentColor' : 'none'} />
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
        <div className="flex items-start justify-between gap-2.5">
          <h2
            className="m-0 min-w-0 font-display font-normal transition-colors"
            style={{
              fontSize: featured ? 30 : 26,
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              color: dim ? 'var(--color-text-faint)' : 'var(--color-text)',
            }}
          >
            {match.name ? (
              match.name
            ) : (
              <>
                {matchKind(match)} <span className="italic" style={{ color: dim ? 'var(--color-text-faint)' : 'var(--color-brand)' }}>at</span>{' '}
                {courtLabel(match)}
              </>
            )}
          </h2>
          {/* Ladies-only badge, in line with the match name */}
          {ladies && <span className="mt-1.5 shrink-0"><LadiesBadge /></span>}
        </div>
        <div className="mt-3 flex items-start gap-6 text-[12.5px] nums-tabular" style={{ color: 'rgba(26,26,26,0.62)' }}>
          <span className="inline-flex flex-col gap-1">
            <span className="inline-flex items-center gap-[5px]">
              <Clock size={12} strokeWidth={2} />
              <span className="ltr-nums">{`${whenLabel(match.start_time)} · ${match.end_time ? timeRange(match) : hm(match.start_time)}`}</span>
            </span>
            <span className="inline-flex items-center gap-[5px]">
              <Gauge size={12} strokeWidth={2} />
              <span className="ltr-nums">{skillRangeText(match.skill_min, match.skill_max)}</span>
            </span>
          </span>
          <span className="inline-flex flex-col gap-1">
            <span className="inline-flex items-center gap-[5px]">
              <MapPin size={12} strokeWidth={2} />
              {locationLine}
            </span>
            {courtText && (
              <span className="ps-[17px] ltr-nums">
                {!isRun && <span className="text-[16px] leading-none" style={{ color: 'var(--color-text)' }}>·</span>}{!isRun && ' '}{courtText}
              </span>
            )}
          </span>
        </div>
        {host && (
          <div className="mt-2 flex items-center justify-between gap-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            <span className="min-w-0 truncate">
              Hosted by <span className="font-semibold" style={{ color: 'rgba(26,26,26,0.78)' }}>{host.name}</span>
              {hostNote ? ` · ${hostNote}` : ''}
            </span>
            {/* host's pending-request count pill, inline-end of the "Hosted by" row */}
            {requestCount > 0 && (
              <Link
                to={detailHref}
                onClick={(e) => e.stopPropagation()}
                aria-label={`${requestCount} pending join ${requestCount === 1 ? 'request' : 'requests'} — review`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12.5px] font-semibold no-underline"
                style={{ background: 'var(--color-warning)', color: 'var(--color-text-onbrand)' }}
              >
                <UserPlus size={12} strokeWidth={2.2} />
                <span className="nums-tabular ltr-nums">{requestCount}</span> {requestCount === 1 ? 'request' : 'requests'}
              </Link>
            )}
          </div>
        )}
        <LifecycleNote status={st} />
        <div className="mt-3.5 flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <AvatarStack initials={roster.map(userInitials)} filled={filled} max={match.total_spots} />
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
