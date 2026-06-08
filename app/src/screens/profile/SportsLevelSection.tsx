import { useState, type ReactNode } from 'react'
import { Check, ChevronDown, Circle, CircleDot, Feather, Footprints, Plus, X } from 'lucide-react'
import { Eyebrow } from '@/components/Eyebrow'
import type { Sport } from '@/lib/types'
import { SKILL_RATINGS, type SkillRating, type SportLevel } from '@/lib/profile'

/** Sports & level — players manage which sports they play and self-rate a skill
 *  level for each. One terracotta accent, warm-neutral cards, two bottom sheets
 *  (sport picker → level picker). Self-contained & controlled: the parent owns
 *  the list and is notified on every add / remove / level change so it can mark
 *  the form dirty. */

const SPORTS: { id: Sport; label: string; icon: typeof Circle }[] = [
  { id: 'padel', label: 'Padel', icon: CircleDot },
  { id: 'tennis', label: 'Tennis', icon: Circle },
  { id: 'badminton', label: 'Badminton', icon: Feather },
  { id: 'running', label: 'Running', icon: Footprints },
]

const SUBTITLE: Record<SkillRating, string> = {
  Casual: 'Just here for fun.',
  Beginner: 'Learning the ropes.',
  Intermediate: 'Comfortable in a rally.',
  Advanced: 'Competitive & consistent.',
}

const iconFor = (s: Sport) => SPORTS.find((x) => x.id === s)!.icon
const labelFor = (s: Sport) => SPORTS.find((x) => x.id === s)!.label
const hairline = 'rgba(26,26,26,0.10)'

