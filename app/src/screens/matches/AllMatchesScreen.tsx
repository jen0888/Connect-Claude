import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { MatchCard } from '@/components/MatchCard'
import { getUser, hostedMatches, joinedNotHostedMatches, matchPlayers, useDB } from '@/lib/store'
import { computeStatus } from '@/lib/status'
import { HOST_CREATE_ROUTE } from '@/lib/hostedMatch'
import type { Match } from '@/lib/types'

/** Two distinct match archives, ONE layout (CLAUDE.md §4):
 *   • bucket='hosted' (/hosting)    → matches you CREATED, FULL card (Edit /
 *     record-results where still valid).
 *   • bucket='joined' (/my-matches) → matches you JOINED but did NOT create,
 *     BRIEF card. Gives join-only users an upcoming+past history that never
 *     depends on hosting.
 *  Both get [ Upcoming ] [ Past ] pills (Upcoming default); buckets never merge.
 *  Past is read-only; the lifecycle status (Just played / Closed / Cancelled)
 *  shows as a chip in the card's bottom-right corner (no art-panel result chip). */
type Bucket = 'hosted' | 'joined'

const COPY: Record<Bucket, { eyebrow: string; upcomingTitle: ReactNode; pastTitle: ReactNode; upcomingEmpty: string; pastEmpty: string }> = {
  hosted: {
    eyebrow: 'Your hosting matches',
    upcomingTitle: (<>On the <span className="italic text-accent">horizon</span>.</>),
    pastTitle: (<>Looking <span className="italic text-accent">back</span>.</>),
    upcomingEmpty: 'No matches scheduled. Try another month or create a new match.',
    pastEmpty: "You didn't host any matches this month.",
  },
  joined: {
    eyebrow: 'Matches you joined',
    upcomingTitle: (<>Coming <span className="italic text-accent">up</span>.</>),
    pastTitle: (<>Looking <span className="italic text-accent">back</span>.</>),
    upcomingEmpty: 'No upcoming matches you joined. Find one in Discover.',
    pastEmpty: "You didn't play any matches this month.",
  },
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface MonthKey {
  month: number // 1-12
  year: number
}

const keyOf = (m: Match): MonthKey => {
  const d = new Date(m.start_time)
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}
const sameKey = (a: MonthKey, b: MonthKey) => a.month === b.month && a.year === b.year

function MonthYearPicker({ value, onChange, available }: { value: MonthKey; onChange: (v: MonthKey) => void; available: MonthKey[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const monthsInYear = new Set(available.filter((k) => k.year === value.year).map((k) => k.month))
  const years = [...new Set(available.map((k) => k.year))].sort()
  const minYear = years[0]
  const maxYear = years[years.length - 1]

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors hover:text-ink"
        style={{ color: 'rgba(26,26,26,0.7)' }}
      >
        {MONTH_NAMES_FULL[value.month - 1]} <span className="nums-tabular">{value.year}</span>
        <ChevronDown size={11} strokeWidth={2.4} className="transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div
          className="absolute -start-2.5 top-[calc(100%+10px)] z-30 w-[244px] rounded-[18px] border bg-card p-3.5"
          style={{ borderColor: 'rgba(26,26,26,0.08)', boxShadow: '0 22px 44px -18px rgba(26,26,26,0.28), 0 4px 12px -4px rgba(26,26,26,0.08)' }}
        >
          {/* year stepper */}
          <div className="mb-3 flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
            <button
              onClick={() => onChange({ ...value, year: value.year - 1 })}
              disabled={value.year <= minYear}
              className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full border-none bg-transparent rtl:rotate-180"
              style={{ cursor: value.year <= minYear ? 'not-allowed' : 'pointer', color: value.year <= minYear ? 'rgba(26,26,26,0.25)' : 'rgba(26,26,26,0.7)' }}
            >
              <ChevronLeft size={14} strokeWidth={2.2} />
            </button>
            <span className="font-display text-[22px] nums-tabular" style={{ letterSpacing: '-0.012em' }}>
              {value.year}
            </span>
            <button
              onClick={() => onChange({ ...value, year: value.year + 1 })}
              disabled={value.year >= maxYear}
              className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full border-none bg-transparent rtl:rotate-180"
              style={{ cursor: value.year >= maxYear ? 'not-allowed' : 'pointer', color: value.year >= maxYear ? 'rgba(26,26,26,0.25)' : 'rgba(26,26,26,0.7)' }}
            >
              <ChevronRight size={14} strokeWidth={2.2} />
            </button>
          </div>
          {/* month grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES_SHORT.map((m, i) => {
              const monthNum = i + 1
              const isSelected = monthNum === value.month
              const hasData = monthsInYear.has(monthNum)
              return (
                <button
                  key={m}
                  disabled={!hasData}
                  onClick={() => {
                    onChange({ month: monthNum, year: value.year })
                    setOpen(false)
                  }}
                  className="rounded-[10px] border-none py-[9px] text-[12px] tracking-[0.04em] transition-colors"
                  style={{
                    cursor: hasData ? 'pointer' : 'not-allowed',
                    background: isSelected ? 'var(--color-brand)' : 'transparent',
                    color: isSelected ? 'var(--color-text-onbrand)' : hasData ? 'rgba(26,26,26,0.75)' : 'rgba(26,26,26,0.25)',
                    fontWeight: isSelected ? 600 : 500,
                  }}
                >
                  {m}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/** Back-compat alias — `/matches/all` was the original hosting archive route. */
export function AllMatchesScreen() {
  return <MatchArchiveScreen bucket="hosted" />
}

export function MatchArchiveScreen({ bucket }: { bucket: Bucket }) {
  const db = useDB()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'upcoming' | 'past'>(params.get('tab') === 'past' ? 'past' : 'upcoming')
  const copy = COPY[bucket]

  const { upcoming, past } = useMemo(() => {
    const source = bucket === 'hosted' ? hostedMatches(db) : joinedNotHostedMatches(db)
    const up: Match[] = []
    const pa: Match[] = []
    for (const m of source) {
      const s = computeStatus(m)
      if (s === 'open' || s === 'full' || s === 'live') up.push(m)
      else pa.push(m)
    }
    pa.sort((a, b) => b.start_time.localeCompare(a.start_time)) // newest first
    return { upcoming: up, past: pa }
  }, [db, bucket])

  const upcomingMonths = useMemo(() => {
    const map = new Map(upcoming.map((m) => [`${keyOf(m).year}-${keyOf(m).month}`, keyOf(m)]))
    return [...map.values()].sort((a, b) => a.year - b.year || a.month - b.month)
  }, [upcoming])
  const pastMonths = useMemo(() => {
    const map = new Map(past.map((m) => [`${keyOf(m).year}-${keyOf(m).month}`, keyOf(m)]))
    return [...map.values()].sort((a, b) => b.year - a.year || b.month - a.month)
  }, [past])

  const fallback: MonthKey = { month: new Date().getMonth() + 1, year: new Date().getFullYear() }
  const [upcomingSel, setUpcomingSel] = useState<MonthKey>(upcomingMonths[0] ?? fallback)
  const [pastSel, setPastSel] = useState<MonthKey>(pastMonths[0] ?? fallback)

  const activeSel = tab === 'upcoming' ? upcomingSel : pastSel
  const setActiveSel = tab === 'upcoming' ? setUpcomingSel : setPastSel
  const activeAvailable = tab === 'upcoming' ? upcomingMonths : pastMonths
  const activeFiltered = (tab === 'upcoming' ? upcoming : past).filter((m) => sameKey(keyOf(m), activeSel))

  // Upcoming variant: brief on the joined archive, full on the hosting archive —
  // the SAME canonical card, never a per-page variant (CLAUDE.md §4). Past is
  // always the brief card in BOTH buckets (read-only history; the lifecycle chip
  // in the card's bottom-right corner carries the state — no art-panel chip).
  const variant = bucket === 'hosted' ? 'full' : 'brief'

  return (
    <Shell>
      <div className="flex h-full flex-col">
        {/* sticky header */}
        <div className="relative z-2 px-6 pt-[60px] pb-3.5" style={{ background: 'linear-gradient(180deg, var(--surface-page) 70%, transparent 100%)' }}>
          <div className="mb-[18px] flex items-center justify-between">
            <Link
              to="/home"
              className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border text-ink no-underline backdrop-blur-[8px] rtl:rotate-180"
              style={{ borderColor: 'rgba(26,26,26,0.12)', background: 'rgba(255,255,255,0.7)' }}
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </Link>
            {/* Create lives on the hosting archive only — the joined archive is
                a history of matches you didn't create. */}
            {bucket === 'hosted' && (
              <Link
                to={HOST_CREATE_ROUTE}
                aria-label="Create a match"
                className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-full bg-transparent text-brand no-underline"
                style={{ border: '1.5px dashed color-mix(in srgb, var(--color-brand) 40%, transparent)' }}
              >
                <Plus size={16} strokeWidth={2} />
              </Link>
            )}
          </div>

          <div className="mb-[18px]">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: 'rgba(26,26,26,0.5)' }}>
              {copy.eyebrow}
            </div>
            <h1 className="m-0 font-display text-[38px] font-normal leading-none" style={{ letterSpacing: '-0.02em' }}>
              {tab === 'upcoming' ? copy.upcomingTitle : copy.pastTitle}
            </h1>
          </div>

          {/* tab pill */}
          <div className="inline-flex items-center gap-1 rounded-pill p-1" style={{ background: 'rgba(26,26,26,0.06)', border: '1px solid rgba(26,26,26,0.06)' }}>
            {(
              [
                { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
                { id: 'past', label: 'Past', count: past.length },
              ] as const
            ).map(({ id, label, count }) => {
              const on = id === tab
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill border-none px-[18px] py-2 text-[13px] tracking-[0.01em] transition-colors"
                  style={{
                    background: on ? 'var(--color-brand)' : 'transparent',
                    color: on ? 'var(--color-text-onbrand)' : 'rgba(26,26,26,0.6)',
                    fontWeight: on ? 600 : 500,
                    boxShadow: on ? '0 6px 14px -6px var(--color-brand)' : 'none',
                  }}
                >
                  {label}
                  <span
                    className="rounded-pill px-[7px] py-px text-[10.5px] font-medium leading-[1.4] nums-tabular"
                    style={{
                      background: on ? 'rgba(244,240,232,0.18)' : 'rgba(26,26,26,0.08)',
                      color: on ? 'rgba(244,240,232,0.85)' : 'rgba(26,26,26,0.5)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* scrollable list */}
        <div className="scroll-area relative z-1 flex flex-1 flex-col gap-3 overflow-y-auto px-6 pt-2 pb-[120px]">
          {/* month header */}
          <div className="-mb-0.5 mt-1 flex items-center gap-3">
            <MonthYearPicker value={activeSel} onChange={setActiveSel} available={activeAvailable} />
            <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] nums-tabular" style={{ color: 'rgba(26,26,26,0.4)' }}>
              {activeFiltered.length} {activeFiltered.length === 1 ? 'match' : 'matches'}
            </span>
            <span className="h-px flex-1" style={{ background: 'rgba(26,26,26,0.08)' }} />
          </div>

          {activeFiltered.length === 0 ? (
            <div className="mt-1.5 rounded-[18px] px-5 py-7 text-center" style={{ background: 'rgba(255,255,255,0.5)', border: '1px dashed rgba(26,26,26,0.18)' }}>
              <div className="mb-1.5 font-display text-[22px]" style={{ letterSpacing: '-0.012em' }}>
                <span className="italic text-accent">Nothing</span> in {MONTH_NAMES_FULL[activeSel.month - 1]}.
              </div>
              <div className="text-[12.5px] leading-normal" style={{ color: 'var(--color-text-muted)' }}>
                {tab === 'past' ? copy.pastEmpty : copy.upcomingEmpty}
              </div>
            </div>
          ) : tab === 'upcoming' ? (
            // Upcoming: hosting → per-card Edit; joined → read-only view (§4).
            activeFiltered.map((m) => (
              <MatchCard
                key={m.id}
                variant={variant}
                match={m}
                host={getUser(db, m.host_id)}
                players={matchPlayers(db, m.id)}
                action={bucket === 'hosted' ? 'edit' : 'view'}
              />
            ))
          ) : (
            activeFiltered.map((m) => (
              <MatchCard
                key={m.id}
                variant="brief"
                match={m}
                host={getUser(db, m.host_id)}
                players={matchPlayers(db, m.id)}
                action="view"
                dimImage={m.status === 'cancelled'}
                statusCorner
                showStatusBadge={false}
              />
            ))
          )}
        </div>
      </div>
    </Shell>
  )
}
