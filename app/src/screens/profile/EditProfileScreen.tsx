import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Eyebrow } from '@/components/Eyebrow'
import { CTA, Segmented } from '@/components/controls'
import { useToast } from '@/components/Toast'
import { currentUserId, getUser, useDB } from '@/lib/store'
import type { SkillLevel, Sport } from '@/lib/types'

/** Edit Player Profile (form version) — save-then-route: Save → Settings +
 *  toast (CLAUDE.md §4). Trust signals (no-shows, stats) are not editable —
 *  public-by-default is the trust mechanism. */

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
  const [sport, setSport] = useState<Sport>(me.sport)
  const [level, setLevel] = useState<SkillLevel>(me.skill_level)

  const save = () => {
    // mock layer: users are static; the future Supabase update goes here
    showToast('Profile saved')
    navigate('/settings')
  }

  return (
    <Shell nav={false}>
      <div className="flex h-full flex-col">
        <div className="relative z-1 flex-1 overflow-y-auto px-[22px] pt-14 pb-[120px]">
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
              <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} style={fieldStyle} />
            </div>
            <div>
              <label className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 160))}
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
              <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Al Waab" className={fieldCls} style={fieldStyle} />
            </div>
          </div>

          <Eyebrow accent="var(--color-brand)">Game</Eyebrow>
          <div className="mt-3 flex flex-col gap-4 rounded-[22px] border bg-card p-[18px]" style={{ borderColor: 'rgba(26,26,26,0.10)' }}>
            <div>
              <div className="mb-2 text-[13.5px] font-medium text-ink">Main sport</div>
              <Segmented
                value={sport}
                onChange={setSport}
                options={[
                  { value: 'padel', label: 'Padel' },
                  { value: 'tennis', label: 'Tennis' },
                  { value: 'badminton', label: 'Badm.' },
                  { value: 'running', label: 'Run' },
                ]}
              />
            </div>
            <div>
              <div className="mb-2 text-[13.5px] font-medium text-ink">Level</div>
              <Segmented
                value={level}
                onChange={setLevel}
                options={[
                  { value: 'beginner', label: 'Beginner' },
                  { value: 'intermediate', label: 'Interm.' },
                  { value: 'advanced', label: 'Advanced' },
                ]}
              />
            </div>
          </div>

          <p className="mt-5 mb-0 text-center text-[11.5px] leading-[1.5]" style={{ color: 'var(--color-text-muted)' }}>
            Stats, attendance and no-shows aren't editable — they're what makes profiles trustworthy.
          </p>
        </div>

        {/* sticky save */}
        <div
          className="absolute inset-x-0 bottom-0 z-5 px-[22px] pt-4 pb-[22px]"
          style={{ background: 'linear-gradient(180deg, transparent, var(--surface-page) 30%)' }}
        >
          <CTA onClick={save}>Save changes</CTA>
        </div>
      </div>
    </Shell>
  )
}