/* ── Bottom-sheet shell ────────────────────────────────────────────── */
function Sheet({ title, subtitle, onClose, children }: { title: ReactNode; subtitle: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      onClick={onClose}
      className="conn-fade-in absolute inset-0 z-45 flex items-end justify-center backdrop-blur-[2px]"
      style={{ background: 'rgba(26,26,26,0.45)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="conn-sheet-in flex max-h-[88%] w-full flex-col rounded-t-xl bg-page"
        style={{ boxShadow: '0 -24px 60px -24px rgba(26,26,26,0.6)' }}
      >
        <div className="flex justify-center pt-2.5">
          <div className="h-1 w-[38px] rounded-pill" style={{ background: 'rgba(26,26,26,0.18)' }} />
        </div>
        <div className="flex items-start gap-3 px-[22px] pt-3 pb-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="m-0 font-display text-[28px] font-normal leading-none" style={{ letterSpacing: '-0.015em' }}>
              {title}
            </h2>
            <div className="mt-1.5 text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
              {subtitle}
            </div>
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
        <div className="flex-1 overflow-y-auto px-[22px] pt-1 pb-[26px]" style={{ scrollbarWidth: 'none' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function SportsLevelSection({ value, onChange }: { value: SportLevel[]; onChange: (next: SportLevel[]) => void }) {
  const [showSportPicker, setShowSportPicker] = useState(false)
  // level sheet doubles for both "new" (finalize a just-picked sport) and "edit"
  const [levelSheet, setLevelSheet] = useState<{ mode: 'new' | 'edit'; sport: Sport; current?: SkillRating } | null>(null)

  const total = SPORTS.length
  const available = SPORTS.filter((s) => !value.some((v) => v.sport === s.id))

  const removeSport = (sport: Sport) => onChange(value.filter((v) => v.sport !== sport))
  const setLevel = (sport: Sport, level: SkillRating, mode: 'new' | 'edit') => {
    if (mode === 'new') onChange([...value, { sport, level }])
    else onChange(value.map((v) => (v.sport === sport ? { ...v, level } : v)))
    setLevelSheet(null)
  }

  return (
    <div>
      {/* header — eyebrow + count */}
      <div className="flex items-center justify-between">
        <Eyebrow accent="var(--color-brand)">Sports &amp; level</Eyebrow>
        <span className="text-[11px] font-medium nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
          <span className="font-bold text-brand">{value.length}</span>/{total}
        </span>
      </div>

      {/* sport rows */}
      <div className="mt-3 flex flex-col gap-2">
        {value.map((row) => {
          const Icon = iconFor(row.sport)
          return (
            <div
              key={row.sport}
              className="flex items-center gap-3 rounded-[16px] border bg-card p-3.5"
              style={{ borderColor: hairline }}
            >
              <span
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(26,26,26,0.05)', color: 'var(--color-text)' }}
              >
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{labelFor(row.sport)}</span>
              {/* level pill — opens the level picker in edit mode */}
              <button
                type="button"
                onClick={() => setLevelSheet({ mode: 'edit', sport: row.sport, current: row.level })}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-pill bg-ink/[0.05] px-3 py-2 text-[12.5px] font-medium text-ink transition-colors hover:bg-ink/10"
              >
                <span className="h-[5px] w-[5px] rounded-full bg-brand" />
                {row.level}
                <ChevronDown size={13} strokeWidth={2.2} style={{ color: 'var(--color-text-muted)' }} />
              </button>
              {/* remove */}
              <button
                type="button"
                onClick={() => removeSport(row.sport)}
                aria-label={`Remove ${labelFor(row.sport)}`}
                className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-ink/40 transition-colors hover:bg-[rgba(162,59,44,0.1)] hover:text-[#a23b2c]"
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>
          )
        })}

        {/* add a sport */}
        {available.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSportPicker(true)}
            className="mt-0.5 inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[16px] border-2 border-dashed bg-transparent py-3.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-ink/[0.02]"
            style={{ borderColor: 'rgba(26,26,26,0.18)' }}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-onbrand" style={{ background: 'var(--color-brand)' }}>
              <Plus size={14} strokeWidth={2.4} />
            </span>
            Add a sport
          </button>
        )}
      </div>

      {/* sport picker */}
      {showSportPicker && (
        <Sheet
          title={
            <>
              Add a <span className="italic text-brand">sport</span>.
            </>
          }
          subtitle="Pick a sport — you'll set your level next."
          onClose={() => setShowSportPicker(false)}
        >
          {available.length === 0 ? (
            <div className="py-8 text-center text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
              You've added every sport. Nice.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {available.map((s) => {
                const Icon = s.icon
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setShowSportPicker(false)
                      setLevelSheet({ mode: 'new', sport: s.id })
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-[16px] border bg-card p-3.5 text-start transition-colors hover:bg-ink/[0.02]"
                    style={{ borderColor: hairline }}
                  >
                    <span
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: 'rgba(26,26,26,0.05)', color: 'var(--color-text)' }}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1 text-[15px] font-semibold text-ink">{s.label}</span>
                    <Plus size={16} strokeWidth={2.2} className="shrink-0 text-brand" />
                  </button>
                )
              })}
            </div>
          )}
        </Sheet>
      )}

      {/* level picker (new + edit) */}
      {levelSheet && (
        <Sheet
          title={
            levelSheet.mode === 'new' ? (
              <>
                Set your <span className="italic text-brand">level</span>.
              </>
            ) : (
              <>
                Change <span className="italic text-brand">level</span>.
              </>
            )
          }
          subtitle={`How do you play ${labelFor(levelSheet.sport)}?`}
          onClose={() => setLevelSheet(null)}
        >
          <div className="flex flex-col gap-2">
            {SKILL_RATINGS.map((lvl) => {
              const on = levelSheet.current === lvl
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(levelSheet.sport, lvl, levelSheet.mode)}
                  className="flex cursor-pointer items-center gap-3 rounded-[16px] border bg-card p-3.5 text-start transition-colors hover:bg-ink/[0.02]"
                  style={{
                    borderColor: on ? 'var(--color-brand)' : hairline,
                    background: on ? 'rgba(199,106,72,0.08)' : 'var(--surface-card)',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-ink">{lvl}</div>
                    <div className="mt-0.5 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                      {SUBTITLE[lvl]}
                    </div>
                  </div>
                  {on && (
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-onbrand" style={{ background: 'var(--color-brand)' }}>
                      <Check size={14} strokeWidth={2.6} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </Sheet>
      )}
    </div>
  )
}
