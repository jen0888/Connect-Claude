import { useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Clock, Layers, MapPin, MessageCircle, Send, Shield, Star, X, Zap } from 'lucide-react'
import { PadelCourtArt, RunPathArt, TennisCourtArt } from './SportArt'
import { OverlayHostContext } from './overlay'

/** Match-invitation approval bottom sheet (CLAUDE.md §3 "Editorial Calm").
 *  A host invited the current user to one of their matches; this sheet slides
 *  up over a dimmed Home screen and lets them Accept / Decline (or Waitlist a
 *  full match), then shows the resolved confirmation inline.
 *
 *  Self-contained on purpose: it takes the design-brief `person`/`match` shape
 *  (rating/reviews/open-spots), NOT the store `User`/`Match` types — so it can
 *  be dropped over any screen without a store dependency. Wire `onResolve` to
 *  the real side effects (calendar add, join chat, notify) at the call site. */

export interface InvitePerson {
  name: string
  first: string
  init: string
  accent: string
  level: string
  played: number
  /** Brief example carries a star rating; the live app deliberately doesn't
   *  track stars (CLAUDE.md §5 — trust = level/played/attendance), so these
   *  three plus the note are optional and their chips render only when given. */
  rating?: number
  reviews?: number
  km?: number
  attendance?: number // 0–100, shown in place of stars for live invites
  note?: string
}

export interface InviteMatch {
  sport: string
  type: string // padel | tennis | run(ning) | badminton — drives the thumbnail art
  kind: string // e.g. "Friendly doubles"
  court: string // e.g. "Court 1"
  venue: string
  when: string // e.g. "Thu · 19:00"
  span: string // e.g. "19:00–20:30"
  max: number
  filled: number
}

export interface Invite {
  person: InvitePerson
  match: InviteMatch
}

type Resolved = 'idle' | 'accepted' | 'declined' | 'waitlist'

const HAIRLINE = 'rgba(26,26,26,0.08)'
const SOFT_FILL = 'rgba(26,26,26,0.06)'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** 46px rounded court/route thumbnail for the summary strip. */
function MatchThumb({ type }: { type: string }) {
  const t = type.toLowerCase()
  const Art = t.startsWith('run') ? RunPathArt : t.startsWith('tennis') ? TennisCourtArt : PadelCourtArt
  return (
    <span className="block h-[46px] w-[46px] shrink-0 overflow-hidden rounded-[12px]" style={{ border: `1px solid ${HAIRLINE}` }}>
      <Art />
    </span>
  )
}

