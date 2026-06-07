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
  getUser,
  isJoined,
  matchPlayers,
  openToJoinMatches,
  pendingRequest,
  useDB,
  waitlistEntry,
  waitlistPosition,
} from '@/lib/store'
import { computeStatus } from '@/lib/status'
import { onboarding } from '@/lib/onboarding'
import { skillLabel, sportLabel } from '@/lib/format'

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
  const me = getUser(db, currentUserId)!
  // preferences echo the sign-up questionnaire; mock-user profile is the fallback
  const sport = onboarding.sport ?? me.sport
  const skill = onboarding.skill ?? me.skill_level
  // seeded "Open to join" rail — curated so every join path's CTA is visible
  const openToJoin = openToJoinMatches(db)
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
              <span>{sportLabel(sport)}</span>
              <span className="opacity-50">·</span>
              <span>{skillLabel(skill)}</span>
            </div>
          </div>
          <Link to="/profile" aria-label="Profile & settings" className="no-underline">
            <Avatar name={me.name} accent="var(--color-accent)" />
          </Link>
        </div>

        {/* checklist nudge — count + bar only, the task list lives on Edit Profile */}
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

        {/* open to join — read-only discovery surfaced on Home; cards deep-link
            to Match Details, CTAs cover all join paths incl. the waitlist */}
        <div className="mb-3 flex items-center justify-between">
          <Eyebrow accent="var(--color-brand)">Open to join</Eyebrow>
          <Link to="/discover" className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink no-underline">
            See all <ChevronRight size={11} strokeWidth={2.2} className="rtl:rotate-180" />
          </Link>
        </div>
        <div className="mb-[26px] flex flex-col gap-3.5">
          {openToJoin.map((m) => {
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

        {/* host CTA — last, per §4's fixed section order */}
        <Link
          to="/matches/create"
          className="flex items-center gap-3.5 rounded-[18px] px-5 py-[18px] text-inherit no-underline transition-colors"
          style={{ background: 'rgba(255,255,255,0.55)', border: '1.5px dashed color-mix(in srgb, var(--color-brand) 33%, transparent)' }}
        >
          <div
            className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-brand"
            style={{ border: '1.5px dashed color-mix(in srgb, var(--color-brand) 40%, transparent)' }}
          >
            <Plus size={16} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-[20px] leading-[1.1]" style={{ letterSpacing: '-0.012em' }}>
              Don't see what you want?
            </div>
            <div className="mt-0.5 text-[12px]" style={{ color: 'rgba(26,26,26,0.6)' }}>
              Host your own and we'll fill the spots.
            </div>
          </div>
          <ChevronRight size={14} strokeWidth={2.2} className="shrink-0 text-brand rtl:rotate-180" />
        </Link>
      </div>
    </Shell>
  )
}
