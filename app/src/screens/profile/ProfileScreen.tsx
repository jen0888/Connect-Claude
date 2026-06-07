import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, EllipsisVertical, Flag, MapPin, MessageCircle, Pencil, Settings, ShieldAlert } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Eyebrow } from '@/components/Eyebrow'
import { MatchCard } from '@/components/MatchCard'
import { SportArt } from '@/components/SportArt'
import { useToast } from '@/components/Toast'
import { actions, currentUserId, discoverMatches, getUser, isJoined, matchPlayers, pendingRequest, useDB } from '@/lib/store'
import { artType, courtLabel, dayLabel, matchKind, skillLabel, sportLabel, initials as userInitials } from '@/lib/format'
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
      <div className="relative z-1 h-full overflow-y-auto px-6 pt-12 pb-[120px]">
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
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/profile/edit')}
                aria-label="Edit profile"
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none text-ink"
                style={{ background: 'rgba(26,26,26,0.05)' }}
              >
                <Pencil size={16} strokeWidth={1.9} />
              </button>
              <button
                onClick={() => navigate('/settings')}
                aria-label="Settings"
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none text-ink"
                style={{ background: 'rgba(26,26,26,0.05)' }}
              >
                <Settings size={16} strokeWidth={1.9} />
              </button>
            </div>
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

        {/* hero */}
        <div className="flex flex-col items-center pt-2 text-center">
          <div className="inline-flex h-[88px] w-[88px] items-center justify-center rounded-full bg-accent font-display text-[40px] italic text-page" style={{ boxShadow: '0 14px 30px -14px rgba(26,26,26,0.35)' }}>
            {userInitials(user)[0]}
          </div>
          <h1 className="mt-3.5 mb-0 font-display text-[34px] font-normal leading-none" style={{ letterSpacing: '-0.02em' }}>
            {first} <span className="italic text-accent">{restName.join(' ')}</span>
          </h1>
          <div className="mt-2 flex items-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>
            <span>{skillLabel(user.skill_level)} player</span>
            <span className="h-[3px] w-[3px] rounded-full" style={{ background: 'var(--color-text-faint)' }} />
            <span>Member · '{joinedYear}</span>
          </div>
          {user.bio && (
            <p className="mt-3 mb-0 max-w-[280px] text-[13px] leading-[1.5]" style={{ color: 'rgba(26,26,26,0.65)', textWrap: 'pretty' }}>
              {user.bio}
            </p>
          )}
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

        {/* attendance + languages line */}
        <div className="mt-3 flex items-center justify-center gap-2 text-[11.5px] nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
          <span>
            <span className="font-semibold text-ink">{user.attendance_rate}%</span> attendance
          </span>
          <span className="h-[3px] w-[3px] rounded-full" style={{ background: 'var(--color-text-faint)' }} />
          <span>{user.languages.join(' · ')}</span>
        </div>

        {/* location */}
        {user.area && (
          <div className="mt-7">
            <Eyebrow>Location</Eyebrow>
            <div className="mt-3 flex items-center gap-3.5 rounded-[18px] border bg-card p-4 shadow-row" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-accent" style={{ background: 'color-mix(in srgb, var(--color-accent) 9%, transparent)' }}>
                <MapPin size={17} strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-ink">{user.area}</div>
                <div className="mt-0.5 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                  Doha, Qatar
                </div>
              </div>
            </div>
          </div>
        )}

        {/* sports & level */}
        <div className="mt-7">
          <Eyebrow>Sports &amp; level</Eyebrow>
          <div className="mt-3 flex items-center gap-3.5 rounded-[18px] border bg-card px-4 py-3.5 shadow-row" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
            <div className="h-[42px] w-[42px] shrink-0 overflow-hidden rounded-[11px]">
              <SportArt type={artType({ sport: user.sport })} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-ink">{sportLabel(user.sport)}</div>
              <div className="mt-0.5 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                Plays most weeks
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-page px-3 py-1.5 text-[11.5px] font-semibold">
              <span className="h-[5px] w-[5px] rounded-full bg-accent" />
              {skillLabel(user.skill_level)}
            </span>
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
                return (
                  <MatchCard
                    key={m.id}
                    match={m}
                    host={user}
                    players={matchPlayers(db, m.id)}
                    action="join"
                    joinStatus={joined ? 'joined' : pending ? 'requested' : null}
                    onAct={() => {
                      if (m.join_mode === 'approval') {
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
