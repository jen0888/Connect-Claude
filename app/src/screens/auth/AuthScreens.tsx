import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, Check, ChevronDown, ChevronLeft, Eye, EyeOff, MailCheck } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { Logo } from '@/components/Logo'
import { CTA } from '@/components/controls'
import { useToast } from '@/components/Toast'
import { useI18n } from '@/i18n'
import { onboarding, resetOnboarding, type OnboardingSkill } from '@/lib/onboarding'
import { mockUser } from '@/lib/mockUser'
import { useAuth } from '@/context/AuthContext'
import { actions } from '@/lib/store'
import { USERS } from '@/lib/mock/data'
import type { Sport } from '@/lib/types'

/** Auth + onboarding — Splash → Sign Up → Q1 Age (DOB hard gate) → Q2 Sport →
 *  Q3 Skill → Community Guidelines (explicit agree) → Creating account →
 *  All Set (confetti celebration) → Home. Single-choice questions (Q2/Q3)
 *  auto-advance ~700ms after a tap — no Next button.
 *  Returning login → straight to Home, never the questionnaire (CLAUDE.md §4).
 *  UI only — no Supabase yet. Mock conventions until auth lands:
 *  an email from mock USERS (e.g. you@example.com) is "registered", so it
 *  triggers email-in-use on Sign Up and is the only login that succeeds
 *  (anything else shows the wrong-credentials state). */

/* ── validation (client-side mirrors of future Supabase errors) ──────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isValidEmail = (v: string) => EMAIL_RE.test(v.trim())
const isStrongPassword = (v: string) => v.length >= 8
const isRegistered = (email: string) => USERS.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())
/** simulated network latency for loading states */
const FAKE_LATENCY = 900

/** prefers-reduced-motion — web mirror of AccessibilityInfo.isReduceMotionEnabled;
 *  when on, the All-Set confetti / orbit / burst ring render statically */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** single-choice questions auto-advance ~700ms after a tap (no Next button);
 *  re-tapping another option restarts the window with the new answer */
const AUTO_ADVANCE_MS = 700

function useAutoAdvance() {
  const navigate = useNavigate()
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (to: string) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => navigate(to), AUTO_ADVANCE_MS)
  }
}

/* ── small shared pieces (auth-local; consume tokens only) ───────────── */
const fieldCls = 'w-full rounded-md border bg-card px-3.5 py-3 text-[14.5px] text-ink outline-none placeholder:text-ink-faint focus-visible:ring-2'
const fieldBorder = (error?: boolean) => ({ borderColor: error ? 'var(--color-danger)' : 'rgba(26,26,26,0.16)' })

function Wordmark({ size = 44 }: { size?: number }) {
  return (
    <h1 className="m-0 text-center font-display font-normal leading-none" style={{ fontSize: size, letterSpacing: '-0.02em' }}>
      Connect<span className="italic text-brand">!</span>
    </h1>
  )
}

/** third-party brand marks — official assets, fixed brand colors (not tokens),
 *  never flipped in RTL (CLAUDE.md §7: logos don't mirror) */
