import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Eyebrow } from '@/components/Eyebrow'
import { CTA } from '@/components/controls'
import { useToast } from '@/components/Toast'
import { actions, currentUserId, getUser, useDB } from '@/lib/store'
import { ratingToSkillLevel, skillLevelToRating, writeProfileSports, type SportLevel } from '@/lib/profile'
import { SportsLevelSection } from './SportsLevelSection'

/** Edit Player Profile (form version) — save-then-route: Save → Home + toast
 *  (CLAUDE.md §4). Trust signals (no-shows, stats) are not editable —
 *  public-by-default is the trust mechanism. Sports & level lets players add
 *  multiple sports and self-rate each one (see SportsLevelSection); on save the
 *  primary (first) sport + level is written to the schema's single fields via
 *  actions.updateProfile so every screen reflects it. */

const fieldCls = 'w-full rounded-md border bg-card px-3.5 py-[11px] text-[14px] text-ink outline-none'
const fieldStyle = { borderColor: 'rgba(26,26,26,0.18)' }

export function EditProfileScreen() {
  const db = useDB()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const me = getUser(db, currentUserId)!

  const [name, setName] = useState(me.name)
  const [bio, setBio] = useState(me.bio ?? '')
  const [area, setArea] = useState(me.area ?? '')
  const [sportLevels, setSportLevels] = useState<SportLevel[]>([{ sport: me.sport, level: skillLevelToRating(me.skill_level) }])
  const [dirty, setDirty] = useState(false)

  const updateSportLevels = (next: SportLevel[]) => {
    setSportLevels(next)
    setDirty(true)
  }

  // a "complete" profile needs a name plus at least one sport with a level
  const canSave = !!name.trim() && sportLevels.length > 0

  const save = () => {
    if (!canSave) return
    // Persist the primary (first) sport + level onto the single-sport schema so
    // every screen that reads the current user reflects it; keep the full list
    // saved too. Mark setup complete so the first-timer card disappears (§4).
    const primary = sportLevels[0]
    actions.updateProfile({
      name: name.trim(),
      bio: bio.trim(),
      area: area.trim(),
      sport: primary.sport,
      skill_level: ratingToSkillLevel(primary.level),
    })
    writeProfileSports(sportLevels)
    actions.completeProfile()
    showToast('Profile saved')
    navigate('/home')
  }

  return (
    <Shell nav={false}>
      <div className="flex h-full flex-col">
        <div className="scroll-area relative z-1 flex-1 overflow-y-auto px-[22px] pt-14 pb-[120px]">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="mb-2 inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border-none text-ink"
            style={{ background: 'rgba(26,26,26,0.05)' }}
          >
            <ChevronLeft size={18} strokeWidth={2} className="rtl:rotate-180" />
          </button>

          <div className="pt-2 pb-[22px]">
            <h1 className="m-0 font-display text-[36px] font-normal leading-none" style={{ letterSpacing: '-0.022em' }}>
              Edit <span className="italic text-brand">your profile</span>.
            </h1>
          </div>

          <Eyebrow accent="var(--color-brand)">Identity</Eyebrow>
          <div className="mt-3 mb-6 flex flex-col gap-3.5 rounded-[22px] border bg-card p-[18px]" style={{ borderColor: 'rgba(26,26,26,0.10)' }}>
            <div>
              <label className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
                Name
              </label>
              <input value={name} onChange={(e) => { setName(e.target.value); setDirty(true) }} className={fieldCls} style={fieldStyle} />
            </div>
            <div>
              <label className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => { setBio(e.target.value.slice(0, 160)); setDirty(true) }}
                rows={3}
                placeholder="A line or two about how you play…"
                className={`${fieldCls} resize-none`}
                style={fieldStyle}
              />
              <div className="mt-1 flex justify-end text-[11px] nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
                {bio.length}/160
              </div>
            </div>
            <div>
              <label className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
                Area
              </label>
              <input value={area} onChange={(e) => { setArea(e.target.value); setDirty(true) }} placeholder="e.g. Al Waab" className={fieldCls} style={fieldStyle} />
            </div>
          </div>

          <SportsLevelSection value={sportLevels} onChange={updateSportLevels} />

          <p className="mt-5 mb-0 text-center text-[11.5px] leading-[1.5]" style={{ color: 'var(--color-text-muted)' }}>
            Stats, attendance and no-shows aren't editable — they're what makes profiles trustworthy.
          </p>
        </div>

        {/* sticky save */}
        <div
          className="absolute inset-x-0 bottom-0 z-5 px-[22px] pt-4 pb-[22px]"
          style={{ background: 'linear-gradient(180deg, transparent, var(--surface-page) 30%)' }}
        >
          {dirty && (
            <div className="mb-2 flex items-center justify-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
              <span className="h-[5px] w-[5px] rounded-full bg-brand" />
              Unsaved changes
            </div>
          )}
          <CTA disabled={!canSave || !dirty} onClick={save}>Save changes</CTA>
        </div>
      </div>
    </Shell>
  )
}
