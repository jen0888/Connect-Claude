import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Plus } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Avatar } from '@/components/Avatar'
import { Eyebrow } from '@/components/Eyebrow'
import { MatchCard } from '@/components/MatchCard'
import { useToast } from '@/components/Toast'
import { actions, currentUserId, getUser, hostedMatches, isJoined, joinedMatches, matchPlayers, useDB } from '@/lib/store'
import { computeStatus } from '@/lib/status'
import { dayLabel, greetingDate, hoursUntil, timeAgoLabel } from '@/lib/format'
import { LIFECYCLE } from '@/components/lifecycle'
import { RecordResultHomeCard } from './RecordResultHomeCard'
import { WeekMatchCard } from './WeekMatchCard'
import { FirstTimerHome } from './FirstTimerHome'

/** Home — default landing tab. Data-driven sections cover every design
 *  variant (First Timer / 2P No Hosting / 2P With Hosting / Just Played):
 *  greeting → JUST PLAYED (transient, 24h) → NEXT UP → You're hosting →
 *  Requested to join → This week → Saved. My Matches lives here, not in
 *  a 4th tab (CLAUDE.md §4). */
export function HomeScreen() {
  const db = useDB()
  const { showToast } = useToast()
  const [attended, setAttended] = useState(false)
  const me = getUser(db, currentUserId)!

  const data = useMemo(() => {
    const joined = joinedMatches(db)
    const hosted = hostedMatches(db).filter((m) => {
      const s = computeStatus(m)
      return s === 'open' || s === 'full'
    })
    const justPlayed = joined.find((m) => computeStatus(m) === 'completed')
    const upcoming = joined.filter((m) => {
      const s = computeStatus(m)
      return s === 'open' || s === 'full'
    })
    const nextUp = upcoming[0]
    const week = upcoming.slice(1).filter((m) => !hosted.some((h) => h.id === m.id))
    const requested = db.matchRequests.filter((r) => r.player_id === currentUserId && r.kind === 'request' && r.status === 'requested')
    const saved = db.matches.filter((m) => db.savedMatchIds.includes(m.id) && !isJoined(db, m.id))
    return { joined, hosted, justPlayed, nextUp, week, requested, saved }
  }, [db])

  // brand-new player: nothing joined, hosted or pending → first-timer Home
  if (data.joined.length === 0 && data.hosted.length === 0 && data.requested.length === 0) {
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
            <Link to="/profile" aria-label="Profile & settings" className="no-underline">
              <Avatar name={me.name} accent="var(--color-accent)" />
            </Link>
          </div>
        </div>

        {/* just played — transient post-match prompt (24h window) */}
        {data.justPlayed && <RecordResultHomeCard match={data.justPlayed} />}

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
              {nextUpIsPlain ? `Next up · in ${hoursUntil(data.nextUp.start_time)}h` : nextUpLc.label}
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

        {/* you're hosting */}
        {data.hosted.map((m) => (
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
        ))}

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
              {data.saved.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  host={getUser(db, m.host_id)}
                  players={matchPlayers(db, m.id)}
                  action="join"
                  onAct={() => {
                    if (m.join_mode === 'approval') {
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
              ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  )
}
