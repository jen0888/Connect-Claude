import { useNavigate, useParams } from 'react-router-dom'
import { Bookmark, Check, ChevronLeft, ChevronRight, Hourglass, ListPlus, MapPin, MessageCircle, Pencil, Plus, Send, Share, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { Shell } from '@/components/Shell'
import { Eyebrow } from '@/components/Eyebrow'
import { MiniMap, PlayerDots } from '@/components/controls'
import { useToast } from '@/components/Toast'
import { actions, currentUserId, getUser, invitablePlayers, isJoined, matchPlayers, pendingRequest, useDB, waitlistEntry, waitlistPosition } from '@/lib/store'
import { computeStatus } from '@/lib/status'
import { dayLabel, hm, initials, skillLabel, sportLabel, whenLabel } from '@/lib/format'
import type { Match, SkillLevel } from '@/lib/types'
import { DecisionButtons, ProfilePeek, ResolvedNote } from './ApprovalCard'

/** Match Details (match-details-other-v2.jsx, Editorial Calm).
 *  One screen, two views: player view (read-only + Join/Request CTA) and
 *  host view (Edit icon, no CTA — full editing lives on the edit screen).
 *  Trust signals shown for the host are CLAUDE.md's: matches played +
 *  attendance — never star ratings (no ratings in Stage 1). */

const LEVEL_NAMES = ['Baby', 'Beginner', 'Low int.', 'High int.', 'Advanced']

/** schema single skill_level → display range on the 1–5 bar.
 *  Matches store the coarse levels; the fine player-ladder steps are
 *  mapped anyway so the function stays total over SkillLevel. */
function levelToRange(level: SkillLevel): [number, number] {
  switch (level) {
    case 'baby_beginner':
      return [1, 1]
    case 'beginner':
      return [1, 2]
    case 'low_intermediate':
      return [2, 3]
    case 'intermediate':
      return [2, 4]
    case 'high_intermediate':
      return [3, 4]
    case 'advanced':
      return [4, 5]
    case 'pro':
      return [5, 5]
    case 'any':
      return [1, 5]
  }
}

function CalmIcon({ onClick, children, ariaLabel, active = false }: { onClick?: () => void; children: ReactNode; ariaLabel: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full backdrop-blur-[8px] transition-colors"
      style={{
        border: `1px solid ${active ? 'color-mix(in srgb, var(--color-brand) 25%, transparent)' : 'rgba(26,26,26,0.10)'}`,
        background: active ? 'color-mix(in srgb, var(--color-brand) 7%, transparent)' : 'rgba(244,240,232,0.55)',
        color: active ? 'var(--color-brand)' : 'var(--color-text)',
      }}
    >
      {children}
    </button>
  )
}

const cardCls = 'rounded-[22px] border bg-card'
const cardStyle = { borderColor: 'rgba(26,26,26,0.10)' }

function TimeCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <span className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <span className="font-display text-[30px] leading-[1.05] ltr-nums" style={{ letterSpacing: '-0.01em' }}>
        {value.split(':')[0]}
        <span style={{ color: 'var(--color-text-muted)' }}>:</span>
        {value.split(':')[1]}
      </span>
    </div>
  )
}

