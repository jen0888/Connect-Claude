import { useMemo, useState } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { Eyebrow } from '@/components/Eyebrow'
import { WD, addMinutes, keyOf, labelFromKey, normalizeTime } from '@/lib/datetime'

/** The shared "When" section for both match create/edit forms — a 10-day
 *  quick-pick date strip + native calendar (any date) + typeable 24h start/end
 *  times + duration presets. One component so create-demo, edit-demo and the
 *  store-backed create/edit never drift (CLAUDE.md §6 — no per-page variants). */

const cardCls = 'rounded-[22px] border bg-card'
const cardStyle = { borderColor: 'rgba(26,26,26,0.10)' }
const hairline = 'rgba(26,26,26,0.10)'
const PRESET_DUR = [30, 60, 90, 120]

/** Typeable 24h time cell — big serif look with separate hour/minute inputs and
 *  a fixed ":" between them; commits a normalised value on blur / Enter. */
function TimeField({ label, value, onCommit }: { label: string; value: string; onCommit: (v: string) => void }) {
  const [hh, mm] = value.split(':')
  const [hDraft, setHDraft] = useState<string | null>(null)
  const [mDraft, setMDraft] = useState<string | null>(null)
  const commit = () => {
    if (hDraft === null && mDraft === null) return
    onCommit(normalizeTime(`${hDraft ?? hh}:${mDraft ?? mm}`, value))
    setHDraft(null)
    setMDraft(null)
  }
  const cell = 'num w-[2ch] border-none bg-transparent p-0 text-center font-display text-[30px] leading-[1.05] text-ink outline-none ltr-nums placeholder:opacity-30'
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <span className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <div className="inline-flex items-baseline font-display text-[30px] leading-[1.05] text-ink" style={{ letterSpacing: '-0.01em' }}>
        <input
          type="text"
          inputMode="numeric"
          aria-label={`${label} hour`}
          value={hDraft ?? hh}
          maxLength={2}
          placeholder="--"
          onChange={(e) => setHDraft(e.target.value.replace(/[^0-9]/g, ''))}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          className={cell}
        />
        <span aria-hidden className="px-0.5 opacity-40">:</span>
        <input
          type="text"
          inputMode="numeric"
          aria-label={`${label} minute`}
          value={mDraft ?? mm}
          maxLength={2}
          placeholder="--"
          onChange={(e) => setMDraft(e.target.value.replace(/[^0-9]/g, ''))}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          className={cell}
        />
      </div>
    </div>
  )
}

/** Read-only End time — derived from Start + Duration, never typed. Mirrors the
 *  TimeField look but renders static numerals with an "auto" tag so it's clear
 *  the host doesn't enter it (CLAUDE.md: times stay LTR / tabular even in RTL). */
function EndField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
        <span
          className="rounded-pill px-1.5 py-px text-[8.5px] font-semibold tracking-[0.08em] text-brand"
          style={{ background: 'color-mix(in srgb, var(--color-brand) 12%, transparent)' }}
        >
          AUTO
        </span>
      </span>
      <div className="font-display text-[30px] leading-[1.05] text-ink ltr-nums nums-tabular" style={{ letterSpacing: '-0.01em' }}>
        {value}
      </div>
    </div>
  )
}

