import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, ChevronLeft, EllipsisVertical, Flag, MapPin, MessageCircle, Pencil, ShieldAlert } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Eyebrow } from '@/components/Eyebrow'
import { MatchCard } from '@/components/MatchCard'
import { SportArt } from '@/components/SportArt'
import { useToast } from '@/components/Toast'
import { actions, currentUserId, discoverMatches, getUser, isJoined, matchPlayers, pendingRequest, useDB, waitlistEntry, waitlistPosition } from '@/lib/store'
import { computeStatus } from '@/lib/status'
import { artType, courtLabel, dayLabel, matchKind, skillLabel, sportLabel, initials as userInitials } from '@/lib/format'
import { sportEmoji } from '@/lib/sports'
import { readProfileSports, skillLevelToRating, type SportLevel } from '@/lib/profile'
import type { User } from '@/lib/types'

/** Player Profile (Player Profile.html / Other Player Profile.html).
 *  Public by default — matches, win rate and no-show count are visible on
 *  every profile surface; trust signals are peer transparency, never a gate
 *  (CLAUDE.md §5). Other-player view adds Message + the ⋯ → Report / Block
 *  menu (block stays slightly hidden — no primary button). */

function winRate(db: ReturnType<typeof useDB>, userId: string): number | null {
  const results = db.matchResults.filter((r) => r.player_id === userId)
  if (!results.length) return null
  return Math.round((results.filter((r) => r.result === 'win').length / results.length) * 100)
}

