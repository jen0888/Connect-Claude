import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Coins, Lock, LockOpen, MapPin, Plus, Sparkles, TriangleAlert } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Eyebrow } from '@/components/Eyebrow'
import { CTA, DualSlider, MiniMap, PlayerDots, Segmented, Slider } from '@/components/controls'
import { useToast } from '@/components/Toast'
import { actions, currentUserId, useDB } from '@/lib/store'
import type { SkillLevel, Sport } from '@/lib/types'
import { VenuePicker, type VenueSelection } from './VenuePicker'

/** Create / Edit Match — single long scroll (create-match-v1.jsx, Editorial
 *  Calm). Cost and Joining must be explicitly chosen before creating.
 *  Save-then-route: Create/Save/Cancel → Home + transient toast (CLAUDE.md §4). */

const SPORTS: { id: Sport; label: string }[] = [
  { id: 'padel', label: 'Padel' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'running', label: 'Running' },
]

const LEVEL_NAMES = ['Baby', 'Beginner', 'Low int.', 'High int.', 'Advanced']
const PRESET_DUR = [30, 60, 90, 120]

/** map the 1–5 dual-slider range onto the schema's single skill_level */
function levelRange(min: number, max: number): SkillLevel {
  if (min <= 1 && max >= 5) return 'any'
  const mid = (min + max) / 2
  if (mid <= 2) return 'beginner'
  if (mid >= 4.5) return 'advanced'
  return 'intermediate'
}

