import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, ListFilter, Plus, Search, X } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { MatchCard } from '@/components/MatchCard'
import { useToast } from '@/components/Toast'
import { actions, discoverFeed, getUser, isJoined, matchPlayers, pendingRequest, useDB, waitlistEntry, waitlistPosition } from '@/lib/store'
import { computeStatus } from '@/lib/status'
import { usePersistedState } from '@/lib/usePersistedState'
import { HOST_CREATE_ROUTE } from '@/lib/hostedMatch'
import type { Match, SkillLevel, Sport } from '@/lib/types'

/** Discover — browse open matches (discover.jsx DiscoverScreen).
 *  Feed is always seeded, never an empty cold-start (CLAUDE.md §5);
 *  the only empty state is a too-narrow filter. */

const SPORT_FILTERS = ['All', 'Padel', 'Tennis', 'Badminton', 'Running'] as const
const TIME_FILTERS = [
  { id: 'all', label: 'Any time' },
  { id: 'tonight', label: 'Tonight' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'week', label: 'This week' },
  { id: 'weekend', label: 'Weekend' },
] as const
const LEVEL_FILTERS = [
  { id: 'all', label: 'Any level' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
] as const

type TimeBucket = 'tonight' | 'tomorrow' | 'week' | 'weekend'

function bucketOf(m: Match, now: Date = new Date()): TimeBucket {
  const d = new Date(m.start_time)
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((startOfDay(d) - startOfDay(now)) / 86400000)
  if (diffDays === 0) return 'tonight'
  if (diffDays === 1) return 'tomorrow'
  const dow = d.getDay()
  // Qatari weekend: Friday + Saturday
  if (dow === 5 || dow === 6) return 'weekend'
  return 'week'
}

const BUCKET_ORDER: TimeBucket[] = ['tonight', 'tomorrow', 'week', 'weekend']
const BUCKET_LABEL: Record<TimeBucket, string> = { tonight: 'Tonight', tomorrow: 'Tomorrow', week: 'This week', weekend: 'Weekend' }

function ChipRow<T extends string>({ items, value, onChange }: { items: readonly { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="scroll-area flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {items.map(({ id, label }) => {
        const on = id === value
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="cursor-pointer whitespace-nowrap rounded-pill px-3.5 py-[7px] text-[12px] tracking-[0.01em] transition-colors"
            style={{
              border: on ? '1px solid var(--color-brand)' : '1px solid rgba(26,26,26,0.12)',
              background: on ? 'var(--color-brand)' : 'rgba(255,255,255,0.6)',
              color: on ? 'var(--color-text-onbrand)' : 'rgba(26,26,26,0.75)',
              fontWeight: on ? 600 : 500,
              boxShadow: on ? '0 6px 14px -8px var(--color-brand)' : 'none',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function DiscoverScreen() {
  const db = useDB()
  const { showToast } = useToast()
  // filter choices persist per-user across refreshes; search text + panel
  // open/closed stay ephemeral UI.
  const [sport, setSport] = usePersistedState<(typeof SPORT_FILTERS)[number]>('discover:sport', 'All')
  const [time, setTime] = usePersistedState<(typeof TIME_FILTERS)[number]['id']>('discover:time', 'all')
  const [level, setLevel] = usePersistedState<(typeof LEVEL_FILTERS)[number]['id']>('discover:level', 'all')
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeCount = (sport !== 'All' ? 1 : 0) + (time !== 'all' ? 1 : 0) + (level !== 'all' ? 1 : 0)
  const summary = [
    sport !== 'All' ? sport : null,
    time !== 'all' ? TIME_FILTERS.find((x) => x.id === time)?.label : null,
    level !== 'all' ? LEVEL_FILTERS.find((x) => x.id === level)?.label : null,
  ].filter(Boolean) as string[]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return discoverFeed(db).filter((m) => {
      if (sport !== 'All' && m.sport !== (sport.toLowerCase() as Sport)) return false
      if (time !== 'all' && bucketOf(m) !== time) return false
      if (level !== 'all' && m.skill_level !== (level as SkillLevel) && m.skill_level !== 'any') return false
      if (q) {
        const host = getUser(db, m.host_id)
        const hay = [m.venue_name, m.court_number, m.route_start, m.route_end, m.sport, host?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [db, sport, time, level, query])

  const spotlight = filtered[0]
  const rest = filtered.slice(1)
  const grouped = useMemo(() => {
    const g = new Map<TimeBucket, Match[]>()
    for (const m of rest) {
      const b = bucketOf(m)
      g.set(b, [...(g.get(b) ?? []), m])
    }
    return g
  }, [rest])

  const act = (m: Match) => {
    if (computeStatus(m) === 'full') {
      // full match → the join CTA is the waitlist (any join_mode, §5)
      actions.joinWaitlist(m.id)
      showToast("On the waitlist — you'll be auto-joined if a spot frees")
    } else if (m.join_mode === 'approval') {
      actions.requestToJoin(m.id)
      showToast('Request sent')
    } else {
      actions.joinMatch(m.id)
      showToast('Joined')
    }
  }

  const cardFor = (m: Match, featured = false) => {
    const joined = isJoined(db, m.id)
    const pending = pendingRequest(db, m.id)
    const waitlisted = waitlistEntry(db, m.id)
    return (
      <MatchCard
        key={m.id}
        match={m}
        host={getUser(db, m.host_id)}
        players={matchPlayers(db, m.id)}
        action="join"
        featured={featured}
        joinStatus={joined ? 'joined' : waitlisted ? 'waitlisted' : pending ? 'requested' : null}
        waitlistPosition={waitlisted ? waitlistPosition(db, m.id) : null}
        onAct={() => act(m)}
        saved={db.savedMatchIds.includes(m.id)}
        onToggleSave={() => actions.toggleSaveMatch(m.id)}
      />
    )
  }

  return (
    <Shell>
      <div className="flex h-full flex-col">
        {/* sticky header */}
        <div className="relative z-2 px-6 pt-[60px] pb-3.5" style={{ background: 'linear-gradient(180deg, var(--surface-page) 78%, transparent 100%)' }}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: 'rgba(26,26,26,0.5)' }}>
                Open matches · Doha
              </div>
              <h1 className="m-0 font-display text-[38px] font-normal leading-none" style={{ letterSpacing: '-0.02em' }}>
                Find your <span className="italic text-accent">next</span> match.
              </h1>
            </div>
            <Link
              to={HOST_CREATE_ROUTE}
              aria-label="Create a match"
              className="mt-0.5 inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-transparent text-brand no-underline"
              style={{ border: '1.5px dashed color-mix(in srgb, var(--color-brand) 40%, transparent)' }}
            >
              <Plus size={16} strokeWidth={2} />
            </Link>
          </div>

          {/* search bar */}
          <div
            className="mb-2.5 flex items-center gap-2 rounded-pill border bg-card px-3.5 py-2.5"
            style={{ borderColor: 'rgba(26,26,26,0.10)', boxShadow: '0 1px 0 rgba(26,26,26,0.02), 0 10px 22px -18px rgba(26,26,26,0.18)' }}
          >
            <Search size={16} strokeWidth={2} style={{ color: 'rgba(26,26,26,0.5)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courts, sports, partners…"
              className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] text-ink outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear"
                className="inline-flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-full border-none"
                style={{ background: 'rgba(26,26,26,0.06)', color: 'rgba(26,26,26,0.6)' }}
              >
                <X size={9} strokeWidth={2.6} />
              </button>
            )}
          </div>

          {/* filter panel */}
          <div className="relative">
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className="flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-pill px-3.5 py-2.5 transition-colors"
              style={{
                background: filtersOpen ? '#fff' : 'rgba(255,255,255,0.6)',
                border: `1px solid ${activeCount > 0 ? 'var(--color-brand)' : 'rgba(26,26,26,0.12)'}`,
                boxShadow: filtersOpen ? '0 10px 22px -18px rgba(26,26,26,0.25)' : 'none',
              }}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2 text-[12.5px] font-semibold tracking-[0.01em] text-ink">
                <ListFilter size={14} strokeWidth={2} className="shrink-0" style={{ color: 'rgba(26,26,26,0.6)' }} />
                {summary.length === 0 ? (
                  <span>Filters</span>
                ) : (
                  <span className="scroll-area flex min-w-0 items-center gap-[5px] overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {summary.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center whitespace-nowrap rounded-pill px-[9px] py-[3px] text-[11.5px] font-semibold text-brand"
                        style={{ background: 'color-mix(in srgb, var(--color-brand) 8%, transparent)' }}
                      >
                        {s}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              <ChevronDown size={14} strokeWidth={2.2} className="transition-transform" style={{ color: 'rgba(26,26,26,0.5)', transform: filtersOpen ? 'rotate(180deg)' : 'none' }} />
            </button>

            {filtersOpen && (
              <div
                className="absolute inset-x-0 top-[calc(100%+8px)] z-5 flex flex-col gap-[13px] rounded-[18px] border bg-card p-3.5"
                style={{ borderColor: 'rgba(26,26,26,0.10)', boxShadow: '0 1px 0 rgba(26,26,26,0.02), 0 26px 48px -24px rgba(26,26,26,0.32)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(26,26,26,0.5)' }}>
                    Refine
                  </div>
                  {activeCount > 0 && (
                    <button
                      onClick={() => {
                        setSport('All')
                        setTime('all')
                        setLevel('all')
                      }}
                      className="cursor-pointer border-none bg-transparent p-0 text-[11px] font-semibold tracking-[0.01em] text-brand"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {(
                  [
                    { label: 'Sports', node: <ChipRow items={SPORT_FILTERS.map((s) => ({ id: s, label: s }))} value={sport} onChange={setSport} /> },
                    { label: 'Time', node: <ChipRow items={TIME_FILTERS} value={time} onChange={setTime} /> },
                    { label: 'Level', node: <ChipRow items={LEVEL_FILTERS} value={level} onChange={setLevel} /> },
                  ] as const
                ).map((g) => (
                  <div key={g.label} className="flex flex-col gap-[7px]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-faint)' }}>
                      {g.label}
                    </div>
                    {g.node}
                  </div>
                ))}
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="mt-0.5 h-[38px] cursor-pointer rounded-pill border-none bg-brand text-[12.5px] font-semibold tracking-[0.01em] text-onbrand shadow-cta"
                >
                  Show results
                </button>
              </div>
            )}
          </div>
        </div>

        {/* scrollable body */}
        <div className="scroll-area relative z-1 flex flex-1 flex-col gap-[18px] overflow-y-auto px-6 pt-3.5 pb-[120px]">
          {filtered.length === 0 ? (
            <div className="mt-1.5 rounded-[18px] px-[22px] py-8 text-center" style={{ background: 'rgba(255,255,255,0.5)', border: '1px dashed rgba(26,26,26,0.18)' }}>
              <div className="mb-1.5 font-display text-[24px]" style={{ letterSpacing: '-0.012em' }}>
                <span className="italic text-accent">Nothing</span> matches that.
              </div>
              <div className="text-[12.5px] leading-normal" style={{ color: 'var(--color-text-muted)' }}>
                Try a wider time window or another sport.
              </div>
            </div>
          ) : (
            <>
              {/* spotlight */}
              {spotlight && (
                <div>
                  <div className="mt-1 mb-2.5 inline-flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="h-[5px] w-[5px] rounded-full bg-accent" />
                    Spotlight
                  </div>
                  {cardFor(spotlight, true)}
                </div>
              )}

              {/* grouped lists */}
              {BUCKET_ORDER.map((b) => {
                const list = grouped.get(b)
                if (!list?.length) return null
                return (
                  <div key={b}>
                    <div className="mt-1 mb-2.5 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
                        <span className="h-[5px] w-[5px] rounded-full bg-accent" />
                        {BUCKET_LABEL[b]}
                      </div>
                      <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] nums-tabular" style={{ color: 'rgba(26,26,26,0.45)' }}>
                        {list.length} {list.length === 1 ? 'match' : 'matches'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2.5">{list.map((m) => cardFor(m))}</div>
                  </div>
                )
              })}

              {/* host nudge footer */}
              <Link
                to={HOST_CREATE_ROUTE}
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
            </>
          )}
        </div>
      </div>
    </Shell>
  )
}