function GoogleMark({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function AppleMark({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 384 512" aria-hidden="true" fill="currentColor" style={{ marginTop: -2 }}>
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  )
}

/** Google + Apple — UI only until Supabase OAuth lands */
function SocialButtons() {
  const { showToast } = useToast()
  const { t } = useI18n()
  const providers = [
    { id: 'google', label: t('auth.continueGoogle'), icon: <GoogleMark /> },
    { id: 'apple', label: t('auth.continueApple'), icon: <AppleMark /> },
  ]
  return (
    <div className="flex flex-col gap-2.5">
      {providers.map((p) => (
        <button
          key={p.id}
          onClick={() => showToast(t('auth.socialSoon'))}
          className="inline-flex h-[46px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-pill border bg-card text-[13.5px] font-semibold text-ink"
          style={{ borderColor: 'rgba(26,26,26,0.12)' }}
        >
          {p.icon}
          {p.label}
        </button>
      ))}
    </div>
  )
}

function OrDivider() {
  const { t } = useI18n()
  return (
    <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-faint)' }}>
      <span className="h-px flex-1" style={{ background: 'rgba(26,26,26,0.10)' }} />
      {t('auth.or')}
      <span className="h-px flex-1" style={{ background: 'rgba(26,26,26,0.10)' }} />
    </div>
  )
}

function BackButton() {
  const navigate = useNavigate()
  const { t } = useI18n()
  return (
    <button
      onClick={() => navigate(-1)}
      aria-label={t('auth.back')}
      className="inline-flex h-[44px] w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none text-ink"
      style={{ background: 'rgba(26,26,26,0.05)' }}
    >
      {/* directional icon — flips in RTL */}
      <ChevronLeft size={18} strokeWidth={2} className="rtl:rotate-180" />
    </button>
  )
}

/** labelled input + inline error (no shared Input primitive exists yet —
 *  this is the established auth-field pattern from the Stage-1 bundle) */
function TextField({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  type = 'text',
  inputMode,
  autoComplete,
  ltr = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  placeholder: string
  error?: string | null
  type?: string
  inputMode?: 'email' | 'tel' | 'text'
  autoComplete?: string
  ltr?: boolean
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        // emails / phone numbers stay LTR + Western digits even in Arabic
        dir={ltr ? 'ltr' : undefined}
        className={`${fieldCls} ${ltr ? 'nums-tabular text-start' : ''}`}
        style={fieldBorder(!!error)}
      />
      {error && <FieldError>{error}</FieldError>}
    </div>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  placeholder: string
  error?: string | null
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  const id = useId()
  const { t } = useI18n()
  return (
    <div>
      <label htmlFor={id} className="mb-[7px] block text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          className={`${fieldCls} pe-11`}
          style={fieldBorder(!!error)}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}
          className="absolute end-1 top-1/2 inline-flex h-[44px] w-[44px] -translate-y-1/2 cursor-pointer items-center justify-center border-none bg-transparent p-0"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {show ? <Eye size={16} strokeWidth={1.9} /> : <EyeOff size={16} strokeWidth={1.9} />}
        </button>
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  )
}

function FieldError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="m-0 mt-1.5 flex items-start gap-1.5 text-[11.5px] font-medium leading-[1.4]" style={{ color: 'var(--color-danger)' }}>
      <AlertCircle size={13} strokeWidth={2} className="mt-px shrink-0" />
      {children}
    </p>
  )
}

/** form-level error (wrong credentials / email in use) */
function FormError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[12.5px] font-medium leading-[1.5]"
      style={{
        color: 'var(--color-danger)',
        borderColor: 'color-mix(in srgb, var(--color-danger) 30%, transparent)',
        background: 'color-mix(in srgb, var(--color-danger) 7%, var(--surface-card))',
      }}
    >
      <AlertCircle size={15} strokeWidth={2} className="mt-px shrink-0" />
      <span>{children}</span>
    </div>
  )
}

/* ── Splash / Welcome — big central logo, footer-level actions ──────── */
export function SplashScreen() {
  const { t } = useI18n()
  return (
    <Shell nav={false}>
      <div className="relative z-1 flex h-full flex-col px-7 pt-8 pb-9">
        {/* TODO: language switching lives in Settings, not onboarding */}
        {/* logo (transparent PNG, bakes in wordmark + tagline) is the sole focus */}
        <div className="flex flex-1 items-center justify-center">
          <Logo className="w-[82vw] max-w-[360px]" />
        </div>
        {/* footer action area */}
        <div className="flex w-full flex-col gap-2.5">
          <Link
            to="/signup"
            className="inline-flex h-[54px] w-full items-center justify-center rounded-pill bg-brand text-[15.5px] font-semibold text-onbrand no-underline shadow-cta transition-all active:translate-y-px active:bg-brandstrong"
          >
            {t('splash.getStarted')}
          </Link>
          <Link
            to="/login"
            className="inline-flex h-[54px] w-full items-center justify-center rounded-pill bg-transparent text-[14.5px] font-medium text-ink no-underline"
            style={{ border: '1.5px solid rgba(26,26,26,0.18)' }}
          >
            {t('splash.logIn')}
          </Link>
        </div>
      </div>
    </Shell>
  )
}

