import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, MapPin, Plus, Search, X } from 'lucide-react'
import { Toggle } from '@/components/controls'
import { venuesForSport } from '@/lib/mock/venues'
import type { Sport, Venue, VenueSetting } from '@/lib/types'

/** Venue / court picker bottom sheet (create-match-shared.jsx VenuePicker).
 *  Court sports: search · setting chips · curated Doha list · custom fallback,
 *  with court # as a separate optional field (CLAUDE.md §5).
 *  Running: no fixed venues — drops straight into the route form
 *  (start/meetup point · round trip · finish point · optional distance). */

export interface VenueSelection {
  id: string // venue id | 'custom' | 'route'
  name: string
  area: string
  setting: VenueSetting | ''
  court: string
  endName?: string
  loop?: boolean
  km?: number | ''
}

function SettingPill({ setting }: { setting: VenueSetting | '' }) {
  if (!setting) return null
  const indoor = /indoor/i.test(setting)
  return (
    <span
      className="inline-flex shrink-0 items-center gap-[5px] rounded-pill px-[9px] py-[3px] text-[10.5px] font-semibold tracking-[0.02em]"
      style={{
        background: indoor ? 'rgba(26,26,26,0.05)' : 'transparent',
        border: `1px solid ${indoor ? 'transparent' : 'rgba(26,26,26,0.18)'}`,
        color: indoor ? 'var(--color-text)' : 'var(--color-text-muted)',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: indoor ? 2 : '50%', background: indoor ? 'var(--color-brand)' : 'var(--color-text-muted)' }} />
      {setting}
    </span>
  )
}

const fieldCls = 'w-full rounded-md border bg-card px-3.5 py-[11px] text-[14px] text-ink outline-none'
const fieldStyle = { borderColor: 'rgba(26,26,26,0.18)' }