export function MatchDetailsScreen() {
  const { id } = useParams()
  const db = useDB()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const match = db.matches.find((m) => m.id === id)

  if (!match) {
    return (
      <Shell>
        <div className="flex h-full items-center justify-center px-6 text-center">
          <div>
            <div className="font-display text-[26px]">
              <span className="italic text-accent">Nothing</span> here.
            </div>
            <div className="mt-1.5 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
              This match doesn't exist or was removed.
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  return <MatchDetailsBody match={match} navigate={navigate} showToast={showToast} db={db} />
}

function MatchDetailsBody({
  match: m,
  navigate,
  showToast,
  db,
}: {
  match: Match
  navigate: ReturnType<typeof useNavigate>
  showToast: (s: string) => void
  db: ReturnType<typeof useDB>
}) {
  const hostView = m.host_id === currentUserId
  const host = getUser(db, m.host_id)!
  const players = matchPlayers(db, m.id)
  const joined = isJoined(db, m.id)
  const pending = pendingRequest(db, m.id)
  const status = computeStatus(m)
  const saved = db.savedMatchIds.includes(m.id)
  const [minLevel, maxLevel] = levelToRange(m.skill_level)

  const filled = m.total_spots - m.spots_available
  const isFull = m.spots_available <= 0
  const isRunning = m.sport === 'running'
  const durationMin = Math.round((new Date(m.end_time).getTime() - new Date(m.start_time).getTime()) / 60000)

  const wl = waitlistEntry(db, m.id)
  const wlPos = wl ? waitlistPosition(db, m.id) : null
  const joinedState = joined ? 'joined' : wl ? 'waitlisted' : pending ? 'requested' : 'idle'
  // invite = personal offer, not a public listing slot (§5) — no public join CTA
  const inviteOnly = m.join_mode === 'invite' && joinedState === 'idle'
  const canJoin = joinedState === 'idle' && status === 'open' && !inviteOnly
  // waitlist applies to ANY full match, orthogonal to join_mode (§5)
  const canWaitlist = joinedState === 'idle' && status === 'full' && !hostView
  const canAct = canJoin || canWaitlist
  const ctaLabel =
    joinedState === 'joined'
      ? "You're in"
      : joinedState === 'requested'
        ? 'Request sent'
        : joinedState === 'waitlisted'
          ? 'On waitlist'
          : canWaitlist
            ? 'Join waitlist'
            : inviteOnly
              ? 'Invite only'
              : status !== 'open'
                ? 'Match full'
                : m.join_mode === 'approval'
                  ? 'Request to join'
                  : 'Join match'

  const onJoin = () => {
    if (canWaitlist) {
      // holds no slot — FIFO entry, auto-promoted when a slot frees (§5)
      actions.joinWaitlist(m.id)
      showToast("On the waitlist — you'll be auto-joined if a spot frees")
      return
    }
    if (!canJoin) return
    if (m.join_mode === 'approval') {
      actions.requestToJoin(m.id)
      showToast('Request sent')
    } else {
      actions.joinMatch(m.id)
      showToast('Joined')
    }
  }

  // hero title: match kind sentence, last word italic-accented (design treatment)
  const title = isRunning ? `${m.round_trip ? 'Round trip' : 'Group'} run from ${m.route_start ?? m.venue_name}` : `${m.total_spots === 2 ? 'Singles' : 'Doubles'} at ${m.venue_name}`
  const words = title.split(' ')
  const head = words.slice(0, -1).join(' ')
  const tail = words[words.length - 1]

  // 10-day read-only date strip anchored on the match day
  const strip = (() => {
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()
    const active = new Date(m.start_time)
    const start = new Date(active.getFullYear(), active.getMonth(), active.getDate() - 2)
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (start < t0) start.setTime(t0.getTime())
    return Array.from({ length: 10 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      const off = Math.round((d.getTime() - t0.getTime()) / 86400000)
      return {
        key: i,
        short: off === 0 ? 'Today' : off === 1 ? 'Tmrw' : wd[d.getDay()],
        day: d.getDate(),
        active: d.toDateString() === active.toDateString(),
      }
    })
  })()

  return (
    <Shell nav={false}>
      <div className="flex h-full flex-col">
        {/* floating top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-[18px] pt-12 pb-3">
          <div className="pointer-events-auto">
            <CalmIcon ariaLabel="Back" onClick={() => navigate(-1)}>
              <ChevronLeft size={15} strokeWidth={1.8} className="rtl:rotate-180" />
            </CalmIcon>
          </div>
          <div className="pointer-events-auto flex gap-2">
            <CalmIcon ariaLabel="Share" onClick={() => showToast('Link copied')}>
              <Share size={14} strokeWidth={1.8} />
            </CalmIcon>
            {!hostView ? (
              <CalmIcon ariaLabel={saved ? 'Remove from saved' : 'Save'} onClick={() => actions.toggleSaveMatch(m.id)} active={saved}>
                <Bookmark size={14} strokeWidth={1.8} fill={saved ? 'currentColor' : 'none'} />
              </CalmIcon>
            ) : (
              <CalmIcon ariaLabel="Edit match" onClick={() => navigate(`/matches/${m.id}/edit`)}>
                <Pencil size={15} strokeWidth={1.8} />
              </CalmIcon>
            )}
          </div>
        </div>

        <div className="scroll-area relative z-1 flex-1 overflow-y-auto px-[22px] pt-[110px]" style={{ paddingBottom: hostView ? 48 : 170, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* hero */}
          <div className="pt-2 pb-[22px]">
            <div className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
              {hostView ? "You're hosting" : `${host.name.split(' ')[0]} is hosting`} · {whenLabel(m.start_time)} · {dayLabel(m.start_time)}
            </div>
            <h1 className="m-0 font-display text-[40px] font-normal leading-none" style={{ letterSpacing: '-0.022em', textWrap: 'balance' }}>
              {head}{head && ' '}
              <span className="italic text-brand">{tail}.</span>
            </h1>
            {/* vibe tags — skill window + sport */}
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-pill px-[11px] py-1.5 text-[12px] font-medium tracking-[0.01em]" style={{ background: 'rgba(26,26,26,0.06)' }}>
                {sportLabel(m.sport)}
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-[11px] py-1.5 text-[12px] font-medium tracking-[0.01em]" style={{ background: 'rgba(26,26,26,0.06)' }}>
                {LEVEL_NAMES[minLevel - 1]} <span style={{ color: 'var(--color-text-muted)' }}>→</span> {LEVEL_NAMES[maxLevel - 1]}
              </span>
              {m.fee_per_player == null && (
                <span className="inline-flex items-center gap-1.5 rounded-pill px-[11px] py-1.5 text-[12px] font-medium tracking-[0.01em]" style={{ background: 'rgba(26,26,26,0.06)' }}>
                  Free to join
                </span>
              )}
            </div>
          </div>

          {/* When */}
          <div>
            <Eyebrow accent="var(--color-brand)">When</Eyebrow>
            <div className={`relative mt-3 ${cardCls}`} style={cardStyle}>
              <div className="px-3.5 pt-3.5 pb-3">
                <div className="scroll-area flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {strip.map((d) => (
                    <span
                      key={d.key}
                      className="flex min-w-[46px] shrink-0 flex-col items-center gap-0.5 rounded-[14px] px-1.5 pt-2 pb-2.5"
                      style={{
                        border: d.active ? '1.5px solid var(--color-brand)' : '1px solid transparent',
                        background: d.active ? 'var(--color-brand)' : 'transparent',
                        color: d.active ? 'var(--color-text-onbrand)' : 'var(--color-text-muted)',
                        opacity: d.active ? 1 : 0.65,
                      }}
                    >
                      <span className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ opacity: 0.75 }}>
                        {d.short}
                      </span>
                      <span className="font-display text-[20px] leading-none nums-tabular">{d.day}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid border-t" style={{ gridTemplateColumns: '1fr 1px 1fr', borderColor: 'rgba(26,26,26,0.10)' }}>
                <TimeCell label="Starts" value={hm(m.start_time)} />
                <div style={{ background: 'rgba(26,26,26,0.10)' }} />
                <TimeCell label="Ends" value={hm(m.end_time)} />
              </div>
              <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: 'rgba(26,26,26,0.10)' }}>
                <span className="text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
                  Duration
                </span>
                <span className="rounded-pill border-[1.5px] border-brand bg-brand px-3 py-1.5 text-[12px] font-medium text-onbrand nums-tabular">{durationMin}m</span>
              </div>
            </div>
          </div>

          {/* Where */}
          <div className="mt-6">
            <Eyebrow accent="var(--color-brand)">Where</Eyebrow>
            <div className={`mt-3 overflow-hidden ${cardCls}`} style={cardStyle}>
              <div className="relative h-[110px]">
                <MiniMap height={110} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.18))' }} />
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  {isRunning ? (
                    <>
                      <div className="font-display text-[20px] leading-[1.1]">
                        {m.route_start} <span className="italic text-brand">{m.round_trip ? '· loop' : `→ ${m.route_end}`}</span>
                      </div>
                      {m.venue_location && (
                        <div className="mt-1 flex items-center gap-2 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} strokeWidth={1.8} /> {m.venue_location}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="font-display text-[20px] leading-[1.1]">
                        {m.venue_name}
                        {m.court_number && <span className="italic text-brand"> · {m.court_number}</span>}
                      </div>
                      {m.venue_location && (
                        <div className="mt-1 flex items-center gap-2 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin size={12} strokeWidth={1.8} className="shrink-0" /> {m.venue_location}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Opening directions')}
                  className="shrink-0 cursor-pointer whitespace-nowrap rounded-pill bg-transparent px-3.5 py-2 text-[12px] font-medium text-ink"
                  style={{ border: '1.5px solid rgba(26,26,26,0.18)' }}
                >
                  Directions
                </button>
              </div>
            </div>
          </div>

          {/* Players */}
          <div className="mt-6">
            <Eyebrow accent="var(--color-brand)">Players</Eyebrow>
            <div className={`mt-3 flex flex-col gap-[18px] p-[18px] ${cardCls}`} style={cardStyle}>
              <div>
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div className="text-[13.5px] font-medium text-ink">{isFull ? 'Match is full' : `${m.spots_available} ${m.spots_available === 1 ? 'spot' : 'spots'} open`}</div>
                  <span className="font-display text-[28px] leading-none nums-tabular">
                    {filled}
                    <span className="italic" style={{ color: 'var(--color-text-muted)' }}>
                      /{m.total_spots}
                    </span>
                  </span>
                </div>
                <div className="mt-1.5">
                  <PlayerDots filled={filled} total={m.total_spots} size={28} />
                </div>
                {/* roster names */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {players.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(p.id === currentUserId ? '/profile' : `/players/${p.id}`)}
                      className="inline-flex cursor-pointer items-center gap-[5px] rounded-pill border-none px-[9px] py-1 text-[11.5px]"
                      style={{ background: 'rgba(26,26,26,0.06)', color: 'var(--color-text-muted)' }}
                    >
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent font-display text-[8.5px] italic leading-none text-onbrand">
                        {initials(p)[0]}
                      </span>
                      <span className="text-ink">{p.name.split(' ')[0]}</span>
                      {p.id === m.host_id && <span className="font-display text-[13px] italic text-brand">· host</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px" style={{ background: 'rgba(26,26,26,0.10)' }} />

              <div>
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div className="text-[13.5px] font-medium text-ink">Skill level</div>
                  <span className="text-[12.5px] font-medium text-ink">
                    {LEVEL_NAMES[minLevel - 1]} <span style={{ color: 'var(--color-text-muted)' }}>→</span> {LEVEL_NAMES[maxLevel - 1]}
                  </span>
                </div>
                {/* static range bar */}
                <div className="relative mt-2.5 h-[22px]">
                  <div className="absolute inset-x-0 top-[9px] h-1 rounded-sm" style={{ background: 'rgba(26,26,26,0.10)' }} />
                  <div
                    className="absolute top-[9px] h-1 rounded-sm bg-brand"
                    style={{ insetInlineStart: `${((minLevel - 1) / 4) * 100}%`, width: `${((maxLevel - minLevel) / 4) * 100}%` }}
                  />
                  {[1, 2, 3, 4, 5].map((n) => {
                    const inRange = n >= minLevel && n <= maxLevel
                    return (
                      <span
                        key={n}
                        className="absolute top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full rtl:translate-x-1/2"
                        style={{
                          insetInlineStart: `${((n - 1) / 4) * 100}%`,
                          background: inRange ? 'var(--color-brand)' : 'var(--surface-card)',
                          border: `1.5px solid ${inRange ? 'var(--color-brand)' : 'rgba(26,26,26,0.18)'}`,
                        }}
                      />
                    )
                  })}
                </div>
                <div className="mt-1 flex justify-between text-[9.5px] font-medium uppercase tracking-[0.08em]">
                  {LEVEL_NAMES.map((l, i) => {
                    const inRange = i + 1 >= minLevel && i + 1 <= maxLevel
                    return (
                      <span key={l} style={{ color: inRange ? 'var(--color-brand)' : 'var(--color-text-muted)', fontWeight: inRange ? 600 : 500 }}>
                        {['Baby', 'Beg', 'Low int.', 'High int.', 'Adv'][i]}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* host view: pending join requests — approve/decline, no slot hold */}
          {hostView &&
            db.matchRequests
              .filter((r) => r.match_id === m.id && r.kind === 'request' && r.status === 'requested')
              .map((r) => {
                const requester = getUser(db, r.player_id)
                if (!requester) return null
                return (
                  <div key={r.id} className="mt-6">
                    <Eyebrow accent="var(--color-brand)">Wants to join</Eyebrow>
                    <div className="mt-3 flex flex-col gap-3">
                      <ProfilePeek user={requester} mode="request" />
                      <DecisionButtons
                        mode="request"
                        size="sm"
                        onApprove={() => {
                          actions.approveRequest(r.id)
                          showToast(`${requester.name.split(' ')[0]} is in`)
                        }}
                        onDecline={() => {
                          actions.declineRequest(r.id)
                          showToast('Request declined')
                        }}
                      />
                    </div>
                  </div>
                )
              })}

          {/* host of an invite-only match: invite specific players (§5 — host→player,
              the invite holds no slot; first to fill wins) */}
          {hostView && m.join_mode === 'invite' && (
            <div className="mt-6">
              <Eyebrow accent="var(--color-brand)">Invite players</Eyebrow>
              {(() => {
                const pending = db.matchRequests.filter((r) => r.match_id === m.id && r.kind === 'invite' && r.status === 'invited')
                const candidates = invitablePlayers(db, m.id)
                return (
                  <div className="mt-3 flex flex-col gap-3">
                    {pending.length > 0 && (
                      <div className={`flex flex-col gap-2.5 p-[18px] ${cardCls}`} style={cardStyle}>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
                          Invited · awaiting reply
                        </div>
                        {pending.map((r) => {
                          const u = getUser(db, r.player_id)
                          if (!u) return null
                          return (
                            <div key={r.id} className="flex items-center gap-3">
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[15px] italic text-onbrand">{initials(u)}</span>
                              <div className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{u.name}</div>
                              <span
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-medium"
                                style={{ background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)', color: 'var(--color-warning)' }}
                              >
                                <Hourglass size={11} strokeWidth={2} /> Pending
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {isFull ? (
                      <div className="text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
                        Match is full — no more invites needed.
                      </div>
                    ) : candidates.length > 0 ? (
                      <div className={`flex flex-col p-[18px] ${cardCls}`} style={cardStyle}>
                        {candidates.map((u) => (
                          <div key={u.id} className="flex items-center gap-3 py-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/players/${u.id}`)}
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-none bg-transparent p-0 text-start"
                            >
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[15px] italic text-onbrand">{initials(u)}</span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[14px] font-medium text-ink">{u.name}</div>
                                <div className="text-[11.5px] nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
                                  {skillLabel(u.skill_level)} · {u.matches_played} played
                                </div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                actions.invitePlayer(m.id, u.id)
                                showToast(`Invited ${u.name.split(' ')[0]}`)
                              }}
                              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-pill border-none bg-brand px-3.5 py-2 text-[12.5px] font-semibold text-onbrand"
                            >
                              <Plus size={13} strokeWidth={2.4} /> Invite
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
                        Everyone's been invited or has joined.
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* invited player: accept/decline — the invite holds no slot */}
          {!hostView &&
            db.matchRequests
              .filter((r) => r.match_id === m.id && r.kind === 'invite' && r.player_id === currentUserId)
              .map((r) =>
                r.status === 'invited' ? (
                  <div key={r.id} className="mt-6">
                    <Eyebrow accent="var(--color-brand)">You're invited</Eyebrow>
                    <div className="mt-3 flex flex-col gap-3">
                      <ProfilePeek user={host} mode="invite" />
                      <DecisionButtons
                        mode="invite"
                        onApprove={() => {
                          // race-safe accept → route into the match chat the
                          // accept just added us to (CLAUDE.md §5)
                          const res = actions.acceptInvite(r.id)
                          if (res === 'expired') {
                            showToast('Match just filled')
                          } else {
                            showToast("You're in")
                            navigate(`/chat/match/${m.id}`)
                          }
                        }}
                        onDecline={() => {
                          actions.declineInvite(r.id)
                          showToast('Invite declined')
                        }}
                      />
                    </div>
                  </div>
                ) : r.status === 'expired' ? (
                  <div key={r.id} className="mt-6">
                    <ResolvedNote status="expired" text="This invite expired — the match filled up or the time passed." />
                  </div>
                ) : null,
              )}

          {/* Hosted by — trust signals, never a gate (CLAUDE.md §5) */}
          {!hostView && (
            <div className="mt-6">
              <Eyebrow accent="var(--color-brand)">Hosted by</Eyebrow>
              <button
                type="button"
                onClick={() => navigate(`/players/${host.id}`)}
                className={`mt-3 flex w-full cursor-pointer items-center gap-3.5 p-[18px] text-start ${cardCls}`}
                style={cardStyle}
              >
                <span className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-accent font-display text-[22px] italic text-onbrand">
                  {initials(host)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[21px] leading-[1.1]" style={{ letterSpacing: '-0.012em' }}>
                    {host.name}
                  </div>
                  <div className="mt-[5px] flex flex-wrap items-center gap-2 text-[11.5px] nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
                    <span>
                      <span className="font-semibold text-ink">{host.matches_played}</span> matches played
                    </span>
                    <span className="opacity-40">·</span>
                    <span>
                      <span className="font-semibold text-ink">{host.attendance_rate}%</span> attendance
                    </span>
                    {host.no_show_count > 0 && (
                      <>
                        <span className="opacity-40">·</span>
                        <span>{host.no_show_count} no-shows</span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight size={14} strokeWidth={2} className="shrink-0 rtl:rotate-180" style={{ color: 'rgba(26,26,26,0.3)' }} />
              </button>
            </div>
          )}

          {/* Description */}
          {m.notes && (
            <div className="mt-6">
              <Eyebrow accent="var(--color-brand)">Description</Eyebrow>
              <div className={`mt-3 px-4 py-3.5 ${cardCls}`} style={cardStyle}>
                <p className="m-0 font-display text-[18px] leading-[1.45] text-ink" style={{ letterSpacing: '-0.005em', textWrap: 'pretty' }}>
                  {m.notes}
                </p>
                <div className="mt-2.5 border-t pt-2.5 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ borderColor: 'rgba(26,26,26,0.10)', color: 'var(--color-text-muted)' }}>
                  — {host.name}, host
                </div>
              </div>
            </div>
          )}

          {/* joined: jump into the match chat */}
          {joined && (status === 'open' || status === 'full' || status === 'live') && (
            <div className="mt-6">
              <button
                onClick={() => navigate(`/chat/match/${m.id}`)}
                className={`flex w-full cursor-pointer items-center gap-3.5 p-[18px] text-start ${cardCls}`}
                style={cardStyle}
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-onbrand" style={{ boxShadow: '0 8px 18px -8px var(--color-brand)' }}>
                  <MessageCircle size={17} strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-ink">Match chat</div>
                  <div className="mt-0.5 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                    All {filled} joined players are in
                  </div>
                </div>
                <ChevronRight size={14} strokeWidth={2} className="shrink-0 rtl:rotate-180" style={{ color: 'rgba(26,26,26,0.3)' }} />
              </button>
            </div>
          )}

          {/* completed: record result */}
          {joined && status === 'completed' && (
            <div className="mt-6">
              <button
                onClick={() => navigate(`/post-match/${m.id}`)}
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-pill border-none bg-brand text-[14px] font-semibold text-onbrand shadow-cta"
              >
                <Star size={15} strokeWidth={2} /> Record result
              </button>
            </div>
          )}
        </div>

        {/* sticky footer CTA — player view only */}
        {!hostView && (status === 'open' || status === 'full') && !joined && (
          <div
            className="absolute inset-x-0 bottom-0 z-5 flex flex-col items-center gap-2.5 px-[22px] pt-4 pb-[22px]"
            style={{ background: 'linear-gradient(180deg, transparent, var(--surface-page) 30%)' }}
          >
            <button
              type="button"
              onClick={onJoin}
              disabled={!canAct}
              className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-pill border-none text-[15px] font-semibold tracking-[0.01em] text-onbrand"
              style={{
                cursor: canAct ? 'pointer' : 'default',
                background:
                  joinedState === 'joined'
                    ? '#2d4a3e'
                    : joinedState === 'requested' || joinedState === 'waitlisted'
                      ? 'rgba(26,26,26,0.85)'
                      : canWaitlist
                        ? 'var(--color-info)' // full · locked-in lifecycle token
                        : canJoin
                          ? 'var(--color-brand)'
                          : 'rgba(26,26,26,0.35)',
                boxShadow: canWaitlist ? '0 14px 28px -12px var(--color-info)' : canJoin ? '0 14px 28px -12px var(--color-brand)' : 'none',
              }}
            >
              {joinedState === 'joined' && <Check size={14} strokeWidth={2.6} />}
              {joinedState === 'waitlisted' && <Hourglass size={15} strokeWidth={2} />}
              {canWaitlist && <ListPlus size={16} strokeWidth={2.1} />}
              {canJoin && (m.join_mode === 'approval' ? <Send size={16} strokeWidth={1.9} /> : <Plus size={17} strokeWidth={2.2} />)}
              {ctaLabel}
              {joinedState === 'waitlisted' && wlPos != null && <span className="nums-tabular ltr-nums">· #{wlPos}</span>}
              {m.fee_per_player != null && canAct && (
                <>
                  <span className="opacity-50">·</span>
                  <span className="nums-tabular">QAR {m.fee_per_player}</span>
                </>
              )}
            </button>
            {joinedState === 'waitlisted' && (
              <button
                type="button"
                onClick={() => {
                  actions.leaveWaitlist(m.id)
                  showToast('Left the waitlist')
                }}
                className="cursor-pointer border-none bg-transparent p-0 text-[12.5px] font-semibold tracking-[0.01em]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Leave waitlist
              </button>
            )}
          </div>
        )}
      </div>
    </Shell>
  )
}
