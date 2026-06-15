import { SKILL_TIERS, skillOrd, type SkillTier } from '@/lib/types'
import { useI18n } from '@/i18n'

/**
 * Discrete, TAP-ONLY skill selector over the canonical ordered tiers
 * (`SKILL_TIERS` — the same set behind `skill_min`/`skill_max`; no invented
 * levels). No dragging, no double-tap — every interaction is a single tap on a
 * stop. State machine:
 *
 *   nothing selected → tap a level        ⇒ that single level (min == max)
 *   single + tap the same level           ⇒ no change (stays single)
 *   single + tap a different level         ⇒ range [min, max] (auto-ordered)
 *   range  + tap any level                 ⇒ collapse to that single level
 *
 * So: first tap sets a level, a second different tap makes a range, and tapping
 * a stop while a range is showing drops back to that one level (tapping a start
 * or end collapses to that endpoint).
 *
 * Each stop is a real <button>, so it's keyboard-accessible for free (Tab to a
 * stop, Enter/Space taps it) with 44px touch targets. RTL: positions use
 * `insetInlineStart`, so the track mirrors in Arabic; labels localize via
 * `t('skill.<tier>')`; numerals stay LTR. Tokens only (§3): faint track,
 * `--color-brand` selected segment + in-range stop dots, pill endpoint handles.
 *
 * `singleOnly` constrains every tap to a single level (e.g. a sign-up step).
 */

const N = SKILL_TIERS.length // 7 ordered stops

export function SkillRangeSlider({
  min,
  max,
  onChange,
  singleOnly = false,
}: {
  min: SkillTier | null
  max: SkillTier | null
  onChange: (min: SkillTier, max: SkillTier) => void
  singleOnly?: boolean
}) {
  const { t } = useI18n()
  const lo = min ? skillOrd(min) : -1
  const hi = max ? skillOrd(max) : -1
  const hasSel = lo >= 0 && hi >= 0
  const isSingle = hasSel && lo === hi
  const label = (i: number) => t(`skill.${SKILL_TIERS[i]}`)
  const pctOf = (i: number) => (i / (N - 1)) * 100

  const tap = (i: number) => {
    if (singleOnly || !hasSel) {
      onChange(SKILL_TIERS[i], SKILL_TIERS[i]) // nothing selected → single
      return
    }
    if (lo === hi) {
      if (i === lo) return // tapped the same single level → stays single
      onChange(SKILL_TIERS[Math.min(lo, i)], SKILL_TIERS[Math.max(lo, i)]) // → range
      return
    }
    onChange(SKILL_TIERS[i], SKILL_TIERS[i]) // range → collapse to the tapped level
  }

  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Skill level">
      <div className="relative flex h-11 items-center">
        {/* faint full track */}
        <div className="absolute inset-x-0 h-1 rounded-pill" style={{ background: 'rgba(26,26,26,0.10)' }} />
        {/* selected range fill (single level shows just the highlighted stop, no segment) */}
        {hasSel && !isSingle && (
          <div
            className="absolute h-1 rounded-pill"
            style={{ background: 'var(--color-brand)', insetInlineStart: `${pctOf(lo)}%`, width: `${pctOf(hi) - pctOf(lo)}%` }}
          />
        )}
        {/* one tappable stop per tier — 44px hit area, visual dot/handle inside */}
        {SKILL_TIERS.map((tier, i) => {
          const inRange = i >= lo && i <= hi
          const isEnd = hasSel && (i === lo || i === hi)
          return (
            <button
              key={tier}
              type="button"
              aria-label={label(i)}
              aria-pressed={inRange}
              onClick={() => tap(i)}
              className="absolute flex h-11 w-11 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-transparent rtl:translate-x-1/2"
              style={{ insetInlineStart: `${pctOf(i)}%` }}
            >
              {isEnd ? (
                <span
                  className="h-[22px] w-[22px] rounded-pill border-2 bg-white"
                  style={{ borderColor: 'var(--color-brand)', boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }}
                />
              ) : (
                <span
                  className="h-[8px] w-[8px] rounded-full"
                  style={{ background: inRange ? 'var(--color-brand)' : 'rgba(26,26,26,0.20)' }}
                />
              )}
            </button>
          )
        })}
      </div>
      {/* level labels — in-range ink, others muted */}
      <div className="flex justify-between text-[10px] font-medium tracking-[0.04em]">
        {SKILL_TIERS.map((tier, i) => {
          const inRange = i >= lo && i <= hi
          return (
            <span key={tier} style={{ color: inRange ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: inRange ? 600 : 500 }}>
              {label(i)}
            </span>
          )
        })}
      </div>
    </div>
  )
}
