import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, Send } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Avatar } from '@/components/Avatar'
import { Eyebrow } from '@/components/Eyebrow'
import { MatchCard } from '@/components/MatchCard'
import { useToast } from '@/components/Toast'
import { InviteApprovalSheet, type Invite } from '@/components/InviteApprovalSheet'
import { actions, currentUserId, getUser, hostedMatches, isJoined, joinedMatches, matchPlayers, myInvites, useDB, waitlistEntry, waitlistPosition } from '@/lib/store'
import { computeStatus } from '@/lib/status'
import { artType, countdownUntil, dayLabel, greetingDate, hm, initials, matchKind, skillLabel, sportLabel, timeRange, timeAgoLabel, whenLabel } from '@/lib/format'
import type { Match, User } from '@/lib/types'
import { useHostedMatch } from '@/lib/hostedMatch'
import { isSupabaseConfigured } from '@/lib/supabase'
import { LIFECYCLE } from '@/components/lifecycle'
import { WeekMatchCard } from './WeekMatchCard'
import { HostedMatchCard } from './HostedMatchCard'
import { FirstTimerHome } from './FirstTimerHome'

/** Invites the auto-pop-up has already greeted the user with, so it fires once
 *  per invite (not on every Home visit/reload). Deferred invites stay pending
 *  and remain reachable from the invite card. */
const INVITES_SEEN_KEY = 'connect:invitesSeen'
function loadSeenInvites(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(INVITES_SEEN_KEY) || '[]') as string[])
  } catch {
    return new Set()
  }
}
function saveSeenInvites(seen: Set<string>) {
  try {
    localStorage.setItem(INVITES_SEEN_KEY, JSON.stringify([...seen]))
  } catch {
    /* ignore quota/availability errors */
  }
}

/** Adapt a store Match + its host into the InviteApprovalSheet's self-contained
 *  shape. The sheet's star-rating/distance chips stay omitted on purpose — the
 *  app's trust model is level/played/attendance, never stars (CLAUDE.md §5). */
function toInvite(m: Match, host: User): Invite {
  return {
    person: {
      name: host.name,
      first: host.name.split(' ')[0] || host.name,
      init: initials(host),
      accent: 'var(--color-accent)',
      level: skillLabel(host.skill_level),
      played: host.matches_played,
      attendance: host.attendance_rate,
      note: m.notes ?? undefined,
    },
    match: {
      sport: m.sport,
      type: artType(m),
      kind: matchKind(m),
      court: m.court_number ? `Court ${m.court_number}` : sportLabel(m.sport),
      venue: m.venue_name,
      when: `${whenLabel(m.start_time)} · ${hm(m.start_time)}`,
      span: timeRange(m),
      max: m.total_spots,
      filled: m.total_spots - m.spots_available,
    },
  }
}

/** Home — default landing tab. Data-driven sections cover every design
 *  variant (First Timer / 2P No Hosting / 2P With Hosting):
 *  greeting → NEXT UP → You're hosting →
 *  Requested to join → This week → Saved. My Matches lives here, not in
 *  a 4th tab (CLAUDE.md §4). */
