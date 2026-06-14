import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight, Plus } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Avatar } from '@/components/Avatar'
import { Eyebrow } from '@/components/Eyebrow'
import { MatchCard } from '@/components/MatchCard'
import { useToast } from '@/components/Toast'
import {
  actions,
  currentUserId,
  discoverFeed,
  getUser,
  isJoined,
  isProfileComplete,
  matchPlayers,
  pendingRequest,
  useDB,
  waitlistEntry,
  waitlistPosition,
} from '@/lib/store'
import { computeStatus } from '@/lib/status'
import { onboarding } from '@/lib/onboarding'
import { skillLabel, sportLabel } from '@/lib/format'
import { HOST_CREATE_ROUTE } from '@/lib/hostedMatch'

/** Home — empty personal state. Rendered whenever the signed-in user has no
 *  joined matches (match_players) and no hosted matches (host_id = me) —
 *  purely data-derived, never a "new user" flag (CLAUDE.md §4/§5).
 *  §4's fixed sections (NEXT UP · You're hosting · This week) have nothing
 *  to show, so they collapse; what remains is a welcome line, the profile
 *  checklist nudge, an "Open to join" rail of seeded matches covering every
 *  join path (instant Join / Request to join / Join waitlist), and the Host
 *  CTA. Feed is always seeded, never blank (§5). */

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
  // `me` can be missing right after sign-up before the profile row exists (or if
  // the snapshot hasn't seated it yet) — never crash on it. Identity + prefs echo
  // the sign-up questionnaire first, then the profile row, then safe defaults.
  const me = getUser(db, currentUserId)
  const name = onboarding.name ?? me?.name ?? 'there'
  const sport = onboarding.sport ?? me?.sport ?? 'padel'
  const skill = onboarding.skill ?? me?.skill_level ?? 'any'
  // Home shows the top slice of the SAME list Discover renders, filtered by the
  // saved answers: sport is an exact match, level passes when the match suits the
  // user's level or is open to any ('any'). If that leaves nothing, fall back to
  // the full nearby feed (never empty, §5) and label it honestly.
  const feed = discoverFeed(db)
  const matched = feed.filter((m) => m.sport === sport && (m.skill_level === skill || m.skill_level === 'any'))
  const usingFallback = matched.length === 0
  const nearby = (usingFallback ? feed : matched).slice(0, 3)
  // profile-setup card hides once the profile is saved complete (§4)
  const profileComplete = isProfileComplete()
  const done = CHECKLIST.filter((c) => c.done).length
  const pct = Math.round((done / CHECKLIST.length) * 100)

  return (
    <Shell>
      <div className="px-[22px] pt-[76px] pb-[110px]">
        {/* greeting — short welcome line */}
        <div className="mb-5 flex items-start justify-between">
          <div className="me-3 min-w-0 flex-1">
            <div className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.2em]" style={{ color: 'rgba(26,26,26,0.5)' }}>
              Welcome to Connect!
            </div>
            <h1 className="m-0 font-display text-[32px] font-normal leading-[1.05]" style={{ letterSpacing: '-0.02em' }}>
              Hello, <span className="italic text-accent">{name.split(' ')[0]}</span>.
              <br />
              Let's get you on a court.
            </h1>
            <div className="mt-2 inline-flex flex-wrap items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
              <span className="inline-flex items-center gap-[5px]">
                <span className="h-[5px] w-[5px] rounded-full bg-brand" />
                Picked for you
              </span>
              <span className="opacity-50">·</span>
              <span>{sportLabel(sport)}</span>
              <span className="opacity-50">·</span>
              <span>{skillLabel(skill)}</span>
            </div>
          </div>
          <Link to="/settings" aria-label="Settings" className="no-underline">
            <Avatar name={name} accent="var(--color-accent)" />
          </Link>
        </div>

        {/* primary CTAs — find vs host, side by side (§2) */}
        <div className="mb-[26px] flex gap-2.5">
          <Link
            to="/discover"
            className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-brand px-4 py-3.5 text-[14px] font-semibold text-onbrand no-underline shadow-cta transition-colors active:bg-brandstrong"
          >
            Find a match
            <ArrowRight size={15} strokeWidth={2.2} className="rtl:rotate-180" />
          </Link>
          <Link
            to={HOST_CREATE_ROUTE}
            className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-transparent px-4 py-3.5 text-[14px] font-semibold text-ink no-underline transition-colors"
            style={{ border: '1.5px solid rgba(26,26,26,0.16)' }}
          >
            <span
              className="inline-flex h-[24px] w-[24px] items-center justify-center rounded-full text-brand"
              style={{ border: '1.5px dashed color-mix(in srgb, var(--color-brand) 45%, transparent)' }}
            >
              <Plus size={15} strokeWidth={2.4} />
            </span>
            Host one
          </Link>
        </div>

        {/* checklist nudge — count + bar only, the task list lives on Edit Profile.
            Hides once the profile is saved complete and stays gone on reload (§4) */}
        {!profileComplete && (
        <div className="mb-[26px] rounded-[18px] border bg-card p-3.5 shadow-row" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
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
            <div className="h-full rounded-pill bg-accent transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>
        )}

        {/* looking for players — the first three rows of the same list Discover
            renders; "See all" continues into it (§2.4 / §4) */}
        <div className="mb-3 flex items-center justify-between">
          <Eyebrow accent="var(--color-brand)">{usingFallback ? `No ${sportLabel(sport)} at your level — nearby` : 'Looking for players'}</Eyebrow>
          <Link to="/discover" className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink no-underline">
            See all <ChevronRight size={11} strokeWidth={2.2} className="rtl:rotate-180" />
          </Link>
        </div>
        <div className="flex flex-col gap-3.5">
          {nearby.map((m) => {
            const status = computeStatus(m)
            const joined = isJoined(db, m.id)
            const pending = pendingRequest(db, m.id)
            const waitlisted = waitlistEntry(db, m.id)
            const host = getUser(db, m.host_id)
            return (
              <MatchCard
                key={m.id}
                match={m}
                host={host}
                players={matchPlayers(db, m.id)}
                action="join"
                joinStatus={joined ? 'joined' : waitlisted ? 'waitlisted' : pending ? 'requested' : null}
                waitlistPosition={waitlisted ? waitlistPosition(db, m.id) : null}
                onAct={() => {
                  if (status === 'full') {
                    actions.joinWaitlist(m.id)
                    showToast("On the waitlist — you'll be auto-joined if a spot frees", 3000)
                  } else if (m.join_mode === 'approval') {
                    actions.requestToJoin(m.id)
                    showToast(`Request sent — Waiting for ${host?.name.split(' ')[0] ?? 'the host'} to approve`, 3000)
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
    </Shell>
  )
}
