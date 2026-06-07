import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Fingerprint,
  Flag,
  LifeBuoy,
  LogOut,
  Pencil,
  Scale,
  Shield,
  ShieldBan,
} from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Toggle } from '@/components/controls'
import { useToast } from '@/components/Toast'
import { useI18n } from '@/i18n'
import { currentUserId, getUser, useDB } from '@/lib/store'

/** Settings (Settings.html) — hybrid: ~80% inline toggles that save in place
 *  (no Save button, no nav), drill-downs only for lists/forms. Language is an
 *  inline EN/عربي segmented; Push is one master toggle, no per-type
 *  (CLAUDE.md §5). Profile+Settings is one combined entry from Home. */

function Row({
  icon,
  color,
  label,
  sub,
  to,
  onClick,
  toggle,
}: {
  icon: ReactNode
  color: string
  label: string
  sub?: string
  to?: string
  onClick?: () => void
  toggle?: { on: boolean; set: (v: boolean) => void }
}) {
  const inner = (
    <>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-white" style={{ background: color }}>
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-start">
        <div className="text-[14px] font-semibold text-ink">{label}</div>
        {sub && (
          <div className="mt-px text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
            {sub}
          </div>
        )}
      </div>
      {toggle ? (
        <Toggle value={toggle.on} onChange={toggle.set} />
      ) : (
        <ChevronRight size={15} strokeWidth={2} className="shrink-0 rtl:rotate-180" style={{ color: 'rgba(26,26,26,0.3)' }} />
      )}
    </>
  )
  const cls = 'flex w-full items-center gap-3 border-none bg-transparent px-4 py-3 text-inherit no-underline'
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick ?? (toggle ? () => toggle.set(!toggle.on) : undefined)} className={`${cls} cursor-pointer`}>
      {inner}
    </button>
  )
}

function Group({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2.5 mb-6 overflow-hidden rounded-[18px] border bg-card shadow-row [&>*+*]:border-t [&>*+*]:border-[rgba(26,26,26,0.06)]" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
      {children}
    </div>
  )
}

