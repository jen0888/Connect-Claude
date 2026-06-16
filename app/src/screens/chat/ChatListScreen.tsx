import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Archive, ArchiveRestore, ArrowRight, Check, Layers, Lock, PenLine, Send, Trash2, UserPlus, Users, X } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Eyebrow } from '@/components/Eyebrow'
import { SportArt } from '@/components/SportArt'
import { useToast } from '@/components/Toast'
import { actions, archivedThreads, currentUserId, getUser, inboxThreads, isGroupThread, isThreadArchived, myHostRequests, myInvites, myWaitlistEntries, requestIsActionable, threadMessages, threadTitle, unreadCount, useDB, waitlistPosition } from '@/lib/store'
import { SwipeRow, type SwipeAction } from '@/screens/chat/SwipeRow'
import { usePersistedState } from '@/lib/usePersistedState'
import { artType, hm, initials, matchKind, courtLabel, whenLabel } from '@/lib/format'
import { computeStatus } from '@/lib/status'
import type { ChatThread } from '@/lib/types'

/** Chat tab — conversations inbox (chat.jsx ChatScreen). Match group threads
 *  + 1:1 DMs in one list; today's live match thread gets the pinned card.
 *  Notifications live here, inline in threads — no Home bell (CLAUDE.md §4). */

function threadTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000)
  if (days === 0) return hm(iso)
  if (days === 1) return 'Yesterday'
  if (days < 7) return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} ${d.getDate()}`
}

export function ChatListScreen() {
  const db = useDB()
  const navigate = useNavigate()
  const { showToast } = useToast()
  // persisted per-user so the chosen filter survives a refresh
  const [filter, setFilter] = usePersistedState<'all' | 'match' | 'dm' | 'alerts' | 'archive'>('chat:filter', 'all')

  const threads =
    filter === 'archive'
      ? archivedThreads(db)
      : inboxThreads(db).filter((t) =>
          filter === 'all' ? true : filter === 'match' ? t.match_id !== null : filter === 'dm' ? t.match_id === null : false,
        )
  const totalUnread = inboxThreads(db).reduce((n, t) => n + unreadCount(db, t.id), 0)

  // Notifications feed (Alerts pill): everything awaiting your review — invites
  // you've received (player), join requests on your matches (host), and your
  // waitlist standing (player). Surfaced on All + the dedicated Alerts filter.
  const invites = myInvites(db)
  const hostReqs = myHostRequests(db)
  const waitReviews = myWaitlistEntries(db)
  // only ACTIONABLE requests drive the badge/seen count — a request on a match
  // that just filled is read-time expired (§5) and shows disabled, not unread.
  const actionableReqs = hostReqs.filter((r) => requestIsActionable(db, r))
  const notifCount = invites.length + actionableReqs.length + waitReviews.length
  const showNotifications = filter === 'all' || filter === 'alerts'
  const showThreads = filter !== 'alerts'

  // Alerts badge: clears the moment the user opens the Alerts tab (they've now
  // seen everything), and only re-appears when a genuinely NEW alert arrives.
  // We persist the count last seen; opening Alerts marks the current count seen,
  // and we never let "seen" exceed the live count (items get actioned/expire),
  // so resolving an alert doesn't suppress a later, real one.
  const [seenAlerts, setSeenAlerts] = usePersistedState<number>('chat:alertsSeen', 0)
  useEffect(() => {
    const target = filter === 'alerts' ? notifCount : Math.min(seenAlerts, notifCount)
    if (target !== seenAlerts) setSeenAlerts(target)
  }, [filter, notifCount, seenAlerts, setSeenAlerts])
  const hasNewAlerts = notifCount > seenAlerts

  // pinned card: prefer a match that's LIVE right now (§3); else fall back to a
  // match thread happening later today (open/full).
  const matchOf = (t: ChatThread) => (t.match_id ? db.matches.find((x) => x.id === t.match_id) : undefined)
  const canPin = filter !== 'archive' // no pinned card in the Archive view
  const livePinned = canPin
    ? threads.find((t) => {
        const m = matchOf(t)
        return m ? computeStatus(m) === 'live' : false
      })
    : undefined
  const todayPinned = canPin
    ? threads.find((t) => {
        const m = matchOf(t)
        if (!m) return false
        const s = computeStatus(m)
        return (s === 'open' || s === 'full') && whenLabel(m.start_time) === 'Today'
      })
    : undefined
  const pinned = livePinned ?? todayPinned
  const pinnedIsLive = !!livePinned
  const rest = threads.filter((t) => t !== pinned)

  const rowFor = (t: ChatThread) => {
    const isMatch = t.match_id !== null
    const isGroup = isGroupThread(t)
    const m = isMatch ? db.matches.find((x) => x.id === t.match_id) : undefined
    const other = !isMatch && !isGroup ? getUser(db, t.participant_ids.find((p) => p !== currentUserId)!) : undefined
    const msgs = threadMessages(db, t.id).filter((x) => !x.system)
    const last = msgs.at(-1)
    const unread = unreadCount(db, t.id)
    const title = isMatch && m ? `${matchKind(m)} · ${courtLabel(m)}` : isGroup ? threadTitle(db, t) : (other?.name ?? '')
    const lastSender = last ? (last.sender_id === currentUserId ? 'You' : getUser(db, last.sender_id)?.name.split(' ')[0]) : null
    const players = isMatch ? t.participant_ids.length : 0
    const to = isMatch ? `/chat/match/${t.match_id}` : isGroup ? `/chat/group/${t.id}` : `/chat/dm/${other?.id}`
    const archived = isThreadArchived(db, t.id)

    // swipe-left actions: Archive (or Unarchive, in the Archive view) + Delete.
    // Transparent buttons — just the icon + word in the action's own colour.
    const swipeActions: SwipeAction[] = [
      archived
        ? { key: 'unarchive', label: 'Unarchive', icon: ArchiveRestore, bg: 'transparent', fg: 'var(--color-accent)', onClick: () => { actions.unarchiveThread(t.id); showToast('Moved to inbox') } }
        : { key: 'archive', label: 'Archive', icon: Archive, bg: 'transparent', fg: 'var(--color-accent)', onClick: () => { actions.archiveThread(t.id); showToast('Archived') } },
      { key: 'delete', label: 'Delete', icon: Trash2, bg: 'transparent', fg: 'var(--color-danger)', onClick: () => { actions.deleteThread(t.id); showToast('Conversation deleted') } },
    ]

    return (
      <SwipeRow key={t.id} actions={swipeActions}>
      <Link
        to={to}
        className="flex items-center gap-[13px] rounded-[16px] border px-3.5 py-3 text-inherit no-underline transition-all hover:bg-card"
        style={{
          background: unread ? 'var(--surface-card)' : 'rgba(255,255,255,0.55)',
          borderColor: 'rgba(26,26,26,0.07)',
          boxShadow: unread ? '0 10px 22px -20px rgba(26,26,26,0.35)' : 'none',
        }}
      >
        {isMatch && m ? (
          <div className="relative shrink-0">
            <div className="h-[52px] w-[52px] overflow-hidden rounded-[14px]">
              <SportArt type={artType(m)} />
            </div>
            <span
              className="absolute -bottom-1 -end-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-card px-[5px] text-[9.5px] font-semibold nums-tabular"
              style={{ border: '1.5px solid var(--surface-page)', color: 'rgba(26,26,26,0.6)', boxShadow: '0 2px 6px -2px rgba(26,26,26,0.3)' }}
            >
              {players}
            </span>
          </div>
        ) : isGroup ? (
          <div className="relative h-[52px] w-[52px] shrink-0">
            <div
              className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full border bg-card text-accent"
              style={{ borderColor: 'rgba(26,26,26,0.08)', boxShadow: '0 8px 18px -14px rgba(26,26,26,0.4)' }}
            >
              <Users size={22} strokeWidth={1.8} />
            </div>
            <span
              className="absolute -bottom-1 -end-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-card px-[5px] text-[9.5px] font-semibold nums-tabular"
              style={{ border: '1.5px solid var(--surface-page)', color: 'rgba(26,26,26,0.6)', boxShadow: '0 2px 6px -2px rgba(26,26,26,0.3)' }}
            >
              {t.participant_ids.length}
            </span>
          </div>
        ) : (
          <div
            className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border bg-card font-display text-[22px] italic text-accent"
            style={{ borderColor: 'rgba(26,26,26,0.08)', boxShadow: '0 8px 18px -14px rgba(26,26,26,0.4)' }}
          >
            {other ? initials(other) : '?'}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14.5px] font-semibold text-ink">{title}</span>
            {isMatch && m && (
              <span className="shrink-0 rounded-pill px-[7px] py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em]" style={{ background: 'rgba(26,26,26,0.05)', color: 'rgba(26,26,26,0.45)' }}>
                {whenLabel(m.start_time)} · <span className="ltr-nums">{hm(m.start_time)}</span>
              </span>
            )}
          </div>
          <div
            className="mt-[3px] truncate text-[12.5px] leading-[1.4]"
            style={{ color: unread ? 'rgba(26,26,26,0.8)' : 'rgba(26,26,26,0.5)', fontWeight: unread ? 500 : 400 }}
          >
            {last ? (lastSender ? `${lastSender}: ${last.body}` : last.body) : 'No messages yet'}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-[7px] self-stretch pt-0.5">
          <span className="whitespace-nowrap text-[10.5px] tracking-[0.02em] nums-tabular" style={{ color: unread ? 'var(--color-brand)' : 'rgba(26,26,26,0.45)', fontWeight: unread ? 600 : 500 }}>
            {threadTime(last?.created_at ?? t.created_at)}
          </span>
          {unread > 0 ? (
            <span className="inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-pill bg-brand px-[5px] text-[10.5px] font-semibold text-onbrand nums-tabular" style={{ boxShadow: '0 6px 12px -5px var(--color-brand)' }}>
              {unread}
            </span>
          ) : (
            <span className="h-[7px] w-[7px]" />
          )}
        </div>
      </Link>
      </SwipeRow>
    )
  }

  const pinnedMatch = pinned?.match_id ? db.matches.find((x) => x.id === pinned.match_id) : undefined
  const pinnedMsgs = pinned ? threadMessages(db, pinned.id).filter((x) => !x.system).slice(-3) : []

  return (
    <Shell>
      <div className="flex h-full flex-col">
        {/* sticky header */}
        <div className="relative z-2 px-6 pt-[60px] pb-3.5" style={{ background: 'linear-gradient(180deg, var(--surface-page) 72%, transparent 100%)' }}>
          <div className="mb-[18px] flex items-start justify-between">
            <div>
              <div className="mb-[9px] text-[11px] font-medium uppercase tracking-[0.2em] nums-tabular" style={{ color: 'rgba(26,26,26,0.5)' }}>
                {totalUnread} new {totalUnread === 1 ? 'message' : 'messages'}
              </div>
              <h1 className="m-0 font-display text-[38px] font-normal leading-none" style={{ letterSpacing: '-0.02em' }}>
                Keep the <span className="italic text-accent">chat</span> going.
              </h1>
            </div>
            <Link
              to="/chat/new"
              aria-label="New message"
              className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-transparent text-brand no-underline"
              style={{ border: '1.5px dashed color-mix(in srgb, var(--color-brand) 40%, transparent)' }}
            >
              <PenLine size={17} strokeWidth={1.9} />
            </Link>
          </div>

          {/* filter pills — horizontally scrollable so the five fit any width */}
          <div className="hscroll flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-pill p-1" style={{ background: 'rgba(26,26,26,0.06)', border: '1px solid rgba(26,26,26,0.06)' }}>
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'match', label: 'Matches' },
                { id: 'dm', label: 'People' },
                { id: 'alerts', label: 'Alerts' },
                { id: 'archive', label: 'Archive' },
              ] as const
            ).map((o) => {
              const on = o.id === filter
              const badge = o.id === 'alerts' && hasNewAlerts
              return (
                <button
                  key={o.id}
                  onClick={() => setFilter(o.id)}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-pill border-none px-[15px] py-2 text-[13px] tracking-[0.01em] transition-colors"
                  style={{
                    background: on ? 'var(--color-brand)' : 'transparent',
                    color: on ? 'var(--color-text-onbrand)' : 'rgba(26,26,26,0.6)',
                    fontWeight: on ? 600 : 500,
                    boxShadow: on ? '0 6px 14px -6px var(--color-brand)' : 'none',
                  }}
                >
                  {o.label}
                  {badge && (
                    <span
                      className="inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-pill px-[5px] text-[10px] font-semibold nums-tabular"
                      style={{
                        background: on ? 'var(--color-text-onbrand)' : 'var(--color-brand)',
                        color: on ? 'var(--color-brand)' : 'var(--color-text-onbrand)',
                      }}
                    >
                      {notifCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* scrollable list */}
        <div className="scroll-area relative z-1 flex flex-1 flex-col gap-2.5 overflow-y-auto px-6 pt-2 pb-[120px]">
          {/* ── Notifications (Alerts pill): invitation · request · waitlist review ── */}
          {/* invitations — host→player invites awaiting your reply (incl. ones
              you deferred with "Decide later", §4). Accept/Decline inline; the
              card opens Match Details for the full picture. */}
          {/* "New for you · N to review" — single CTA-tinted header leading the
              action stack; each card's kicker now carries its own type label. */}
          {showNotifications && notifCount > 0 && (
            <div className="mt-0.5 inline-flex items-center gap-2 whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-brand)' }}>
              <span className="h-[5px] w-[5px] rounded-full" style={{ background: 'var(--color-brand)' }} />
              New for you · <span className="nums-tabular">{notifCount}</span> to review
            </div>
          )}
          {showNotifications && invites.length > 0 && (
            <>
              {invites.map((r) => {
                const m = db.matches.find((x) => x.id === r.match_id)
                if (!m) return null
                const host = getUser(db, m.host_id)
                return (
                  <div
                    key={r.id}
                    className="flex shrink-0 flex-col gap-2.5 rounded-[18px] border p-[14px] transition-transform hover:-translate-y-px"
                    style={{
                      background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 14%, var(--surface-card)) 0%, var(--surface-card) 70%)',
                      borderColor: 'color-mix(in srgb, var(--color-accent) 45%, transparent)',
                      boxShadow: '0 12px 26px -20px color-mix(in srgb, var(--color-accent) 70%, transparent)',
                    }}
                  >
                    <Link to={`/matches/${m.id}`} className="flex items-center gap-[13px] text-inherit no-underline">
                      <div className="relative shrink-0">
                        <div className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-full font-display text-[21px] italic text-onbrand" style={{ background: 'var(--color-accent)' }}>
                          {host ? initials(host) : '?'}
                        </div>
                        <span className="conn-pulse absolute -bottom-1 -end-1 inline-flex h-[19px] w-[19px] items-center justify-center rounded-full text-onbrand" style={{ background: 'var(--color-accent)', border: '1.5px solid var(--surface-page)' }}>
                          <Send size={9} strokeWidth={2.4} />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[9.5px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--color-accent)' }}>Match invitation</div>
                        <div className="mt-1 truncate text-[14.5px] font-semibold text-ink">{host?.name} invited you</div>
                        <div className="mt-[2px] truncate text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                          {matchKind(m)} · {courtLabel(m)} · {whenLabel(m.start_time)} <span className="ltr-nums">{hm(m.start_time)}</span>
                        </div>
                      </div>
                    </Link>
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          actions.declineInvite(r.id)
                          showToast('Invite declined')
                        }}
                        className="inline-flex h-[40px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-pill bg-transparent text-[13px] font-semibold"
                        style={{ color: 'var(--color-danger)', border: '1.5px solid color-mix(in srgb, var(--color-danger) 27%, transparent)' }}
                      >
                        <X size={14} strokeWidth={2.2} /> Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // race-safe accept → straight into the match chat (§5)
                          const res = actions.acceptInvite(r.id)
                          if (res === 'expired') {
                            showToast('Match just filled')
                          } else {
                            showToast("You're in")
                            navigate(`/chat/match/${m.id}`)
                          }
                        }}
                        className="inline-flex h-[40px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-pill border-none text-[13px] font-semibold text-onbrand"
                        style={{ background: 'var(--color-success)', boxShadow: '0 10px 20px -10px var(--color-success)' }}
                      >
                        <Check size={14} strokeWidth={2.4} /> Accept
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* join requests — players asking to join a match you host. The inbox
              is a POINTER ONLY (B.2): each row deep-links to Match Details, where
              the actionable approve/decline bars live — no inline buttons here
              (and never inside an opened thread). The in-thread §7 decision card
              remains the in-conversation action surface. */}
          {showNotifications && hostReqs.length > 0 && (
            <>
              {hostReqs.map((r) => {
                const m = db.matches.find((x) => x.id === r.match_id)
                const player = getUser(db, r.player_id)
                if (!m || !player) return null
                // read-time expired — a sibling won the last spot (§5). Flips in
                // place to a disabled, non-actionable row (neutral), not a pointer.
                if (!requestIsActionable(db, r)) {
                  return (
                    <div
                      key={r.id}
                      className="flex shrink-0 items-center gap-[13px] rounded-[18px] border p-[14px]"
                      style={{ background: 'rgba(255,255,255,0.55)', borderColor: 'rgba(26,26,26,0.08)' }}
                    >
                      <div
                        className="inline-flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full font-display text-[21px] italic"
                        style={{ background: 'color-mix(in srgb, var(--color-neutral) 20%, transparent)', color: 'var(--color-neutral)' }}
                      >
                        {initials(player)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>{player.name}</span>
                        <div className="mt-[3px] inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--color-neutral)' }}>
                          <Lock size={12} strokeWidth={2} /> Match full · no longer available
                        </div>
                      </div>
                    </div>
                  )
                }
                // pending → passive pointer to Match Details (review there)
                return (
                  <Link
                    key={r.id}
                    to={`/matches/${m.id}`}
                    className="flex shrink-0 items-center gap-[13px] rounded-[18px] border p-[14px] text-inherit no-underline transition-transform hover:-translate-y-px"
                    style={{
                      background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-brand) 12%, var(--surface-card)) 0%, var(--surface-card) 70%)',
                      borderColor: 'color-mix(in srgb, var(--color-brand) 45%, transparent)',
                      boxShadow: '0 12px 26px -20px color-mix(in srgb, var(--color-brand) 70%, transparent)',
                    }}
                  >
                    <div className="relative shrink-0">
                      <div className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-full font-display text-[21px] italic text-onbrand" style={{ background: 'var(--color-brand)' }}>
                        {initials(player)}
                      </div>
                      <span className="conn-pulse absolute -bottom-1 -end-1 inline-flex h-[19px] w-[19px] items-center justify-center rounded-full text-onbrand" style={{ background: 'var(--color-brand)', border: '1.5px solid var(--surface-page)' }}>
                        <UserPlus size={9} strokeWidth={2.4} />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[9.5px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--color-brand)' }}>Request to join</div>
                      <div className="mt-1 truncate text-[14.5px] font-semibold text-ink">{player.name} wants to join</div>
                      <div className="mt-[2px] truncate text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                        {matchKind(m)} · {courtLabel(m)} · {whenLabel(m.start_time)} <span className="ltr-nums">{hm(m.start_time)}</span>
                        {m.spots_available > 0 ? ` — ${m.spots_available} spot${m.spots_available === 1 ? '' : 's'} left` : ''}
                      </div>
                    </div>
                    <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill px-3.5 text-[12px] font-semibold text-onbrand" style={{ background: 'var(--color-brand)', boxShadow: '0 8px 18px -8px var(--color-brand)' }}>
                      Review <ArrowRight size={12} strokeWidth={2.2} className="rtl:rotate-180" />
                    </span>
                  </Link>
                )
              })}
            </>
          )}

          {/* waitlist — matches you're queued on (waitlist review). Auto-promote
              is FIFO; review your position or leave the queue (§5). */}
          {showNotifications && waitReviews.length > 0 && (
            <>
              {waitReviews.map((r) => {
                const m = db.matches.find((x) => x.id === r.match_id)
                if (!m) return null
                const pos = waitlistPosition(db, m.id)
                const host = getUser(db, m.host_id)
                return (
                  <div
                    key={r.id}
                    className="flex shrink-0 flex-col gap-2.5 rounded-[18px] border p-[14px]"
                    style={{
                      background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-info) 12%, var(--surface-card)) 0%, var(--surface-card) 70%)',
                      borderColor: 'color-mix(in srgb, var(--color-info) 45%, transparent)',
                      boxShadow: '0 12px 26px -20px color-mix(in srgb, var(--color-info) 70%, transparent)',
                    }}
                  >
                    <Link to={`/matches/${m.id}`} className="flex items-center gap-[13px] text-inherit no-underline">
                      <div className="relative shrink-0">
                        <div className="h-[50px] w-[50px] overflow-hidden rounded-[14px]">
                          <SportArt type={artType(m)} />
                        </div>
                        <span className="absolute -bottom-1 -end-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-pill px-[5px] text-[9.5px] font-semibold text-onbrand nums-tabular" style={{ background: 'var(--color-info)', border: '1.5px solid var(--surface-page)' }}>
                          <span className="ltr-nums">{m.total_spots}/{m.total_spots}</span>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[9.5px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--color-info)' }}>Match full · waitlist</div>
                        <div className="mt-1 truncate text-[14.5px] font-semibold text-ink">
                          {matchKind(m)} · {courtLabel(m)}
                        </div>
                        <div className="mt-[2px] truncate text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                          Hosted by {host?.name.split(' ')[0]} · {whenLabel(m.start_time)}
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ background: 'color-mix(in srgb, var(--color-info) 12%, transparent)', color: 'var(--color-info)' }}>
                        <Layers size={12} strokeWidth={2} /> <span className="ltr-nums">{pos ? `#${pos}` : 'Queued'}</span>
                      </span>
                    </Link>
                    <div className="flex items-center justify-between gap-2.5">
                      <span className="text-[11.5px] leading-[1.4]" style={{ color: 'var(--color-text-muted)' }}>
                        You'll join automatically if a spot opens.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          actions.leaveWaitlist(m.id)
                          showToast('Left waitlist')
                        }}
                        className="inline-flex h-[34px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-pill bg-transparent px-3.5 text-[12.5px] font-semibold"
                        style={{ color: 'color-mix(in srgb, var(--color-danger) 78%, transparent)', border: '1.5px solid color-mix(in srgb, var(--color-danger) 22%, transparent)' }}
                      >
                        <X size={13} strokeWidth={2.2} /> Leave
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* Alerts filter with nothing pending → caught-up state */}
          {filter === 'alerts' && notifCount === 0 && (
            <div className="mt-1.5 rounded-[18px] px-5 py-7 text-center" style={{ background: 'rgba(255,255,255,0.5)', border: '1px dashed rgba(26,26,26,0.18)' }}>
              <div className="mb-1.5 font-display text-[22px]" style={{ letterSpacing: '-0.012em' }}>
                All <span className="italic text-accent">caught up</span>.
              </div>
              <div className="text-[12.5px] leading-normal" style={{ color: 'var(--color-text-muted)' }}>
                No invites, join requests, or waitlist updates right now.
              </div>
            </div>
          )}

          {showThreads && pinned && pinnedMatch && (
            <>
              <Eyebrow>{pinnedIsLive ? 'Live now · on court' : "Active now · Today's match"}</Eyebrow>
              <Link
                to={`/chat/match/${pinnedMatch.id}`}
                className="mb-1 block shrink-0 overflow-hidden rounded-[22px] border bg-card text-inherit no-underline shadow-card transition-transform hover:-translate-y-px"
                style={{ borderColor: 'rgba(26,26,26,0.08)' }}
              >
                <div className="flex items-center gap-3 px-4 pt-3.5 pb-3">
                  <div className="h-[46px] w-[46px] shrink-0 overflow-hidden rounded-[12px]">
                    <SportArt type={artType(pinnedMatch)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[20px] leading-[1.1]" style={{ letterSpacing: '-0.012em' }}>
                      {matchKind(pinnedMatch)} · {courtLabel(pinnedMatch)}
                    </div>
                    <div className="mt-0.5 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                      {pinnedMatch.venue_name} · {pinned.participant_ids.length} players
                    </div>
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-[5px] text-[10px] font-semibold uppercase tracking-[0.18em]"
                    style={{
                      color: pinnedIsLive ? 'var(--color-live)' : 'var(--color-accent)',
                      background: pinnedIsLive ? 'color-mix(in srgb, var(--color-live) 10%, transparent)' : 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                    }}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${pinnedIsLive ? 'conn-pulse' : ''}`} style={{ background: pinnedIsLive ? 'var(--color-live)' : 'var(--color-accent)' }} />
                    {pinnedIsLive ? 'Live' : 'Today'}
                  </span>
                </div>
                {/* message preview bubbles */}
                <div className="flex flex-col gap-[7px] px-4 pb-1">
                  {pinnedMsgs.map((msg) => {
                    const mine = msg.sender_id === currentUserId
                    const sender = getUser(db, msg.sender_id)
                    return (
                      <div key={msg.id} className="flex" style={{ justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                        <div
                          className="max-w-[78%] px-3 py-2 text-[12.5px] leading-[1.35]"
                          style={{
                            background: mine ? 'var(--color-brand)' : 'rgba(26,26,26,0.05)',
                            color: mine ? 'var(--color-text-onbrand)' : 'var(--color-text)',
                            borderRadius: 14,
                            borderEndEndRadius: mine ? 4 : 14,
                            borderEndStartRadius: mine ? 14 : 4,
                          }}
                        >
                          {!mine && <div className="mb-0.5 text-[10px] font-semibold tracking-[0.02em] text-accent">{sender?.name.split(' ')[0]}</div>}
                          {msg.body}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* footer */}
                <div
                  className="mt-2.5 flex items-center justify-between border-t px-4 py-[11px]"
                  style={{ borderColor: 'rgba(26,26,26,0.06)', background: 'color-mix(in srgb, var(--color-brand) 3%, transparent)' }}
                >
                  <span className="whitespace-nowrap text-[11.5px] nums-tabular" style={{ color: 'rgba(26,26,26,0.6)' }}>
                    {threadMessages(db, pinned.id).filter((x) => !x.system).length} messages ·{' '}
                    <span className="font-semibold text-brand">{unreadCount(db, pinned.id)} new</span>
                  </span>
                  <span className="inline-flex h-[34px] shrink-0 items-center gap-[7px] whitespace-nowrap rounded-pill bg-brand px-4 text-[12.5px] font-semibold tracking-[0.01em] text-onbrand" style={{ boxShadow: '0 8px 18px -8px var(--color-brand)' }}>
                    Open chat <ArrowRight size={11} strokeWidth={2.2} className="rtl:rotate-180" />
                  </span>
                </div>
              </Link>
            </>
          )}

          {showThreads && rest.length > 0 && (
            <>
              <Eyebrow>{filter === 'archive' ? 'Archived' : pinned ? 'Earlier' : 'Conversations'}</Eyebrow>
              {rest.map(rowFor)}
            </>
          )}

          {showThreads && threads.length === 0 && (
            <div className="mt-1.5 rounded-[18px] px-5 py-7 text-center" style={{ background: 'rgba(255,255,255,0.5)', border: '1px dashed rgba(26,26,26,0.18)' }}>
              {filter === 'archive' ? (
                <>
                  <div className="mb-1.5 font-display text-[22px]" style={{ letterSpacing: '-0.012em' }}>
                    Nothing <span className="italic text-accent">archived</span>.
                  </div>
                  <div className="text-[12.5px] leading-normal" style={{ color: 'var(--color-text-muted)' }}>
                    Swipe left on a conversation to archive it.
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-1.5 font-display text-[22px]" style={{ letterSpacing: '-0.012em' }}>
                    <span className="italic text-accent">Quiet</span> in here.
                  </div>
                  <div className="text-[12.5px] leading-normal" style={{ color: 'var(--color-text-muted)' }}>
                    No conversations yet. Join or host a match to start talking.
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
