import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowUp,
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  MapPin,
  Pin,
  Trophy,
  Check,
} from 'lucide-react'
import { Shell } from '@/components/Shell'
import { AvatarStack } from '@/components/Avatar'
import { SportArt } from '@/components/SportArt'
import { useToast } from '@/components/Toast'
import { actions, currentUserId, matchPlayers, threadForMatch, threadMessages, threadTimeline, useDB } from '@/lib/store'
import { computeStatus } from '@/lib/status'
import { artType, courtLabel, hm, initials, matchKind, timeRange, whenLabel } from '@/lib/format'
import type { MatchStatus } from '@/lib/types'
import { ChatTimeline } from '@/screens/chat/ChatTimeline'
import { RecordResultForm } from '@/screens/postmatch/RecordResultForm'

/** Match group chat (match-group-chat.jsx MatchThread) — auto thread with all
 *  joined players. Pinned match bar up top expands to details, or to the
 *  SHARED RecordResultForm once the match completes; a recorded result posts
 *  a system line inline (result is canonical on Match Details too). The timeline
 *  renders through the shared ChatTimeline (§1), so the host's inbound join
 *  requests surface as inline decision cards (§7). */

export function MatchChatScreen() {
  const { id } = useParams()
  const db = useDB()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [muted, setMuted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const match = db.matches.find((m) => m.id === id)
  const thread = match ? threadForMatch(db, match.id) : undefined
  const msgs = thread ? threadMessages(db, thread.id) : []
  const timeline = thread ? threadTimeline(db, thread.id) : []

  useEffect(() => {
    if (thread) actions.markThreadRead(thread.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.id, msgs.length])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [timeline.length])

  if (!match || !thread) return null

  const status: MatchStatus = computeStatus(match)
  const cancelled = status === 'cancelled'
  const played = status === 'completed' || status === 'closed'
  const full = match.spots_available <= 0 && !cancelled && !played
  const players = matchPlayers(db, match.id)
  const recorded = db.matchResults.some((r) => r.match_id === match.id && r.player_id === currentUserId)
  const myResult = db.matchResults.find((r) => r.match_id === match.id && r.player_id === currentUserId)
  const title = `${matchKind(match)} · ${courtLabel(match)}`

  const send = () => {
    if (!draft.trim()) return
    actions.sendMessage(thread.id, draft)
    setDraft('')
  }

  const onResultSaved = () => {
    setExpanded(false)
    actions.postSystemLine(thread.id, `Result recorded · ${players.length - 1} of ${match.total_spots} played`, 'pos', 'trophy')
    showToast('Result submitted')
  }

  // pinned bar status line
  let statusEl: React.ReactNode
  if (cancelled) statusEl = <span className="font-semibold" style={{ color: 'var(--color-danger)' }}>Cancelled</span>
  else if (played && recorded)
    statusEl = (
      <span className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--color-success)' }}>
        <Trophy size={11} strokeWidth={2} /> {myResult?.result === 'win' ? 'You won' : myResult?.result === 'loss' ? 'You lost' : 'Draw'}
      </span>
    )
  else if (played)
    statusEl = (
      <span className="inline-flex items-center gap-1 font-semibold text-brand">
        <Trophy size={11} strokeWidth={2} /> Record result
      </span>
    )
  else if (full)
    statusEl = (
      <span className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--color-success)' }}>
        <Lock size={11} strokeWidth={2} /> Full · locked in
      </span>
    )
  else
    statusEl = (
      <span className="font-semibold text-brand nums-tabular">
        {match.spots_available} spot{match.spots_available === 1 ? '' : 's'} open
      </span>
    )

  return (
    <Shell nav={false} blobs={false}>
      <div className="flex h-full flex-col">
        {/* header */}
        <div
          className="relative z-4 flex shrink-0 items-center gap-[11px] border-b px-3.5 pt-[52px] pb-3 backdrop-blur-[16px]"
          style={{ background: 'rgba(244,240,232,0.86)', borderColor: 'rgba(26,26,26,0.06)' }}
        >
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="inline-flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none text-ink"
            style={{ background: 'rgba(26,26,26,0.06)' }}
          >
            <ChevronLeft size={18} strokeWidth={2} className="rtl:rotate-180" />
          </button>
          <div className="h-[38px] w-[38px] shrink-0 overflow-hidden rounded-[11px]">
            <SportArt type={artType(match)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15.5px] font-semibold text-ink" style={{ letterSpacing: '-0.01em' }}>
              {title}
            </div>
            <div className="mt-px truncate text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
              {cancelled ? 'Match cancelled' : played ? `Completed · ${match.venue_name}` : `${players.length} of ${match.total_spots} players · ${match.venue_name}`}
            </div>
          </div>
          <button
            onClick={() => {
              setMuted((v) => !v)
              showToast(muted ? 'Notifications on' : 'Notifications muted')
            }}
            aria-label="Notifications"
            className="inline-flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none text-ink"
            style={{ background: 'rgba(26,26,26,0.06)' }}
          >
            {muted ? <BellOff size={16} strokeWidth={1.8} /> : <Bell size={15} strokeWidth={1.9} />}
          </button>
        </div>

        {/* pinned match bar */}
        <div className="relative z-2 mx-4 mt-2 mb-1.5 shrink-0">
          <div
            className="overflow-hidden bg-card transition-all"
            style={{
              borderRadius: expanded ? 20 : 16,
              border: '1px solid rgba(26,26,26,0.08)',
              boxShadow: expanded ? '0 1px 0 rgba(26,26,26,0.02), 0 22px 38px -26px rgba(26,26,26,0.26)' : '0 1px 0 rgba(26,26,26,0.02), 0 14px 26px -24px rgba(26,26,26,0.28)',
              opacity: cancelled ? 0.94 : 1,
            }}
          >
            <button
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-3 py-2.5 text-start text-inherit"
            >
              <div className="relative h-[42px] w-[42px] shrink-0 overflow-hidden rounded-[11px]" style={{ filter: cancelled ? 'grayscale(0.55)' : 'none' }}>
                <SportArt type={artType(match)} />
                {played && recorded && (
                  <span className="absolute -end-[3px] -bottom-[3px] inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-white" style={{ background: 'var(--color-success)', border: '2px solid #fff' }}>
                    <Check size={9} strokeWidth={3.4} />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-[7px]">
                  <span className="truncate text-[13.5px] font-semibold text-ink">{title}</span>
                  <Pin size={13} strokeWidth={1.9} className="shrink-0 text-accent" />
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {played ? (
                    <>
                      {statusEl}
                      <span className="opacity-40">·</span>
                      <span>{recorded ? 'recorded' : 'tap to fill in'}</span>
                    </>
                  ) : (
                    <>
                      <span style={{ textDecoration: cancelled ? 'line-through' : 'none' }} className="ltr-nums">
                        {whenLabel(match.start_time)} · {hm(match.start_time)}
                      </span>
                      <span className="opacity-40">·</span>
                      {statusEl}
                    </>
                  )}
                </div>
              </div>
              <ChevronRight
                size={16}
                strokeWidth={2}
                className="shrink-0 transition-transform"
                style={{ color: 'rgba(26,26,26,0.32)', transform: expanded ? 'rotate(-90deg)' : 'rotate(90deg)' }}
              />
            </button>

            {/* drop-down detail */}
            <div className="overflow-hidden transition-all" style={{ maxHeight: expanded ? (played ? 560 : 260) : 0, opacity: expanded ? 1 : 0 }}>
              {played ? (
                <div className="scroll-area max-h-[524px] overflow-y-auto bg-page pt-3.5 pb-4">
                  <RecordResultForm match={match} onSaved={onResultSaved} />
                </div>
              ) : (
                <div className="px-4 pt-0.5 pb-[15px]">
                  <div className="flex items-center gap-[18px] border-t pt-[11px] text-[12.5px]" style={{ borderColor: 'rgba(26,26,26,0.07)', color: 'rgba(26,26,26,0.62)' }}>
                    <span className="inline-flex items-center gap-[5px] nums-tabular ltr-nums">
                      <Clock size={13} strokeWidth={1.9} /> {timeRange(match)}
                    </span>
                    <span className="inline-flex items-center gap-[5px] truncate">
                      <MapPin size={13} strokeWidth={1.9} /> {match.venue_name}
                    </span>
                  </div>
                  <div className="mt-[13px] flex items-center justify-between gap-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <AvatarStack initials={players.map(initials)} filled={players.length} max={match.total_spots} />
                      <span className="whitespace-nowrap text-[12px]" style={{ color: 'rgba(26,26,26,0.6)' }}>
                        {statusEl}
                      </span>
                    </div>
                    <Link
                      to={`/matches/${match.id}`}
                      className="inline-flex shrink-0 items-center gap-[5px] rounded-pill px-3.5 py-[7px] text-[12.5px] font-semibold text-brand no-underline"
                      style={{ border: '1.5px solid color-mix(in srgb, var(--color-brand) 33%, transparent)' }}
                    >
                      Match details <ChevronRight size={14} strokeWidth={2} className="rtl:rotate-180" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* result recorded · waiting-to-close bar */}
        {played && recorded && status !== 'closed' && (
          <div
            className="relative z-2 mx-4 mb-1.5 flex shrink-0 items-center gap-[11px] rounded-[14px] px-[13px] py-2.5"
            style={{ background: 'color-mix(in srgb, var(--color-brand) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--color-brand) 20%, transparent)' }}
          >
            <span className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-brand" style={{ background: 'color-mix(in srgb, var(--color-brand) 12%, transparent)' }}>
              <Clock size={13} strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold" style={{ textWrap: 'pretty' }}>
                Waiting for one more result to lock the match
              </div>
              <div className="mt-px text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Closes automatically in 24h
              </div>
            </div>
          </div>
        )}

        {/* timeline — one renderer, many message types (§1): text · system · decision (§7) */}
        <ChatTimeline ref={scrollRef} items={timeline} />

        {/* composer / cancelled note */}
        {cancelled ? (
          <div
            className="relative z-3 flex shrink-0 items-center justify-center gap-2 border-t px-[18px] pt-3.5 pb-8 text-[12.5px] font-semibold"
            style={{ background: 'rgba(244,240,232,0.92)', borderColor: 'rgba(26,26,26,0.06)', color: 'var(--color-danger)' }}
          >
            <Lock size={12} strokeWidth={2} /> This match was cancelled — chat is read-only
          </div>
        ) : (
          <div
            className="relative z-3 flex shrink-0 items-end gap-[9px] border-t px-4 pt-2.5 pb-[30px] backdrop-blur-[16px]"
            style={{ background: 'rgba(244,240,232,0.92)', borderColor: 'rgba(26,26,26,0.06)' }}
          >
            <div className="flex min-h-[42px] flex-1 items-center rounded-[22px] border bg-card pe-1.5 ps-4" style={{ borderColor: 'rgba(26,26,26,0.12)' }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Message"
                className="min-w-0 flex-1 border-none bg-transparent py-[11px] text-[14px] text-ink outline-none"
              />
              <button
                onClick={send}
                aria-label="Send"
                disabled={!draft.trim()}
                className="ms-1.5 inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-none transition-colors"
                style={{
                  cursor: draft.trim() ? 'pointer' : 'default',
                  background: draft.trim() ? 'var(--color-brand)' : 'rgba(26,26,26,0.12)',
                  color: draft.trim() ? 'var(--color-text-onbrand)' : 'rgba(26,26,26,0.4)',
                }}
              >
                <ArrowUp size={16} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}