export function ProfileScreen({ own = false }: { own?: boolean }) {
  const { id } = useParams()
  const db = useDB()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)

  const user: User | undefined = own ? getUser(db, currentUserId) : id ? getUser(db, id) : undefined
  if (!user) return null
  const isMe = user.id === currentUserId

  const rate = winRate(db, user.id)
  const joinedYear = new Date(user.created_at).getFullYear().toString().slice(-2)

  // Sports & level. The canonical primary sport + level is ALWAYS the one on the
  // store `users` row (the single source of truth everyone reads — /players/:id,
  // match cards, roster, chat — §5), so it can never drift from what others see.
  // On the viewer's OWN profile we additionally surface the extra sports they
  // saved in Edit Profile (readProfileSports, lib/profile); other players only
  // ever see the primary, since the multi-sport list isn't on the users row.
  const primarySport: SportLevel = { sport: user.sport, level: skillLevelToRating(user.skill_level) }
  const extraSports = isMe ? (readProfileSports() ?? []).filter((s) => s.sport !== user.sport) : []
  const sportsList: SportLevel[] = [primarySport, ...extraSports]
  const [first, ...restName] = user.name.split(' ')

  // their open matches (hosted by them, joinable)
  const theirOpen = !isMe ? discoverMatches(db).filter((m) => m.host_id === user.id) : []

  // recent matches: played matches they were in
  const recent = db.matchPlayers
    .filter((mp) => mp.player_id === user.id)
    .map((mp) => db.matches.find((m) => m.id === mp.match_id))
    .filter((m): m is NonNullable<typeof m> => !!m && new Date(m.end_time).getTime() < Date.now())
    .sort((a, b) => b.start_time.localeCompare(a.start_time))
    .slice(0, 4)

  return (
    <Shell>
      <div className="scroll-area relative z-1 h-full overflow-y-auto px-6 pt-12 pb-[120px]">
        {/* top bar */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none text-ink"
            style={{ background: 'rgba(26,26,26,0.05)' }}
          >
            <ChevronLeft size={18} strokeWidth={2} className="rtl:rotate-180" />
          </button>
          {isMe ? (
            <button
              onClick={() => navigate('/profile/edit')}
              aria-label="Edit profile"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none text-ink"
              style={{ background: 'rgba(26,26,26,0.05)' }}
            >
              <Pencil size={16} strokeWidth={1.9} />
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="More"
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none text-ink"
                style={{ background: 'rgba(26,26,26,0.05)' }}
              >
                <EllipsisVertical size={17} strokeWidth={1.9} />
              </button>
              {menuOpen && (
                <>
                  <div onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30" />
                  <div
                    className="absolute end-0 top-[calc(100%+8px)] z-31 w-[180px] overflow-hidden rounded-[16px] border bg-card py-1"
                    style={{ borderColor: 'rgba(26,26,26,0.10)', boxShadow: '0 18px 40px -14px rgba(26,26,26,0.45)' }}
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        navigate(`/safety/report/${user.id}`)
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-2.5 text-start text-[13.5px] font-medium"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <Flag size={15} strokeWidth={1.9} /> Report
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        actions.blockUser(user.id)
                        showToast(`${first} blocked`)
                        navigate(-1)
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-2.5 text-start text-[13.5px] font-medium"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <ShieldAlert size={15} strokeWidth={1.9} /> Block
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* hero — identity stacks name → location → bio directly under the
            name (CLAUDE.md §5); empty location/bio lines hide cleanly. */}
        <div className="flex flex-col items-center pt-2 text-center">
          <div className="inline-flex h-[88px] w-[88px] items-center justify-center rounded-full bg-accent font-display text-[48px] italic leading-none text-page" style={{ letterSpacing: '-0.01em', boxShadow: '0 14px 30px -14px rgba(26,26,26,0.35)' }}>
            {userInitials(user)[0]}
          </div>
          <div className="mt-3.5 flex items-center justify-center gap-1.5">
            {/* name — Instrument Serif 44px, tight tracking; first name carried in
                italic accent as the recurring identity motif (typography brief). */}
            <h1 className="m-0 font-display text-[44px] font-normal leading-[1.05]" style={{ letterSpacing: '-0.02em' }}>
              <span className="italic text-accent">{first}</span>
              {restName.length > 0 && <> {restName.join(' ')}</>}
            </h1>
            {user.verified && (
              <BadgeCheck size={20} strokeWidth={2} className="shrink-0 text-brand" aria-label="Verified" />
            )}
          </div>
          {/* location — muted line with a MapPin (not flipped in RTL, §7); city + area */}
          {[user.area, user.city].filter(Boolean).length > 0 && (
            <div className="mt-2.5 flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
              <MapPin size={13} strokeWidth={1.9} className="shrink-0" />
              <span>{[user.area, user.city].filter(Boolean).join(' · ')}</span>
            </div>
          )}
          <div className="mt-2 flex items-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>
            <span>{skillLabel(user.skill_level)} player</span>
            <span className="h-[3px] w-[3px] rounded-full" style={{ background: 'var(--color-text-faint)' }} />
            <span>Member · <span className="ltr-nums">'{joinedYear}</span></span>
          </div>
          {/* bio — body in ink; empty: own profile gets an "Add a bio" deep-link,
              other-player profiles just hide the line (§5) */}
          {user.bio ? (
            /* bio — the "voice" of the page, set like a hand-set pull quote:
               Instrument Serif italic 17px, balanced wrap, ink stepped to 0.78
               opacity, curly quotes as an editorial accent (typography brief). */
            <p
              className="mt-4 mb-0 max-w-[300px] font-display text-[17px] italic leading-[1.35]"
              style={{ color: 'rgba(26,26,26,0.78)', letterSpacing: '0.005em', textWrap: 'balance' }}
            >
              {'“'}{user.bio}{'”'}
            </p>
          ) : isMe ? (
            <button
              onClick={() => navigate('/profile/edit')}
              className="mt-3 cursor-pointer rounded-pill border-none bg-transparent px-3 py-1 text-[12.5px] font-medium"
              style={{ color: 'var(--color-accent)' }}
            >
              + Add a bio
            </button>
          ) : null}
          {!isMe && (
            <button
              onClick={() => navigate(`/chat/dm/${user.id}`)}
              className="mt-4 inline-flex h-[42px] cursor-pointer items-center gap-2 rounded-pill border-none bg-brand px-5 text-[13.5px] font-semibold text-onbrand shadow-cta"
            >
              <MessageCircle size={15} strokeWidth={2} /> Message
            </button>
          )}
        </div>

        {/* stats — public trust signals */}
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {[
            { num: <span className="nums-tabular">{user.matches_played}</span>, lbl: 'Matches' },
            {
              num: rate != null ? (
                <span>
                  <span className="italic text-accent nums-tabular">{rate}</span>
                  <span className="text-[18px]" style={{ color: 'rgba(26,26,26,0.5)' }}>%</span>
                </span>
              ) : (
                <span style={{ color: 'var(--color-text-faint)' }}>—</span>
              ),
              lbl: 'Win rate',
            },
            {
              num: (
                <span className="nums-tabular" style={{ color: user.no_show_count === 0 ? '#2d5a40' : user.no_show_count <= 2 ? '#a66a1e' : '#7a3a2a' }}>
                  {user.no_show_count}
                </span>
              ),
              lbl: 'No-shows',
            },
          ].map((s) => (
            <div key={s.lbl} className="rounded-[18px] border bg-card py-4 text-center shadow-row" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
              <div className="font-display text-[30px] leading-none">{s.num}</div>
              <div className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
                {s.lbl}
              </div>
            </div>
          ))}
        </div>

        {/* languages line */}
        {user.languages.length > 0 && (
          <div className="mt-3 flex items-center justify-center gap-2 text-[11.5px] nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
            <span>{user.languages.join(' · ')}</span>
          </div>
        )}

        {/* sports & level — own profile shows every sport the player added in
            Edit Profile (persisted via writeProfileSports); other players fall
            back to the single primary sport carried on the store user. */}
        <div className="mt-7">
          <Eyebrow>Sports &amp; level</Eyebrow>
          <div className="mt-3 flex flex-col gap-2">
            {sportsList.map((row, i) => (
              <div key={row.sport} className="flex items-center gap-3.5 rounded-[18px] border bg-card px-4 py-3.5 shadow-row" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
                <span className="shrink-0 text-[28px] leading-none">{sportEmoji(row.sport)}</span>
                <div className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="text-[14px] font-semibold text-ink">{sportLabel(row.sport)}</span>
                  {i === 0 && (
                    <span className="truncate text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                      Plays most weeks
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-page px-3 py-1.5 text-[11.5px] font-semibold">
                  <span className="h-[5px] w-[5px] rounded-full bg-accent" />
                  {row.level}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* their open matches — join straight from the profile */}
        {theirOpen.length > 0 && (
          <div className="mt-7">
            <Eyebrow>Open matches</Eyebrow>
            <div className="mt-3 flex flex-col gap-3">
              {theirOpen.map((m) => {
                const joined = isJoined(db, m.id)
                const pending = pendingRequest(db, m.id)
                const waitlisted = waitlistEntry(db, m.id)
                return (
                  <MatchCard
                    key={m.id}
                    match={m}
                    host={user}
                    players={matchPlayers(db, m.id)}
                    action="join"
                    joinStatus={joined ? 'joined' : waitlisted ? 'waitlisted' : pending ? 'requested' : null}
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
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* recent matches */}
        {recent.length > 0 && (
          <div className="mt-7">
            <Eyebrow>Recent matches</Eyebrow>
            <div className="mt-3 flex flex-col gap-2">
              {recent.map((m) => {
                const res = db.matchResults.find((r) => r.match_id === m.id && r.player_id === user.id)
                const cancelled = m.status === 'cancelled'
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-[16px] border bg-card px-3.5 py-3" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
                    <div className="h-[42px] w-[42px] shrink-0 overflow-hidden rounded-[11px]" style={{ filter: cancelled ? 'grayscale(0.6)' : 'none', opacity: cancelled ? 0.6 : 1 }}>
                      <SportArt type={artType(m)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10.5px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>
                        {dayLabel(m.start_time)}
                      </div>
                      <div className="mt-0.5 truncate font-display text-[16px] leading-[1.1]">
                        {matchKind(m)} <span className="italic" style={{ color: 'var(--color-text-muted)' }}>at</span> {courtLabel(m)}
                      </div>
                    </div>
                    <span
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.06em]"
                      style={{
                        background: cancelled
                          ? 'color-mix(in srgb, var(--color-danger) 8%, transparent)'
                          : res?.result === 'win'
                            ? 'color-mix(in srgb, var(--color-success) 9%, transparent)'
                            : 'rgba(26,26,26,0.06)',
                        color: cancelled ? 'var(--color-danger)' : res?.result === 'win' ? 'var(--color-success)' : 'var(--color-text-muted)',
                      }}
                    >
                      {cancelled ? 'Cancelled' : res ? (res.result === 'win' ? 'Won' : res.result === 'loss' ? 'Lost' : 'Draw') : 'Played'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}