export function HomeScreen() {
  const db = useDB()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [attended, setAttended] = useState(false)
  // invite-approval bottom sheet: `sheet` holds a snapshot of the tapped invite
  // so the resolved state + exit animation survive the store mutation that
  // removes the invite from the list; `sheetOpen` drives the slide in/out.
  const [sheet, setSheet] = useState<{ reqId: string; matchId: string; invite: Invite } | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const seenInvites = useRef(loadSeenInvites())
  const me = getUser(db, currentUserId)!
  // the host's own match (localStorage source of truth) — written by the
  // Create/Edit form; preferred over seeded hosted matches when present.
  // It is a demo/mock artifact: `connect:hostedMatch` is a single browser-global
  // key, NOT scoped per user, so in live (Supabase) mode it would bleed across
  // accounts on the same device. Live mode relies solely on the host-scoped
  // store selector (`data.hosted`, filtered by host_id === currentUserId).
  const localHosted = useHostedMatch()
  const hosted = isSupabaseConfigured ? null : localHosted

  const data = useMemo(() => {
    const joined = joinedMatches(db)
    const hosted = hostedMatches(db).filter((m) => {
      const s = computeStatus(m)
      return s === 'open' || s === 'full'
    })
    const upcoming = joined.filter((m) => {
      const s = computeStatus(m)
      return s === 'open' || s === 'full'
    })
    const nextUp = upcoming[0]
    const week = upcoming.slice(1).filter((m) => !hosted.some((h) => h.id === m.id))
    const requested = db.matchRequests.filter((r) => r.player_id === currentUserId && r.kind === 'request' && r.status === 'requested')
    const invited = myInvites(db)
    const saved = db.matches.filter((m) => db.savedMatchIds.includes(m.id) && !isJoined(db, m.id))
    return { joined, hosted, nextUp, week, requested, invited, saved }
  }, [db])

  // Auto-greet the first not-yet-seen pending invite with the approval pop-up,
  // once per invite. A small beat lets Home settle before it slides up; setState
  // runs inside the timeout (never synchronously in the effect) so the render
  // stays clean, and the cleanup cancels it if the user opens a card first.
  useEffect(() => {
    if (sheet) return
    const pending = data.invited.find((r) => !seenInvites.current.has(r.id))
    if (!pending) return
    const m = db.matches.find((x) => x.id === pending.match_id)
    const host = m ? getUser(db, m.host_id) : undefined
    if (!m || !host) return
    const t = setTimeout(() => {
      seenInvites.current.add(pending.id)
      saveSeenInvites(seenInvites.current)
      setSheet({ reqId: pending.id, matchId: m.id, invite: toInvite(m, host) })
      setSheetOpen(true)
    }, 350)
    return () => clearTimeout(t)
  }, [data.invited, db, sheet])

  // empty personal state = no joined (match_players) + no hosted (host_id = me)
  // + no pending invites. Purely data-derived — never a "new user" flag (§4).
  if (data.joined.length === 0 && data.hosted.length === 0 && !hosted && data.invited.length === 0) {
    return <FirstTimerHome />
  }

  const nextUpStatus = data.nextUp ? computeStatus(data.nextUp) : null
  const nextUpLc = nextUpStatus ? LIFECYCLE[nextUpStatus] : null
  const nextUpIsPlain = nextUpStatus === 'open' || nextUpStatus === 'full'

  return (
    <Shell>
      <div className="px-6 pt-[60px] pb-[110px]">
        {/* greeting */}
        <div className="mb-[26px] flex items-start justify-between">
          <div>
            <div className="mb-2.5 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: 'rgba(26,26,26,0.5)' }}>
              {greetingDate()}
            </div>
            <h1 className="m-0 font-display text-[38px] font-normal leading-none" style={{ letterSpacing: '-0.02em' }}>
              Hello, <span className="italic text-accent">{me.name.split(' ')[0]}</span>.
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/matches/create"
              aria-label="Create a match"
              className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-full bg-transparent text-brand transition-colors"
              style={{ border: '1.5px dashed color-mix(in srgb, var(--color-brand) 40%, transparent)' }}
            >
              <Plus size={16} strokeWidth={2} />
            </Link>
            <Link to="/settings" aria-label="Settings" className="no-underline">
              <Avatar name={me.name} accent="var(--color-accent)" />
            </Link>
          </div>
        </div>

        {/* next up — featured */}
        {data.nextUp && nextUpLc && (
          <>
            <div
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-pill py-1.5 ps-2.5 pe-3 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-onbrand"
              style={{
                background: nextUpIsPlain ? 'var(--color-brand)' : nextUpLc.color,
                boxShadow: `0 6px 16px -6px ${nextUpIsPlain ? 'var(--color-brand)' : nextUpLc.color}`,
              }}
            >
              <span className={`h-1.5 w-1.5 rounded-full bg-onbrand ${nextUpLc.pulse ? 'conn-pulse' : ''}`} />
              {nextUpIsPlain
                ? (() => {
                    const left = countdownUntil(data.nextUp.start_time)
                    return left === 'soon' ? 'Next up · soon' : `Next up · in ${left}`
                  })()
                : nextUpLc.label}
            </div>
            <div className="mt-2.5 mb-[26px]">
              <MatchCard
                match={data.nextUp}
                host={data.nextUp.host_id !== currentUserId ? getUser(db, data.nextUp.host_id) : null}
                players={matchPlayers(db, data.nextUp.id)}
                action="attend"
                attended={attended}
                onAct={() => setAttended((v) => !v)}
                showStatusBadge={false}
              />
            </div>
          </>
        )}

        {/* you're invited — host→player invites awaiting your reply (§5).
            Accept/Decline inline; tapping the card opens Match Details. */}
        {data.invited.map((r) => {
          const m = db.matches.find((x) => x.id === r.match_id)
          const host = m ? getUser(db, m.host_id) : undefined
          if (!m || !host) return null
          return (
            <div key={r.id}>
              <div className="mb-2.5">
                <Eyebrow>You're invited</Eyebrow>
              </div>
              <div className="mb-[26px]">
                <MatchCard match={m} host={host} players={matchPlayers(db, m.id)} action="view" showStatusBadge={false} badge={{ text: 'Invite' }} />
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSheet({ reqId: r.id, matchId: m.id, invite: toInvite(m, host) })
                      setSheetOpen(true)
                    }}
                    className="inline-flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-pill border-none text-[14px] font-semibold text-onbrand"
                    style={{ background: 'var(--color-brand)', boxShadow: '0 12px 24px -10px var(--color-brand)' }}
                  >
                    <Send size={15} strokeWidth={2} /> Review invitation
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {/* you're hosting — the host's own match from the source of truth wins;
            otherwise fall back to seeded hosted matches */}
        {hosted ? (
          <div>
            <div className="mb-2.5">
              <Eyebrow>You're hosting · {hosted.dateLabel}</Eyebrow>
            </div>
            <div className="mb-[26px]">
              <HostedMatchCard match={hosted} />
            </div>
          </div>
        ) : (
          data.hosted.map((m) => (
            <div key={m.id}>
              <div className="flex items-center justify-between">
                <Eyebrow>You're hosting · {dayLabel(m.start_time)}</Eyebrow>
                <Link
                  to="/matches/all?filter=hosting"
                  className="inline-flex items-center gap-1 text-[11.5px] font-medium no-underline transition-colors hover:text-accent"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  See all <ChevronRight size={10} strokeWidth={2.2} className="rtl:rotate-180" />
                </Link>
              </div>
              <div className="mt-2.5 mb-[26px]">
                <MatchCard match={m} players={matchPlayers(db, m.id)} action="edit" showStatusBadge={false} />
              </div>
            </div>
          ))
        )}

        {/* requested to join — awaiting host approval */}
        {data.requested.map((r) => {
          const m = db.matches.find((x) => x.id === r.match_id)
          if (!m) return null
          return (
            <div key={r.id}>
              <div className="mb-2.5">
                <Eyebrow>Requested to join</Eyebrow>
              </div>
              <div className="mb-[26px]">
                <MatchCard
                  match={m}
                  host={getUser(db, m.host_id)}
                  players={matchPlayers(db, m.id)}
                  action="cancel"
                  onAct={() => {
                    actions.cancelRequest(m.id)
                    showToast('Request cancelled')
                  }}
                  badge={{ text: 'Awaiting host', pulse: true }}
                  hostNote={`sent ${timeAgoLabel(r.created_at)}`}
                />
              </div>
            </div>
          )
        })}

        {/* this week */}
        {data.week.length > 0 && (
          <>
            <Eyebrow>This week</Eyebrow>
            <div className="mt-2.5 mb-[26px] flex flex-col gap-3.5">
              {data.week.map((m) => (
                <WeekMatchCard key={m.id} match={m} host={m.host_id !== currentUserId ? getUser(db, m.host_id) : null} players={matchPlayers(db, m.id)} />
              ))}
            </div>
          </>
        )}

        {/* saved — bookmarked but never joined */}
        {data.saved.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <Eyebrow>Saved · not joined yet</Eyebrow>
              <Link
                to="/matches/all"
                className="inline-flex items-center gap-1 text-[11.5px] font-medium no-underline transition-colors hover:text-accent"
                style={{ color: 'var(--color-text-muted)' }}
              >
                See all <ChevronRight size={10} strokeWidth={2.2} className="rtl:rotate-180" />
              </Link>
            </div>
            <div className="mt-2.5 flex flex-col gap-3.5">
              {data.saved.map((m) => {
                const waitlisted = waitlistEntry(db, m.id)
                return (
                  <MatchCard
                    key={m.id}
                    match={m}
                    host={getUser(db, m.host_id)}
                    players={matchPlayers(db, m.id)}
                    action="join"
                    joinStatus={waitlisted ? 'waitlisted' : null}
                    waitlistPosition={waitlisted ? waitlistPosition(db, m.id) : null}
                    onAct={() => {
                      if (computeStatus(m) === 'full') {
                        actions.joinWaitlist(m.id)
                        showToast("On the waitlist — you'll be auto-joined if a spot frees")
                      } else if (m.join_mode === 'approval') {
                        actions.requestToJoin(m.id)
                        showToast('Request sent')
                      } else {
                        actions.joinMatch(m.id)
                        showToast('Joined')
                      }
                    }}
                    saved={db.savedMatchIds.includes(m.id)}
                    onToggleSave={() => actions.toggleSaveMatch(m.id)}
                  />
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* invite-approval bottom sheet — slides up over the dimmed Home screen */}
      {sheet && (
        <InviteApprovalSheet
          invite={sheet.invite}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onDefer={() => {
            setSheetOpen(false)
            showToast("Saved — decide whenever you're ready")
          }}
          onResolve={(state) => {
            if (state === 'declined') {
              actions.declineInvite(sheet.reqId)
              showToast('Invite declined')
            } else if (state === 'waitlist') {
              actions.joinWaitlist(sheet.matchId)
              showToast("Added to the waitlist — you'll be auto-joined if a spot frees")
            } else {
              // race-safe accept: if the last slot was taken between render and
              // tap the invite expires; otherwise route straight into the match
              // chat thread the accept just added us to (CLAUDE.md §5).
              const res = actions.acceptInvite(sheet.reqId)
              if (res === 'expired') {
                setSheetOpen(false)
                showToast('Match just filled')
              } else {
                showToast("You're in")
                navigate(`/chat/match/${sheet.matchId}`)
              }
            }
          }}
        />
      )}
    </Shell>
  )
}
