import type { ReactNode } from 'react'

/** Shared form controls — ported from create-match-shared.jsx. */

export function Segmented<T extends string | boolean>({
  value,
  options,
  onChange,
}: {
  value: T | null
  options: { value: T; label: string; icon?: ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="grid gap-0.5 rounded-md p-[3px]" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)`, background: 'rgba(26,26,26,0.06)' }}>
      {options.map((opt) => {
        const on = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border-none px-2 py-2.5 text-[12.5px] font-semibold tracking-[0.01em] transition-all"
            style={{
              background: on ? 'var(--color-brand)' : 'transparent',
              color: on ? 'var(--color-text-onbrand)' : 'var(--color-text-muted)',
            }}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className="relative h-[26px] w-11 shrink-0 cursor-pointer rounded-pill border-none p-0 transition-colors"
      style={{ background: value ? 'var(--color-brand)' : 'rgba(26,26,26,0.18)' }}
    >
      <span
        className="absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white transition-all"
        style={{ insetInlineStart: value ? 20 : 2, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
      />
    </button>
  )
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  ticks,
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  ticks?: string[]
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex h-7 items-center">
        <div className="absolute inset-x-0 h-1 rounded-pill" style={{ background: 'rgba(26,26,26,0.10)' }} />
        <div className="absolute h-1 rounded-pill bg-brand" style={{ insetInlineStart: 0, width: `${pct}%` }} />
        <div
          className="absolute h-[22px] w-[22px] rounded-full border-2 border-brand bg-white"
          style={{ insetInlineStart: `calc(${pct}% - 11px)`, boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 m-0 w-full cursor-pointer opacity-0"
        />
      </div>
      {ticks && (
        <div className="flex justify-between text-[10px] font-medium tracking-[0.05em] nums-tabular" style={{ color: 'rgba(26,26,26,0.4)' }}>
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export function DualSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  ticks,
}: {
  value: [number, number]
  min: number
  max: number
  step?: number
  onChange: (v: [number, number]) => void
  ticks?: string[]
}) {
  const [lo, hi] = value
  const loPct = ((lo - min) / (max - min)) * 100
  const hiPct = ((hi - min) / (max - min)) * 100
  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative flex h-7 items-center">
        <div className="absolute inset-x-0 h-1 rounded-pill" style={{ background: 'rgba(26,26,26,0.10)' }} />
        <div className="absolute h-1 rounded-pill bg-brand" style={{ insetInlineStart: `${loPct}%`, width: `${hiPct - loPct}%` }} />
        {[loPct, hiPct].map((p, i) => (
          <div
            key={i}
            className="absolute h-[22px] w-[22px] rounded-full border-2 border-brand bg-white"
            style={{ insetInlineStart: `calc(${p}% - 11px)`, boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }}
          />
        ))}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => onChange([Math.min(parseFloat(e.target.value), hi), hi])}
          className="absolute inset-0 m-0 w-full cursor-pointer opacity-0"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => onChange([lo, Math.max(parseFloat(e.target.value), lo)])}
          className="absolute inset-0 m-0 w-full cursor-pointer opacity-0"
        />
      </div>
      {ticks && (
        <div className="flex justify-between text-[10px] font-medium tracking-[0.05em]" style={{ color: 'rgba(26,26,26,0.4)' }}>
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

/** avatar dots for the player-count picker — first dot is you */
export function PlayerDots({ filled = 1, total = 4, size = 26 }: { filled?: number; total?: number; size?: number }) {
  const initials = ['You', 'JK', 'RP', 'LB', 'ST', 'NV', 'HD', 'OM']
  return (
    <div className="inline-flex items-center">
      {Array.from({ length: total }, (_, i) => {
        const isFilled = i < filled
        return (
          <div
            key={i}
            className="inline-flex items-center justify-center rounded-full font-semibold tracking-[0.02em]"
            style={{
              width: size,
              height: size,
              marginInlineStart: i ? -6 : 0,
              fontSize: size <= 22 ? 8 : 9.5,
              background: isFilled ? (i === 0 ? 'var(--color-brand)' : 'rgba(26,26,26,0.10)') : 'transparent',
              color: i === 0 ? 'var(--color-text-onbrand)' : 'var(--color-text)',
              border: isFilled ? 'none' : '1.5px dashed rgba(26,26,26,0.28)',
              boxShadow: isFilled ? '0 0 0 2px var(--surface-page)' : 'none',
            }}
          >
            {isFilled ? initials[i] : '+'}
          </div>
        )
      })}
    </div>
  )
}

/** primary CTA pill */
export function CTA({ children, onClick, disabled = false, big = true }: { children: ReactNode; onClick?: () => void; disabled?: boolean; big?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-pill border-none px-[22px] font-semibold tracking-[0.01em] transition-transform"
      style={{
        height: big ? 54 : 44,
        fontSize: big ? 15.5 : 13.5,
        background: disabled ? 'rgba(26,26,26,0.15)' : 'var(--color-brand)',
        color: disabled ? 'rgba(26,26,26,0.4)' : 'var(--color-text-onbrand)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '0 12px 28px -10px var(--color-brand)',
      }}
    >
      {children}
    </button>
  )
}

/** tiny decorative Doha map (create-match-shared.jsx MiniMap) */
export function MiniMap({ height = 140 }: { height?: number }) {
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', width: '100%', height }}>
      <defs>
        <linearGradient id="mm-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ece6da" />
          <stop offset="100%" stopColor="#e2dcd0" />
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill="url(#mm-bg)" />
      <path d="M0 130 Q100 110 200 130 T420 150 L420 200 L0 200 Z" fill="#d4dac8" opacity=".55" />
      <ellipse cx="320" cy="60" rx="80" ry="40" fill="#cfd9c4" opacity=".5" />
      <g stroke="#F4F0E8" strokeWidth="5" fill="none" strokeLinecap="round">
        <path d="M-20 90 L420 80" />
        <path d="M140 -20 L130 230" />
        <path d="M280 -20 L295 230" />
      </g>
      <g stroke="#F4F0E8" strokeWidth="2" fill="none" opacity=".75">
        <path d="M-20 40 L420 50" />
        <path d="M60 -20 L70 230" />
        <path d="M340 -20 L355 230" />
      </g>
      <g transform="translate(200 100)">
        <circle r="22" fill="var(--color-accent)" opacity=".18" />
        <circle r="13" fill="var(--color-text)" />
        <circle r="13" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" />
        <circle r="4" fill="var(--color-accent)" />
      </g>
      <g transform="translate(95 75)">
        <circle r="9" fill="var(--color-text)" />
        <circle r="9" fill="none" stroke="#F4F0E8" strokeWidth="1.5" />
        <circle r="2.5" fill="#F4F0E8" />
      </g>
      <g transform="translate(310 140)">
        <circle r="9" fill="var(--color-text)" />
        <circle r="9" fill="none" stroke="#F4F0E8" strokeWidth="1.5" />
        <circle r="2.5" fill="#F4F0E8" />
      </g>
    </svg>
  )
}