export function SettingsScreen() {
  const db = useDB()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { locale, setLocale } = useI18n()
  const me = getUser(db, currentUserId)!
  const [push, setPush] = useState(true)
  const [biometric, setBiometric] = useState(true)
  const [safetyOpen, setSafetyOpen] = useState(false)
  const [first, ...rest] = me.name.split(' ')

  // inline toggles save in place — confirmation is the switch itself
  const setPushAndSave = (v: boolean) => {
    setPush(v)
    showToast(v ? 'Push notifications on' : 'Push notifications off')
  }

  return (
    <Shell>
      <div className="relative z-1 h-full overflow-y-auto px-6 pt-12 pb-[120px]">
        {/* top bar */}
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none text-ink"
            style={{ background: 'rgba(26,26,26,0.05)' }}
          >
            <ChevronLeft size={18} strokeWidth={2} className="rtl:rotate-180" />
          </button>
          <div className="flex-1 text-center text-[13px] font-semibold tracking-[0.01em]">Settings</div>
          <span className="h-10 w-10" />
        </div>

        {/* profile hero */}
        <div className="rounded-[22px] border bg-card p-4 shadow-card" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
          <div className="flex items-center gap-3.5">
            <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[26px] italic text-page">
              {first[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[24px] leading-[1.05]">
                {first} <span className="italic text-accent">{rest.join(' ')}</span>
              </div>
              <div className="mt-1 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                Member · '{new Date(me.created_at).getFullYear().toString().slice(-2)}
              </div>
            </div>
          </div>
          <div className="mt-3.5 grid grid-cols-2 gap-2.5">
            <Link
              to="/profile"
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-pill bg-brand text-[13px] font-semibold text-onbrand no-underline shadow-cta"
            >
              <Eye size={14} strokeWidth={2} /> View profile
            </Link>
            <Link
              to="/profile/edit"
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-pill bg-transparent text-[13px] font-medium text-ink no-underline"
              style={{ border: '1.5px solid rgba(26,26,26,0.16)' }}
            >
              <Pencil size={13} strokeWidth={1.9} /> Edit profile
            </Link>
          </div>
        </div>

        {/* Account */}
        <div className="mt-7 inline-flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
          <span className="h-[5px] w-[5px] rounded-full bg-accent" /> Account
        </div>
        <Group>
          {/* language — inline EN / عربي segmented */}
          <div className="flex w-full items-center gap-3 px-4 py-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-white" style={{ background: '#2FB872' }}>
              <Shield size={16} strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1 text-[14px] font-semibold text-ink">Language</div>
            <div className="inline-flex rounded-pill bg-brand p-[3px]">
              {(
                [
                  { id: 'en', label: 'EN' },
                  { id: 'ar', label: 'عر' },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setLocale(o.id)}
                  className="cursor-pointer rounded-pill border-none px-3.5 py-1.5 text-[12px] font-semibold transition-colors"
                  style={{
                    background: locale === o.id ? 'var(--surface-card)' : 'transparent',
                    color: locale === o.id ? 'var(--color-brand)' : 'var(--color-text-onbrand)',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </Group>

        {/* Security & alerts */}
        <div className="inline-flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
          <span className="h-[5px] w-[5px] rounded-full bg-accent" /> Security &amp; alerts
        </div>
        <Group>
          <Row icon={<Bell size={16} strokeWidth={1.9} />} color="#EF4D4D" label="Push notifications" sub="Match invites, chat, reminders" toggle={{ on: push, set: setPushAndSave }} />
          <Row icon={<Fingerprint size={16} strokeWidth={1.9} />} color="#1a1a1a" label="Biometric login" sub="Face ID · sign in faster" toggle={{ on: biometric, set: setBiometric }} />
        </Group>

        {/* Support & info */}
        <div className="inline-flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
          <span className="h-[5px] w-[5px] rounded-full bg-accent" /> Support &amp; info
        </div>
        <Group>
          {/* safety drill-down */}
          <button
            type="button"
            onClick={() => setSafetyOpen((o) => !o)}
            aria-expanded={safetyOpen}
            className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-4 py-3 text-inherit"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-white" style={{ background: '#E85D2C' }}>
              <Shield size={16} strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1 text-start">
              <div className="text-[14px] font-semibold text-ink">Safety &amp; support</div>
              <div className="mt-px text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                Report a problem, players, blocked, guidelines
              </div>
            </div>
            <ChevronDown size={15} strokeWidth={2} className="shrink-0 transition-transform" style={{ color: 'rgba(26,26,26,0.3)', transform: safetyOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
          {safetyOpen && (
            <div className="bg-page/60">
              {[
                { icon: <LifeBuoy size={15} strokeWidth={1.9} />, color: '#2FB872', label: 'Report a problem', sub: 'Bugs, account, feedback', to: '/safety/problem' },
                { icon: <Flag size={15} strokeWidth={1.9} />, color: '#E85D2C', label: 'Report a player or match', sub: 'Conduct or safety concern', to: '/safety/report' },
                { icon: <ShieldBan size={15} strokeWidth={1.9} />, color: '#7C5CFF', label: 'Blocked list', sub: "People you've blocked", to: '/safety/blocked' },
                { icon: <BookOpen size={15} strokeWidth={1.9} />, color: '#3C8FFF', label: 'Guidelines', sub: 'Community standards', to: '/safety/guidelines' },
              ].map((it) => (
                <Link key={it.label} to={it.to} className="flex w-full items-center gap-3 px-4 py-2.5 ps-8 text-inherit no-underline">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-white" style={{ background: it.color }}>
                    {it.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-ink">{it.label}</div>
                    <div className="mt-px text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      {it.sub}
                    </div>
                  </div>
                  <ChevronRight size={14} strokeWidth={2} className="shrink-0 rtl:rotate-180" style={{ color: 'rgba(26,26,26,0.3)' }} />
                </Link>
              ))}
            </div>
          )}
          {/* legal — links only */}
          <Row icon={<Scale size={16} strokeWidth={1.9} />} color="#6B6B73" label="Legal" sub="Terms, privacy policy" onClick={() => showToast('Opens terms & privacy')} />
        </Group>

        {/* sign out */}
        <button
          type="button"
          onClick={() => showToast('Signed out')}
          className="mx-auto flex cursor-pointer items-center gap-2 border-none bg-transparent px-4 py-2 text-[13.5px] font-semibold"
          style={{ color: 'var(--color-danger)' }}
        >
          <LogOut size={15} strokeWidth={2} /> Sign out
        </button>
        <div className="mt-2 pb-2 text-center text-[11px]" style={{ color: 'var(--color-text-faint)' }}>
          Connect v 1.0.0 <span className="opacity-60">·</span> Made in Doha
        </div>
      </div>
    </Shell>
  )
}