/* ── Sign Up — name · email · phone · password ──────────────────────── */
export function SignUpScreen() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [emailInUse, setEmailInUse] = useState(false)
  const [busy, setBusy] = useState(false)

  const touch = (k: string) => setTouched((s) => ({ ...s, [k]: true }))
  const emailError = emailInUse ? t('auth.err.emailInUse') : touched.email && email && !isValidEmail(email) ? t('auth.err.invalidEmail') : null
  const pwError = touched.pw && pw && !isStrongPassword(pw) ? t('auth.err.weakPassword') : null
  const canGo = !!name.trim() && isValidEmail(email) && isStrongPassword(pw)

  const submit = () => {
    if (!canGo || busy) return
    setBusy(true)
    // mock latency; becomes supabase.auth.signUp — in-use check is server-side
    setTimeout(() => {
      setBusy(false)
      if (isRegistered(email)) setEmailInUse(true)
      else {
        // new account → start the questionnaire blank, nothing pre-selected (§3)
        resetOnboarding()
        navigate('/onboarding/age')
      }
    }, FAKE_LATENCY)
  }

  return (
    <Shell nav={false}>
      <div className="relative z-1 h-full overflow-y-auto px-7 pt-8 pb-10">
        {/* TODO: language switching lives in Settings, not onboarding */}
        <div className="pt-5 pb-6">
          <Wordmark />
        </div>
        <SocialButtons />
        <OrDivider />
        <div className="flex flex-col gap-3.5">
          <TextField label={t('auth.field.name')} value={name} onChange={setName} placeholder={t('auth.ph.name')} autoComplete="name" />
          <TextField
            label={t('auth.field.email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            ltr
            value={email}
            onChange={(v) => {
              setEmail(v)
              setEmailInUse(false)
            }}
            onBlur={() => touch('email')}
            placeholder={t('auth.ph.email')}
            error={emailError}
          />
          <PasswordField
            label={t('auth.field.password')}
            value={pw}
            onChange={setPw}
            onBlur={() => touch('pw')}
            placeholder={t('auth.ph.password')}
            error={pwError}
            autoComplete="new-password"
          />
        </div>
        <div className="mt-6">
          <CTA disabled={!canGo} loading={busy} onClick={submit}>
            {t('signup.cta')}
          </CTA>
        </div>
        <div className="mt-4 text-center text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
          {t('signup.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-brand no-underline">
            {t('signup.logInLink')}
          </Link>
        </div>
      </div>
    </Shell>
  )
}

/* ── Login — returning players go straight to Home ──────────────────── */
export function LoginScreen() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [touched, setTouched] = useState(false)
  const [wrongCreds, setWrongCreds] = useState(false)
  const [busy, setBusy] = useState(false)

  const emailError = touched && email && !isValidEmail(email) ? t('auth.err.invalidEmail') : null
  const canGo = isValidEmail(email) && !!pw

  const submit = () => {
    if (!canGo || busy) return
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      // dev-only mock login: the password must match VITE_DEV_PASSWORD
      // (.env.development, gitignored) and success signs in as mockUser.
      // import.meta.env.MODE is replaced at build time, so this whole branch
      // is dead-code-eliminated from production bundles.
      if (import.meta.env.MODE === 'development') {
        if (import.meta.env.VITE_DEV_PASSWORD && pw === import.meta.env.VITE_DEV_PASSWORD) {
          signIn(mockUser)
          // returning login → straight to Home, never the questionnaire
          navigate('/home')
        } else {
          setWrongCreds(true)
        }
        return
      }
      // becomes supabase.auth.signInWithPassword; mock convention until then
      if (isRegistered(email)) navigate('/home')
      else setWrongCreds(true)
    }, FAKE_LATENCY)
  }

  return (
    <Shell nav={false}>
      <div className="relative z-1 h-full overflow-y-auto px-7 pt-8 pb-10">
        {/* TODO: language switching lives in Settings, not onboarding */}
        <div className="pt-5 pb-6">
          <Wordmark />
        </div>
        <SocialButtons />
        <OrDivider />
        <div className="flex flex-col gap-3.5">
          <TextField
            label={t('auth.field.email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            ltr
            value={email}
            onChange={(v) => {
              setEmail(v)
              setWrongCreds(false)
            }}
            onBlur={() => setTouched(true)}
            placeholder={t('auth.ph.email')}
            error={emailError}
          />
          <PasswordField
            label={t('auth.field.password')}
            value={pw}
            onChange={(v) => {
              setPw(v)
              setWrongCreds(false)
            }}
            placeholder={t('auth.ph.password')}
            autoComplete="current-password"
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Link to="/forgot-password" className="px-1 py-2 text-[12.5px] font-semibold text-brand no-underline">
            {t('login.forgot')}
          </Link>
        </div>
        {wrongCreds && (
          <div className="mb-4">
            <FormError>{t('auth.err.wrongCredentials')}</FormError>
          </div>
        )}
        <CTA disabled={!canGo} loading={busy} onClick={submit}>
          {t('login.cta')}
        </CTA>
        <div className="mt-4 text-center text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
          {t('login.new')}{' '}
          <Link to="/signup" className="font-semibold text-brand no-underline">
            {t('login.createLink')}
          </Link>
        </div>
      </div>
    </Shell>
  )
}

/* ── Forgot password — request link, then sent state ────────────────── */
export function ForgotPasswordScreen() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const emailError = touched && email && !isValidEmail(email) ? t('auth.err.invalidEmail') : null

  const send = (after?: () => void) => {
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      setSent(true)
      after?.()
    }, FAKE_LATENCY)
  }

  return (
    <Shell nav={false}>
      <div className="relative z-1 flex h-full flex-col px-7 pt-12 pb-10">
        <div className="mb-4">
          <BackButton />
        </div>
        {sent ? (
          /* sent / success state */
          <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
            <div
              className="mb-6 inline-flex h-[72px] w-[72px] items-center justify-center rounded-full text-onbrand"
              style={{ background: 'var(--color-success)', boxShadow: '0 18px 40px -16px var(--color-success)' }}
            >
              <MailCheck size={32} strokeWidth={2} />
            </div>
            <h1 className="m-0 mb-2 font-display text-[34px] font-normal leading-[1.05]" style={{ letterSpacing: '-0.022em' }}>
              {t('forgot.sentTitle')}
            </h1>
            <p className="m-0 mb-8 max-w-[280px] text-[13px] leading-[1.55]" style={{ color: 'var(--color-text-muted)', textWrap: 'pretty' }}>
              {t('forgot.sentBody', { email: email.trim() })}
            </p>
            <div className="flex w-full flex-col gap-2.5">
              <CTA loading={busy} onClick={() => send(() => showToast(t('forgot.toastSent')))}>
                {t('forgot.resend')}
              </CTA>
              <button
                onClick={() => navigate('/login')}
                className="cursor-pointer border-none bg-transparent px-3 py-2.5 text-[13px] font-semibold text-brand"
              >
                {t('forgot.backToLogin')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="m-0 mb-2 font-display text-[34px] font-normal leading-[1.02]" style={{ letterSpacing: '-0.022em' }}>
              {t('forgot.titleA')}
              <span className="italic text-brand">{t('forgot.titleB')}</span>
              {t('forgot.titleC')}
            </h1>
            <p className="mb-6 text-[13px] leading-[1.5]" style={{ color: 'var(--color-text-muted)' }}>
              {t('forgot.sub')}
            </p>
            <TextField
              label={t('auth.field.email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              ltr
              value={email}
              onChange={setEmail}
              onBlur={() => setTouched(true)}
              placeholder={t('auth.ph.email')}
              error={emailError}
            />
            <div className="mt-5">
              <CTA disabled={!isValidEmail(email)} loading={busy} onClick={() => send()}>
                {t('forgot.cta')}
              </CTA>
            </div>
          </>
        )}
      </div>
    </Shell>
  )
}

/* ── Reset password — new password (reached from the email link) ────── */
export function ResetPasswordScreen() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { showToast } = useToast()
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)

  const pwError = touched.pw && pw && !isStrongPassword(pw) ? t('auth.err.weakPassword') : null
  const matchError = touched.confirm && confirm && pw !== confirm ? t('auth.err.mismatch') : null
  const canGo = isStrongPassword(pw) && pw === confirm

  const submit = () => {
    if (!canGo || busy) return
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      showToast(t('reset.toastDone'))
      navigate('/login')
    }, FAKE_LATENCY)
  }

  return (
    <Shell nav={false}>
      <div className="relative z-1 h-full px-7 pt-12">
        <div className="mb-4">
          <BackButton />
        </div>
        <h1 className="m-0 mb-2 font-display text-[34px] font-normal leading-[1.02]" style={{ letterSpacing: '-0.022em' }}>
          {t('reset.titleA')}
          <span className="italic text-brand">{t('reset.titleB')}</span>
          {t('reset.titleC')}
        </h1>
        <p className="mb-6 text-[13px] leading-[1.5]" style={{ color: 'var(--color-text-muted)' }}>
          {t('reset.sub')}
        </p>
        <div className="flex flex-col gap-3.5">
          <PasswordField
            label={t('auth.field.newPassword')}
            value={pw}
            onChange={setPw}
            onBlur={() => setTouched((s) => ({ ...s, pw: true }))}
            placeholder={t('auth.ph.password')}
            error={pwError}
            autoComplete="new-password"
          />
          <PasswordField
            label={t('auth.field.confirmPassword')}
            value={confirm}
            onChange={setConfirm}
            onBlur={() => setTouched((s) => ({ ...s, confirm: true }))}
            placeholder={t('auth.ph.confirmPassword')}
            error={matchError}
            autoComplete="new-password"
          />
        </div>
        <div className="mt-5">
          <CTA disabled={!canGo} loading={busy} onClick={submit}>
            {t('reset.cta')}
          </CTA>
        </div>
      </div>
    </Shell>
  )
}

