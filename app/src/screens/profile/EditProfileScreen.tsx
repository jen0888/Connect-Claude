import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Eyebrow } from '@/components/Eyebrow'
import { CTA, Segmented } from '@/components/controls'
import { useToast } from '@/components/Toast'
import { useI18n } from '@/i18n'
import { actions, currentUserId, getUser, useDB } from '@/lib/store'
import { ratingToSkillLevel, readProfileSports, skillLevelToRating, writeProfileSports, type SportLevel } from '@/lib/profile'
import { QATAR_CITIES, areasFor } from '@/lib/locations'
import type { Gender } from '@/lib/types'
import { SportsLevelSection } from './SportsLevelSection'

/** Edit Player Profile (form version) — save-then-route: Save → Settings + toast
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
  const { t } = useI18n()
  const me = getUser(db, currentUserId)!

  // The schema stores a single `name`; the UI splits it into first + last
  // (first word = first name, remainder = last name) and recombines on save so
  // every surface that does `name.split(' ')` keeps rendering correctly.
  const [firstWord, ...restWords] = me.name.split(' ')
  const [firstName, setFirstName] = useState(firstWord ?? '')
  const [lastName, setLastName] = useState(restWords.join(' '))
  const [bio, setBio] = useState(me.bio ?? '')
  // gender is required + pre-filled from the current value (carry-forward, §4)
  const [gender, setGender] = useState<Gender>(me.gender)
  const [city, setCity] = useState(me.city ?? 'Doha')
  const [area, setArea] = useState(me.area ?? '')
  // Carry-forward (§4): rehydrate the full sports list the player last saved
  // (lib/profile), so re-opening Edit Profile shows every sport + level already
  // chosen — never blank, never reset to a default. Falls back to the primary
  // sport/level carried on the store users row when nothing was saved yet (e.g.
  // a fresh account that only picked one sport at onboarding).
  const [sportLevels, setSportLevels] = useState<SportLevel[]>(
    () => readProfileSports() ?? [{ sport: me.sport, level: skillLevelToRating(me.skill_level) }],
  )
  const [dirty, setDirty] = useState(false)

  // areas depend on the chosen city; keep the saved area available even if it
  // isn't in the curated list so an existing value is never silently dropped.
  const areaOptions = Array.from(new Set([...areasFor(city), ...(area ? [area] : [])]))
  const changeCity = (next: string) => {
    setCity(next)
    if (area && !areasFor(next).includes(area)) setArea('')
    setDirty(true)
  }

  const updateSportLevels = (next: SportLevel[]) => {
    setSportLevels(next)
    setDirty(true)
  }

  const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
  // a "complete" profile needs at least a first name plus one sport with a level
  const canSave = !!firstName.trim() && sportLevels.length > 0

  const save = () => {
    if (!canSave) return
    // Persist the primary (first) sport + level onto the single-sport schema so
    // every screen that reads the current user reflects it; keep the full list
    // saved too. Mark setup complete so the first-timer card disappears (§4).
    const primary = sportLevels[0]
    actions.updateProfile({
      name: fullName,
      bio: bio.trim(),
      area: area.trim(),
      city: city.trim(),
      gender,
      sport: primary.sport,
      skill_level: ratingToSkillLevel(primary.level),
    })
    writeProfileSports(sportLevels)
    actions.completeProfile()
    // save-then-route: Edit Profile → View Profile (shows the updated name,
    // bio, location, sport + level) + transient toast (§4 / Part 1)
    showToast('Profile updated')
    navigate('/profile')
  }

  return (
    <Shell nav={false}>
      <div className="flex h-full flex-col">
        <div className="scroll-area relative z-1 flex-1 overflow-y-auto px-[22px] pt-14 pb-[120px]">
          <button
            type="button"
            onClick={() => navigate('/settings')}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
                  First name
                </label>
                <input
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setDirty(true) }}
                  placeholder="e.g. Jen"
                  className={fieldCls}
                  style={fieldStyle}
                />
              </div>
              <div>
                <label className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
                  Last name
                </label>
                <input
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setDirty(true) }}
                  placeholder="e.g. S."
                  className={fieldCls}
                  style={fieldStyle}
                />
              </div>
            </div>
            <div>
              <label className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
                {t('gender.label')}
              </label>
              {/* required + pre-filled; segmented control (radius md, brand-fill selected), tokens only */}
              <Segmented
                value={gender}
                onChange={(v) => { setGender(v); setDirty(true) }}
                options={(['male', 'female'] as Gender[]).map((g) => ({ value: g, label: t(`gender.${g}`) }))}
              />
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
                  City
                </label>
                <div className="relative">
                  <select value={city} onChange={(e) => changeCity(e.target.value)} className={`${fieldCls} appearance-none pe-9`} style={fieldStyle}>
                    {QATAR_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} strokeWidth={2} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                </div>
              </div>
              <div>
                <label className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
                  Area
                </label>
                <div className="relative">
                  <select value={area} onChange={(e) => { setArea(e.target.value); setDirty(true) }} className={`${fieldCls} appearance-none pe-9`} style={fieldStyle}>
                    <option value="">Select area</option>
                    {areaOptions.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} strokeWidth={2} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                </div>
              </div>
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