export function WhenCard({
  dateKey,
  onDateKey,
  startTime,
  onStartTime,
  endTime,
  onEndTime,
  duration,
  onDuration,
  restrictPast = false,
}: {
  dateKey: string
  onDateKey: (k: string) => void
  startTime: string
  onStartTime: (t: string) => void
  endTime: string
  onEndTime: (t: string) => void
  /** match length in minutes — the host picks this first; End is derived from it */
  duration: number
  onDuration: (mins: number) => void
  /** create flows: forbid picking a date before today */
  restrictPast?: boolean
}) {
  const today = useMemo(() => new Date(), [])
  const todayKey = keyOf(today)
  const [showDur, setShowDur] = useState(false)
  const [customDur, setCustomDur] = useState('')

  // Duration is the source of truth; End = Start + Duration (day-rollover safe via
  // addMinutes' %1440 wrap). Changing either Duration or Start re-rolls End.
  const setDuration = (mins: number) => {
    onDuration(mins)
    onEndTime(addMinutes(startTime, mins))
  }
  const handleStart = (v: string) => {
    onStartTime(v)
    onEndTime(addMinutes(v, duration))
  }

  const dateLabel = labelFromKey(dateKey)
  // 10-day quick-pick strip anchored to today; if a date outside that window is
  // chosen via the calendar, the strip re-anchors so the selection stays visible.
  const dateDays = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const [sy, sm, sd] = dateKey.split('-').map(Number)
    const sel = new Date(sy, (sm || 1) - 1, sd || 1)
    const diff = Math.round((sel.getTime() - base.getTime()) / 86400000)
    const anchor = diff < 0 || diff > 9 ? sel : base
    return Array.from({ length: 10 }, (_, i) => {
      const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + i)
      return { label: WD[d.getDay()], day: d.getDate(), key: keyOf(d) }
    })
  }, [today, dateKey])

  return (
    <>
      <div className="flex items-center justify-between">
        <Eyebrow accent="var(--color-brand)">When</Eyebrow>
        {/* pick any date — opens the native calendar; the strip re-anchors */}
        <label
          className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-pill px-3 py-1.5 text-[11.5px] font-medium text-ink"
          style={{ border: '1.5px solid rgba(26,26,26,0.18)' }}
        >
          <CalendarDays size={13} strokeWidth={1.8} className="text-brand" />
          {dateLabel}
          <input
            type="date"
            aria-label="Pick a date"
            value={dateKey}
            min={restrictPast ? todayKey : undefined}
            onChange={(e) => {
              if (e.target.value) onDateKey(e.target.value)
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>
      <div className={`relative mt-3 ${cardCls}`} style={cardStyle}>
        {/* date strip */}
        <div className="px-3.5 pt-3.5 pb-2.5">
          <div className="hscroll gap-1.5">
            {dateDays.map((d) => {
              const on = d.key === dateKey
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => onDateKey(d.key)}
                  className="flex min-w-[46px] shrink-0 cursor-pointer flex-col items-center gap-0.5 rounded-[14px] px-1.5 pt-2 pb-2.5"
                  style={{
                    border: on ? '1.5px solid var(--color-brand)' : '1px solid transparent',
                    background: on ? 'var(--color-brand)' : 'transparent',
                    color: on ? 'var(--color-text-onbrand)' : 'var(--color-text)',
                  }}
                >
                  <span className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ opacity: on ? 0.7 : 0.55 }}>
                    {d.label}
                  </span>
                  <span className="font-display text-[20px] leading-none nums-tabular">{d.day}</span>
                </button>
              )
            })}
          </div>
        </div>
        {/* duration — picked first; sits between Date and the time fields and
            drives the derived End time */}
        <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: hairline }}>
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
                    style={{ borderColor: hairline, boxShadow: '0 18px 40px -14px rgba(26,26,26,0.45)' }}
                  >
                    <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--color-text-muted)' }}>
                      Custom duration
                    </div>
                    <div className="flex items-center gap-2.5 rounded-md px-3 py-2" style={{ border: '1px solid rgba(26,26,26,0.18)' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        value={customDur}
                        onChange={(e) => setCustomDur(e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && parseInt(customDur, 10) > 0) {
                            setDuration(parseInt(customDur, 10))
                            setShowDur(false)
                            setCustomDur('')
                          }
                        }}
                        placeholder={String(duration)}
                        className="num min-w-0 flex-1 border-none bg-transparent p-0 font-display text-[26px] leading-none text-ink outline-none"
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
        {/* starts (typeable 24h) / ends (auto = start + duration) */}
        <div className="grid border-t" style={{ gridTemplateColumns: '1fr 1px 1fr', borderColor: hairline }}>
          <TimeField label="Starts" value={startTime} onCommit={handleStart} />
          <div style={{ background: hairline }} />
          <EndField label="Ends" value={endTime} />
        </div>
      </div>
    </>
  )
}
