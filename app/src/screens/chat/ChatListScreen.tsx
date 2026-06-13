import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, MailPlus, PenLine, X } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Eyebrow } from '@/components/Eyebrow'
import { SportArt } from '@/components/SportArt'
import { useToast } from '@/components/Toast'
import { actions, currentUserId, getUser, inboxThreads, myInvites, threadMessages, unreadCount, useDB } from '@/lib/store'
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
  const [filter, setFilter] = usePersistedState<'all' | 'match' | 'dm'>('chat:filter', 'all')

  const threads = inboxThreads(db).filter((t) => (filter === 'all' ? true : filter === 'match' ? t.match_id !== null : t.match_id === null))
  const totalUnread = inboxThreads(db).reduce((n, t) => n + unreadCount(db, t.id), 0)

  // pinned card: a match thread for a match happening today (open/full/live)
  const pinned = threads.find((t) => {
    if (!t.match_id) return false
    const m = db.matches.find((x) => x.id === t.match_id)
    if (!m) return false
    const s = computeStatus(m)
    return (s === 'open' || s === 'full' || s === 'live') && whenLabel(m.start_time) === 'Today'
  })
  const rest = threads.filter((t) => t !== pinned)
  // pending invites surface as notifications in Chat (CLAUDE.md §4) — hidden on the People filter
  const invites = filter === 'dm' ? [] : myInvites(db)

  const rowFor = (t: ChatThread) => {
    const isMatch = t.match_id !== null
    const m = isMatch ? db.matches.find((x) => x.id === t.match_id) : undefined
    const other = !isMatch ? getUser(db, t.participant_ids.find((p) => p !== currentUserId)!) : undefined
    const msgs = threadMessages(db, t.id).filter((x) => !x.system)
    const last = msgs.at(-1)
    const unread = unreadCount(db, t.id)
    const title = isMatch && m ? `${matchKind(m)} · ${courtLabel(m)}` : (other?.name ?? '')
    const lastSender = last ? (last.sender_id === currentUserId ? 'You' : getUser(db, last.sender_id)?.name.split(' ')[0]) : null
    const players = isMatch ? t.participant_ids.length : 0

    return (
      <Link
        key={t.id}
        to={isMatch ? `/chat/match/${t.match_id}` : `/chat/dm/${other?.id}`}
        className="flex shrink-0 items-center gap-[13px] rounded-[16px] border px-3.5 py-3 text-inherit no-underline transition-all hover:-translate-y-px hover:bg-card"
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

          {/* filter pills */}
          <div className="inline-flex items-center gap-1 rounded-pill p-1" style={{ background: 'rgba(26,26,26,0.06)', border: '1px solid rgba(26,26,26,0.06)' }}>
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'match', label: 'Matches' },
                { id: 'dm', label: 'People' },
              ] as const
            ).map((o) => {
              const on = o.id === filter
              return (
                <button
                  key={o.id}
                  onClick={() => setFilter(o.id)}
                  className="cursor-pointer rounded-pill border-none px-4 py-2 text-[13px] tracking-[0.01em] transition-colors"
                  style={{
                    background: on ? 'var(--color-brand)' : 'transparent',
                    color: on ? 'var(--color-text-onbrand)' : 'rgba(26,26,26,0.6)',
                    fontWeight: on ? 600 : 500,
                    boxShadow: on ? '0 6px 14px -6px var(--color-brand)' : 'none',
                  }}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* scrollable list */}
        <div className="scroll-area relative z-1 flex flex-1 flex-col gap-2.5 overflow-y-auto px-6 pt-2 pb-[120px]">
          {/* invitations — host→player invites awaiting your reply (incl. ones
              you deferred with "Decide later", §4). Accept/Decline inline; the
              card opens Match Details for the full picture. */}
          {invites.length > 0 && (
            <>
              <Eyebrow>Invitations</Eyebrow>
              {invites.map((r) => {
                const m = db.matches.find((x) => x.id === r.match_id)
                if (!m) return null
                const host = getUser(db, m.host_id)
                return (
                  <div
                    key={r.id}
                    className="flex shrink-0 flex-col gap-2.5 rounded-[16px] border px-3.5 py-3"
                    style={{ background: 'color-mix(in srgb, var(--color-brand) 5%, var(--surface-card))', borderColor: 'color-mix(in srgb, var(--color-brand) 25%, transparent)' }}
                  >
                    <Link to={`/matches/${m.id}`} className="flex items-center gap-[13px] text-inherit no-underline">
                      <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[14px]">
                        <SportArt type={artType(m)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold text-ink">
                          {matchKind(m)} · {courtLabel(m)}
                        </span>
                        <div className="mt-[3px] truncate text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
                          {host?.name.split(' ')[0]} invited you · {whenLabel(m.start_time)}
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-brand px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-onbrand" style={{ boxShadow: '0 6px 14px -6px var(--color-brand)' }}>
                        <MailPlus size={12} strokeWidth={2} /> Invite
                      </span>
                    </Link>
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          actions.declineInvite(r.id)
                          showToast('Invite declined')
                        }}
                        className="inline-flex h-[40px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-pill bg-transparent text-[13px] font-semibold"
                        style={{ color: 'color-mix(in srgb, var(--color-danger) 78%, transparent)', border: '1.5px solid color-mix(in srgb, var(--color-danger) 24%, transparent)' }}
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
                        style={{ background: 'var(--color-brand)', boxShadow: '0 10px 20px -10px var(--color-brand)' }}
                      >
                        <Check size={14} strokeWidth={2.4} /> Accept
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {pinned && pinnedMatch && (
            <>
              <Eyebrow>Active now · Today's match</Eyebrow>
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
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-[5px] text-[10px] font-semibold uppercase tracking-[0.18em] text-accent" style={{ background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)' }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    Today
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

          {rest.length > 0 && (
            <>
              <Eyebrow>{pinned ? 'Earlier' : 'Conversations'}</Eyebrow>
              {rest.map(rowFor)}
            </>
          )}

          {threads.length === 0 && (
            <div className="mt-1.5 rounded-[18px] px-5 py-7 text-center" style={{ background: 'rgba(255,255,255,0.5)', border: '1px dashed rgba(26,26,26,0.18)' }}>
              <div className="mb-1.5 font-display text-[22px]" style={{ letterSpacing: '-0.012em' }}>
                <span className="italic text-accent">Quiet</span> in here.
              </div>
              <div className="text-[12.5px] leading-normal" style={{ color: 'var(--color-text-muted)' }}>
                No conversations yet. Join or host a match to start talking.
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