const addMinutes = (hhmm: string, mins: number) => {
  const [h, mn] = hhmm.split(':').map(Number)
  const total = (((h * 60 + mn + mins) % 1440) + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
const diffMinutes = (a: string, b: string) => {
  const [ah, am] = a.split(':').map(Number)
  const [bh, bm] = b.split(':').map(Number)
  return (((bh * 60 + bm - ah * 60 - am) % 1440) + 1440) % 1440
}

const cardCls = 'rounded-[22px] border bg-card'
const cardStyle = { borderColor: 'rgba(26,26,26,0.10)' }

function FieldRow({ label, hint, rightLabel, children }: { label: string; hint?: string; rightLabel?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <div>
          <div className="text-[13.5px] font-medium text-ink">{label}</div>
          {hint && (
            <div className="mt-0.5 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
              {hint}
            </div>
          )}
        </div>
        {rightLabel}
      </div>
      {children}
    </div>
  )
}

export function CreateMatchScreen({ mode = 'create' }: { mode?: 'create' | 'edit' }) {
  const isEdit = mode === 'edit'
  const { id } = useParams()
  const db = useDB()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const existing = isEdit ? db.matches.find((m) => m.id === id) : undefined

  // 10-day date strip starting today
  const dateDays = useMemo(() => {
    const out: { label: string; day: number; key: string; date: Date }[] = []
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const base = new Date()
    for (let i = 0; i < 10; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)
      out.push({ label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : wd[d.getDay()], day: d.getDate(), key: d.toISOString().slice(0, 10), date: d })
    }
    return out
  }, [])

  const [sport, setSport] = useState<Sport>(existing?.sport ?? 'padel')
  const [dateKey, setDateKey] = useState(existing ? existing.start_time.slice(0, 10) : dateDays[0].key)
  const [startTime, setStartTime] = useState(existing ? existing.start_time.slice(11, 16) : '18:30')
  const [endTime, setEndTime] = useState(existing ? existing.end_time.slice(11, 16) : '20:00')
  const duration = diffMinutes(startTime, endTime)
  const setDuration = (mins: number) => setEndTime(addMinutes(startTime, mins))
  const [players, setPlayers] = useState(existing?.total_spots ?? 4)
  const [minLevel, setMinLevel] = useState(2)
  const [maxLevel, setMaxLevel] = useState(4)
  const [isFree, setIsFree] = useState<boolean | null>(existing ? existing.fee_per_player == null : null)
  const [pricePerPlayer, setPricePerPlayer] = useState(existing?.fee_per_player ? String(existing.fee_per_player) : '')
  const [requireApproval, setRequireApproval] = useState<boolean | null>(existing ? existing.join_mode === 'approval' : null)
  const [description, setDescription] = useState(existing?.notes ?? '')
  const [showVenue, setShowVenue] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [showDur, setShowDur] = useState(false)
  const [customDur, setCustomDur] = useState('')

  const [venue, setVenue] = useState<VenueSelection | null>(() => {
    if (existing) {
      if (existing.sport === 'running' && existing.route_start) {
        return { id: 'route', name: existing.route_start, endName: existing.route_end ?? '', loop: existing.round_trip, km: '', area: '', setting: '', court: '' }
      }
      return { id: existing.venue_id ?? 'custom', name: existing.venue_name, area: existing.venue_location ?? '', setting: '', court: existing.court_number ?? '' }
    }
    return null
  })

  const isRoute = venue?.id === 'route' || !!venue?.endName
  const venueCompatible = venue != null && (sport === 'running' ? isRoute : !isRoute)
  const allChosen = isFree !== null && requireApproval !== null

  const save = () => {
    if (!allChosen) {
      setShowReminder(true)
      return
    }
    const dayIso = dateKey
    const start = `${dayIso}T${startTime}:00`
    const end = `${dayIso}T${endTime}:00`
    const price = isFree ? null : parseFloat(pricePerPlayer) || null
    const base = {
      sport,
      venue_id: venue && venue.id !== 'custom' && venue.id !== 'route' ? venue.id : null,
      venue_name: venue?.name ?? '',
      venue_location: venue?.area || null,
      court_number: venue?.court || null,
      route_start: sport === 'running' ? (venue?.name ?? null) : null,
      route_end: sport === 'running' ? (venue?.loop ? venue.name : (venue?.endName ?? null)) : null,
      round_trip: sport === 'running' ? (venue?.loop ?? false) : false,
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      skill_level: levelRange(minLevel, maxLevel),
      total_spots: players,
      fee_per_player: price,
      fee_total: price ? price * players : null,
      join_mode: (requireApproval ? 'approval' : 'open') as 'approval' | 'open',
      notes: description.trim() || null,
    }
    if (isEdit && existing) {
      actions.updateMatch(existing.id, base)
      showToast('Changes saved')
    } else {
      actions.createMatch({ ...base, host_id: currentUserId })
      showToast('Match created')
    }
    navigate('/home') // save-then-route: Match edit/create → Home + toast
  }

  const cancelMatch = () => {
    if (existing) {
      actions.cancelMatch(existing.id)
      showToast('Match cancelled')
      navigate('/home')
    }
  }

  const selectedDay = dateDays.find((d) => d.key === dateKey)

  return (
    <Shell nav={false}>
      <div className="flex h-full flex-col">
        <div className="relative z-1 flex-1 overflow-y-auto px-[22px] pt-14 pb-[130px]">
          {/* back */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="mb-2 inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border-none text-ink"
            style={{ background: 'rgba(26,26,26,0.05)' }}
          >
            <ArrowLeft size={18} strokeWidth={2} className="rtl:rotate-180" />
          </button>

          {/* hero copy */}
          <div className="pt-2 pb-[22px]">
            <div className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
              {isEdit ? `You're hosting · ${selectedDay?.label ?? ''}` : 'Step one of one'}
            </div>
            <h1 className="m-0 font-display text-[40px] font-normal leading-none" style={{ letterSpacing: '-0.022em', textWrap: 'balance' }}>
              {isEdit ? (
                <>
                  Edit <span className="italic text-brand">your match</span>.
                </>
              ) : (
                <>
                  Let's set up <span className="italic text-brand">your match</span>.
                </>
              )}
            </h1>
          </div>

          {/* sport pills */}
          <div className="-ms-0.5 flex gap-2 overflow-x-auto pb-3.5" style={{ scrollbarWidth: 'none' }}>
            {SPORTS.map((s) => {
              const on = sport === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSport(s.id)}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-pill px-4 py-2.5 text-[13px] font-medium tracking-[0.01em]"
                  style={{
                    border: `1.5px solid ${on ? 'var(--color-brand)' : 'rgba(26,26,26,0.18)'}`,
                    background: on ? 'var(--color-brand)' : 'transparent',
                    color: on ? 'var(--color-text-onbrand)' : 'var(--color-text)',
                  }}
                >
                  {s.label}
                </button>
              )
            })}
          </div>

          {/* When */}
          <div className="mt-2">
            <Eyebrow accent="var(--color-brand)">When</Eyebrow>
            <div className={`relative mt-3 ${cardCls}`} style={cardStyle}>
              {/* date strip */}
              <div className="px-3.5 pt-3.5 pb-2.5">
                <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {dateDays.map((d) => {
                    const on = d.key === dateKey
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setDateKey(d.key)}
                        className="flex min-w-[46px] shrink-0 cursor-pointer flex-col items-center gap-0.5 rounded-[14px] px-1.5 pt-2 pb-2.5"
                        style={{
                          border: on ? '1.5px solid var(--color-brand)' : '1px solid transparent',
                          background: on ? 'var(--color-brand)' : 'transparent',
                          color: on ? 'var(--color-text-onbrand)' : 'var(--color-text)',
                        }}
                      >
                        <span className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ opacity: on ? 0.7 : 0.55 }}>
                          {d.label.slice(0, 3)}
                        </span>
                        <span className="font-display text-[20px] leading-none nums-tabular">{d.day}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* time row */}
              <div className="grid border-t" style={{ gridTemplateColumns: '1fr 1px 1fr', borderColor: 'rgba(26,26,26,0.10)' }}>
                {(
                  [
                    { label: 'Starts', value: startTime, set: (v: string) => { setStartTime(v); setEndTime(addMinutes(v, duration)) } },
                    { label: 'Ends', value: endTime, set: setEndTime },
                  ] as const
                ).flatMap((f, i) => [
                  i === 1 ? <div key="divider" style={{ background: 'rgba(26,26,26,0.10)' }} /> : null,
                  <label key={f.label} className="flex cursor-pointer flex-col gap-1 px-4 py-3">
                    <span className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--color-text-muted)' }}>
                      {f.label}
                    </span>
                    <input
                      type="time"
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      className="border-none bg-transparent p-0 font-display text-[30px] leading-[1.05] text-ink outline-none ltr-nums"
                      style={{ letterSpacing: '-0.01em' }}
                    />
                  </label>,
                ])}
              </div>
              {/* duration row */}
              <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: 'rgba(26,26,26,0.10)' }}>
                <span className="text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
                  Duration
                </span>
                <div className="flex items-center gap-1.5">
                  {PRESET_DUR.includes(duration) ? (
                    PRESET_DUR.map((d) => {
                      const on = duration === d
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDuration(d)}
                          className="cursor-pointer rounded-pill px-3 py-1.5 text-[12px] font-medium nums-tabular"
                          style={{
                            border: `1.5px solid ${on ? 'var(--color-brand)' : 'rgba(26,26,26,0.18)'}`,
                            background: on ? 'var(--color-brand)' : 'transparent',
                            color: on ? 'var(--color-text-onbrand)' : 'var(--color-text)',
                          }}
                        >
                          {d}m
                        </button>
                      )
                    })
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDur(true)}
                      className="cursor-pointer rounded-pill border-[1.5px] border-brand bg-brand px-3 py-1.5 text-[12px] font-medium text-onbrand nums-tabular"
                    >
                      {duration}m
                    </button>
                  )}
                  <div className="relative inline-flex">
                    <button
                      type="button"
                      aria-label="Custom duration"
                      onClick={() => setShowDur((s) => !s)}
                      className="-ms-0.5 inline-flex cursor-pointer items-center justify-center border-none bg-transparent px-1.5 py-1.5"
                      style={{ color: showDur ? 'var(--color-brand)' : 'var(--color-text-muted)' }}
                    >
                      <Plus size={12} strokeWidth={2.2} />
                    </button>
                    {showDur && (
                      <>
                        <div onClick={() => setShowDur(false)} className="fixed inset-0 z-30" />
                        <div
                          className="absolute end-0 top-[calc(100%+8px)] z-31 w-[210px] rounded-[16px] border bg-card p-3.5"
                          style={{ borderColor: 'rgba(26,26,26,0.10)', boxShadow: '0 18px 40px -14px rgba(26,26,26,0.45)' }}
                        >
                          <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--color-text-muted)' }}>
                            Custom duration
                          </div>
                          <div className="flex items-center gap-2.5 rounded-md px-3 py-2" style={{ border: '1px solid rgba(26,26,26,0.18)' }}>
                            <input
                              type="number"
                              autoFocus
                              value={customDur}
                              onChange={(e) => setCustomDur(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && parseInt(customDur, 10) > 0) {
                                  setDuration(parseInt(customDur, 10))
                                  setShowDur(false)
                                  setCustomDur('')
                                }
                              }}
                              placeholder={String(duration)}
                              className="min-w-0 flex-1 border-none bg-transparent p-0 font-display text-[26px] leading-none text-ink outline-none"
                            />
                            <span className="text-[12.5px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                              min
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={!(parseInt(customDur, 10) > 0)}
                            onClick={() => {
                              setDuration(parseInt(customDur, 10))
                              setShowDur(false)
                              setCustomDur('')
                            }}
                            className="mt-2.5 w-full cursor-pointer rounded-pill border-none bg-ink py-2.5 text-[13px] font-semibold text-onbrand disabled:opacity-60"
                          >
                            Set duration
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
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
                  {!venueCompatible ? (
                    <>
                      <div className="font-display text-[20px] leading-[1.15]" style={{ color: 'rgba(26,26,26,0.45)' }}>
                        Add a location
                      </div>
                      <div className="mt-1 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                        {sport === 'running' ? 'Set a start and finish point.' : 'Pick a court for your match.'}
                      </div>
                    </>
                  ) : isRoute ? (
                    <div className="flex gap-[11px]">
                      {/* route spine */}
                      <div className="flex shrink-0 flex-col items-center pt-[5px]">
                        <span className="h-[9px] w-[9px] rounded-full bg-brand" />
                        <span className="my-[3px] min-h-5 w-0.5 flex-1 rounded-pill opacity-60" style={{ background: 'rgba(26,26,26,0.18)' }} />
                        <span className="box-border h-[9px] w-[9px] rounded-full" style={{ border: '1.5px solid rgba(26,26,26,0.18)' }} />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
                        <div>
                          <div className="mb-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>
                            Start
                          </div>
                          <div className="font-display text-[17px] leading-[1.15]" style={{ letterSpacing: '-0.01em' }}>
                            {venue!.name}
                          </div>
                        </div>
                        <div>
                          <div className="mb-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>
                            Finish
                          </div>
                          <div className="font-display text-[17px] leading-[1.15]" style={{ letterSpacing: '-0.01em' }}>
                            {venue!.loop ? <span className="italic text-brand">Loop · back to start</span> : venue!.endName}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-display text-[20px] leading-[1.15]">
                        {venue!.name}
                        {venue!.court && <span className="italic text-brand"> · Court {venue!.court}</span>}
                      </div>
                      {(venue!.area || venue!.setting) && (
                        <div className="mt-1 flex min-w-0 items-center gap-2 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                          <span className="inline-flex min-w-0 items-center gap-1 truncate">
                            <MapPin size={12} strokeWidth={1.8} className="shrink-0" /> {venue!.area}
                          </span>
                          {venue!.setting && (
                            <>
                              <span className="opacity-40">·</span>
                              <span>{venue!.setting}</span>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowVenue(true)}
                  className="shrink-0 cursor-pointer rounded-pill bg-transparent px-3.5 py-2 text-[12px] font-medium text-ink"
                  style={{ border: '1.5px solid rgba(26,26,26,0.18)' }}
                >
                  {venueCompatible ? 'Change' : 'Choose a location'}
                </button>
              </div>
            </div>
          </div>

          {/* Players + level */}
          <div className="mt-6">
            <Eyebrow accent="var(--color-brand)">Players</Eyebrow>
            <div className={`mt-3 flex flex-col gap-[18px] p-[18px] ${cardCls}`} style={cardStyle}>
              <FieldRow
                label="How many?"
                rightLabel={
                  <span className="font-display text-[28px] leading-none nums-tabular">
                    {players}
                    <span className="text-[14px] italic" style={{ color: 'var(--color-text-muted)' }}>
                      {' '}
                      spots
                    </span>
                  </span>
                }
              >
                <div className="mt-2 flex items-center gap-3.5">
                  <PlayerDots filled={1} total={players} size={28} />
                </div>
                <div className="mt-3">
                  <Slider value={players} min={2} max={8} onChange={setPlayers} ticks={['2', '3', '4', '5', '6', '7', '8']} />
                </div>
              </FieldRow>

              <div className="h-px" style={{ background: 'rgba(26,26,26,0.10)' }} />

              <FieldRow
                label="Skill level"
                rightLabel={
                  <span className="text-[12.5px] font-medium text-ink">
                    {LEVEL_NAMES[minLevel - 1]} <span style={{ color: 'var(--color-text-muted)' }}>→</span> {LEVEL_NAMES[maxLevel - 1]}
                  </span>
                }
              >
                <div className="mt-2.5">
                  <DualSlider
                    value={[minLevel, maxLevel]}
                    min={1}
                    max={5}
                    onChange={([lo, hi]) => {
                      setMinLevel(lo)
                      setMaxLevel(hi)
                    }}
                    ticks={['Baby', 'Beg', 'Low int.', 'High int.', 'Adv']}
                  />
                </div>
              </FieldRow>
            </div>
          </div>

          {/* Rules */}
          <div className="mt-6">
            <Eyebrow accent="var(--color-brand)">Rules</Eyebrow>
            <div className={`mt-3 flex flex-col gap-[18px] p-[18px] ${cardCls}`} style={cardStyle}>
              <FieldRow
                label="Cost"
                hint={isFree === null ? 'Choose how players cover the court.' : isFree ? 'No cost per player.' : 'Players will split the cost.'}
              >
                <Segmented
                  value={isFree}
                  onChange={setIsFree}
                  options={[
                    { value: true, label: 'Free to join', icon: <Sparkles size={14} strokeWidth={1.8} /> },
                    { value: false, label: 'Split the cost', icon: <Coins size={14} strokeWidth={1.8} /> },
                  ]}
                />
                {isFree === false && (
                  <div className="mt-3.5">
                    <div className="flex items-center gap-3.5">
                      <div className="flex-1">
                        <div className="text-[13.5px] font-medium">Price per player</div>
                        <div className="mt-0.5 text-[11.5px] nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
                          Total court fee · QAR {((parseFloat(pricePerPlayer) || 0) * players).toFixed(0)}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-md bg-page px-3.5 py-2" style={{ border: '1px solid rgba(26,26,26,0.10)' }}>
                        <span className="text-[12.5px] font-semibold leading-none tracking-[0.06em]" style={{ color: 'var(--color-text-muted)' }}>
                          QAR
                        </span>
                        <input
                          type="number"
                          placeholder="0"
                          value={pricePerPlayer}
                          onChange={(e) => setPricePerPlayer(e.target.value)}
                          className="w-16 border-none bg-transparent py-0.5 text-end font-display text-[24px] leading-none text-ink outline-none"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-start gap-2.5 rounded-[14px] px-3.5 py-3" style={{ background: 'rgba(26,26,26,0.06)' }}>
                      <Coins size={14} strokeWidth={1.8} className="mt-px shrink-0 text-brand" />
                      <div className="text-[11.5px] leading-normal" style={{ color: 'var(--color-text-muted)' }}>
                        Connect doesn't handle payments. Players settle with you directly —{' '}
                        <span className="font-medium text-ink">cash to the host or bank transfer</span>.
                      </div>
                    </div>
                  </div>
                )}
              </FieldRow>

              <div className="h-px" style={{ background: 'rgba(26,26,26,0.10)' }} />

              <FieldRow
                label="Joining"
                hint={
                  requireApproval === null
                    ? 'Choose how players get in.'
                    : requireApproval
                      ? "You'll review each join request."
                      : 'Anyone can join instantly.'
                }
              >
                <Segmented
                  value={requireApproval}
                  onChange={setRequireApproval}
                  options={[
                    { value: false, label: 'Join instantly', icon: <LockOpen size={14} strokeWidth={1.8} /> },
                    { value: true, label: 'Require approval', icon: <Lock size={14} strokeWidth={1.8} /> },
                  ]}
                />
              </FieldRow>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <Eyebrow accent="var(--color-brand)">Description</Eyebrow>
            <div className={`mt-3 px-4 py-3.5 ${cardCls}`} style={cardStyle}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 240))}
                placeholder="Add a note for players — vibe, tactics, anything they should know…"
                rows={3}
                className="block min-h-16 w-full resize-none border-none bg-transparent p-0 text-[13.5px] leading-relaxed text-ink outline-none placeholder:italic"
                style={{ letterSpacing: '0.005em' }}
              />
              <div className="mt-1.5 flex justify-end text-[11px] font-medium nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
                {description.length}/240
              </div>
            </div>
          </div>
        </div>

        {/* sticky footer CTA */}
        <div
          className="absolute inset-x-0 bottom-0 z-5 flex flex-col items-center gap-2.5 px-[22px] pt-4 pb-[22px]"
          style={{ background: 'linear-gradient(180deg, transparent, var(--surface-page) 30%)' }}
        >
          {isEdit ? (
            <>
              <CTA onClick={save}>Save changes</CTA>
              <button
                type="button"
                onClick={cancelMatch}
                className="cursor-pointer border-none bg-transparent px-2.5 py-1.5 text-[13px] font-medium tracking-[0.01em] underline underline-offset-3"
                style={{ color: '#9b2f1f', textDecorationColor: 'rgba(155,47,31,0.35)' }}
              >
                Cancel match
              </button>
            </>
          ) : (
            <CTA onClick={save}>
              Create match <ArrowRight size={14} strokeWidth={2} className="rtl:rotate-180" />
            </CTA>
          )}
        </div>

        {/* required-choice reminder sheet */}
        {showReminder && (
          <div
            onClick={() => setShowReminder(false)}
            className="absolute inset-0 z-40 flex items-end justify-center p-4 backdrop-blur-[2px]"
            style={{ background: 'rgba(26,26,26,0.45)' }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-[26px] bg-card px-[22px] pt-6 pb-[18px]"
              style={{ boxShadow: '0 30px 60px -20px rgba(26,26,26,0.6)' }}
            >
              <div className="mb-3.5 inline-flex h-11 w-11 items-center justify-center rounded-[14px]" style={{ background: 'rgba(155,47,31,0.1)', color: '#9b2f1f' }}>
                <TriangleAlert size={22} strokeWidth={2} />
              </div>
              <h3 className="m-0 mb-2 font-display text-[26px] font-normal leading-[1.1]" style={{ letterSpacing: '-0.01em' }}>
                A couple of choices first.
              </h3>
              <p className="m-0 mb-4 text-[13.5px] leading-normal" style={{ color: 'var(--color-text-muted)' }}>
                Before you create this match, please set:
              </p>
              <div className="mb-5 flex flex-col gap-2.5">
                {[
                  { ok: isFree !== null, label: 'Cost — free or split' },
                  { ok: requireApproval !== null, label: 'Joining — instant or approval' },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-2.5 text-[13.5px] font-medium" style={{ color: r.ok ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                    <span
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: r.ok ? 'var(--color-brand)' : 'transparent',
                        border: r.ok ? 'none' : '1.5px solid rgba(155,47,31,0.5)',
                        color: r.ok ? 'var(--color-text-onbrand)' : '#9b2f1f',
                      }}
                    >
                      {r.ok ? <Check size={11} strokeWidth={3.2} /> : <span className="text-[12px] font-bold">*</span>}
                    </span>
                    <span style={{ textDecoration: r.ok ? 'line-through' : 'none', opacity: r.ok ? 0.7 : 1 }}>{r.label}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowReminder(false)}
                className="w-full cursor-pointer rounded-pill border-none bg-ink py-3.5 text-[14px] font-semibold text-onbrand"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* venue / court picker */}
        {showVenue && <VenuePicker sport={sport} current={venueCompatible ? venue : null} onClose={() => setShowVenue(false)} onSelect={(v) => { setVenue(v); setShowVenue(false) }} />}
      </div>
    </Shell>
  )
}