export function VenuePicker({
  sport,
  current,
  onClose,
  onSelect,
}: {
  sport: Sport
  current: VenueSelection | null
  onClose: () => void
  onSelect: (v: VenueSelection) => void
}) {
  const sportVenues = useMemo(() => venuesForSport(sport), [sport])
  const hasFixed = sportVenues.length > 0 // running → no fixed courts

  const [query, setQuery] = useState('')
  const [setF, setSetF] = useState('all')
  const [picked, setPicked] = useState<string | null>(hasFixed && current && current.id !== 'custom' && current.id !== 'route' ? current.id : null)
  const [court, setCourt] = useState(hasFixed && current?.court ? current.court : '')
  const [customMode, setCustomMode] = useState(!hasFixed || current?.id === 'custom')
  const [endName, setEndName] = useState(current?.endName ?? '')
  const [loop, setLoop] = useState(current?.loop ?? false)
  const [km, setKm] = useState(current?.km ? String(current.km) : '')
  const [customName, setCustomName] = useState(current && (current.id === 'custom' || current.id === 'route') ? current.name : '')
  const [customArea, setCustomArea] = useState(current?.id === 'custom' ? current.area : '')

  const availSettings = ['indoor', 'outdoor', 'rooftop'].filter((s) => sportVenues.some((v) => v.setting.toLowerCase().includes(s)))

  const list = useMemo(
    () =>
      sportVenues
        .filter((v) => setF === 'all' || v.setting.toLowerCase().includes(setF))
        .filter((v) => !query.trim() || `${v.name} ${v.area}`.toLowerCase().includes(query.toLowerCase())),
    [sportVenues, setF, query],
  )

  const canConfirm = customMode
    ? hasFixed
      ? customName.trim().length > 0
      : customName.trim().length > 0 && (loop || endName.trim().length > 0)
    : picked != null

  const confirm = () => {
    if (!canConfirm) return
    if (customMode) {
      if (!hasFixed) {
        const start = customName.trim()
        const dist = parseFloat(km)
        onSelect({ id: 'route', name: start, endName: loop ? start : endName.trim(), loop, km: !isNaN(dist) && dist > 0 ? dist : '', area: '', setting: '', court: '' })
      } else {
        onSelect({ id: 'custom', name: customName.trim(), area: customArea.trim(), setting: '', court: court.trim() })
      }
    } else {
      const v = sportVenues.find((x) => x.id === picked) as Venue
      onSelect({ id: v.id, name: v.name, area: v.area, setting: v.setting, court: court.trim() })
    }
  }

  return (
    <div onClick={onClose} className="absolute inset-0 z-45 flex items-end justify-center backdrop-blur-[2px]" style={{ background: 'rgba(26,26,26,0.45)' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90%] w-full flex-col rounded-t-xl bg-page"
        style={{ boxShadow: '0 -24px 60px -24px rgba(26,26,26,0.6)' }}
      >
        {/* grab handle */}
        <div className="flex justify-center pt-2.5">
          <div className="h-1 w-[38px] rounded-pill" style={{ background: 'rgba(26,26,26,0.18)' }} />
        </div>

        {/* header */}
        <div className="flex items-start gap-3 px-[22px] pt-3 pb-3.5">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
              {sport} in Doha
            </div>
            <h2 className="m-0 font-display text-[28px] font-normal leading-none" style={{ letterSpacing: '-0.015em' }}>
              Choose a <span className="italic text-brand">location</span>.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none text-ink"
            style={{ background: 'rgba(26,26,26,0.06)' }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {hasFixed && !customMode && (
          <div className="flex flex-col gap-2.5 px-[22px] pb-3">
            {/* search */}
            <div className="relative flex items-center">
              <Search size={16} strokeWidth={2} className="absolute start-[13px]" style={{ color: 'var(--color-text-muted)' }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search venue or area…" className={`${fieldCls} ps-10`} style={fieldStyle} />
            </div>
            {/* setting chips */}
            {availSettings.length > 1 && (
              <div className="scroll-area flex gap-[7px] overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {[['all', 'All'], ...availSettings.map((s) => [s, s[0].toUpperCase() + s.slice(1)])].map(([val, label]) => {
                  const on = setF === val
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSetF(val)}
                      className="shrink-0 cursor-pointer rounded-pill px-3.5 py-[7px] text-[12px] font-medium"
                      style={{
                        border: `1.5px solid ${on ? 'var(--color-brand)' : 'rgba(26,26,26,0.18)'}`,
                        background: on ? 'var(--color-brand)' : 'transparent',
                        color: on ? 'var(--color-text-onbrand)' : 'var(--color-text)',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* body */}
        <div className="scroll-area flex-1 overflow-y-auto px-3.5 pt-0.5 pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {customMode ? (
            !hasFixed ? (
              /* running: plot a route */
              <div className="flex flex-col gap-4 px-2 pt-1.5 pb-1">
                <p className="m-0 mt-0.5 text-[13px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Running matches don't use a court — set where you meet and where you finish.
                </p>
                <div>
                  <label className="mb-[7px] flex items-center gap-[7px] text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="h-2 w-2 rounded-full bg-brand" /> Start / meetup point
                  </label>
                  <input autoFocus value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Corniche — by the clock tower" className={fieldCls} style={fieldStyle} />
                </div>

                <div className="flex items-center gap-3 rounded-md border bg-card px-3.5 py-[11px]" style={{ borderColor: 'rgba(26,26,26,0.10)' }}>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-ink">Round trip</div>
                    <div className="mt-px text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      Finish back where you started.
                    </div>
                  </div>
                  <Toggle value={loop} onChange={setLoop} />
                </div>

                {!loop && (
                  <div>
                    <label className="mb-[7px] flex items-center gap-[7px] text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
                      <span className="box-border h-2 w-2 rounded-full" style={{ border: '1.5px solid rgba(26,26,26,0.18)' }} /> Finish point
                    </label>
                    <input value={endName} onChange={(e) => setEndName(e.target.value)} placeholder="e.g. Aspire Park — Gate 3" className={fieldCls} style={fieldStyle} />
                  </div>
                )}

                {/* distance */}
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-ink">Distance</div>
                    <div className="mt-px text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      Roughly how far is the run? Optional.
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3.5 py-1.5" style={{ borderColor: 'rgba(26,26,26,0.10)' }}>
                    <input
                      value={km}
                      onChange={(e) => setKm(e.target.value)}
                      placeholder="—"
                      inputMode="decimal"
                      className="w-12 border-none bg-transparent p-0 text-center font-display text-[24px] leading-none text-ink outline-none"
                    />
                    <span className="text-[12.5px] font-semibold tracking-[0.04em]" style={{ color: 'var(--color-text-muted)' }}>
                      km
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* court sports: custom venue */
              <div className="flex flex-col gap-3.5 px-2 pt-1.5 pb-1">
                <div>
                  <label className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
                    Venue name
                  </label>
                  <input autoFocus value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. The Pearl rooftop court" className={fieldCls} style={fieldStyle} />
                </div>
                <div>
                  <label className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
                    Area / district <span className="font-normal normal-case tracking-normal">(optional)</span>
                  </label>
                  <input value={customArea} onChange={(e) => setCustomArea(e.target.value)} placeholder="e.g. The Pearl-Qatar" className={fieldCls} style={fieldStyle} />
                </div>
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="-mt-0.5 inline-flex cursor-pointer items-center gap-1.5 self-start border-none bg-transparent px-0.5 py-1 text-[12.5px] font-medium text-brand"
                >
                  <ArrowLeft size={14} strokeWidth={2} className="rtl:rotate-180" /> Back to venue list
                </button>
              </div>
            )
          ) : (
            <div className="flex flex-col">
              {list.length === 0 && (
                <div className="px-4 py-6 text-center text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                  No venues match “{query}”.
                </div>
              )}
              {list.map((v) => {
                const on = picked === v.id
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setPicked(v.id)}
                    className="mb-1 flex w-full cursor-pointer items-center gap-3 rounded-[16px] px-3.5 py-[13px] text-start"
                    style={{
                      background: on ? 'var(--surface-card)' : 'transparent',
                      border: `1.5px solid ${on ? 'var(--color-brand)' : 'transparent'}`,
                      boxShadow: on ? '0 8px 22px -14px rgba(26,26,26,0.5)' : 'none',
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-medium text-ink">{v.name}</span>
                      <span className="mt-[5px] flex items-center gap-2">
                        <span className="inline-flex min-w-0 items-center gap-1 truncate text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                          <MapPin size={12} strokeWidth={1.8} className="shrink-0" /> {v.area}
                        </span>
                        <SettingPill setting={v.setting} />
                      </span>
                    </span>
                    <span
                      className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-onbrand"
                      style={{ border: on ? 'none' : '1.5px solid rgba(26,26,26,0.18)', background: on ? 'var(--color-brand)' : 'transparent' }}
                    >
                      {on && <Check size={12} strokeWidth={3} />}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex flex-col gap-3 border-t bg-page px-[22px] pt-3 pb-[22px]" style={{ borderColor: 'rgba(26,26,26,0.10)' }}>
          {!customMode && hasFixed && (
            <button
              type="button"
              onClick={() => {
                setCustomMode(true)
                setPicked(null)
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-md bg-transparent px-3.5 py-[11px] text-[13px] font-medium text-ink"
              style={{ border: '1px dashed rgba(26,26,26,0.18)' }}
            >
              <Plus size={14} strokeWidth={2.2} className="text-brand" />
              Can't find it? Add a custom venue
            </button>
          )}

          {hasFixed && (picked != null || customMode) && (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-ink">Court number</div>
                <div className="mt-px text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  Optional — add later if unsure
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3.5 py-1.5" style={{ borderColor: 'rgba(26,26,26,0.10)' }}>
                <span className="text-[11.5px] font-semibold tracking-[0.04em]" style={{ color: 'var(--color-text-muted)' }}>
                  Court
                </span>
                <input
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                  placeholder="—"
                  inputMode="numeric"
                  className="w-[46px] border-none bg-transparent p-0 text-center font-display text-[24px] leading-none text-ink outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-pill border-none text-[15px] font-semibold tracking-[0.01em]"
            style={{
              background: canConfirm ? 'var(--color-brand)' : 'rgba(26,26,26,0.15)',
              color: canConfirm ? 'var(--color-text-onbrand)' : 'rgba(26,26,26,0.4)',
              cursor: canConfirm ? 'pointer' : 'not-allowed',
              boxShadow: canConfirm ? '0 12px 28px -10px var(--color-brand)' : 'none',
            }}
          >
            {hasFixed ? 'Use this venue' : 'Use this route'} {canConfirm && <ArrowRight size={14} strokeWidth={2} className="rtl:rotate-180" />}
          </button>
        </div>
      </div>
    </div>
  )
}
