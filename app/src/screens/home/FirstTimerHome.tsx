import { Link } from 'react-router-dom'
import { ArrowRight, Check, ChevronRight, Plus } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Avatar } from '@/components/Avatar'
import { Eyebrow } from '@/components/Eyebrow'
import { MatchCard } from '@/components/MatchCard'
import { useToast } from '@/components/Toast'
import { actions, currentUserId, discoverMatches, getUser, isJoined, matchPlayers, pendingRequest, useDB } from '@/lib/store'
import { sportLabel } from '@/lib/format'

/** First-time Home (empty-home-screens.jsx EmptyEditorial) — brand-new user
 *  has nothing joined yet; empty state becomes opportunity. Feed is always
 *  seeded, never blank (CLAUDE.md §5). */

const CHECKLIST = [
  { id: 'photo', label: 'Add a profile photo', done: true },
  { id: 'level', label: 'Confirm your level', done: true },
  { id: 'avail', label: 'Set weekly availability', done: false },
  { id: 'friend', label: 'Invite a friend', done: false },
  { id: 'first', label: 'Play your first match', done: false },
] as const

export function FirstTimerHome() {
  const db = useDB()
  const { showToast } = useToast()
  const me = getUser(db, currentUserId)!
  const nearby = discoverMatches(db)
    .filter((m) => m.host_id !== currentUserId)
    .slice(0, 3)
  const done = CHECKLIST.filter((c) => c.done).length
  const pct = Math.round((done / CHECKLIST.length) * 100)

  return (
    <Shell>
      <div className="px-[22px] pt-[76px] pb-[110px]">
        {/* greeting */}
        <div className="mb-5 flex items-start justify-between">
          <div className="me-3 min-w-0 flex-1">
            <div className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.2em]" style={{ color: 'rgba(26,26,26,0.5)' }}>
              Welcome to Connect
            </div>
            <h1 className="m-0 font-display text-[32px] font-normal leading-[1.05]" style={{ letterSpacing: '-0.02em' }}>
              Hello, <span className="italic text-accent">{me.name.split(' ')[0]}</span>.
              <br />
              Let's get you on a court.
            </h1>
            <div className="mt-2 inline-flex flex-wrap items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
              <span className="inline-flex items-center gap-[5px]">
                <span className="h-[5px] w-[5px] rounded-full bg-brand" />
                Picked for you
              </span>
              <span className="opacity-50">·</span>
              <span>{sportLabel(me.sport)}</span>
              <span className="opacity-50">·</span>
              <span className="capitalize">{me.skill_level}</span>
            </div>
          </div>
          <Link to="/profile" aria-label="Profile & settings" className="no-underline">
            <Avatar name={me.name} accent="var(--color-accent)" />
          </Link>
        </div>

        {/* primary CTAs */}
        <div className="mb-[26px] grid grid-cols-2 gap-2.5">
          <Link
            to="/discover"
            className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-[14px] bg-brand text-[14px] font-semibold tracking-[0.01em] text-onbrand no-underline"
            style={{ boxShadow: '0 10px 22px -10px var(--color-brand)' }}
          >
            Find a match <ArrowRight size={11} strokeWidth={2.2} className="rtl:rotate-180" />
          </Link>
          <Link
            to="/matches/create"
            className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-[14px] border bg-transparent text-[14px] font-medium tracking-[0.01em] text-ink no-underline"
            style={{ borderColor: 'rgba(26,26,26,0.18)' }}
          >
            <span
              className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-ink"
              style={{ border: '1.5px dashed rgba(26,26,26,0.35)' }}
            >
              <Plus size={11} strokeWidth={2.4} />
            </span>
            Host one
          </Link>
        </div>

        {/* nearby feed */}
        <div className="mb-3 flex items-center justify-between">
          <Eyebrow accent="var(--color-brand)">Looking for players</Eyebrow>
          <Link to="/discover" className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink no-underline">
            See all <ChevronRight size={11} strokeWidth={2.2} className="rtl:rotate-180" />
          </Link>
        </div>
        <div className="mb-[22px] flex flex-col gap-3.5">
          {nearby.map((m) => {
            const joined = isJoined(db, m.id)
            const pending = pendingRequest(db, m.id)
            return (
              <MatchCard
                key={m.id}
                match={m}
                host={getUser(db, m.host_id)}
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

        {/* checklist nudge */}
        <div className="rounded-[18px] border bg-card p-3.5 shadow-row" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
          <div className="mb-2.5 flex items-center justify-between">
            <div>
              <div className="text-[10.5px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
                Profile setup
              </div>
              <div className="mt-0.5 font-display text-[18px] leading-[1.1] text-ink" style={{ letterSpacing: '-0.01em' }}>
                <span className="italic text-brand nums-tabular">{done}</span> of {CHECKLIST.length} done
              </div>
            </div>
            <Link to="/profile/edit" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-ink no-underline">
              Continue <ArrowRight size={11} strokeWidth={2.2} className="rtl:rotate-180" />
            </Link>
          </div>
          <div className="h-1.5 overflow-hidden rounded-pill" style={{ background: 'rgba(26,26,26,0.08)' }}>
            <div className="h-full rounded-pill bg-brand transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3.5 flex flex-col gap-2">
            {CHECKLIST.map((c) => (
              <div key={c.id} className="flex items-center gap-2.5">
                <span
                  className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-onbrand"
                  style={{
                    background: c.done ? 'var(--color-brand)' : 'transparent',
                    border: c.done ? '1.5px solid var(--color-brand)' : '1.5px dashed rgba(26,26,26,0.25)',
                  }}
                >
                  {c.done && <Check size={12} strokeWidth={2.2} />}
                </span>
                <span
                  className="text-[13.5px]"
                  style={{
                    color: c.done ? 'var(--color-text-muted)' : 'var(--color-text)',
                    textDecoration: c.done ? 'line-through' : 'none',
                    textDecorationColor: 'var(--color-text-muted)',
                  }}
                >
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  )
}
