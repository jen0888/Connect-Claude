import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronDown, ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { CTA } from '@/components/controls'
import { useToast } from '@/components/Toast'
import { useI18n } from '@/i18n'

/** Auth + onboarding (Splash / Sign Up / Login / Age Check / Questions /
 *  All Set). 18+ is a hard gate via date of birth — never a checkbox
 *  (CLAUDE.md §1). Returning login → straight to Home, no questionnaire;
 *  the questionnaire runs on Sign Up only (CLAUDE.md §4). */

const fieldCls = 'w-full rounded-md border bg-card px-3.5 py-3 text-[14.5px] text-ink outline-none placeholder:text-ink-faint'
const fieldStyle = { borderColor: 'rgba(26,26,26,0.16)' }

function Wordmark({ size = 44 }: { size?: number }) {
  return (
    <h1 className="m-0 text-center font-display font-normal leading-none" style={{ fontSize: size, letterSpacing: '-0.02em' }}>
      Connect<span className="italic text-brand">!</span>
    </h1>
  )
}

function SocialButtons() {
  const { showToast } = useToast()
  return (
    <div className="flex flex-col gap-2.5">
      {['Continue with Google', 'Continue with Apple', 'Continue with Facebook'].map((label) => (
        <button
          key={label}
          onClick={() => showToast('Social sign-in comes with Supabase')}
          className="inline-flex h-[46px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-pill border bg-card text-[13.5px] font-semibold text-ink"
          style={{ borderColor: 'rgba(26,26,26,0.12)' }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function PasswordField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${fieldCls} pe-11`} style={fieldStyle} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label="Toggle password"
          className="absolute end-3 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-0"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {show ? <Eye size={16} strokeWidth={1.9} /> : <EyeOff size={16} strokeWidth={1.9} />}
        </button>
      </div>
    </div>
  )
}

function LangBar() {
  const { locale, setLocale } = useI18n()
  return (
    <div className="flex justify-end pt-2">
      <div className="inline-flex rounded-pill p-[3px]" style={{ background: 'rgba(26,26,26,0.06)' }}>
        {(
          [
            { id: 'en', label: 'EN' },
            { id: 'ar', label: 'عربي' },
          ] as const
        ).map((o) => (
          <button
            key={o.id}
            onClick={() => setLocale(o.id)}
            className="cursor-pointer rounded-pill border-none px-3 py-1.5 text-[12px] font-semibold transition-colors"
            style={{
              background: locale === o.id ? 'var(--surface-card)' : 'transparent',
              color: locale === o.id ? 'var(--color-text)' : 'var(--color-text-muted)',
              boxShadow: locale === o.id ? '0 2px 8px -4px rgba(26,26,26,0.3)' : 'none',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Splash ─────────────────────────────────────────────────────────── */
export function SplashScreen() {
  return (
    <Shell nav={false}>
      <div className="relative z-1 flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-muted)' }}>
          Doha · pickup sports
        </div>
        <Wordmark size={64} />
        <p className="mt-4 mb-10 max-w-[260px] text-[14px] leading-[1.5]" style={{ color: 'rgba(26,26,26,0.6)', textWrap: 'pretty' }}>
          Find a match, meet good people, and play more often.
        </p>
        <div className="flex w-full flex-col gap-2.5">
          <Link to="/signup" className="inline-flex h-[52px] w-full items-center justify-center rounded-pill bg-brand text-[15px] font-semibold text-onbrand no-underline shadow-cta">
            Create an account
          </Link>
          <Link
            to="/login"
            className="inline-flex h-[52px] w-full items-center justify-center rounded-pill bg-transparent text-[14.5px] font-medium text-ink no-underline"
            style={{ border: '1.5px solid rgba(26,26,26,0.18)' }}
          >
            I already have one
          </Link>
        </div>
      </div>
    </Shell>
  )
}

/* ── Sign Up ────────────────────────────────────────────────────────── */
export function SignUpScreen() {
  const navigate = useNavigate()
  const [agree, setAgree] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const canGo = name.trim() && email.trim() && pw && pw === confirm && agree

  return (
    <Shell nav={false}>
      <div className="relative z-1 h-full overflow-y-auto px-7 pt-8 pb-10">
        <LangBar />
        <div className="pt-5 pb-6">
          <Wordmark />
        </div>
        <SocialButtons />
        <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-faint)' }}>
          <span className="h-px flex-1" style={{ background: 'rgba(26,26,26,0.10)' }} />
          or
          <span className="h-px flex-1" style={{ background: 'rgba(26,26,26,0.10)' }} />
        </div>
        <div className="flex flex-col gap-3.5">
          <div>
            <label className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
              Name
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={fieldCls} style={fieldStyle} />
          </div>
          <div>
            <label className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
              Email
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={fieldCls} style={fieldStyle} />
          </div>
          <PasswordField label="Password" value={pw} onChange={setPw} placeholder="8+ characters" />
          <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} placeholder="Repeat it" />
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2.5">
          <span
            className="inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[6px] text-onbrand transition-colors"
            style={{ background: agree ? 'var(--color-brand)' : 'transparent', border: agree ? 'none' : '1.5px solid rgba(26,26,26,0.25)' }}
            onClick={() => setAgree((a) => !a)}
          >
            {agree && <Check size={12} strokeWidth={3} />}
          </span>
          <span className="text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
            I agree to the <Link to="/safety/guidelines" className="font-semibold text-brand no-underline">Terms &amp; Community Guidelines</Link>
          </span>
        </label>
        <div className="mt-5">
          <CTA disabled={!canGo} onClick={() => navigate('/onboarding/age')}>
            Create account
          </CTA>
        </div>
        <div className="mt-4 text-center text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand no-underline">
            Log in
          </Link>
        </div>
      </div>
    </Shell>
  )
}

/* ── Login — returning players go straight to Home ──────────────────── */
export function LoginScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')

  return (
    <Shell nav={false}>
      <div className="relative z-1 h-full overflow-y-auto px-7 pt-8 pb-10">
        <LangBar />
        <div className="pt-5 pb-6">
          <Wordmark />
        </div>
        <SocialButtons />
        <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-faint)' }}>
          <span className="h-px flex-1" style={{ background: 'rgba(26,26,26,0.10)' }} />
          or
          <span className="h-px flex-1" style={{ background: 'rgba(26,26,26,0.10)' }} />
        </div>
        <div className="flex flex-col gap-3.5">
          <div>
            <label className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
              Email
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={fieldCls} style={fieldStyle} />
          </div>
          <PasswordField label="Password" value={pw} onChange={setPw} placeholder="Your password" />
        </div>
        <div className="mt-3 flex justify-end">
          <Link to="/forgot-password" className="text-[12.5px] font-semibold text-brand no-underline">
            Forgot password?
          </Link>
        </div>
        <div className="mt-5">
          {/* returning login → straight to Home, no questionnaire */}
          <CTA disabled={!email.trim() || !pw} onClick={() => navigate('/home')}>
            Log in
          </CTA>
        </div>
        <div className="mt-4 text-center text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
          New here?{' '}
          <Link to="/signup" className="font-semibold text-brand no-underline">
            Create an account
          </Link>
        </div>
      </div>
    </Shell>
  )
}

/* ── Forgot / Reset password ────────────────────────────────────────── */
export function ForgotPasswordScreen() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  return (
    <Shell nav={false}>
      <div className="relative z-1 h-full px-7 pt-12">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="mb-4 inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border-none text-ink"
          style={{ background: 'rgba(26,26,26,0.05)' }}
        >
          <ChevronLeft size={18} strokeWidth={2} className="rtl:rotate-180" />
        </button>
        <h1 className="m-0 mb-2 font-display text-[34px] font-normal leading-[1.02]" style={{ letterSpacing: '-0.022em' }}>
          Forgot your <span className="italic text-brand">password</span>?
        </h1>
        <p className="mb-6 text-[13px] leading-[1.5]" style={{ color: 'var(--color-text-muted)' }}>
          Enter your email and we'll send a reset link.
        </p>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={fieldCls} style={fieldStyle} />
        <div className="mt-5">
          <CTA
            disabled={!email.trim()}
            onClick={() => {
              showToast('Reset link sent')
              navigate('/login')
            }}
          >
            Send reset link
          </CTA>
        </div>
      </div>
    </Shell>
  )
}

/* ── Age Check — DOB hard gate, 18+ only ────────────────────────────── */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 80 }, (_, i) => THIS_YEAR - 10 - i)

function daysInMonth(month: number, year: number | null) {
  return new Date(year ?? 2000, month + 1, 0).getDate()
}
function ageFrom(y: number, m: number, d: number) {
  const today = new Date()
  let age = today.getFullYear() - y
  if (today.getMonth() < m || (today.getMonth() === m && today.getDate() < d)) age--
  return age
}

function DobDropdown<T extends number>({
  label,
  display,
  placeholder,
  options,
  open,
  onToggle,
  onSelect,
}: {
  label: string
  display: string | null
  placeholder: string
  options: { value: T; label: string }[]
  open: boolean
  onToggle: () => void
  onSelect: (v: T) => void
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between gap-1 rounded-md border bg-card px-3 py-3 text-[14px]"
        style={{ borderColor: open ? 'var(--color-brand)' : 'rgba(26,26,26,0.16)', color: display ? 'var(--color-text)' : 'var(--color-text-faint)' }}
      >
        <span className="truncate nums-tabular">{display ?? placeholder}</span>
        <ChevronDown size={14} strokeWidth={2} className="shrink-0 transition-transform" style={{ color: 'rgba(26,26,26,0.4)', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div
          className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-[200px] overflow-y-auto rounded-[14px] border bg-card py-1"
          style={{ borderColor: 'rgba(26,26,26,0.10)', boxShadow: '0 18px 40px -14px rgba(26,26,26,0.4)' }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onSelect(o.value)
                onToggle()
              }}
              className="block w-full cursor-pointer border-none bg-transparent px-3.5 py-2 text-start text-[13.5px] text-ink nums-tabular hover:bg-page"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AgeCheckScreen() {
  const navigate = useNavigate()
  const [month, setMonth] = useState<number | null>(null)
  const [day, setDay] = useState<number | null>(null)
  const [year, setYear] = useState<number | null>(null)
  const [openField, setOpenField] = useState<string | null>(null)
  const [popup, setPopup] = useState(false)

  const complete = month != null && day != null && year != null
  const age = complete ? ageFrom(year!, month!, day!) : null
  const dim = daysInMonth(month ?? 0, year)
  if (day != null && day > dim) setTimeout(() => setDay(null), 0)

  const submit = () => {
    if (!complete) return
    if (age! >= 18) navigate('/onboarding/1')
    else setPopup(true)
  }

  return (
    <Shell nav={false}>
      <div className="relative z-1 flex h-full flex-col px-7 pt-12">
        {/* top: back + progress */}
        <div className="mb-6 flex items-center gap-3.5">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="inline-flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none text-ink"
            style={{ background: 'rgba(26,26,26,0.05)' }}
          >
            <ChevronLeft size={18} strokeWidth={2} className="rtl:rotate-180" />
          </button>
          <div className="h-1 flex-1 overflow-hidden rounded-pill" style={{ background: 'rgba(26,26,26,0.08)' }}>
            <div className="h-full rounded-pill bg-brand" style={{ width: '12%' }} />
          </div>
          <div className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
            Sign&nbsp;up
          </div>
        </div>

        <h1 className="m-0 mb-2 font-display text-[34px] font-normal leading-[1.02]" style={{ letterSpacing: '-0.022em' }}>
          When's your <span className="italic text-brand">birthday</span>?
        </h1>
        <p className="mb-7 text-[13px] leading-[1.5]" style={{ color: 'var(--color-text-muted)', textWrap: 'pretty' }}>
          You need to be 18 or older to use Connect. We only use this to confirm your age.
        </p>

        <div className="flex gap-2.5">
          <DobDropdown
            label="Month"
            display={month != null ? MONTHS[month] : null}
            placeholder="Month"
            options={MONTHS.map((m, i) => ({ value: i, label: m }))}
            open={openField === 'month'}
            onToggle={() => setOpenField(openField === 'month' ? null : 'month')}
            onSelect={setMonth}
          />
          <DobDropdown
            label="Day"
            display={day != null ? String(day) : null}
            placeholder="—"
            options={Array.from({ length: month != null ? dim : 31 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
            open={openField === 'day'}
            onToggle={() => setOpenField(openField === 'day' ? null : 'day')}
            onSelect={setDay}
          />
          <DobDropdown
            label="Year"
            display={year != null ? String(year) : null}
            placeholder="Year"
            options={YEARS.map((y) => ({ value: y, label: String(y) }))}
            open={openField === 'year'}
            onToggle={() => setOpenField(openField === 'year' ? null : 'year')}
            onSelect={setYear}
          />
        </div>

        <div className="mt-4 text-[12.5px] nums-tabular" style={{ color: complete && age! >= 18 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
          {complete ? (
            age! >= 18 ? (
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Check size={13} strokeWidth={2.6} /> Great — you're {age}.
              </span>
            ) : (
              "You'll need to be 18+ to continue."
            )
          ) : (
            'Select your date of birth.'
          )}
        </div>

        <div className="mt-auto pb-9">
          <CTA disabled={!complete} onClick={submit}>
            Continue
          </CTA>
          <p className="mt-3 mb-0 text-center text-[11px] leading-[1.5]" style={{ color: 'var(--color-text-faint)' }}>
            By continuing you confirm this is accurate and agree to our{' '}
            <Link to="/safety/guidelines" className="font-semibold text-brand no-underline">
              Community Guidelines
            </Link>
            .
          </p>
        </div>

        {/* under-18 hard gate */}
        {popup && (
          <div className="absolute inset-0 z-40 flex items-end justify-center p-4 backdrop-blur-[2px]" style={{ background: 'rgba(26,26,26,0.45)' }}>
            <div className="w-full rounded-[26px] bg-card px-[22px] pt-6 pb-[18px]" style={{ boxShadow: '0 30px 60px -20px rgba(26,26,26,0.6)' }}>
              <h3 className="m-0 mb-2 font-display text-[26px] font-normal leading-[1.1]" style={{ letterSpacing: '-0.01em' }}>
                See you at <span className="italic text-brand">18</span>.
              </h3>
              <p className="m-0 mb-5 text-[13.5px] leading-[1.5]" style={{ color: 'var(--color-text-muted)' }}>
                Connect is for adults only right now. We'd love to have you when you're older.
              </p>
              <button onClick={() => navigate('/welcome')} className="w-full cursor-pointer rounded-pill border-none bg-ink py-3.5 text-[14px] font-semibold text-onbrand">
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

/* ── Questionnaire — sign-up only, 5 quick steps ────────────────────── */
interface Step {
  key: string
  title: [string, string, string?]
  sub: string
  options: { id: string; name: string; desc?: string }[]
}

const STEPS: Step[] = [
  {
    key: 'role',
    title: ['Choose your ', 'role'],
    sub: 'This shapes what you see on Connect. You can change it later.',
    options: [
      { id: 'player', name: 'Player', desc: 'Find and join matches near you' },
      { id: 'host', name: 'Host', desc: 'Set up matches and fill the spots' },
      { id: 'both', name: 'Both', desc: 'Mix it up — play and host' },
    ],
  },
  {
    key: 'sport',
    title: ['Pick your ', 'sport'],
    sub: 'Your main one — you can play them all.',
    options: [
      { id: 'padel', name: 'Padel' },
      { id: 'tennis', name: 'Tennis' },
      { id: 'badminton', name: 'Badminton' },
      { id: 'running', name: 'Running' },
    ],
  },
  {
    key: 'level',
    title: ["What's your ", 'level', '?'],
    sub: 'Be honest — it makes for better matches.',
    options: [
      { id: 'beginner', name: 'Beginner', desc: 'Learning the ropes' },
      { id: 'intermediate', name: 'Intermediate', desc: 'Solid rallies, fair serves' },
      { id: 'advanced', name: 'Advanced', desc: 'Competitive, consistent' },
    ],
  },
  {
    key: 'days',
    title: ['When do you ', 'play', '?'],
    sub: 'Roughly — so we can surface the right matches.',
    options: [
      { id: 'mornings', name: 'Mornings', desc: 'Before work, sunrise runs' },
      { id: 'evenings', name: 'Evenings', desc: 'After-work prime time' },
      { id: 'weekends', name: 'Weekends', desc: 'Friday & Saturday sessions' },
    ],
  },
  {
    key: 'area',
    title: ['Where in ', 'Doha', '?'],
    sub: 'Your home area — matches all over the city still show.',
    options: [
      { id: 'westbay', name: 'West Bay · Al Dafna' },
      { id: 'aspire', name: 'Aspire Zone · Al Waab' },
      { id: 'pearl', name: 'The Pearl · Lusail' },
      { id: 'other', name: 'Somewhere else' },
    ],
  },
]

export function QuestionnaireScreen({ step }: { step: number }) {
  const navigate = useNavigate()
  const s = STEPS[step - 1]
  const [selected, setSelected] = useState<string | null>(null)
  const next = () => navigate(step < STEPS.length ? `/onboarding/${step + 1}` : '/onboarding/guidelines')

  return (
    <Shell nav={false}>
      <div className="relative z-1 flex h-full flex-col px-7 pt-12">
        <div className="mb-6 flex items-center gap-3.5">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="inline-flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none text-ink"
            style={{ background: 'rgba(26,26,26,0.05)' }}
          >
            <ChevronLeft size={18} strokeWidth={2} className="rtl:rotate-180" />
          </button>
          <div className="h-1 flex-1 overflow-hidden rounded-pill" style={{ background: 'rgba(26,26,26,0.08)' }}>
            <div className="h-full rounded-pill bg-brand transition-all" style={{ width: `${12 + (step / STEPS.length) * 88}%` }} />
          </div>
          <div className="shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
            <b className="text-ink">{step}</b> / {STEPS.length}
          </div>
        </div>

        <h1 className="m-0 mb-2 font-display text-[34px] font-normal leading-[1.02]" style={{ letterSpacing: '-0.022em' }}>
          {s.title[0]}
          <span className="italic text-brand">{s.title[1]}</span>
          {s.title[2] ?? ''}
        </h1>
        <p className="mb-7 text-[13px] leading-[1.5]" style={{ color: 'var(--color-text-muted)', textWrap: 'pretty' }}>
          {s.sub}
        </p>

        <div className="flex flex-col gap-2.5">
          {s.options.map((o) => {
            const on = selected === o.id
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setSelected(o.id)
                  setTimeout(next, 220)
                }}
                className="flex w-full cursor-pointer items-center gap-3.5 rounded-[18px] bg-card px-4 py-4 text-start transition-all"
                style={{
                  border: on ? '1.5px solid var(--color-brand)' : '1px solid rgba(26,26,26,0.10)',
                  background: on ? 'color-mix(in srgb, var(--color-brand) 5%, var(--surface-card))' : 'var(--surface-card)',
                  boxShadow: on ? '0 10px 24px -16px var(--color-brand)' : 'none',
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{o.name}</span>
                  {o.desc && (
                    <span className="mt-0.5 block text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                      {o.desc}
                    </span>
                  )}
                </span>
                <span
                  className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-onbrand"
                  style={{ background: on ? 'var(--color-brand)' : 'transparent', border: on ? 'none' : '1.5px solid rgba(26,26,26,0.18)' }}
                >
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-auto flex flex-col items-center gap-1 pb-9">
          <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            {selected ? (
              <>
                Saved — <b className="text-ink">{s.options.find((o) => o.id === selected)?.name}</b>
              </>
            ) : (
              'Tap one to continue'
            )}
          </div>
          <button onClick={next} className="cursor-pointer border-none bg-transparent px-3 py-2 text-[12.5px] font-semibold text-brand">
            Skip for now
          </button>
        </div>
      </div>
    </Shell>
  )
}

/* ── Onboarding guidelines — agree before entering ──────────────────── */
const ONBOARD_RULES = [
  { title: 'Show up', body: 'Cancel at least 2 hours before start so your spot can be filled. Cancelling within 2 hours counts as a no-show — same as not turning up.' },
  { title: 'No-shows are visible', body: "They're recorded on your profile for other players to see. No blocks, no penalties — just transparency." },
  { title: 'Play fair, talk kind', body: 'Call lines honestly and keep chat friendly. Competitive is great; hostile is not.' },
  { title: 'Money is between you', body: 'Connect never handles payments — court costs are settled in cash or transfer, directly with the host.' },
]

export function OnboardingGuidelinesScreen() {
  const navigate = useNavigate()
  return (
    <Shell nav={false}>
      <div className="relative z-1 flex h-full flex-col overflow-y-auto px-7 pt-12 pb-9">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
          One last thing
        </div>
        <h1 className="m-0 mb-2 font-display text-[34px] font-normal leading-[1.02]" style={{ letterSpacing: '-0.022em' }}>
          House <span className="italic text-brand">rules</span>.
        </h1>
        <p className="mb-6 text-[13px] leading-[1.5]" style={{ color: 'var(--color-text-muted)', textWrap: 'pretty' }}>
          Four things every player agrees to. They come down to one idea — treat every player the way you'd want to be treated.
        </p>
        <div className="flex flex-col gap-3">
          {ONBOARD_RULES.map((g, i) => (
            <div key={g.title} className="rounded-[18px] border bg-card p-4 shadow-row" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
              <div className="mb-1.5 flex items-baseline gap-2.5">
                <span className="font-display text-[18px] italic leading-none text-accent nums-tabular">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[14.5px] font-semibold text-ink">{g.title}</span>
              </div>
              <p className="m-0 text-[12.5px] leading-[1.55]" style={{ color: 'rgba(26,26,26,0.65)', textWrap: 'pretty' }}>
                {g.body}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-7">
          <CTA onClick={() => navigate('/onboarding/done')}>I'm in — let's play</CTA>
        </div>
      </div>
    </Shell>
  )
}

/* ── All Set ────────────────────────────────────────────────────────── */
export function AllSetScreen() {
  const navigate = useNavigate()
  return (
    <Shell nav={false}>
      <div className="relative z-1 flex h-full flex-col items-center justify-center px-8 text-center">
        <div
          className="mb-7 inline-flex h-[88px] w-[88px] items-center justify-center rounded-full text-onbrand"
          style={{ background: 'var(--color-success)', boxShadow: '0 18px 40px -16px var(--color-success)' }}
        >
          <Check size={40} strokeWidth={2.6} />
        </div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-muted)' }}>
          Profile complete
        </div>
        <h1 className="m-0 font-display text-[44px] font-normal leading-[1.02]" style={{ letterSpacing: '-0.022em' }}>
          You're <span className="italic text-brand">all set</span>.
        </h1>
        <p className="mt-3.5 mb-9 max-w-[270px] text-[13.5px] leading-[1.55]" style={{ color: 'var(--color-text-muted)', textWrap: 'pretty' }}>
          We'll line up matches, partners and courts around what you just picked. Welcome to Connect.
        </p>
        <div className="flex w-full flex-col gap-2.5">
          <CTA onClick={() => navigate('/home')}>Take me home</CTA>
          <button onClick={() => navigate('/onboarding/1')} className="cursor-pointer border-none bg-transparent px-3 py-2.5 text-[13px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Edit my answers
          </button>
        </div>
      </div>
    </Shell>
  )
}