/** Trust-signal chips under the person's name. */
function StatChips({ person }: { person: InvitePerson }) {
  const chips: { icon: React.ReactNode; label: React.ReactNode; key: string }[] = [
    { key: 'level', icon: <Shield size={12} strokeWidth={1.9} />, label: <span>{person.level}</span> },
    ...(person.rating != null
      ? [
          {
            key: 'rating',
            icon: <Star size={12.5} strokeWidth={1.9} />,
            label: (
              <span>
                <strong className="font-semibold text-ink">{person.rating}</strong>
                {person.reviews != null && <> ({person.reviews})</>}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'played',
      icon: <Zap size={13} strokeWidth={1.9} />,
      label: (
        <span>
          <strong className="font-semibold text-ink">{person.played}</strong> played
        </span>
      ),
    },
    ...(person.attendance != null
      ? [{ key: 'attendance', icon: <Check size={13} strokeWidth={2.2} />, label: <span>{person.attendance}% attendance</span> }]
      : []),
    ...(person.km != null ? [{ key: 'km', icon: <MapPin size={12} strokeWidth={1.9} />, label: <span>{person.km} km</span> }] : []),
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {chips.map((c, i) => (
        <span key={c.key} className="inline-flex items-center gap-[5px] whitespace-nowrap text-[11.5px] font-medium nums-tabular ltr-nums" style={{ color: 'var(--color-text-muted)' }}>
          {i > 0 && <span className="-ms-[7px] h-[3px] w-[3px] rounded-full opacity-50" style={{ background: 'var(--color-text-faint)' }} />}
          <span className="inline-flex" style={{ color: c.key === 'rating' ? 'var(--color-accent)' : 'var(--color-text-faint)' }}>
            {c.icon}
          </span>
          {c.label}
        </span>
      ))}
    </div>
  )
}

export function InviteApprovalSheet({
  invite,
  open,
  onClose,
  onResolve,
  onDefer,
}: {
  invite: Invite
  open: boolean
  onClose: () => void
  onResolve: (state: 'accepted' | 'declined' | 'waitlist') => void
  /** "Decide later" — dismisses without resolving, leaving the invite pending.
   *  When provided, the decision area shows Accept (primary) · Decide later · Decline. */
  onDefer?: () => void
}) {
  const { person, match } = invite
  const titleId = useId()
  const overlayHost = useContext(OverlayHostContext)

  // mount/visibility split so the panel can play an exit animation before unmounting
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false) // starts off-screen so it always plays the slide-in
  const [resolved, setResolved] = useState<Resolved>('idle')

  const reduce = prefersReducedMotion()
  const sheetRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)

  const isFull = match.filled >= match.max
  const openSpots = Math.max(0, match.max - match.filled)
  const primary = isFull
    ? { state: 'waitlist' as const, color: 'var(--color-info)', icon: <Layers size={15} strokeWidth={2.2} />, short: 'Waitlist', long: 'Join the waitlist' }
    : { state: 'accepted' as const, color: 'var(--color-success)', icon: <Check size={15} strokeWidth={2.4} />, short: 'Accept', long: 'Accept invitation' }

  // Drive entrance/exit purely from `open`. All setState happens inside
  // rAF/timeout callbacks (never synchronously in the effect body) so the
  // panel mounts at translateY(100%) then transitions in, and stays mounted
  // through the reverse before unmounting + restoring focus.
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement
      let raf2 = 0
      const raf1 = requestAnimationFrame(() => {
        setMounted(true)
        setResolved('idle')
        raf2 = requestAnimationFrame(() => setShown(true))
      })
      return () => {
        cancelAnimationFrame(raf1)
        cancelAnimationFrame(raf2)
      }
    }
    let t = 0
    const raf = requestAnimationFrame(() => {
      setShown(false)
      t = window.setTimeout(
        () => {
          setMounted(false)
          ;(triggerRef.current as HTMLElement | null)?.focus?.()
        },
        reduce ? 0 : 280,
      )
    })
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [open, reduce])

  // focus into the sheet once it's on screen
  useEffect(() => {
    if (shown) sheetRef.current?.focus()
  }, [shown])

  // Esc to close + simple focus trap while open
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const root = sheetRef.current
      if (!root) return
      const focusable = root.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement
      if (e.shiftKey && (active === first || active === root)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  // swipe-down-to-dismiss on the grabber (nice-to-have)
  const dragRef = useRef<{ startY: number; dy: number } | null>(null)
  const onGrabberPointerDown = (e: React.PointerEvent) => {
    if (reduce) return
    dragRef.current = { startY: e.clientY, dy: 0 }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onGrabberPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d || !sheetRef.current) return
    d.dy = Math.max(0, e.clientY - d.startY)
    sheetRef.current.style.transition = 'none'
    sheetRef.current.style.transform = `translateY(${d.dy}px)`
  }
  const endGrabberDrag = () => {
    const d = dragRef.current
    const el = sheetRef.current
    dragRef.current = null
    if (!d || !el) return
    el.style.transition = ''
    el.style.transform = ''
    if (d.dy > 90) onClose()
  }

  if (!mounted) return null

  const first = person.first
  const headerTitle =
    resolved === 'accepted' ? (
      "You're in!"
    ) : resolved === 'waitlist' ? (
      'Added to waitlist'
    ) : resolved === 'declined' ? (
      'Declined'
    ) : (
      <>
        {first} <span className="italic text-brand">invited</span> you to play
      </>
    )

  const resolve = (state: Exclude<Resolved, 'idle'>) => {
    setResolved(state)
    onResolve(state)
  }

  return createPortal(
    // Frame-scoped overlay — fills the phone frame's overlay host (which sits
    // above the bottom nav), so the dim + sheet cover the tab bar but stay
    // clipped to the 430px column on desktop. pointer-events-auto re-enables
    // taps (the host itself is pointer-events-none until filled).
    <div
      onClick={onClose}
      className="pointer-events-auto absolute inset-0 z-[100] flex items-end justify-center"
      style={{
        background: 'rgba(26,26,26,0.42)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        opacity: reduce ? 1 : shown ? 1 : 0,
        transition: reduce ? undefined : 'opacity 0.28s ease',
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="flex max-h-[90%] w-full max-w-[430px] flex-col rounded-t-[28px] bg-card outline-none"
        style={{
          boxShadow: '0 -24px 60px -24px rgba(26,26,26,0.6)',
          transform: reduce ? 'none' : shown ? 'translateY(0)' : 'translateY(100%)',
          transition: reduce ? undefined : `transform ${shown ? '0.42s' : '0.28s'} cubic-bezier(0.2,0.8,0.2,1)`,
        }}
      >
        {/* grabber */}
        <div
          className="flex shrink-0 cursor-grab touch-none justify-center pt-4 pb-1 active:cursor-grabbing"
          onPointerDown={onGrabberPointerDown}
          onPointerMove={onGrabberPointerMove}
          onPointerUp={endGrabberDrag}
          onPointerCancel={endGrabberDrag}
        >
          <span className="h-1 w-[38px] rounded-pill" style={{ background: 'rgba(26,26,26,0.18)' }} />
        </div>

        <div
          className="scroll-area flex min-h-0 flex-col overflow-y-auto px-[22px]"
          style={{ scrollbarWidth: 'none', overscrollBehavior: 'contain', paddingBottom: 'max(36px, calc(env(safe-area-inset-bottom, 0px) + 20px))' }}
        >
          {/* header */}
          <div className="flex items-start gap-3 pt-2">
            <div className="min-w-0 flex-1">
              <div className="mb-2 inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase text-brand" style={{ letterSpacing: '0.18em' }}>
                <Send size={12} strokeWidth={2} />
                Match invitation
              </div>
              <h2 id={titleId} className="m-0 font-display text-[29px] font-normal leading-[1.08]" style={{ letterSpacing: '-0.015em' }}>
                {headerTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss"
              className="inline-flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none"
              style={{ background: SOFT_FILL, color: 'var(--color-text-muted)' }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {resolved === 'idle' ? (
            <>
              {/* match summary strip */}
              <div className="mt-[18px] flex items-center gap-3 rounded-[16px] px-3.5 py-3" style={{ border: `1px solid ${HAIRLINE}` }}>
                <MatchThumb type={match.type} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[18px] leading-[1.15] text-ink" style={{ letterSpacing: '-0.01em' }}>
                    {match.kind} · {match.court}
                  </div>
                  <div className="mt-[5px] flex min-w-0 items-center gap-1.5 truncate text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                    <Clock size={12.5} strokeWidth={1.9} className="shrink-0" />
                    <span className="ltr-nums">{match.when}</span>
                    <span className="opacity-50">·</span>
                    <span className="truncate">{match.venue}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end self-stretch justify-center ps-3.5 text-end" style={{ borderInlineStart: `1px solid ${HAIRLINE}` }}>
                  <div className="font-display text-[26px] leading-none nums-tabular" style={{ color: 'var(--color-accent)' }}>
                    {openSpots}
                  </div>
                  <div className="mt-1 text-[9.5px] font-bold uppercase" style={{ letterSpacing: '0.16em', color: 'var(--color-text-faint)' }}>
                    Spots
                  </div>
                </div>
              </div>

              {/* profile peek */}
              <div className="mt-3 rounded-[18px] bg-page px-4 py-[15px]">
                <div className="flex items-center gap-[13px]">
                  <span
                    className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full font-display italic text-onbrand"
                    style={{ background: person.accent, fontSize: 22, letterSpacing: '0.02em', boxShadow: '0 4px 12px -6px rgba(26,26,26,0.4)' }}
                  >
                    {person.init}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-[3px] text-[10px] font-bold uppercase" style={{ letterSpacing: '0.16em', color: 'var(--color-text-faint)' }}>
                      Invited by
                    </div>
                    <div className="truncate font-display text-[23px] leading-none" style={{ letterSpacing: '-0.012em' }}>
                      {person.name}
                    </div>
                    <div className="mt-1.5">
                      <StatChips person={person} />
                    </div>
                  </div>
                </div>
                {/* invite note */}
                {person.note && (
                  <div className="mt-3 flex gap-[9px] border-t pt-3" style={{ borderColor: HAIRLINE }}>
                    <MessageCircle size={14} strokeWidth={1.9} className="mt-px shrink-0 text-brand" />
                    <p className="m-0 font-display text-[16px] italic leading-[1.4]" style={{ letterSpacing: '-0.005em', color: 'rgba(26,26,26,0.78)' }}>
                      “{person.note}”
                    </p>
                  </div>
                )}
              </div>

              {/* full-match → waitlist info note */}
              {isFull && (
                <div
                  className="mt-3 flex items-start gap-2.5 rounded-[14px] px-3.5 py-3"
                  style={{ background: 'color-mix(in srgb, var(--color-info) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-info) 20%, transparent)' }}
                >
                  <Layers size={15} strokeWidth={2} className="mt-px shrink-0" style={{ color: 'var(--color-info)' }} />
                  <p className="m-0 text-[12px] leading-[1.4]" style={{ color: 'var(--color-text-muted)' }}>
                    Your match is full ({match.filled}/{match.max}). You can <strong className="font-semibold" style={{ color: 'var(--color-info)' }}>waitlist</strong> {first} — they'll join automatically if a spot opens.
                  </p>
                </div>
              )}

              {/* actions sit directly below the content (content-sized half sheet) */}
              <div className="pt-5">
              {/* decision buttons — 3-action (Accept · Decide later · Decline)
                  when a defer handler is supplied, else the classic 2-up row. */}
              {onDefer ? (
                <div className="mt-4 flex flex-col gap-2.5">
                  {/* primary — Accept / Waitlist, full width */}
                  <button
                    type="button"
                    onClick={() => resolve(primary.state)}
                    className="inline-flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-pill border-none text-[15px] font-semibold text-onbrand"
                    style={{ background: primary.color, boxShadow: `0 12px 24px -10px ${primary.color}` }}
                  >
                    {primary.icon} {primary.long}
                  </button>
                  {/* secondary — Decide later (neutral) · Decline (quietest) */}
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={onDefer}
                      className="inline-flex h-[48px] flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-pill bg-transparent text-[14px] font-semibold text-ink"
                      style={{ border: '1.5px solid rgba(26,26,26,0.16)' }}
                    >
                      <Clock size={15} strokeWidth={2} /> Decide later
                    </button>
                    <button
                      type="button"
                      onClick={() => resolve('declined')}
                      className="inline-flex h-[48px] flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-pill bg-transparent text-[14px] font-semibold"
                      style={{ color: 'color-mix(in srgb, var(--color-danger) 78%, transparent)' }}
                    >
                      <X size={15} strokeWidth={2.2} /> Decline
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => resolve('declined')}
                    className="inline-flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-pill bg-transparent text-[15px] font-semibold"
                    style={{ color: 'var(--color-danger)', border: '1.5px solid color-mix(in srgb, var(--color-danger) 27%, transparent)' }}
                  >
                    <X size={15} strokeWidth={2.4} /> Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => resolve(primary.state)}
                    className="inline-flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-pill border-none text-[15px] font-semibold text-onbrand"
                    style={{ background: primary.color, boxShadow: `0 12px 24px -10px ${primary.color}` }}
                  >
                    {primary.icon} {primary.short}
                  </button>
                </div>
              )}

              {/* footer microcopy */}
              <p className="mt-3 mb-0 text-center text-[11px] leading-[1.4]" style={{ color: 'var(--color-text-muted)' }}>
                {onDefer ? 'Accepting adds it to your calendar and chat · Decide later keeps it in your invites.' : 'Accepting adds this to your calendar and the match chat.'}
              </p>
              </div>
            </>
          ) : (
            <ResolvedBlock resolved={resolved} match={match} first={first} onClose={onClose} />
          )}
        </div>
      </div>
    </div>,
    overlayHost ?? document.body,
  )
}

/** The post-decision body that replaces the summary/buttons/footer (items 3–6). */
function ResolvedBlock({ resolved, match, first, onClose }: { resolved: Exclude<Resolved, 'idle'>; match: InviteMatch; first: string; onClose: () => void }) {
  const waitlist = resolved === 'waitlist'
  const declined = resolved === 'declined'

  const color = declined ? 'var(--color-text-faint)' : waitlist ? 'var(--color-info)' : 'var(--color-success)'
  const Icon = declined ? X : waitlist ? Layers : Check
  const title = declined ? 'Invitation declined' : waitlist ? 'On the waitlist' : "You're in"
  const body = declined
    ? `${first} won't be notified harshly — just a quiet no.`
    : waitlist
      ? `${first} is first on the waitlist. We'll add them if a spot opens.`
      : `${match.kind} · ${match.court} is on your calendar and in your chats.`

  return (
    <>
      <div
        className="mt-[18px] flex items-start gap-2.5 rounded-[14px] px-3.5 py-3"
        style={{
          background: declined ? SOFT_FILL : `color-mix(in srgb, ${color} 8%, transparent)`,
          border: `1px solid ${declined ? HAIRLINE : `color-mix(in srgb, ${color} 20%, transparent)`}`,
        }}
      >
        <span
          className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
          style={{ background: declined ? 'rgba(26,26,26,0.10)' : color, color: declined ? 'var(--color-text-muted)' : '#fff' }}
        >
          <Icon size={15} strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold" style={{ color: declined ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
            {title}
          </div>
          <div className="mt-px text-[11.5px] leading-[1.4]" style={{ color: 'var(--color-text-muted)' }}>
            {body}
          </div>
        </div>
      </div>

      {declined ? (
        <button
          type="button"
          onClick={onClose}
          className="mt-5 inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-pill border-none text-[15px] font-semibold text-onbrand"
          style={{ background: 'var(--color-text)' }}
        >
          Done
        </button>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="mt-5 inline-flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-pill border-none text-[15px] font-semibold text-onbrand"
          style={{ background: 'var(--color-brand)', boxShadow: '0 12px 28px -10px var(--color-brand)' }}
        >
          <MessageCircle size={16} strokeWidth={2} /> Open match chat
        </button>
      )}
    </>
  )
}