/* ── Onboarding chrome — back + Step X of 3 progress ────────────────── */
const TOTAL_STEPS = 3

function StepHeader({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useI18n()
  return (
    <div className="mb-6 flex items-center gap-3.5">
      <BackButton />
      <div className="h-1 flex-1 overflow-hidden rounded-pill" style={{ background: 'rgba(26,26,26,0.08)' }}>
        <div className="h-full rounded-pill bg-brand transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>
      <div className="shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] nums-tabular ltr-nums" style={{ color: 'var(--color-text-muted)' }}>
        {t('onb.step', { step, total: TOTAL_STEPS })}
      </div>
    </div>
  )
}

function StepTitle({ a, b, c, sub }: { a: string; b: string; c: string; sub: string }) {
  return (
    <>
      <h1 className="m-0 mb-2 font-display text-[34px] font-normal leading-[1.02]" style={{ letterSpacing: '-0.022em' }}>
        {a}
        <span className="italic text-brand">{b}</span>
        {c}
      </h1>
      <p className="mb-7 text-[13px] leading-[1.5]" style={{ color: 'var(--color-text-muted)', textWrap: 'pretty' }}>
        {sub}
      </p>
    </>
  )
}

/** single-select option row (sign-up Q2/Q3) — radio semantics */
function OptionCard({ name, desc, on, onSelect }: { name: string; desc?: string; on: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onSelect}
      className="flex w-full cursor-pointer items-center gap-3.5 rounded-[18px] bg-card px-4 py-4 text-start transition-all"
      style={{
        border: on ? '1.5px solid var(--color-brand)' : '1px solid rgba(26,26,26,0.10)',
        background: on ? 'color-mix(in srgb, var(--color-brand) 5%, var(--surface-card))' : 'var(--surface-card)',
        boxShadow: on ? '0 10px 24px -16px var(--color-brand)' : 'none',
      }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{name}</span>
        {desc && (
          <span className="mt-0.5 block text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            {desc}
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
}

/** question footer — helper hint flips to a saved confirmation once a
 *  choice is made (replaces the removed Next button) */
function SavedFooter({ saved }: { saved: string | null }) {
  const { t } = useI18n()
  return (
    <div
      aria-live="polite"
      className="mt-auto flex items-center justify-center gap-1.5 pt-6 pb-9 text-[12.5px] font-medium"
      style={{ color: saved ? 'var(--color-success)' : 'var(--color-text-muted)' }}
    >
      {saved ? (
        <>
          <Check size={13} strokeWidth={2.6} />
          {t('onb.saved', { value: saved })}
        </>
      ) : (
        t('onb.tapHint')
      )}
    </div>
  )
}

/* ── Q1 — Age check (DOB picker, 18+ hard gate) ─────────────────────── */
function daysInMonth(month: number, year: number | null) {
  return new Date(year ?? 2000, month + 1, 0).getDate()
}
function ageFrom(y: number, m: number, d: number) {
  const today = new Date()
  let age = today.getFullYear() - y
  if (today.getMonth() < m || (today.getMonth() === m && today.getDate() < d)) age--
  return age
}
const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 80 }, (_, i) => THIS_YEAR - 10 - i)

function DobDropdown({
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
  options: { value: number; label: string }[]
  open: boolean
  onToggle: () => void
  onSelect: (v: number) => void
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-[46px] w-full cursor-pointer items-center justify-between gap-1 rounded-md border bg-card px-3 py-3 text-[14px]"
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
  const { t, locale } = useI18n()
  const [month, setMonth] = useState<number | null>(onboarding.dob?.month ?? null)
  const [day, setDay] = useState<number | null>(onboarding.dob?.day ?? null)
  const [year, setYear] = useState<number | null>(onboarding.dob?.year ?? null)
  const [openField, setOpenField] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)

  // month names localize; digits stay Western + LTR (CLAUDE.md §7)
  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', { month: 'long' })
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2000, i, 1)))
  }, [locale])

  const complete = month != null && day != null && year != null
  const age = complete ? ageFrom(year, month, day) : null
  const underage = age != null && age < 18

  const pickMonth = (m: number) => {
    setMonth(m)
    if (day != null && day > daysInMonth(m, year)) setDay(null)
  }
  const pickYear = (y: number) => {
    setYear(y)
    if (day != null && month != null && day > daysInMonth(month, y)) setDay(null)
  }

  const submit = () => {
    if (!complete) return
    if (underage) {
      setBlocked(true) // hard gate — no way past
      return
    }
    onboarding.dob = { year: year!, month: month!, day: day! }
    navigate('/onboarding/sport')
  }

  return (
    <Shell nav={false}>
      <div className="relative z-1 flex h-full flex-col px-7 pt-12">
        <StepHeader step={1} />
        <StepTitle a={t('onb.age.titleA')} b={t('onb.age.titleB')} c={t('onb.age.titleC')} sub={t('onb.age.sub')} />

        {/* DOB stays LTR (M · D · Y order is stable) even under dir="rtl" */}
        <div className="flex gap-2.5" dir="ltr">
          <DobDropdown
            label={t('onb.age.month')}
            display={month != null ? monthNames[month] : null}
            placeholder={t('onb.age.month')}
            options={monthNames.map((m, i) => ({ value: i, label: m }))}
            open={openField === 'month'}
            onToggle={() => setOpenField(openField === 'month' ? null : 'month')}
            onSelect={pickMonth}
          />
          <DobDropdown
            label={t('onb.age.day')}
            display={day != null ? String(day) : null}
            placeholder="—"
            options={Array.from({ length: month != null ? daysInMonth(month, year) : 31 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
            open={openField === 'day'}
            onToggle={() => setOpenField(openField === 'day' ? null : 'day')}
            onSelect={setDay}
          />
          <DobDropdown
            label={t('onb.age.year')}
            display={year != null ? String(year) : null}
            placeholder={t('onb.age.year')}
            options={YEARS.map((y) => ({ value: y, label: String(y) }))}
            open={openField === 'year'}
            onToggle={() => setOpenField(openField === 'year' ? null : 'year')}
            onSelect={pickYear}
          />
        </div>

        <div
          className="mt-4 text-[12.5px] nums-tabular"
          role={underage ? 'alert' : undefined}
          style={{ color: underage ? 'var(--color-danger)' : complete ? 'var(--color-success)' : 'var(--color-text-muted)' }}
        >
          {complete ? (
            underage ? (
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <AlertCircle size={13} strokeWidth={2.2} /> {t('onb.age.under')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Check size={13} strokeWidth={2.6} /> {t('onb.age.ok', { age: age! })}
              </span>
            )
          ) : (
            t('onb.age.prompt')
          )}
        </div>

        <div className="mt-auto pb-9">
          <CTA disabled={!complete || underage} onClick={submit}>
            {t('onb.next')}
          </CTA>
        </div>

        {/* under-18 hard block */}
        {blocked && (
          <div className="absolute inset-0 z-40 flex items-end justify-center p-4 backdrop-blur-[2px]" style={{ background: 'rgba(26,26,26,0.45)' }}>
            <div role="alertdialog" aria-modal="true" className="w-full rounded-[26px] bg-card px-[22px] pt-6 pb-[18px]" style={{ boxShadow: '0 30px 60px -20px rgba(26,26,26,0.6)' }}>
              <h3 className="m-0 mb-2 font-display text-[26px] font-normal leading-[1.1]" style={{ letterSpacing: '-0.01em' }}>
                {t('onb.age.blockTitleA')}
                <span className="italic text-brand nums-tabular">{t('onb.age.blockTitleB')}</span>
                {t('onb.age.blockTitleC')}
              </h3>
              <p className="m-0 mb-5 text-[13.5px] leading-[1.5]" style={{ color: 'var(--color-text-muted)' }}>
                {t('onb.age.blockBody')}
              </p>
              <button onClick={() => navigate('/welcome')} className="min-h-[48px] w-full cursor-pointer rounded-pill border-none bg-ink py-3.5 text-[14px] font-semibold text-onbrand">
                {t('onb.age.blockCta')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

/* ── Q2 — Sport ─────────────────────────────────────────────────────── */
const SPORTS: Sport[] = ['padel', 'tennis', 'badminton', 'running']

export function OnboardingSportScreen() {
  const { t } = useI18n()
  const advance = useAutoAdvance()
  const [selected, setSelected] = useState<Sport | null>(onboarding.sport)

  return (
    <Shell nav={false}>
      <div className="relative z-1 flex h-full flex-col px-7 pt-12">
        <StepHeader step={2} />
        <StepTitle a={t('onb.sport.titleA')} b={t('onb.sport.titleB')} c={t('onb.sport.titleC')} sub={t('onb.sport.sub')} />
        <div role="radiogroup" className="flex flex-col gap-2.5">
          {SPORTS.map((s) => (
            <OptionCard
              key={s}
              name={t(`sport.${s}`)}
              on={selected === s}
              onSelect={() => {
                setSelected(s)
                onboarding.sport = s
                advance('/onboarding/skill')
              }}
            />
          ))}
        </div>
        <SavedFooter saved={selected ? t(`sport.${selected}`) : null} />
      </div>
    </Shell>
  )
}

/* ── Q3 — Skill level (Baby Beginner → Pro, 7 steps) ────────────────── */
const SKILLS: OnboardingSkill[] = ['baby_beginner', 'beginner', 'low_intermediate', 'intermediate', 'high_intermediate', 'advanced', 'pro']

export function OnboardingSkillScreen() {
  const { t } = useI18n()
  const advance = useAutoAdvance()
  const [selected, setSelected] = useState<OnboardingSkill | null>(onboarding.skill)

  return (
    <Shell nav={false}>
      {/* min-h-full: 7 options outgrow small viewports — page scrolls */}
      <div className="relative z-1 flex min-h-full flex-col px-7 pt-12">
        <StepHeader step={3} />
        <StepTitle a={t('onb.skill.titleA')} b={t('onb.skill.titleB')} c={t('onb.skill.titleC')} sub={t('onb.skill.sub')} />
        <div role="radiogroup" className="flex flex-col gap-2.5">
          {SKILLS.map((s) => (
            <OptionCard
              key={s}
              name={t(`skill.${s}`)}
              desc={t(`skill.${s}.desc`)}
              on={selected === s}
              onSelect={() => {
                setSelected(s)
                onboarding.skill = s
                advance('/onboarding/guidelines')
              }}
            />
          ))}
        </div>
        <SavedFooter saved={selected ? t(`skill.${selected}`) : null} />
      </div>
    </Shell>
  )
}

/* ── Community Guidelines review lives in CommunityStandardsScreen.tsx ── */

/* ── Creating account — full-screen hold between agree and All Set ───── */
export function CreatingAccountScreen() {
  const navigate = useNavigate()
  const { t } = useI18n()

  useEffect(() => {
    // becomes the Supabase signUp call; replace so Back never returns here.
    // New account = clean slate — Home renders the first-timer variant.
    const id = window.setTimeout(() => {
      actions.startFreshAccount()
      navigate('/onboarding/done', { replace: true })
    }, 1800)
    return () => window.clearTimeout(id)
  }, [navigate])

  return (
    <Shell nav={false}>
      <div role="status" className="relative z-1 flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <span
          className="h-10 w-10 animate-spin rounded-full"
          style={{ border: '3px solid color-mix(in oklab, var(--color-brand) 25%, transparent)', borderTopColor: 'var(--color-brand)' }}
        />
        <div className="text-[13px] font-medium" style={{ color: 'rgba(26,26,26,0.66)' }}>
          {t('onb.rules.creating')}
        </div>
      </div>
    </Shell>
  )
}

/* ── All Set — celebration (confetti + burst ring + orbiting dot) ────── */

/** celebration palette from the All-Set spec — decorative confetti only,
 *  never UI; the falling pieces cycle through it */
const CONFETTI_COLORS = ['#c76a48', '#e89b6c', '#4F7A5C', '#88b29b', '#d9a45a', '#1a1a1a', '#F4F0E8']
const CONFETTI_COUNT = 28

interface ConfettiPiece {
  id: number
  color: string
  x: number
  w: number
  h: number
  dx: number
  dy: number
  rot: number
  duration: number
  delay: number
  spin: number
}

function makeConfetti(width: number): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const x = width / 2 + (Math.random() - 0.5) * width * (0.35 + Math.random() * 0.55)
    const fromCenter = x >= width / 2 ? 1 : -1 // pieces drift outward
    return {
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      x,
      w: 7 + Math.random() * 3,
      h: 12 + Math.random() * 6,
      dx: fromCenter * (10 + Math.random() * 140) + (Math.random() - 0.5) * 60,
      dy: 420 + Math.random() * 300,
      rot: -540 + Math.random() * 1080,
      duration: 1700 + Math.random() * 1100,
      delay: Math.random() * 500,
      spin: 500 + Math.random() * 600,
    }
  })
}

/** full-screen confetti — fires once on entry, always sits behind the
 *  headline & badge; each ribbon falls once (conn-conf-fall, fill both)
 *  while its inner face tumbles independently (conn-conf-tumble, loop) */
function ConfettiLayer() {
  const ref = useRef<HTMLDivElement>(null)
  const [pieces, setPieces] = useState<ConfettiPiece[]>([])

  // spread scales to the measured shell width (useWindowDimensions equivalent)
  useEffect(() => {
    setPieces(makeConfetti(ref.current?.offsetWidth ?? 390))
  }, [])

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={
            {
              top: -24,
              left: p.x,
              width: p.w,
              height: p.h,
              '--conf-dx': `${p.dx}px`,
              '--conf-dy': `${p.dy}px`,
              '--conf-rot': `${p.rot}deg`,
              animation: `conn-conf-fall ${p.duration}ms ease ${p.delay}ms both`,
            } as CSSProperties
          }
        >
          <div className="h-full w-full" style={{ background: p.color, borderRadius: 2, animation: `conn-conf-tumble ${p.spin}ms linear infinite` }} />
        </div>
      ))}
    </div>
  )
}

/** terracotta check badge + one-shot burst ring + continuously orbiting dot;
 *  `animate={false}` (reduced motion) renders the badge statically */
function CelebrationBadge({ animate }: { animate: boolean }) {
  return (
    <div className="relative mb-7 inline-flex">
      {/* burst ring — 96×96 centered on the 88px badge, expands once, behind it */}
      {animate && (
        <span
          aria-hidden
          className="absolute h-24 w-24 rounded-full"
          style={{ top: -4, insetInlineStart: -4, border: '2px solid var(--color-brand)', animation: 'conn-burst-ring 900ms ease-out 150ms both' }}
        />
      )}
      {/* orbit container = badge + padding; it rotates, the dot rides its top edge */}
      {animate && (
        <span aria-hidden className="absolute" style={{ inset: -10, animation: 'conn-orbit 3000ms linear infinite' }}>
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-brand" />
        </span>
      )}
      <div
        className="relative inline-flex h-[88px] w-[88px] items-center justify-center rounded-full text-onbrand"
        style={{ background: 'var(--color-brand)', boxShadow: '0 18px 40px -16px var(--color-brand)' }}
      >
        <Check size={40} strokeWidth={2.6} />
      </div>
    </div>
  )
}

export function AllSetScreen() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const reducedMotion = usePrefersReducedMotion()

  return (
    <Shell nav={false}>
      <div className="relative z-1 flex h-full flex-col px-8">
        {/* celebration fires once on entry; skipped under reduced motion */}
        {!reducedMotion && <ConfettiLayer />}
        <div className="relative flex flex-1 flex-col items-center justify-center text-center">
          <CelebrationBadge animate={!reducedMotion} />
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-muted)' }}>
            {t('onb.done.eyebrow')}
          </div>
          <h1 className="m-0 font-display text-[44px] font-normal leading-[1.02]" style={{ letterSpacing: '-0.022em' }}>
            {t('onb.done.titleA')}
            <span className="italic text-brand">{t('onb.done.titleB')}</span>
            {t('onb.done.titleC')}
          </h1>
          <p className="mt-3.5 mb-0 max-w-[270px] text-[13.5px] leading-[1.55]" style={{ color: 'var(--color-text-muted)', textWrap: 'pretty' }}>
            {t('onb.done.body')}
          </p>
        </div>
        {/* CTA pinned to the bottom, clear of the home indicator — hands off
            to Home (first-timer Home shows the seeded Discover feed) */}
        <div className="relative w-full" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 28px)' }}>
          <CTA onClick={() => navigate('/home')}>
            {t('onb.done.cta')}
            {/* directional icon — flips in RTL */}
            <ArrowRight size={18} strokeWidth={2.2} className="rtl:rotate-180" />
          </CTA>
        </div>
      </div>
    </Shell>
  )
}
